import { useEffect, useState, type ReactElement } from "react";
import "./App.css";

const API_URL = "https://smartprepai-5ujb.onrender.com";

type Source = {
  source: string;
  chunkIndex: number;
  score: number;
};

function formatAIResponse(text: string) {
  const lines = text.split("\n");
  const elements: ReactElement[] = [];

  let codeBuffer: string[] = [];
  let inCode = false;
  let codeLanguage = "";

  const flushCode = () => {
    if (codeBuffer.length > 0) {
      elements.push(
        <pre
          className="code-block"
          key={`code-${elements.length}`}
        >
          <div className="code-header">
            <span>{codeLanguage || "code"}</span>
          </div>

          <code>{codeBuffer.join("\n")}</code>
        </pre>
      );

      codeBuffer = [];
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      if (inCode) {
        inCode = false;
        flushCode();
      } else {
        inCode = true;
        codeLanguage =
          trimmed.replace("```", "") || "code";
      }

      return;
    }

    if (inCode) {
      codeBuffer.push(line);
      return;
    }

    if (!trimmed) {
      elements.push(
        <div
          className="answer-space"
          key={`space-${index}`}
        />
      );

      return;
    }

    if (trimmed.startsWith("### ")) {
      elements.push(
        <h3
          className="answer-heading"
          key={index}
        >
          {trimmed.replace("### ", "")}
        </h3>
      );

      return;
    }

    if (trimmed.startsWith("## ")) {
      elements.push(
        <h2
          className="answer-heading"
          key={index}
        >
          {trimmed.replace("## ", "")}
        </h2>
      );

      return;
    }

    if (trimmed === "---") {
      elements.push(
        <hr
          className="answer-divider"
          key={index}
        />
      );

      return;
    }

    if (/^[-*]\s/.test(trimmed)) {
      elements.push(
        <div
          className="bullet-item"
          key={index}
        >
          <span>•</span>

          <span>
            {formatInline(trimmed.slice(2))}
          </span>
        </div>
      );

      return;
    }

    if (/^\d+\.\s/.test(trimmed)) {
      const match = trimmed.match(
        /^(\d+)\.\s(.+)/
      );

      if (match) {
        elements.push(
          <div
            className="number-item"
            key={index}
          >
            <span className="number-badge">
              {match[1]}
            </span>

            <span>
              {formatInline(match[2])}
            </span>
          </div>
        );

        return;
      }
    }

    elements.push(
      <p
        className="answer-paragraph"
        key={index}
      >
        {formatInline(trimmed)}
      </p>
    );
  });

  if (inCode) {
    flushCode();
  }

  return elements;
}

function formatInline(text: string) {
  const parts = text.split(
    /(\*\*.*?\*\*|`.*?`)/g
  );

  return parts.map((part, index) => {
    if (
      part.startsWith("**") &&
      part.endsWith("**")
    ) {
      return (
        <strong key={index}>
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (
      part.startsWith("`") &&
      part.endsWith("`")
    ) {
      return (
        <code
          className="inline-code"
          key={index}
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    return part;
  });
}

function App() {
  // ---------------- CHAT ----------------

  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [sources, setSources] =
    useState<Source[]>([]);
  const [chatLoading, setChatLoading] =
    useState(false);

  // ---------------- RESUME ----------------

  const [resume, setResume] =
    useState<File | null>(null);
  const [analysis, setAnalysis] = useState("");
  const [resumeLoading, setResumeLoading] =
    useState(false);

  // ---------------- INTERVIEW ----------------

  const [topic, setTopic] = useState("DSA");
  const [difficulty, setDifficulty] =
    useState("Medium");
  const [count, setCount] = useState(5);
  const [questions, setQuestions] = useState("");
  const [interviewLoading, setInterviewLoading] =
    useState(false);

  // ---------------- SERVER WARM-UP ----------------
  // The Render free tier sleeps after ~15 minutes idle.
  // Ping it as soon as the page opens so it wakes up while the
  // user is reading, and tell them if it's taking a while.

  const [serverWaking, setServerWaking] =
    useState(false);

  useEffect(() => {
    let cancelled = false;

    // Only show the message if the ping is actually slow,
    // so a warm server never flashes a banner.
    const slowTimer = setTimeout(() => {
      if (!cancelled) setServerWaking(true);
    }, 2000);

    fetch(`${API_URL}/`)
      .catch(() => {
        // If the ping fails, the real requests will
        // show their own error messages.
      })
      .finally(() => {
        clearTimeout(slowTimer);
        if (!cancelled) setServerWaking(false);
      });

    return () => {
      cancelled = true;
      clearTimeout(slowTimer);
    };
  }, []);

  // ---------------- CHAT ----------------

  const sendMessage = async () => {
    if (!message.trim()) return;

    setChatLoading(true);
    setReply("");
    setSources([]);

    try {
      const response = await fetch(
        `${API_URL}/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: message.trim(),
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setReply(data.reply || "");
        setSources(data.sources || []);
      } else {
        setReply(
          data.message ||
            "Something went wrong."
        );
      }
    } catch (error) {
      console.error(error);

      setReply(
        "Unable to connect to SmartPrep AI. Please try again."
      );
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

      const response = await fetch(
        `${API_URL}/resume/analyze`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (data.success) {
        setAnalysis(data.analysis);
      } else {
        setAnalysis(
          data.message ||
            "Resume analysis failed."
        );
      }
    } catch (error) {
      console.error(error);

      setAnalysis(
        "Unable to connect to the resume analyzer."
      );
    } finally {
      setResumeLoading(false);
    }
  };

  // ---------------- INTERVIEW ----------------

  const generateInterview = async () => {
    setInterviewLoading(true);
    setQuestions("");

    try {
      const response = await fetch(
        `${API_URL}/interview/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            topic,
            difficulty,
            count,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setQuestions(data.questions);
      } else {
        setQuestions(
          data.message ||
            "Failed to generate questions."
        );
      }
    } catch (error) {
      console.error(error);

      setQuestions(
        "Unable to connect to the interview generator."
      );
    } finally {
      setInterviewLoading(false);
    }
  };

  return (
    <div className="app">

      {/* HEADER */}

      <header className="header">
        <div className="logo">
          🚀 SmartPrep AI
        </div>

        <p>
          Your AI-powered placement preparation
          assistant
        </p>
      </header>

      {serverWaking && (
        <div className="server-status" role="status">
          <div className="loading-dots">
            <span></span>
            <span></span>
            <span></span>
          </div>

          <span>
            Waking up the server... this can take up
            to a minute after a period of inactivity.
          </span>
        </div>
      )}

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
            Practice interviews, analyze your resume,
            and prepare for software engineering
            placements with AI.
          </p>
        </section>

        {/* CHAT */}

        <section className="card chat-card">

          <div className="card-header">
            <div className="icon">
              🤖
            </div>

            <div>
              <h2>
                AI Placement Assistant
              </h2>

              <p>
                Ask anything about DSA, DBMS, OS,
                OOP or interviews.
              </p>
            </div>
          </div>

          <textarea
            value={message}
            onChange={(e) =>
              setMessage(e.target.value)
            }
            placeholder="Example: Explain binary search in simple terms..."
          />

          <button
            className="primary-button"
            onClick={sendMessage}
            disabled={chatLoading}
          >
            {chatLoading
              ? "🤔 Thinking..."
              : "Ask SmartPrep AI →"}
          </button>

          {chatLoading && (
            <div className="loading-box">

              <div className="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>

              <span>
                Searching your study material and
                generating an answer...
              </span>

            </div>
          )}

          {reply && !chatLoading && (
            <div className="ai-response">

              <div className="response-top">

                <div className="ai-avatar">
                  🤖
                </div>

                <div>
                  <strong>
                    SmartPrep AI
                  </strong>

                  <span>
                    AI-powered answer
                  </span>
                </div>

                {sources.length > 0 && (
                  <div className="rag-badge">
                    ✦ RAG
                  </div>
                )}

              </div>

              <div className="answer-content">
                {formatAIResponse(reply)}
              </div>

              {sources.length > 0 && (
                <div className="sources-section">

                  <div className="sources-title">

                    📚 Based on your study material

                    <span>
                      {sources.length} sources
                    </span>

                  </div>

                  <div className="sources-list">

                    {sources.map(
                      (source, index) => (
                        <div
                          className="source-card"
                          key={`${source.source}-${source.chunkIndex}-${index}`}
                        >

                          <div className="source-icon">
                            📄
                          </div>

                          <div className="source-info">

                            <strong>
                              {source.source}
                            </strong>

                            <small>
                              Study material •
                              Relevant section
                            </small>

                          </div>

                          <div className="score">
                            {Math.round(
                              source.score * 100
                            )}
                            %
                          </div>

                        </div>
                      )
                    )}

                  </div>

                </div>
              )}

            </div>
          )}

        </section>

        {/* RESUME */}

        <section className="card">

          <div className="card-header">

            <div className="icon">
              📄
            </div>

            <div>

              <h2>
                AI Resume Analyzer
              </h2>

              <p>
                Upload your resume and get an
                AI-powered ATS analysis.
              </p>

            </div>

          </div>

          <label className="upload-box">

            <input
              type="file"
              accept=".pdf"
              onChange={(e) => {

                const file =
                  e.target.files?.[0] ||
                  null;

                setResume(file);
                setAnalysis("");

              }}
            />

            <div className="upload-icon">
              📁
            </div>

            {resume ? (
              <>
                <strong>
                  {resume.name}
                </strong>

                <span>
                  PDF selected successfully
                </span>
              </>
            ) : (
              <>
                <strong>
                  Choose your resume
                </strong>

                <span>
                  PDF files only • Maximum 5 MB
                </span>
              </>
            )}

          </label>

          <button
            className="primary-button"
            onClick={analyzeResume}
            disabled={
              !resume || resumeLoading
            }
          >
            {resumeLoading
              ? "Analyzing Resume..."
              : "Analyze My Resume →"}
          </button>

          {analysis && (
            <div className="response-box">

              <div className="response-title">
                📊 Resume Analysis
              </div>

              <div className="analysis-text">
                {analysis}
              </div>

            </div>
          )}

        </section>

        {/* INTERVIEW */}

        <section className="card">

          <div className="card-header">

            <div className="icon">
              🎯
            </div>

            <div>

              <h2>
                AI Interview Generator
              </h2>

              <p>
                Generate placement interview
                questions using AI.
              </p>

            </div>

          </div>

          <div className="interview-controls">

            <div>

              <label>
                Topic
              </label>

              <select
                value={topic}
                onChange={(e) =>
                  setTopic(e.target.value)
                }
              >

                <option value="DSA">
                  DSA
                </option>

                <option value="DBMS">
                  DBMS
                </option>

                <option value="Operating Systems">
                  Operating Systems
                </option>

                <option value="OOP">
                  OOP
                </option>

                <option value="Computer Networks">
                  Computer Networks
                </option>

              </select>

            </div>

            <div>

              <label>
                Difficulty
              </label>

              <select
                value={difficulty}
                onChange={(e) =>
                  setDifficulty(e.target.value)
                }
              >

                <option value="Easy">
                  Easy
                </option>

                <option value="Medium">
                  Medium
                </option>

                <option value="Hard">
                  Hard
                </option>

              </select>

            </div>

            <div>

              <label>
                Questions
              </label>

              <select
                value={count}
                onChange={(e) =>
                  setCount(
                    Number(e.target.value)
                  )
                }
              >

                <option value={3}>
                  3
                </option>

                <option value={5}>
                  5
                </option>

                <option value={10}>
                  10
                </option>

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

            <div>
              💬
            </div>

            <h3>
              AI Chat
            </h3>

            <p>
              Get instant explanations for
              placement preparation.
            </p>

          </div>

          <div className="feature">

            <div>
              📄
            </div>

            <h3>
              Resume Analysis
            </h3>

            <p>
              Identify resume strengths, gaps
              and ATS improvements.
            </p>

          </div>

          <div className="feature">

            <div>
              🎯
            </div>

            <h3>
              Interview Prep
            </h3>

            <p>
              Generate technical software
              engineering interview questions.
            </p>

          </div>

        </section>

      </main>

      <footer>

        <p>
          SmartPrep AI • Built for smarter
          placement preparation
        </p>

      </footer>

    </div>
  );
}

export default App;