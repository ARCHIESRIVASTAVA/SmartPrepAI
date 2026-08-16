import { Router } from "express";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const router = Router();

console.log("🚀 chat.ts loaded");

const apiKey = process.env.GEMINI_API_KEY;

console.log("API Key Loaded:", apiKey ? "YES" : "NO");

if (!apiKey) {
  throw new Error("❌ GEMINI_API_KEY not found in .env");
}

const ai = new GoogleGenAI({
  apiKey,
});

router.post("/", async (req, res) => {
  console.log("✅ CHAT ROUTE HIT");

  try {
    console.log("📩 Request Body:", req.body);

    const { message } = req.body;

    if (!message) {
      console.log("❌ No message received");

      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    console.log("🤖 Sending request to Gemini...");

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: message,
    });

    console.log("✅ Gemini Response:", response.text);

    return res.status(200).json({
      success: true,
      reply: response.text,
    });

  } catch (error: any) {

    console.log("❌ GEMINI ERROR START");
    console.error(error);
    console.log("❌ GEMINI ERROR END");

    return res.status(500).json({
      success: false,
      message: error?.message || "Unknown Error",
      error,
    });
  }
});

export default router;