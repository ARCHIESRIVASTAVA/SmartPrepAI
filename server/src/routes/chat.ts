import { Router } from "express";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import {
  retrieveRelevantChunks,
  type RetrievedChunk,
} from "../rag/retrieve";

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

const MODEL = "gemini-3.6-flash";

function buildContext(chunks: RetrievedChunk[]): string {
  return chunks
    .map(
      (chunk, index) => `
SOURCE ${index + 1}
FILE: ${chunk.source}
CHUNK: ${chunk.chunkIndex}

${chunk.text}
`
    )
    .join("\n--------------------\n");
}

function buildStudyPrompt(context: string, question: string): string {
  return `
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
}

function buildWebPrompt(question: string): string {
  return `
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
}

/** Add URL citations from model annotations to the list, skipping duplicates. */
function collectUrlCitations(
  annotations: any[],
  webSources: WebSource[]
): void {
  for (const annotation of annotations) {
    const url = annotation?.url || annotation?.uri;

    if (
      !url ||
      annotation.type !== "url_citation" ||
      !/^https?:\/\//i.test(url)
    ) {
      continue;
    }

    let title = annotation.title || "Web source";

    try {
      title = annotation.title || new URL(url).hostname;
    } catch {
      // Keep the fallback title.
    }

    if (!webSources.some((source) => source.url === url)) {
      webSources.push({ title, url });
    }
  }
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

      const prompt = buildStudyPrompt(context, question);

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

      const webPrompt = buildWebPrompt(question);

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

// ================================================
// STREAMING CHAT (Server-Sent Events)
//
// Same retrieval and prompts as POST /chat, but the answer
// is sent token-by-token so the user sees text immediately.
//
// Events:
//   meta   { sourceType, rag, sources }   after retrieval
//   token  { text }                       for each piece of text
//   done   { webSources, retrievedChunks } when finished
//   error  { error, message }             if something fails
// ================================================

router.post("/stream", async (req, res) => {
  const { message } = req.body ?? {};

  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid question.",
    });
  }

  const question = message.trim();

  res.status(200);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  // Stop proxies (Render, nginx) from buffering the stream.
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  // Open the stream right away so the browser knows we're alive.
  res.write(": connected\n\n");

  let clientGone = false;
  res.on("close", () => {
    clientGone = true;
  });

  const send = (event: string, data: unknown) => {
    if (!clientGone) {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    }
  };

  try {
    console.log("🔥 NEW SMARTPREP STREAM REQUEST:", question);

    const retrievedChunks = await retrieveRelevantChunks(question, 5);

    const bestScore = retrievedChunks.reduce(
      (highest, chunk) => Math.max(highest, chunk.score),
      0
    );

    const useStudyMaterial =
      retrievedChunks.length > 0 && bestScore >= RELEVANCE_THRESHOLD;

    const sourceType: SourceType = useStudyMaterial
      ? "study_material"
      : "web";

    console.log("🎯 Best retrieval score:", bestScore, "| source:", sourceType);

    send("meta", {
      sourceType,
      rag: useStudyMaterial,
      sources: useStudyMaterial
        ? retrievedChunks.map((chunk) => ({
            source: chunk.source,
            chunkIndex: chunk.chunkIndex,
            score: chunk.score,
          }))
        : [],
    });

    const stream = useStudyMaterial
      ? await ai.interactions.create({
          model: MODEL,
          input: buildStudyPrompt(buildContext(retrievedChunks), question),
          stream: true,
        })
      : await ai.interactions.create({
          model: MODEL,
          input: buildWebPrompt(question),
          tools: [{ type: "google_search" }],
          stream: true,
        });

    let fullText = "";
    const webSources: WebSource[] = [];

    for await (const event of stream) {
      if (clientGone) {
        break;
      }

      if (event.event_type === "step.delta") {
        const delta: any = event.delta;

        if (delta?.type === "text" && typeof delta.text === "string") {
          fullText += delta.text;
          send("token", { text: delta.text });
        } else if (
          delta?.type === "text_annotation_delta" &&
          Array.isArray(delta.annotations)
        ) {
          collectUrlCitations(delta.annotations, webSources);
        }
      } else if (event.event_type === "error") {
        throw new Error(
          (event as any).error?.message || "Gemini stream error"
        );
      }
    }

    if (clientGone) {
      return;
    }

    if (!fullText.trim()) {
      throw new Error("Gemini returned an empty streamed response.");
    }

    send("done", {
      webSources,
      retrievedChunks: retrievedChunks.length,
    });

    console.log("✅ Streamed answer complete:", fullText.length, "chars");
    res.end();
  } catch (error: any) {
    const status =
      error?.status ?? error?.statusCode ?? error?.response?.status;

    console.error("❌ SMARTPREP STREAM ERROR:", {
      message: error?.message,
      status,
      code: error?.code,
    });

    if (status === 429) {
      send("error", {
        error: "QUOTA_EXCEEDED",
        message:
          "The AI service quota or rate limit has been reached. Please try again later.",
      });
    } else {
      send("error", {
        error: "CHAT_ERROR",
        message:
          "SmartPrep AI could not process your request. Please try again.",
      });
    }

    res.end();
  }
});

export default router;

