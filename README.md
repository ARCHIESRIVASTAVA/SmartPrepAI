# 🚀 SmartPrep AI

> AI-powered placement preparation platform designed to help students prepare smarter for software engineering placements.

SmartPrep AI combines AI-powered chat, resume analysis, interview question generation, and mock interview practice into one platform.

---

## ✨ Features

### 🤖 AI Placement Assistant
Ask questions related to:
- Data Structures & Algorithms
- DBMS
- Operating Systems
- OOP
- Computer Networks
- Software Engineering Interviews

Get instant AI-powered explanations and preparation guidance.

### 📄 AI Resume Analyzer
Upload your resume in PDF format and receive:
- ATS score
- Resume strengths
- Missing skills
- Improvement suggestions
- Suitable software engineering roles
- Important interview preparation topics

### 🎯 Interview Question Generator
Generate placement interview questions based on:
- Topic
- Difficulty
- Number of questions

Supports technical topics such as DSA and other software engineering subjects.

### 🎤 Mock Interview
Start an AI-powered mock interview by selecting a topic and difficulty level.

The system generates interview questions designed to simulate a technical interview experience.

---

## 🏗️ Project Architecture

```text
SmartPrepAI/
│
├── client/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── server/
│   ├── src/
│   │   ├── app.ts
│   │   ├── server.ts
│   │   └── routes/
│   │       ├── chat.ts
│   │       ├── resume.ts
│   │       ├── interview.ts
│   │       └── mockInterview.ts
│   ├── package.json
│   └── tsconfig.json
│
├── .gitignore
└── README.md