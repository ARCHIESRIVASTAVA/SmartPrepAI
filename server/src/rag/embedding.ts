import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY not found in .env");
}

const ai = new GoogleGenAI({
  apiKey,
});

export interface EmbeddingOptions {
  /** Total attempts before giving up. Defaults to 5 (used by ingestion). */
  maxRetries?: number;
  /** Base wait after a 429, doubled each attempt. Defaults to 5000ms. */
  baseDelayMs?: number;
}

/**
 * Create embeddings for multiple texts in one API request.
 *
 * Ingestion uses the defaults (patient, long backoff).
 * User-facing requests should pass a small maxRetries and
 * baseDelayMs so a rate limit fails fast instead of hanging.
 */
export async function createEmbeddings(
  texts: string[],
  options: EmbeddingOptions = {}
): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const maxRetries = options.maxRetries ?? 5;
  const baseDelayMs = options.baseDelayMs ?? 5000;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await ai.models.embedContent({
        model: "gemini-embedding-001",
        contents: texts,
        config: {
          outputDimensionality: 768,
        },
      });

      if (!response.embeddings) {
        throw new Error("Failed to generate embeddings");
      }

      const embeddings = response.embeddings.map(
        (embedding) => {
          if (!embedding.values) {
            throw new Error(
              "Embedding values are missing"
            );
          }

          return normalizeEmbedding(embedding.values);
        }
      );

      return embeddings;
    } catch (error: any) {
      const status = error?.status;

      if (status === 429 && attempt < maxRetries - 1) {
        const waitTime =
          Math.pow(2, attempt) * baseDelayMs;

        console.log(
          `⏳ Gemini quota/rate limit reached. Waiting ${
            waitTime / 1000
          } seconds...`
        );

        await sleep(waitTime);

        continue;
      }

      throw error;
    }
  }

  throw new Error(
    "Failed to generate embeddings after retries"
  );
}

/**
 * Normalize a vector.
 */
function normalizeEmbedding(
  embedding: number[]
): number[] {
  const magnitude = Math.sqrt(
    embedding.reduce(
      (sum, value) => sum + value * value,
      0
    )
  );

  if (magnitude === 0) {
    throw new Error(
      "Embedding has zero magnitude"
    );
  }

  return embedding.map(
    (value) => value / magnitude
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  );
}