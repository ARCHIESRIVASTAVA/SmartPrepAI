import fs from "fs";
import path from "path";
import { PDFParse } from "pdf-parse";
import dotenv from "dotenv";

import { createEmbeddings } from "./embedding";
import { index } from "./pinecone";

dotenv.config();

const KNOWLEDGE_BASE = path.join(
  process.cwd(),
  "knowledge-base"
);

const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;

/*
 * Number of chunks sent to Gemini in ONE request.
 *
 * Keeping this relatively small makes the ingestion
 * safer on free-tier limits.
 */
const EMBEDDING_BATCH_SIZE = 20;

/*
 * Number of vectors sent to Pinecone at once.
 */
const PINECONE_BATCH_SIZE = 100;

const NAMESPACE = "placement";

/**
 * Split text into overlapping chunks.
 */
function chunkText(text: string): string[] {
  const chunks: string[] = [];

  let start = 0;

  while (start < text.length) {
    const end = Math.min(
      start + CHUNK_SIZE,
      text.length
    );

    const chunk = text
      .slice(start, end)
      .trim();

    if (chunk.length > 0) {
      chunks.push(chunk);
    }

    start += CHUNK_SIZE - CHUNK_OVERLAP;
  }

  return chunks;
}

/**
 * Create a safe filename for Pinecone IDs.
 */
function createSafeFileName(
  fileName: string
): string {
  return fileName.replace(
    /[^a-zA-Z0-9]/g,
    "-"
  );
}

/**
 * Process one PDF.
 */
async function ingestPDF(
  filePath: string
): Promise<number> {
  const fileName = path.basename(filePath);

  console.log(
    `\n📄 Processing: ${fileName}`
  );

  const buffer = fs.readFileSync(filePath);

  /*
   * Extract PDF text.
   */
  const parser = new PDFParse({
    data: buffer,
  });

  const result = await parser.getText();

  const text = result.text.trim();

  await parser.destroy();

  if (!text) {
    console.log(
      `⚠️ No text found in ${fileName}`
    );

    return 0;
  }

  console.log(
    `📝 Extracted ${text.length} characters`
  );

  /*
   * Create chunks.
   */
  const chunks = chunkText(text);

  console.log(
    `✂️ Created ${chunks.length} chunks`
  );

  const safeFileName =
    createSafeFileName(fileName);

  let totalUploaded = 0;

  /*
   * Process chunks in embedding batches.
   */
  for (
    let start = 0;
    start < chunks.length;
    start += EMBEDDING_BATCH_SIZE
  ) {
    const batch = chunks.slice(
      start,
      start + EMBEDDING_BATCH_SIZE
    );

    console.log(
      `\n🧠 Creating embeddings for chunks ${
        start + 1
      }-${start + batch.length} of ${
        chunks.length
      }...`
    );

    /*
     * ONE Gemini request for the whole batch.
     */
    const embeddings =
      await createEmbeddings(batch);

    /*
     * Build Pinecone records.
     */
    const vectors = embeddings.map(
      (embedding, indexInBatch) => {
        const chunkIndex =
          start + indexInBatch;

        return {
          id: `${safeFileName}-${chunkIndex}`,

          values: embedding,

          metadata: {
            source: fileName,
            chunkIndex,
            text: batch[indexInBatch],
          },
        };
      }
    );

    /*
     * Upload to Pinecone.
     */
    for (
      let i = 0;
      i < vectors.length;
      i += PINECONE_BATCH_SIZE
    ) {
      const pineconeBatch =
        vectors.slice(
          i,
          i + PINECONE_BATCH_SIZE
        );

      await index
        .namespace(NAMESPACE)
        .upsert({
          records: pineconeBatch,
        });
    }

    totalUploaded += vectors.length;

    console.log(
      `✅ Uploaded ${totalUploaded}/${chunks.length} chunks`
    );
  }

  return totalUploaded;
}

/**
 * Main function.
 */
async function main() {
  console.log(
    "🚀 Starting SmartPrep AI RAG ingestion...\n"
  );

  /*
   * Check knowledge-base folder.
   */
  if (!fs.existsSync(KNOWLEDGE_BASE)) {
    throw new Error(
      `Knowledge base folder not found: ${KNOWLEDGE_BASE}`
    );
  }

  /*
   * Find PDFs.
   */
  const files = fs
    .readdirSync(KNOWLEDGE_BASE)
    .filter((file) =>
      file
        .toLowerCase()
        .endsWith(".pdf")
    );

  if (files.length === 0) {
    console.log(
      "❌ No PDF files found."
    );

    return;
  }

  console.log(
    `📚 Found ${files.length} PDF files:\n`
  );

  files.forEach((file) => {
    console.log(`  • ${file}`);
  });

  let totalChunks = 0;
  let successfulFiles = 0;
  let failedFiles = 0;

  /*
   * Process PDFs one at a time.
   */
  for (const file of files) {
    const filePath = path.join(
      KNOWLEDGE_BASE,
      file
    );

    try {
      const uploaded =
        await ingestPDF(filePath);

      totalChunks += uploaded;
      successfulFiles++;

    } catch (error) {
      failedFiles++;

      console.error(
        `\n❌ Failed to process: ${file}`
      );

      console.error(error);

      /*
       * Continue to the next PDF.
       */
      continue;
    }
  }

  console.log(
    "\n================================"
  );

  console.log(
    "🎉 INGESTION FINISHED"
  );

  console.log(
    "================================"
  );

  console.log(
    `📚 PDFs found: ${files.length}`
  );

  console.log(
    `✅ Successfully processed: ${successfulFiles}`
  );

  console.log(
    `❌ Failed: ${failedFiles}`
  );

  console.log(
    `📦 Total chunks uploaded: ${totalChunks}`
  );

  console.log(
    `🌲 Pinecone namespace: ${NAMESPACE}`
  );

  console.log(
    "================================"
  );
}

main().catch((error) => {
  console.error(
    "\n❌ INGESTION FAILED:"
  );

  console.error(error);

  process.exit(1);
});
