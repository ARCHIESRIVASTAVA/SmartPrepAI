import { Router } from "express";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const router = Router();

console.log("🚀 interview.ts loaded");

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("❌ GEMINI_API_KEY not found in .env");
}

console.log("✅ Interview API Key Loaded: YES");

const ai = new GoogleGenAI({
  apiKey,
});

// Generate Interview Questions
router.post("/generate", async (req, res) => {
  console.log("🎯 /interview/generate route hit");

  try {
    const {
      topic = "DSA",
      difficulty = "Medium",
      count = 5,
    } = req.body;

    console.log("Topic:", topic);
    console.log("Difficulty:", difficulty);
    console.log("Count:", count);

    const prompt = `
You are an expert software engineering interviewer.

Generate ${count} placement interview questions.

Topic: ${topic}
Difficulty: ${difficulty}

Requirements:
- Questions should be suitable for software engineering placements.
- Keep questions clear and practical.
- Mix conceptual and problem-solving questions where appropriate.
- Do not provide answers.
- Number the questions from 1 to ${count}.
- Focus on questions commonly asked in technical interviews.

Return only the questions.
`;

    console.log("🤖 Sending request to Gemini...");

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
    });

    console.log("✅ Interview questions generated");

    return res.status(200).json({
      success: true,
      topic,
      difficulty,
      count,
      questions: response.text,
    });
  } catch (error: any) {
    console.error("❌ INTERVIEW ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error?.message || "Failed to generate questions",
    });
  }
});

export default router;