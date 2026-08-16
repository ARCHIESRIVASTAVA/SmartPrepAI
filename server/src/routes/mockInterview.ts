import { Router } from "express";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const router = Router();

console.log("🎤 mockInterview.ts loaded");

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("❌ GEMINI_API_KEY not found in .env");
}

const ai = new GoogleGenAI({
  apiKey,
});

/*
  START MOCK INTERVIEW
  Generates the first interview question
*/

router.post("/start", async (req, res) => {
  try {
    const {
      topic = "DSA",
      difficulty = "Medium",
    } = req.body;

    const prompt = `
You are conducting a technical software engineering mock interview.

Topic: ${topic}
Difficulty: ${difficulty}

Ask ONE technical interview question.

Rules:
- The question should be suitable for a software engineering placement.
- Do not give the answer.
- Do not give hints.
- Keep it clear and concise.
- Return only the interview question.
`;

    console.log("🎤 Starting mock interview...");

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
    });

    return res.status(200).json({
      success: true,
      question: response.text,
      topic,
      difficulty,
    });
  } catch (error: any) {
    console.error("❌ MOCK INTERVIEW START ERROR:", error);

    return res.status(500).json({
      success: false,
      message:
        error?.message || "Failed to start mock interview",
    });
  }
});


/*
  EVALUATE ANSWER
*/

router.post("/evaluate", async (req, res) => {
  try {
    const {
      topic = "DSA",
      question,
      answer,
    } = req.body;

    if (!question || !answer) {
      return res.status(400).json({
        success: false,
        message: "Question and answer are required",
      });
    }

    const prompt = `
You are an expert software engineering interviewer.

Evaluate the candidate's answer to the interview question below.

Topic: ${topic}

QUESTION:
${question}

CANDIDATE ANSWER:
${answer}

Give the evaluation in this exact format:

Score: X/10

What you did well:
- Point 1
- Point 2

What you missed:
- Point 1
- Point 2

How to improve:
- Point 1
- Point 2

Ideal approach:
Give a concise explanation of what a strong answer should contain.

Keep the feedback practical and suitable for a placement interview.
`;

    console.log("📊 Evaluating mock interview answer...");

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
    });

    return res.status(200).json({
      success: true,
      evaluation: response.text,
    });
  } catch (error: any) {
    console.error("❌ MOCK INTERVIEW EVALUATION ERROR:", error);

    return res.status(500).json({
      success: false,
      message:
        error?.message || "Failed to evaluate answer",
    });
  }
});


export default router;