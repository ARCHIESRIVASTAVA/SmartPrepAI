import { Router } from "express";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { retrieveRelevantChunks } from "../rag/retrieve";

dotenv.config();

const router = Router();

console.log("🔥 SMARTPREP AI RAG + GOOGLE SEARCH ROUTE LOADED");

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY not found in .env");
}

const ai = new GoogleGenAI({ apiKey });

// Initial threshold; tune it using actual retrieval results.
const RELEVANCE_THRESHOLD = 0.62;

router.post("/", async (req, res) => {
  try {
    const { message } = req.body;

    console.log("=================================");
    console.log("🔥 NEW SMARTPREP CHAT REQUEST");
    console.log("Question:", message);

    // 1. Validate the question
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    // 2. Search the Pinecone knowledge base
    console.log("🔎 Searching Pinecone...");

    const retrievedChunks = await retrieveRelevantChunks(
      message.trim(),
      5
    );

    console.log("📚 Retrieved chunks:", retrievedChunks.length);

    // 3. Check whether the retrieved material is relevant enough
    const bestScore = retrievedChunks.reduce(
      (highest, chunk) => Math.max(highest, chunk.score),
      0
    );

    const useStudyMaterial =
      retrievedChunks.length > 0 &&
      bestScore >= RELEVANCE_THRESHOLD;

    console.log("🎯 Best retrieval score:", bestScore);
    console.log(
      "📖 Using study material:",
      useStudyMaterial
    );

    // 4. Prepare the study material context
    const context = retrievedChunks
      .map(
        (chunk, i) => `
SOURCE ${i + 1}
FILE: ${chunk.source}
CHUNK: ${chunk.chunkIndex}
RELEVANCE SCORE: ${chunk.score}

${chunk.text}
`
      )
      .join("\n--------------------\n");

    let interaction: any;
    let sourceType: "study_material" | "web" | "study_material_and_web";
    let reply = "";
    const webSources: { title: string; url: string }[] = [];

    // ==================================================
    // PATH A: Relevant information exists in the PDFs
    // ==================================================

    if (useStudyMaterial) {
      console.log("📚 Answering from study material...");

      const prompt = `
You are SmartPrep AI, a placement preparation assistant.

Answer the user's question using the retrieved study material.

RULES:
- Use the provided study material as your primary source.
- Explain concepts clearly and simply.
- Do not invent facts or claim unsupported information.
- If the material does not fully answer the question,
  clearly explain its limitations.
- Prefer C++ examples for programming questions.
- Do not use Python unless explicitly requested.
- Do not claim to have searched Google.
- Keep the answer relevant to the user's question.

================ STUDY MATERIAL ================

${context}

================ USER QUESTION ================

${message.trim()}

=================================================

Provide the final answer.
`;

      interaction = await ai.interactions.create({
        model: "gemini-3.6-flash",
        input: prompt,
      });

      reply = interaction.output_text || "";
      sourceType = "study_material";
    }

    // ==================================================
    // PATH B: Relevant information is not found
    // Search Google using Gemini's built-in tool.
    // ==================================================

    else {
      console.log(
        "🌐 Study material insufficient. Searching Google..."
      );

      const webPrompt = `
You are SmartPrep AI, an AI-powered placement preparation assistant.

The user's placement-preparation knowledge base did not
provide sufficiently relevant information for this question.

Answer the question by searching the web using the
Google Search tool.

RULES:
- Search the web before answering.
- Prefer reliable educational resources, official
  documentation, university resources, and reputable sources.
- Answer the user's actual question directly.
- Explain technical concepts in simple language.
- For programming questions, prefer C++ examples unless
  the user requests another language.
- Do not use Python unless explicitly requested.
- Do not invent facts, URLs, or search results.
- If reliable information cannot be found, say so.
- Cite the web sources used in the response.
- Do not claim that the answer came from the PDFs.
- Do not claim that a search succeeded if it did not.

USER QUESTION:
${message.trim()}

Provide a clear, useful answer based on your web research.
`;

      interaction = await ai.interactions.create({
        model: "gemini-3.6-flash",
        input: webPrompt,
        tools: [{ type: "google_search" }],
      });

      reply = interaction.output_text || "";

      sourceType = "web";

      // 5. Extract citations returned by the Interactions API
      // Google Search citations are supplied in model-output
      // annotations. The response structure can vary by SDK version.

      const steps: any[] = interaction.steps || [];

      for (const step of steps) {
        if (step.type !== "model_output") {
          continue;
        }

        const contents = Array.isArray(step.content)
          ? step.content
          : [];

        for (const content of contents) {
          const annotations = Array.isArray(content.annotations)
            ? content.annotations
            : [];

          for (const annotation of annotations) {
            const url = annotation.uri || annotation.url;
            const title =
              annotation.title ||
              (url ? new URL(url).hostname : "Web source");

            if (
              annotation.type === "url_citation" &&
              url &&
              /^https?:\/\//i.test(url)
            ) {
              const alreadyExists = webSources.some(
                (source) => source.url === url
              );

              if (!alreadyExists) {
                webSources.push({
                  title,
                  url,
                });
              }
            }
          }
        }
      }

      console.log("🌐 Web sources found:", webSources.length);
    }

    // 6. Prepare the study-material source list
    const sources = retrievedChunks.map((chunk) => ({
      source: chunk.source,
      chunkIndex: chunk.chunkIndex,
      score: chunk.score,
    }));

    console.log("✅ Answer generated");
    console.log("📌 Source type:", sourceType);
    console.log("=================================");

    // 7. Return the answer and source information
    return res.status(200).json({
      success: true,
      rag: useStudyMaterial,
      sourceType,
      retrievedChunks: retrievedChunks.length,
      reply,
      sources: useStudyMaterial ? sources : [],
      webSources,
    });
  } catch (error: any) {
    console.error("❌ SMARTPREP CHAT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error?.message || "Chat request failed",
    });
  }
});

export default router;