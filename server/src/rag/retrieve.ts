import dotenv from "dotenv";

import { createEmbeddings } from "./embedding";
import { index } from "./pinecone";

dotenv.config();

const NAMESPACE = "placement";
const TOP_K = 5;

export interface RetrievedChunk {
  text: string;
  source: string;
  chunkIndex: number;
  score: number;
}

/**
 * Search the Pinecone knowledge base
 * for information relevant to the user's question.
 */
export async function retrieveRelevantChunks(
  query: string,
  topK: number = TOP_K
): Promise<RetrievedChunk[]> {
  if (!query || !query.trim()) {
    return [];
  }

  console.log(`🔎 Searching knowledge base for: "${query}"`);

  /*
   * Convert the user's question into an embedding.
   */
  const embeddings = await createEmbeddings([
    query,
  ]);

  const queryEmbedding = embeddings[0];

  /*
   * Search Pinecone for the most similar chunks.
   */
  const result = await index
    .namespace(NAMESPACE)
    .query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
    });

  /*
   * Convert Pinecone results into a clean format.
   */
  const matches = result.matches || [];

  const retrievedChunks: RetrievedChunk[] =
    matches
      .filter(
        (match) =>
          match.metadata &&
          typeof match.metadata.text === "string"
      )
      .map((match) => ({
        text: match.metadata!.text as string,

        source:
          (match.metadata!.source as string) ||
          "Unknown source",

        chunkIndex:
          (match.metadata!.chunkIndex as number) ||
          0,

        score: match.score || 0,
      }));

  console.log(
    `📚 Retrieved ${retrievedChunks.length} relevant chunks`
  );

  retrievedChunks.forEach(
    (chunk, index) => {
      console.log(
        `  ${index + 1}. ${chunk.source} | score: ${chunk.score.toFixed(
          4
        )}`
      );
    }
  );

  return retrievedChunks;
}