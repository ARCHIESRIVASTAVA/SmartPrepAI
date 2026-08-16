import { useState } from "react";
import "./App.css";

function App() {
  // ================= CHAT =================
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // ================= RESUME =================
  const [resume, setResume] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState("");
  const [resumeLoading, setResumeLoading] = useState(false);

  // ================= INTERVIEW GENERATOR =================
  const [topic, setTopic] = useState("DSA");
  const [difficulty, setDifficulty] = useState("Medium");
  const [questionCount, setQuestionCount] = useState(5);
  const [questions, setQuestions] = useState("");
  const [interviewLoading, setInterviewLoading] = useState(false);

  // ================= MOCK INTERVIEW =================
  const [mockTopic, setMockTopic] = useState("DSA");
  const [mockDifficulty, setMockDifficulty] = useState("Medium");
  const [mockQuestion, setMockQuestion] = useState("");
  const [mockAnswer, setMockAnswer] = useState("");
  const [evaluation, setEvaluation] = useState("");
  const [mockLoading, setMockLoading] = useState(false);
  const [evaluationLoading, setEvaluationLoading] = useState(false);
  const [interviewStarted, setInterviewStarted] = useState(false);

  // ================= CHAT =================

  const sendMessage = async () => {
    if (!message.trim()) return;

    setChatLoading(true);
    setReply("");

    try {
      const response = await fetch("http://localhost:5000/chat", {
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

  // ================= RESUME =================

  const analyzeResume = async () => {
    if (!resume) return;

    setResumeLoading(true);
    setAnalysis("");

    try {
      const formData = new FormData();
      formData.append("resume", resume);

      const response = await fetch(
        "http://localhost:5000/resume/analyze",
        {
          method: "POST",
          body: formData,
        }
      );

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

  // ================= INTERVIEW GENERATOR =================

  const generateQuestions = async () => {
    setInterviewLoading(true);
    setQuestions("");

    try {
      const response = await fetch(
        "http://localhost:5000/interview/generate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            topic,
            difficulty,
            count: questionCount,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setQuestions(data.questions);
      } else {
        setQuestions(
          data.message || "Failed to generate interview questions."
        );
      }
    } catch (error) {
      console.error(error);
      setQuestions(
        "Unable to connect to the interview preparation service."
      );
    } finally {
      setInterviewLoading(false);
    }
  };

  // ================= START MOCK INTERVIEW =================

  const startMockInterview = async () => {
    setMockLoading(true);
    setMockQuestion("");
    setMockAnswer("");
    setEvaluation("");
    setInterviewStarted(false);

    try {
      const response = await fetch(
        "http://localhost:5000/mock-interview/start",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            topic: mockTopic,
            difficulty: mockDifficulty,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setMockQuestion(data.question);
        setInterviewStarted(true);
      } else {
        setMockQuestion(
          data.message || "Unable to start mock interview."
        );
      }
    } catch (error) {
      console.error(error);
      setMockQuestion(
        "Unable to connect to the mock interview service."
      );
    } finally {
      setMockLoading(false);
    }
  };

  // ================= EVALUATE ANSWER =================

  const evaluateAnswer = async () => {
    if (!mockAnswer.trim() || !mockQuestion) return;

    setEvaluationLoading(true);
    setEvaluation("");

    try {
      const response = await fetch(
        "http://localhost:5000/mock-interview/evaluate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            topic: mockTopic,
            question: mockQuestion,
            answer: mockAnswer,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setEvaluation(data.evaluation);
      } else {
        setEvaluation(
          data.message || "Answer evaluation failed."
        );
      }
    } catch (error) {
      console.error(error);
      setEvaluation(
        "Unable to connect to the evaluation service."
      );
    } finally {
      setEvaluationLoading(false);
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

        {/* ================= CHAT ================= */}

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
            {chatLoading
              ? "Thinking..."
              : "Ask SmartPrep AI →"}
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

        {/* ================= RESUME ================= */}

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

        {/* ================= INTERVIEW GENERATOR ================= */}

        <section className="card">

          <div className="card-header">

            <div className="icon">
              🎯
            </div>

            <div>
              <h2>
                Interview Preparation
              </h2>

              <p>
                Generate placement-focused interview questions using AI.
              </p>
            </div>

          </div>

          <div className="interview-controls">

            <div className="control">

              <label>
                Topic
              </label>

              <select
                value={topic}
                onChange={(e) =>
                  setTopic(e.target.value)
                }
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
                <option value="JavaScript">
                  JavaScript
                </option>
                <option value="System Design">
                  System Design
                </option>
              </select>

            </div>

            <div className="control">

              <label>
                Difficulty
              </label>

              <select
                value={difficulty}
                onChange={(e) =>
                  setDifficulty(e.target.value)
                }
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>

            </div>

            <div className="control">

              <label>
                Questions
              </label>

              <select
                value={questionCount}
                onChange={(e) =>
                  setQuestionCount(Number(e.target.value))
                }
              >
                <option value={3}>3</option>
                <option value={5}>5</option>
                <option value={10}>10</option>
              </select>

            </div>

          </div>

          <button
            className="primary-button"
            onClick={generateQuestions}
            disabled={interviewLoading}
          >
            {interviewLoading
              ? "Generating Questions..."
              : "Generate Interview Questions →"}
          </button>

          {questions && (
            <div className="analysis-box">

              <div className="response-title">
                🎯 Interview Questions
              </div>

              <div className="analysis-text">
                {questions}
              </div>

            </div>
          )}

        </section>

        {/* ================= MOCK INTERVIEW ================= */}

        <section className="card">

          <div className="card-header">

            <div className="icon">
              🎤
            </div>

            <div>
              <h2>
                AI Mock Interview
              </h2>

              <p>
                Practice technical interviews and receive AI feedback.
              </p>
            </div>

          </div>

          <div className="interview-controls">

            <div className="control">

              <label>
                Topic
              </label>

              <select
                value={mockTopic}
                onChange={(e) =>
                  setMockTopic(e.target.value)
                }
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
                <option value="JavaScript">
                  JavaScript
                </option>
              </select>

            </div>

            <div className="control">

              <label>
                Difficulty
              </label>

              <select
                value={mockDifficulty}
                onChange={(e) =>
                  setMockDifficulty(e.target.value)
                }
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>

            </div>

          </div>

          <button
            className="primary-button"
            onClick={startMockInterview}
            disabled={mockLoading}
          >
            {mockLoading
              ? "Starting Interview..."
              : "Start Mock Interview →"}
          </button>

          {mockQuestion && (
            <div className="response-box">

              <div className="response-title">
                🤖 Interviewer
              </div>

              <p>
                {mockQuestion}
              </p>

            </div>
          )}

          {interviewStarted && (
            <>
              <textarea
                className="mock-answer"
                value={mockAnswer}
                onChange={(e) =>
                  setMockAnswer(e.target.value)
                }
                placeholder="Type your answer here..."
              />

              <button
                className="primary-button"
                onClick={evaluateAnswer}
                disabled={
                  !mockAnswer.trim() ||
                  evaluationLoading
                }
              >
                {evaluationLoading
                  ? "Evaluating Answer..."
                  : "Submit Answer →"}
              </button>
            </>
          )}

          {evaluation && (
            <div className="analysis-box">

              <div className="response-title">
                📊 AI Evaluation
              </div>

              <div className="analysis-text">
                {evaluation}
              </div>

            </div>
          )}

        </section>

        {/* FEATURES */}

        <section className="features">

          <div className="feature">
            <div>💬</div>

            <h3>
              AI Chat
            </h3>

            <p>
              Get instant explanations for placement preparation.
            </p>
          </div>

          <div className="feature">
            <div>📄</div>

            <h3>
              Resume Analysis
            </h3>

            <p>
              Identify resume strengths, gaps and ATS improvements.
            </p>
          </div>

          <div className="feature">
            <div>🎤</div>

            <h3>
              Mock Interviews
            </h3>

            <p>
              Practice technical interviews and receive AI feedback.
            </p>
          </div>

        </section>

      </main>

      <footer>
        <p>
          SmartPrep AI • Built for smarter placement preparation
        </p>
      </footer>

    </div>
  );
}

export default App;