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

/**
 * Create embeddings for multiple texts in one API request.
 */
export async function createEmbeddings(
  texts: string[]
): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  const maxRetries = 5;

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
          Math.pow(2, attempt) * 5000;

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