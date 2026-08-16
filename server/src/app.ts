 import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import chatRouter from "./routes/chat";
import resumeRouter from "./routes/resume";
import interviewRouter from "./routes/interview";
import mockInterviewRouter from "./routes/mockInterview";

dotenv.config();

const app = express();

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

// AI Chat
app.use("/chat", chatRouter);

// Resume Analyzer
app.use("/resume", resumeRouter);

// Interview Question Generator
app.use("/interview", interviewRouter);

// Mock Interview
app.use("/mock-interview", mockInterviewRouter);

export default app;

