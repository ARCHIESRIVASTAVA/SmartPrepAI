🚀 SmartPrep AI

AI-powered placement preparation platform for software engineering interviews.

SmartPrep AI helps students prepare for technical placements through AI-powered chat, RAG-based study assistance, resume analysis, and interview question generation.

🌐 Live Demo

Frontend: https://smart-prep-ai-gamma.vercel.app

Backend: https://smartprepai-5ujb.onrender.com

GitHub: https://github.com/ARCHIESRIVASTAVA/SmartPrepAI

✨ Features

🤖 AI Placement Assistant

Ask questions about DSA, OOP, DBMS, Operating Systems, Computer Networks, SQL and interviews.

Uses a RAG pipeline to retrieve relevant information from placement study material.

Generates clear, beginner-friendly answers using Gemini.

Displays retrieved knowledge-base sources and similarity scores.

📚 Retrieval-Augmented Generation (RAG)

12 placement preparation PDFs used as the knowledge base.

PDFs are parsed and split into overlapping chunks.

Each chunk is converted into a vector embedding.

Embeddings are stored in Pinecone.

User queries are embedded and matched against the knowledge base using semantic similarity.

Top relevant chunks are passed to Gemini as context before generating the answer.

Current knowledge base contains 533 chunks.

📄 AI Resume Analyzer

Upload a PDF resume.

Sends the resume to the backend for AI analysis.

Provides feedback on strengths, gaps and ATS-oriented improvements.

🎯 AI Interview Generator

Select a technical topic.

Select difficulty.

Select number of questions.

Generates placement-focused interview questions using Gemini.

🎤 Mock Interview

Supports an AI-powered mock interview workflow through the backend.

🏗️ System Architecture

                         ┌──────────────────────┐
                         │    SmartPrep AI       │
                         │   React Frontend      │
                         │       Vercel          │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │    Node + Express     │
                         │       Backend         │
                         │       Render          │
                         └──────────┬───────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
              ▼                     ▼                     ▼
        ┌───────────┐        ┌─────────────┐       ┌──────────────┐
        │ AI Chat   │        │ Resume AI   │       │ Interview AI │
        └─────┬─────┘        └─────────────┘       └──────────────┘
              │
              ▼
       ┌─────────────────┐
       │ Query Embedding │
       │ Gemini Embedding│
       └────────┬────────┘
                │
                ▼
       ┌─────────────────┐
       │    Pinecone     │
       │ Vector Database │
       └────────┬────────┘
                │
                ▼
       ┌─────────────────┐
       │ Top-K Relevant  │
       │ Knowledge Chunks│
       └────────┬────────┘
                │
                ▼
       ┌─────────────────┐
       │      Gemini     │
       │ 3.6 Flash       │
       └────────┬────────┘
                │
                ▼
       ┌─────────────────┐
       │ Grounded Answer │
       └─────────────────┘

🔄 RAG Workflow

PLACEMENT PDFs
      │
      ▼
PDF Text Extraction
      │
      ▼
Text Chunking
      │
      ▼
Gemini Embeddings
      │
      ▼
Pinecone Vector Database
      │
      │
      │          USER QUESTION
      │                 │
      │                 ▼
      │          Query Embedding
      │                 │
      └──────────► Semantic Search
                        │
                        ▼
                 Top-K Chunks
                        │
                        ▼
                 Context + Query
                        │
                        ▼
                    Gemini
                        │
                        ▼
                 Final Answer

🧠 Why RAG?

A normal LLM request looks like:

User Question → LLM → Answer

SmartPrep AI uses:

User Question
      ↓
Retrieve relevant study material
      ↓
Provide retrieved context to LLM
      ↓
Generate grounded answer

This helps the assistant answer questions using the project's specific placement-preparation material instead of relying only on the model's general knowledge.

🛠️ Tech Stack

Frontend

React

TypeScript

Vite

CSS

Backend

Node.js

Express.js

TypeScript

Multer

pdf-parse

dotenv

CORS

AI

Google Gemini API

Gemini 3.6 Flash

Gemini Embedding

RAG / Vector Database

Pinecone

Cosine similarity

Semantic search

Deployment

Vercel — Frontend

Render — Backend

GitHub — Source control

📁 Project Structure

SmartPrepAI/
│
├── client/
│   └── src/
│       ├── App.tsx
│       ├── App.css
│       ├── index.css
│       └── main.tsx
│
├── server/
│   ├── knowledge-base/
│   │   └── placement preparation PDFs
│   │
│   └── src/
│       ├── app.ts
│       ├── server.ts
│       │
│       ├── routes/
│       │   ├── chat.ts
│       │   ├── interview.ts
│       │   ├── mockInterview.ts
│       │   └── resume.ts
│       │
│       └── rag/
│           ├── embedding.ts
│           ├── ingest.ts
│           ├── pinecone.ts
│           └── retrieve.ts
│
└── .gitignore

🔌 API Endpoints

Chat

POST /chat

Example request:

{
  "message": "Explain polymorphism in OOP"
}

The RAG pipeline retrieves relevant chunks before generating the response.

Resume Analysis

POST /resume/analyze

Accepts a PDF resume using multipart form data.

Interview Generator

POST /interview/generate

Example request:

{
  "topic": "DSA",
  "difficulty": "Medium",
  "count": 5
}

Mock Interview

POST /mock-interview/start

Starts an AI-powered mock interview session.

⚙️ Local Setup

1. Clone the repository

git clone https://github.com/ARCHIESRIVASTAVA/SmartPrepAI.git
cd SmartPrepAI

2. Install frontend dependencies

cd client
npm install

3. Install backend dependencies

Open another terminal:

cd server
npm install

4. Configure environment variables

Create:

server/.env

Add:

GEMINI_API_KEY=your_gemini_api_key
PINECONE_API_KEY=your_pinecone_api_key

Never commit .env to GitHub.

5. Start the backend

From:

SmartPrepAI/server

run:

npm run dev

The backend runs locally on:

http://localhost:5000

6. Start the frontend

From:

SmartPrepAI/client

run:

npm run dev

Open the local Vite URL shown in the terminal.

📦 RAG Knowledge Base

The knowledge base contains placement preparation material covering topics including:

Data Structures & Algorithms

Object-Oriented Programming

DBMS

SQL

Operating Systems

Computer Networks

RAG

The ingestion pipeline:

Reads PDFs from server/knowledge-base/

Extracts PDF text

Splits text into chunks

Generates embeddings

Stores vectors and metadata in Pinecone

Retrieves the most relevant chunks during user queries

🔐 Environment Variables

Variable

Purpose

GEMINI_API_KEY

Gemini AI and embedding API access

PINECONE_API_KEY

Pinecone vector database access

Secrets are stored through environment variables and are not included in the repository.

🚀 Deployment

Frontend

The React frontend is deployed on Vercel.

Production URL:

https://smart-prep-ai-gamma.vercel.app

Backend

The Node/Express backend is deployed on Render.

Production URL:

https://smartprepai-5ujb.onrender.com

The backend is configured to listen on 0.0.0.0 and uses Render's PORT environment variable in production.

🎯 Key Technical Highlights

Built the application using TypeScript/JavaScript.

Implemented an end-to-end RAG pipeline.

Used Gemini embeddings to represent study-material chunks as vectors.

Used Pinecone for vector storage and semantic retrieval.

Implemented top-K retrieval using cosine similarity.

Passed retrieved context to Gemini to produce grounded answers.

Built REST APIs using Express.

Integrated PDF upload and text extraction for resume analysis.

Deployed frontend and backend independently using Vercel and Render.

📸 Screenshots

Add screenshots of:

SmartPrep AI homepage

AI Placement Assistant response

RAG sources displayed below an answer

Resume Analyzer

Interview Generator

Recommended folder:

screenshots/
├── home.png
├── ai-chat.png
├── rag-sources.png
├── resume-analyzer.png
└── interview-generator.png

🔮 Future Improvements

Authentication and user profiles

Persistent chat history

Personalized interview sessions

Hybrid search combining semantic and keyword retrieval

Reranking retrieved chunks

RAG evaluation metrics

Streaming AI responses

Interview performance analytics

👨‍💻 Author

Archie Srivastava

GitHub: https://github.com/ARCHIESRIVASTAVA

⭐ Project Summary

SmartPrep AI combines Generative AI, Retrieval-Augmented Generation, vector search, full-stack development, and cloud deployment into a practical placement-preparation platform.

It demonstrates an end-to-end workflow from:

User → React → Express → Retrieval → Pinecone → Gemini → Grounded Response