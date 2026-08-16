import { Router } from "express";
import multer from "multer";
import dotenv from "dotenv";
import { PDFParse } from "pdf-parse";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("❌ GEMINI_API_KEY not found in .env");
}

const ai = new GoogleGenAI({
  apiKey,
});

router.post("/analyze", upload.single("resume"), async (req, res) => {
  console.log("📄 RESUME ANALYZE ROUTE HIT");

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a PDF resume",
      });
    }

    console.log("📄 File received:", req.file.originalname);

    const parser = new PDFParse({
      data: req.file.buffer,
    });

    const result = await parser.getText();

    await parser.destroy();

    const resumeText = result.text;

    if (!resumeText || !resumeText.trim()) {
      return res.status(400).json({
        success: false,
        message: "Could not extract text from the PDF",
      });
    }

    console.log("📝 Resume text extracted");
    console.log("🤖 Sending resume to Gemini...");

    const prompt = `
You are an expert ATS resume analyzer and placement mentor.

Analyze the following resume for a software engineering candidate.

Give the following:

1. ATS Score out of 100
2. Top strengths
3. Missing or weak skills
4. Specific resume improvements
5. Suitable software engineering roles
6. Top 5 interview topics the candidate should prepare

Keep the response concise, practical, and placement-focused.

RESUME:
${resumeText}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
    });

    console.log("✅ Gemini resume analysis completed");

    return res.status(200).json({
      success: true,
      filename: req.file.originalname,
      analysis: response.text,
    });
  } catch (error: any) {
    console.error("❌ RESUME ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error?.message || "Resume analysis failed",
    });
  }
});

export default router;
