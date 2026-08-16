import { useState } from "react";
import "./App.css";

const API_URL = "https://smartprepai-5ujb.onrender.com";

function App() {
  // ---------------- CHAT ----------------
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // ---------------- RESUME ----------------
  const [resume, setResume] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState("");
  const [resumeLoading, setResumeLoading] = useState(false);

  // ---------------- INTERVIEW ----------------
  const [topic, setTopic] = useState("DSA");
  const [difficulty, setDifficulty] = useState("Medium");
  const [count, setCount] = useState(5);
  const [questions, setQuestions] = useState("");
  const [interviewLoading, setInterviewLoading] = useState(false);

  // ---------------- CHAT ----------------
  const sendMessage = async () => {
    if (!message.trim()) return;

    setChatLoading(true);
    setReply("");

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setReply(data.reply);
      } else {
        setReply(data.message || "Something went wrong.");
      }
    } catch (error) {
      console.error(error);
      setReply("Unable to connect to SmartPrep AI.");
    } finally {
      setChatLoading(false);
    }
  };

  // ---------------- RESUME ----------------
  const analyzeResume = async () => {
    if (!resume) return;

    setResumeLoading(true);
    setAnalysis("");

    try {
      const formData = new FormData();
      formData.append("resume", resume);

      const response = await fetch(`${API_URL}/resume/analyze`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setAnalysis(data.analysis);
      } else {
        setAnalysis(data.message || "Resume analysis failed.");
      }
    } catch (error) {
      console.error(error);
      setAnalysis("Unable to connect to the resume analyzer.");
    } finally {
      setResumeLoading(false);
    }
  };

  // ---------------- INTERVIEW GENERATOR ----------------
  const generateInterview = async () => {
    setInterviewLoading(true);
    setQuestions("");

    try {
      const response = await fetch(`${API_URL}/interview/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic,
          difficulty,
          count,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setQuestions(data.questions);
      } else {
        setQuestions(data.message || "Failed to generate questions.");
      }
    } catch (error) {
      console.error(error);
      setQuestions("Unable to connect to the interview generator.");
    } finally {
      setInterviewLoading(false);
    }
  };

  return (
    <div className="app">

      {/* HEADER */}
      <header className="header">
        <div className="logo">🚀 SmartPrep AI</div>

        <p>
          Your AI-powered placement preparation assistant
        </p>
      </header>

      <main className="main">

        {/* HERO */}
        <section className="hero">
          <span className="badge">
            AI • PLACEMENT • PREPARATION
          </span>

          <h1>
            Prepare smarter.
            <br />
            <span>Get placed faster.</span>
          </h1>

          <p>
            Practice interviews, analyze your resume, and prepare
            for software engineering placements with AI.
          </p>
        </section>

        {/* CHAT */}
        <section className="card">

          <div className="card-header">
            <div className="icon">🤖</div>

            <div>
              <h2>AI Placement Assistant</h2>
              <p>
                Ask anything about DSA, DBMS, OS, OOP or interviews.
              </p>
            </div>
          </div>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Example: Explain binary search in simple terms..."
          />

          <button
            className="primary-button"
            onClick={sendMessage}
            disabled={chatLoading}
          >
            {chatLoading ? "Thinking..." : "Ask SmartPrep AI →"}
          </button>

          {reply && (
            <div className="response-box">
              <div className="response-title">
                🤖 SmartPrep AI
              </div>

              <p>{reply}</p>
            </div>
          )}
        </section>

        {/* RESUME */}
        <section className="card">

          <div className="card-header">
            <div className="icon">📄</div>

            <div>
              <h2>AI Resume Analyzer</h2>
              <p>
                Upload your resume and get an AI-powered ATS analysis.
              </p>
            </div>
          </div>

          <label className="upload-box">

            <input
              type="file"
              accept=".pdf"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setResume(file);
                setAnalysis("");
              }}
            />

            <div className="upload-icon">📁</div>

            {resume ? (
              <>
                <strong>{resume.name}</strong>
                <span>PDF selected successfully</span>
              </>
            ) : (
              <>
                <strong>Choose your resume</strong>
                <span>PDF files only • Maximum 5 MB</span>
              </>
            )}

          </label>

          <button
            className="primary-button"
            onClick={analyzeResume}
            disabled={!resume || resumeLoading}
          >
            {resumeLoading
              ? "Analyzing Resume..."
              : "Analyze My Resume →"}
          </button>

          {analysis && (
            <div className="analysis-box">
              <div className="response-title">
                📊 Resume Analysis
              </div>

              <div className="analysis-text">
                {analysis}
              </div>
            </div>
          )}
        </section>

        {/* INTERVIEW GENERATOR */}
        <section className="card">

          <div className="card-header">
            <div className="icon">🎯</div>

            <div>
              <h2>AI Interview Generator</h2>
              <p>
                Generate placement interview questions using AI.
              </p>
            </div>
          </div>

          <div className="interview-controls">

            <div>
              <label>Topic</label>

              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              >
                <option value="DSA">DSA</option>
                <option value="DBMS">DBMS</option>
                <option value="Operating Systems">
                  Operating Systems
                </option>
                <option value="OOP">OOP</option>
                <option value="Computer Networks">
                  Computer Networks
                </option>
              </select>
            </div>

            <div>
              <label>Difficulty</label>

              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            <div>
              <label>Questions</label>

              <select
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
              >
                <option value={3}>3</option>
                <option value={5}>5</option>
                <option value={10}>10</option>
              </select>
            </div>

          </div>

          <button
            className="primary-button"
            onClick={generateInterview}
            disabled={interviewLoading}
          >
            {interviewLoading
              ? "Generating Questions..."
              : "Generate Interview Questions →"}
          </button>

          {questions && (
            <div className="response-box">
              <div className="response-title">
                🎯 Interview Questions
              </div>

              <div className="analysis-text">
                {questions}
              </div>
            </div>
          )}

        </section>

        {/* FEATURES */}
        <section className="features">

          <div className="feature">
            <div>💬</div>
            <h3>AI Chat</h3>
            <p>
              Get instant explanations for placement preparation.
            </p>
          </div>

          <div className="feature">
            <div>📄</div>
            <h3>Resume Analysis</h3>
            <p>
              Identify resume strengths, gaps and ATS improvements.
            </p>
          </div>

          <div className="feature">
            <div>🎯</div>
            <h3>Interview Prep</h3>
            <p>
              Generate technical software engineering interview questions.
            </p>
          </div>

        </section>

      </main>

      {/* FOOTER */}
      <footer>
        <p>
          SmartPrep AI • Built for smarter placement preparation
        </p>
      </footer>

    </div>
  );
}

export default App;