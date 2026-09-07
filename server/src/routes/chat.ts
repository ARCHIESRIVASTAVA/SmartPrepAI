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

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        success: false,
        message: "Message is required",
      });
    }

    console.log("🤖 Sending request to Gemini 3.6 Flash...");

    const interaction = await ai.interactions.create({
      model: "gemini-3.6-flash",
      input: message,
    });

    const reply = interaction.output_text;

    console.log("✅ Gemini Response:", reply);

    return res.status(200).json({
      success: true,
      reply,
    });
  } catch (error: any) {
    console.error("❌ GEMINI ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error?.message || "Gemini API request failed",
    });
  }
});

export default router;