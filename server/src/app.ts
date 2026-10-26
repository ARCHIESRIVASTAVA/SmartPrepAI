 import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import chatRouter from "./routes/chat";
import resumeRouter from "./routes/resume";
import interviewRouter from "./routes/interview";
import mockInterviewRouter from "./routes/mockInterview";
import studyRouter from "./routes/study";
import tutorRouter from "./routes/tutor";
import { aiLimiter } from "./lib/gemini";

dotenv.config();

const app = express();

// Render sits behind a proxy; trust it so req.ip is the real visitor.
app.set("trust proxy", 1);

// Middleware
app.use(cors());
app.use(express.json());

// Health Check
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "🚀 SmartPrep AI Backend Running",
  });
});

// Every route below calls Gemini, so each visitor gets a fair share.
for (const path of ["/chat", "/resume", "/interview", "/mock-interview", "/study", "/tutor"]) {
  app.use(path, aiLimiter);
}

// AI Chat
app.use("/chat", chatRouter);

// Resume Analyzer
app.use("/resume", resumeRouter);

// Interview Question Generator
app.use("/interview", interviewRouter);

// Mock Interview
app.use("/mock-interview", mockInterviewRouter);

// Flashcards, slides and quiz
app.use("/study", studyRouter);

// Pip, the study-buddy chatbot
app.use("/tutor", tutorRouter);

export default app;

