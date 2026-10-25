🚀 SmartPrep AI

AI-powered placement preparation platform for software engineering interviews.

SmartPrep AI helps students prepare for technical placements through AI-powered chat, RAG-based study assistance, resume analysis, interview question generation, and scored mock interviews.

🌐 Live Demo

Frontend: https://smart-prep-ai-gamma.vercel.app

Backend: https://smartprepai-5ujb.onrender.com

GitHub: https://github.com/ARCHIESRIVASTAVA/SmartPrepAI

✨ Features

🎮 Game-style interface

Cinematic title screen that wakes the server while it loads, then a stage-select map for the four tools. Arrow keys, 1-4, Enter and Esc all work, as do mouse and touch.

🏆 Progress and personalisation

XP, levels, a daily streak and stars on each stage. The mock interview boss unlocks after you clear the first three stages.

A skill radar shows your average mock-interview score per topic, and the app suggests your weakest topic.

Mock interviews can follow a service-company, product-company or startup style, and can ask about your own resume (from your last Resume scan).

Answer by voice and have questions read aloud (browser speech, best in Chrome and Edge).

Download a share card with your level and topic scores.

Pip, a study buddy in the sidebar, reacts as you work: it greets you, nudges your streak, cheers correct answers and encourages you after misses.

XP pop-ups, level-up and daily-goal celebrations (with confetti), and a daily goal ring.

A downloadable daily calendar reminder (.ics) so your streak survives even when the tab is closed.

Progress is stored in the browser (localStorage), not on the server.

🤖 AI Placement Assistant

Ask questions about DSA, OOP, DBMS, Operating Systems, Computer Networks, SQL and interviews.

Uses a RAG pipeline to retrieve relevant information from placement study material.

Generates clear, beginner-friendly answers using Gemini.

Streams the answer as it is generated instead of making the user wait for the full response.

Displays retrieved knowledge-base sources and similarity scores, with a "Why this matched" excerpt that highlights the words shared with your question.

Falls back to Google Search through Gemini when the study material does not cover a question, and shows the web links it used.

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

🃏 Flashcards, Slides and Quiz blitz

Flashcards: AI-built decks on any topic. Flip, mark "knew it" or "missed it". Missed cards come back once in the session and are saved for spaced repetition: they return after 1, 3, 7 and 14 days as you get them right, and count as mastered after that (saved in the browser).

Slides: a 7-slide study deck on any topic, with keyboard navigation and a PowerPoint (.pptx) download.

Quiz blitz: 10 timed multiple-choice questions, 3 lives, streak and speed bonuses. Results feed your topic skill radar.

🎤 Mock Interview

Pick a topic and difficulty, then answer one question at a time.

Each answer gets a score out of 10 with feedback on what you did well, what you missed, and how to improve.

Questions do not repeat within a session. Skip a question or end the interview at any time.

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
│       ├── App.tsx            (screens, navigation, server status)
│       ├── types.ts
│       ├── stages.css         (title and stage select)
│       ├── api.ts             (API URL, streaming chat client)
│       ├── constants.ts
│       ├── main.tsx
│       ├── App.css
│       ├── index.css          (design tokens)
│       ├── views/
│       │   ├── TitleScreen.tsx
│       │   ├── StageSelect.tsx
│       │   ├── AskView.tsx
│       │   ├── FlashcardsView.tsx
│       │   ├── SlidesView.tsx
│       │   ├── QuizView.tsx
│       │   ├── ResumeView.tsx
│       │   ├── InterviewView.tsx
│       │   └── MockInterviewView.tsx
│       ├── components/
│       │   ├── CodeBlock.tsx
│       │   ├── CopyButton.tsx
│       │   ├── ErrorNote.tsx
│       │   ├── ResultPanel.tsx
│       │   └── Segmented.tsx
│       └── lib/
│           ├── format.tsx     (renders AI answers)
│           ├── mock.ts        (score parsing, error messages)
│           └── sources.ts
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
│       │   ├── study.ts
│       │   ├── studyParse.ts
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

POST /chat/stream

Same request as POST /chat, but the answer is sent as Server-Sent Events:

meta: where the answer comes from (study notes or the web) and the matched passages

token: a piece of the answer

done: the web links used, if any

error: something went wrong, with a message

The frontend uses this endpoint and falls back to POST /chat if streaming fails.

Resume Analysis

POST /resume/analyze

Accepts a PDF resume using multipart form data.

Interview Generator

POST /study/flashcards, /study/slides, /study/quiz

Each takes a topic (and count or difficulty where relevant) and returns validated JSON generated by Gemini: cards, slides or multiple-choice questions.

POST /interview/generate

Example request:

{
  "topic": "DSA",
  "difficulty": "Medium",
  "count": 5
}

Mock Interview

POST /mock-interview/start

Example request:

{
  "topic": "DSA",
  "difficulty": "Medium",
  "previousQuestions": ["What is a hash map?"]
}

Returns one interview question. previousQuestions is optional and stops the same question coming up twice in a session.

POST /mock-interview/evaluate

Example request:

{
  "topic": "DSA",
  "question": "What is a hash map?",
  "answer": "A hash map stores key-value pairs using a hash function..."
}

Returns a score out of 10 with feedback on what the answer did well, what it missed, and how to improve.

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

http://localhost:10000

(or the port set in the PORT environment variable)

6. Start the frontend

From:

SmartPrepAI/client

run:

npm run dev

Open the local Vite URL shown in the terminal.

Note: the frontend calls the deployed backend by default. The address is API_URL in client/src/api.ts. To test against your local backend, change it to http://localhost:10000.

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

Streamed model output to the browser with Server-Sent Events, with an automatic fallback to a standard request if streaming fails.

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

Interview performance analytics

👨‍💻 Author

Archie Srivastava

GitHub: https://github.com/ARCHIESRIVASTAVA

⭐ Project Summary

SmartPrep AI combines Generative AI, Retrieval-Augmented Generation, vector search, full-stack development, and cloud deployment into a practical placement-preparation platform.

It demonstrates an end-to-end workflow from:

User → React → Express → Retrieval → Pinecone → Gemini → Grounded Response