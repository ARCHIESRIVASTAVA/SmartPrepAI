import { Router } from "express";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

import { retrieveRelevantChunks } from "../rag/retrieve";

dotenv.config();

const router = Router();

console.log("🔥🔥🔥 NEW RAG CHAT ROUTE LOADED 🔥🔥🔥");

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY not found in .env");
}

const ai = new GoogleGenAI({
  apiKey,
});

router.post("/", async (req, res) => {
  try {
    const { message } = req.body;

    console.log("=================================");
    console.log("🔥 NEW RAG CHAT ROUTE HIT");
    console.log("Question:", message);

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    // 1️⃣ Retrieve relevant chunks from Pinecone
    console.log("🔎 Retrieving knowledge...");

    const retrievedChunks =
      await retrieveRelevantChunks(message, 5);

    console.log(
      "📚 Retrieved:",
      retrievedChunks.length
    );

    // 2️⃣ Create context
    const context = retrievedChunks
      .map(
        (chunk, i) => `
SOURCE ${i + 1}
FILE: ${chunk.source}
CHUNK: ${chunk.chunkIndex}

${chunk.text}
`
      )
      .join("\n--------------------\n");

    // 3️⃣ Ask Gemini using retrieved context
    console.log("🤖 Calling Gemini...");

    const prompt = `
You are SmartPrep AI, a placement preparation assistant.

Answer the user's question using the study material
provided below.

Rules:
- Use the retrieved study material as the primary source.
- Explain concepts clearly and simply.
- Do not invent information.
- If the material does not contain enough information,
  say that clearly.
- Prefer C++ examples for programming questions.
- Do not use Python unless explicitly requested.

================ STUDY MATERIAL ================

${context}

================ USER QUESTION ================

${message}

=================================================

Give the final answer now.
`;

    const interaction =
      await ai.interactions.create({
        model: "gemini-3.6-flash",
        input: prompt,
      });

    const reply = interaction.output_text;

    // 4️⃣ Prepare sources
    const sources = retrievedChunks.map(
      (chunk) => ({
        source: chunk.source,
        chunkIndex: chunk.chunkIndex,
        score: chunk.score,
      })
    );

    console.log("✅ Answer generated");
    console.log("📚 Sources:", sources);
    console.log("=================================");

    // 5️⃣ Return RAG response
    return res.status(200).json({
      success: true,
      rag: true,
      retrievedChunks: retrievedChunks.length,
      reply,
      sources,
    });

  } catch (error: any) {
    console.error("❌ RAG ERROR:", error);

    return res.status(500).json({
      success: false,
      rag: true,
      message:
        error?.message ||
        "RAG request failed",
    });
  }
});

export default router;