import type { NextFunction, Request, Response } from "express";

/*
  Shared protection against Gemini rate limits.

  - guard(): runs a Gemini call with a small concurrency cap, retries
    short per-minute limits, and can fall back to a second model.
  - aiLimiter: stops one visitor from using up the shared quota.
  - sendAiError(): turns any failure into a short, friendly reply
    instead of leaking Google's raw error text.
*/

export const PRIMARY_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
/** Optional second model with its own quota, tried when the first is limited. */
const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || "";

const MAX_CONCURRENT = Number(process.env.GEMINI_CONCURRENCY) || 4;
const MAX_WAIT_MS = 6000;

export const statusOf = (error: any): number | undefined =>
  error?.status ?? error?.statusCode ?? error?.response?.status ?? error?.code;

export function isQuotaError(error: any): boolean {
  const text = String(error?.message ?? "");
  return (
    statusOf(error) === 429 ||
    /RESOURCE_EXHAUSTED|exceeded your current quota|rate limit/i.test(text)
  );
}

const isBusy = (error: any) =>
  statusOf(error) === 503 || /overloaded|UNAVAILABLE/i.test(String(error?.message ?? ""));

/** Seconds Google asks us to wait, if the error says so. */
export function retryDelaySeconds(error: any): number | null {
  const text = String(error?.message ?? "");
  const match =
    text.match(/retryDelay"?\s*[:=]\s*"?(\d+(?:\.\d+)?)s/i) ??
    text.match(/retry in (\d+(?:\.\d+)?)s/i);
  return match ? Number(match[1]) : null;
}

// ---------------- concurrency cap ----------------

let active = 0;
const waiting: (() => void)[] = [];

async function slot<T>(task: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT) {
    await new Promise<void>((resolve) => waiting.push(resolve));
  }

  active += 1;
  try {
    return await task();
  } finally {
    active -= 1;
    waiting.shift()?.();
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs `call` with the primary model. On a rate limit or overload it
 * tries the fallback model (if configured), then waits briefly and
 * retries. Gives up quickly when Google asks for a long wait, which
 * usually means the daily quota is gone.
 */
export async function guard<T>(call: (model: string) => Promise<T>): Promise<T> {
  const models = [PRIMARY_MODEL, FALLBACK_MODEL].filter(Boolean);
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const model = models[attempt % models.length];

    try {
      return await slot(() => call(model));
    } catch (error) {
      lastError = error;

      const retryable = isQuotaError(error) || isBusy(error);
      if (!retryable || attempt === 2) break;

      const asked = retryDelaySeconds(error);
      if (asked !== null && asked * 1000 > MAX_WAIT_MS && models.length === 1) break;

      // With two models, switching is the retry; otherwise wait a moment.
      if (models.length === 1 || attempt > 0) {
        await sleep(Math.min(asked !== null ? asked * 1000 : 1500 * (attempt + 1), MAX_WAIT_MS));
      }
    }
  }

  throw lastError;
}

// ---------------- friendly errors ----------------

export const QUOTA_MESSAGE =
  "The AI is very busy right now. Please wait a minute and try again.";

export function sendAiError(res: Response, error: any, fallback: string) {
  console.error("❌ AI ERROR:", {
    status: statusOf(error),
    message: String(error?.message ?? error).slice(0, 300),
  });

  if (isQuotaError(error)) {
    return res
      .status(429)
      .json({ success: false, error: "QUOTA_EXCEEDED", message: QUOTA_MESSAGE });
  }

  return res.status(500).json({ success: false, message: fallback });
}

// ---------------- per-visitor limiter ----------------

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = Number(process.env.RATE_LIMIT_PER_MIN) || 30;
const hits = new Map<string, number[]>();

setInterval(() => {
  const cutoff = Date.now() - WINDOW_MS;
  hits.forEach((times, key) => {
    const recent = times.filter((t) => t > cutoff);
    if (recent.length) hits.set(key, recent);
    else hits.delete(key);
  });
}, WINDOW_MS).unref();

export function aiLimiter(req: Request, res: Response, next: NextFunction) {
  // Health checks and CORS preflights are free.
  if (req.method === "OPTIONS") return next();

  const key = req.ip || "unknown";
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => t > now - WINDOW_MS);

  if (recent.length >= MAX_PER_WINDOW) {
    const wait = Math.max(1, Math.ceil((recent[0] + WINDOW_MS - now) / 1000));
    res.setHeader("Retry-After", String(wait));
    return res.status(429).json({
      success: false,
      error: "TOO_FAST",
      message: `You're going a little fast. Try again in ${wait} seconds.`,
    });
  }

  recent.push(now);
  hits.set(key, recent);
  next();
}
