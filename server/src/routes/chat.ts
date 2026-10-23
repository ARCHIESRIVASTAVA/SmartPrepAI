import { Router } from "express";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { retrieveRelevantChunks } from "../rag/retrieve";

dotenv.config();

const router = Router();

console.log("🚀 SMARTPREP AI RAG + GOOGLE SEARCH ROUTE LOADED");

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY not found in .env");
}

const ai = new GoogleGenAI({ apiKey });

// Starting threshold; tune this using actual retrieval tests.
const RELEVANCE_THRESHOLD = 0.62;

type SourceType = "study_material" | "web";

interface WebSource {
  title: string;
  url: string;
}

router.post("/", async (req, res) => {
  try {
    const { message } = req.body;

    console.log("====================================");
    console.log("🔥 NEW SMARTPREP CHAT REQUEST");
    console.log("Question:", message);

    // 1. Validate the request.
    if (
      typeof message !== "string" ||
      !message.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid question.",
      });
    }

    const question = message.trim();

    // 2. Retrieve relevant chunks from Pinecone.
    console.log("🔎 Searching Pinecone...");

    const retrievedChunks = await retrieveRelevantChunks(
      question,
      5
    );

    console.log(
      "📚 Retrieved chunks:",
      retrievedChunks.length
    );

    // 3. Determine whether the retrieved material
    // is relevant enough to use as the primary source.
    const bestScore = retrievedChunks.reduce(
      (highest, chunk) =>
        Math.max(highest, chunk.score),
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

    // 4. Prepare the retrieved context.
    const context = retrievedChunks
      .map(
        (chunk, index) => `
SOURCE ${index + 1}
FILE: ${chunk.source}
CHUNK: ${chunk.chunkIndex}

${chunk.text}
`
      )
      .join("\n--------------------\n");

    let reply = "";
    let sourceType: SourceType;

    const webSources: WebSource[] = [];

    // ================================================
    // PATH A: Answer using relevant study material.
    // ================================================

    if (useStudyMaterial) {
      console.log("📚 Generating answer from study material...");

      const prompt = `
You are SmartPrep AI, a placement preparation assistant.

Answer the user's question using the study material
provided below.

RULES:
- Use the retrieved study material as your primary source.
- Explain concepts clearly and simply.
- Do not invent facts or unsupported information.
- If the material does not fully answer the question,
  clearly explain its limitations.
- Prefer C++ examples for programming questions.
- Do not use Python unless explicitly requested.
- Do not claim to have searched the web.
- Answer the user's actual question directly.

================ STUDY MATERIAL ================

${context}

================ USER QUESTION ================

${question}

================================================

Provide the final answer.
`;

      const interaction = await ai.interactions.create({
        model: "gemini-3.6-flash",
        input: prompt,
      });

      reply = interaction.output_text || "";
      sourceType = "study_material";

      if (!reply.trim()) {
        throw new Error(
          "Gemini returned an empty response for study material."
        );
      }
    }

    // ================================================
    // PATH B: Search Google when relevant study
    // material is unavailable.
    // ================================================

    else {
      console.log(
        "🌐 Study material insufficient. Searching Google..."
      );

      const webPrompt = `
You are SmartPrep AI, an AI-powered placement preparation assistant.

The placement-preparation knowledge base did not return
sufficiently relevant material for this question.

Use Google Search to research and answer the question.

RULES:
- Use the Google Search tool before answering.
- Prefer official documentation, reputable educational
  resources, universities, and reliable technical sources.
- Explain concepts clearly and simply.
- For programming questions, prefer C++ examples unless
  the user requests another language.
- Do not use Python unless explicitly requested.
- Do not invent facts or fabricate sources.
- Answer the user's actual question directly.
- If reliable information cannot be found, say so.
- Do not claim the answer came from the study PDFs.
- Use the web citations supplied by the search tool.
- Keep the answer relevant to placement preparation.

USER QUESTION:
${question}

Provide a clear answer based on your web research.
`;

      const interaction = await ai.interactions.create({
        model: "gemini-3.6-flash",
        input: webPrompt,
        tools: [{ type: "google_search" }],
      });

      reply = interaction.output_text || "";
      sourceType = "web";

      if (!reply.trim()) {
        throw new Error(
          "Gemini returned an empty response after the web search request."
        );
      }

      // 5. Extract URL citations from model-output annotations.
      // The precise response structure depends on the SDK/API version.

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
            const url =
              annotation.url ||
              annotation.uri;

            if (
              !url ||
              annotation.type !== "url_citation" ||
              !/^https?:\/\//i.test(url)
            ) {
              continue;
            }

            let title = annotation.title || "Web source";

            try {
              title =
                annotation.title ||
                new URL(url).hostname;
            } catch {
              // Keep the fallback title.
            }

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

      console.log(
        "🌐 Extracted web citations:",
        webSources.length
      );
    }

    // 6. Prepare the PDF source information.
    const sources = retrievedChunks.map((chunk) => ({
      source: chunk.source,
      chunkIndex: chunk.chunkIndex,
      score: chunk.score,
    }));

    console.log("✅ Answer generated");
    console.log("📌 Source type:", sourceType);
    console.log("====================================");

    // 7. Return the response to the frontend.
    return res.status(200).json({
      success: true,
      rag: sourceType === "study_material",
      sourceType,
      retrievedChunks: retrievedChunks.length,
      reply,
      sources:
        sourceType === "study_material"
          ? sources
          : [],
      webSources,
    });
  } catch (error: any) {
    // 8. Log useful error details without exposing secrets.
    const status =
      error?.status ??
      error?.statusCode ??
      error?.response?.status;

    console.error("❌ SMARTPREP CHAT ERROR:", {
      message: error?.message,
      status,
      code: error?.code,
      details: error?.errorDetails,
    });

    // Handle quota and rate-limit errors separately.
    if (status === 429) {
      return res.status(429).json({
        success: false,
        error: "QUOTA_EXCEEDED",
        message:
          "The AI service quota or rate limit has been reached. Please try again later.",
      });
    }

    return res.status(500).json({
      success: false,
      error: "CHAT_ERROR",
      message:
        "SmartPrep AI could not process your request. Please try again.",
    });
  }
});

export default router;

