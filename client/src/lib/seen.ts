/*
  Remembers the questions this browser has already been shown, per
  topic, so the next deck or quiz can ask the AI for different ones.
*/

const KEY = "smartprep-seen-v1";
const PER_TOPIC = 30;

export type Seen = Record<string, string[]>;

const listeners = new Set<() => void>();

/** Turns untrusted saved or downloaded data into a valid Seen map. */
export function sanitizeSeen(raw: unknown): Seen {
  const out: Seen = {};
  if (!raw || typeof raw !== "object") return out;

  const entries = Object.entries(raw as Record<string, unknown>).slice(0, 60);
  for (const [topic, list] of entries) {
    if (!Array.isArray(list)) continue;
    out[topic.slice(0, 60)] = list
      .filter((q): q is string => typeof q === "string")
      .map((q) => q.slice(0, 600))
      .slice(-PER_TOPIC);
  }
  return out;
}

function read(): Seen {
  try {
    return sanitizeSeen(JSON.parse(localStorage.getItem(KEY) || "{}"));
  } catch {
    return {};
  }
}

function write(all: Seen) {
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // Storage can be blocked; variety then relies on the AI alone.
  }
  listeners.forEach((listener) => listener());
}

const norm = (topic: string) => topic.trim().toLowerCase();

export function getSeen(topic: string): string[] {
  return read()[norm(topic)] ?? [];
}

export function addSeen(topic: string, questions: string[]) {
  const all = read();
  const key = norm(topic);
  const merged = [...(all[key] ?? []), ...questions];
  // De-duplicate, keeping the most recent ones.
  const unique = merged.filter((q, i) => merged.lastIndexOf(q) === i);

  all[key] = unique.slice(-PER_TOPIC);
  write(all);
}

// ---------------- sync hooks ----------------

export const getSeenAll = read;

export function replaceSeen(next: Seen) {
  write(sanitizeSeen(next));
}

export function subscribeSeen(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
