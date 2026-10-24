import {
  useEffect,
  useRef,
  useState,
  type ReactElement,
} from "react";
import {
  Check,
  CircleAlert,
  Copy,
  FileSearch,
  FileUp,
  Highlighter,
  ListChecks,
  LoaderCircle,
  MessageSquare,
  Mic,
  type LucideIcon,
} from "lucide-react";
import "./App.css";

const API_URL = "https://smartprepai-5ujb.onrender.com";

type Source = {
  source: string;
  chunkIndex: number;
  score: number;
};

type SourceType = "study_material" | "web";

type WebSource = {
  title: string;
  url: string;
};

type Tab = "ask" | "resume" | "interview" | "mock";

type MockRound = {
  question: string;
  /** null when the question was skipped or no score could be read */
  score: number | null;
  skipped?: boolean;
};

type ServerState = "checking" | "waking" | "ready" | "offline";

const NAV_ITEMS: { id: Tab; label: string; Icon: LucideIcon }[] = [
  { id: "ask", label: "Ask", Icon: MessageSquare },
  { id: "resume", label: "Resume", Icon: FileSearch },
  { id: "interview", label: "Questions", Icon: ListChecks },
  { id: "mock", label: "Mock interview", Icon: Mic },
];

const SERVER_LABELS: Record<ServerState, string> = {
  checking: "Checking server",
  waking: "Server starting up",
  ready: "Server online",
  offline: "Server unreachable",
};

const EXAMPLE_QUESTIONS = [
  "Explain how paging works in an operating system",
  "What are the ACID properties? Give an example for each",
  "What is the difference between a process and a thread?",
  "Write binary search in C++ and explain its time complexity",
];

const TOPICS = [
  "DSA",
  "DBMS",
  "Operating Systems",
  "OOP",
  "Computer Networks",
];

const DIFFICULTIES = ["Easy", "Medium", "Hard"];

const QUESTION_COUNTS = [3, 5, 10];

/** "OS_Full_Notes.pdf" -> "OS Full Notes" */
function prettySource(name: string) {
  return name
    .replace(/\.pdf$/i, "")
    .replace(/_+/g, " ")
    .trim();
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// ---------------- MOCK INTERVIEW HELPERS ----------------

/** Reads "Score: 7/10" (also "**Score: 7/10**", "Score: 7.5/10"). */
function parseScore(evaluation: string): number | null {
  const match = evaluation.match(
    /score\s*:?\s*\**\s*(\d+(?:\.\d+)?)\s*\/\s*10/i
  );

  if (!match) return null;

  const value = Number(match[1]);

  return value >= 0 && value <= 10 ? value : null;
}

/**
 * Prepares the evaluation text for display: drops the score line
 * (it is shown as a badge instead) and turns the section labels
 * into headings so they read as sections.
 */
function prepareEvaluation(evaluation: string): string {
  return evaluation
    .replace(
      /^[ \t]*\**[ \t]*score[ \t]*:?[ \t]*\**[ \t]*\d+(?:\.\d+)?[ \t]*\/[ \t]*10[ \t]*\**[ \t]*$/im,
      ""
    )
    .replace(
      /^[ \t]*\**[ \t]*(what you did well|what you missed|how to improve|ideal approach)[ \t]*:?[ \t]*\**[ \t]*$/gim,
      (_match, label: string) =>
        `### ${label.charAt(0).toUpperCase()}${label
          .slice(1)
          .toLowerCase()}`
    )
    .trim();
}

function scoreClass(score: number) {
  if (score >= 7) return "score score-good";
  if (score < 5) return "score score-low";
  return "score";
}

/** Turns raw API errors (quota, network) into something readable. */
function friendlyError(
  status: number,
  message: unknown,
  fallback: string
) {
  const text = typeof message === "string" ? message : "";

  if (status === 429 || /quota|rate.?limit|429/i.test(text)) {
    return "The AI service has hit its usage limit. Wait a minute and try again.";
  }

  return fallback;
}

// ---------------- END MOCK INTERVIEW HELPERS ----------------

function ErrorNote({ message }: { message: string }) {
  return (
    <p className="error-note" role="alert">
      <CircleAlert size={16} aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}

function CopyButton({
  text,
  label,
}: {
  text: string;
  label: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked; nothing useful to show.
    }
  };

  return (
    <button
      type="button"
      className="ghost-button"
      onClick={copy}
    >
      {copied ? (
        <Check size={14} aria-hidden="true" />
      ) : (
        <Copy size={14} aria-hidden="true" />
      )}
      <span>{copied ? "Copied" : label}</span>
    </button>
  );
}

function CodeBlock({
  language,
  code,
}: {
  language: string;
  code: string;
}) {
  return (
    <div className="code-block">
      <div className="code-header">
        <span>{language}</span>
        <CopyButton text={code} label="Copy" />
      </div>

      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}

function formatAIResponse(text: string) {
  const lines = text.split("\n");
  const elements: ReactElement[] = [];

  let codeBuffer: string[] = [];
  let inCode = false;
  let codeLanguage = "";

  const flushCode = () => {
    if (codeBuffer.length > 0) {
      elements.push(
        <CodeBlock
          key={`code-${elements.length}`}
          language={codeLanguage || "code"}
          code={codeBuffer.join("\n")}
        />
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
    /(\*\*.*?\*\*|`.*?`|\*[^*\s][^*]*\*)/g
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

    if (
      part.length > 2 &&
      part.startsWith("*") &&
      part.endsWith("*")
    ) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }

    return part;
  });
}

// ---------------- STREAMING CHAT ----------------
// Reads Server-Sent Events from POST /chat/stream and reports
// each piece to the caller as it arrives.

type StreamHandlers = {
  onMeta: (meta: {
    sources: Source[];
    sourceType: SourceType;
  }) => void;
  onToken: (text: string) => void;
  onDone: (info: { webSources: WebSource[] }) => void;
  onError: (message: string) => void;
};

// Throws if the stream could not be started or broke before
// any text arrived, so the caller can fall back to POST /chat.
// Errors the server reports itself go to onError instead.
async function streamChat(
  message: string,
  handlers: StreamHandlers
): Promise<void> {
  const response = await fetch(`${API_URL}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  if (!response.ok || !response.body) {
    throw new Error(`Stream failed (${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let buffer = "";
  let receivedText = false;
  let finished = false;

  const handleEvent = (raw: string) => {
    let event = "message";
    let data = "";

    for (const line of raw.split("\n")) {
      if (line.startsWith("event:")) {
        event = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        data += line.slice(5).trim();
      }
    }

    if (!data) return;

    const payload = JSON.parse(data);

    if (event === "meta") {
      handlers.onMeta({
        sources: payload.sources || [],
        sourceType: payload.sourceType,
      });
    } else if (event === "token") {
      receivedText = true;
      handlers.onToken(payload.text || "");
    } else if (event === "done") {
      finished = true;
      handlers.onDone({
        webSources: payload.webSources || [],
      });
    } else if (event === "error") {
      finished = true;
      handlers.onError(
        payload.message || "Something went wrong."
      );
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE events are separated by a blank line.
      const parts = buffer.split("\n\n");
      buffer = parts.pop() || "";

      parts.forEach(handleEvent);
    }
  } catch (error) {
    // Connection dropped mid-stream. Keep what we have if any
    // text arrived; otherwise let the caller fall back.
    if (!receivedText) throw error;
  }

  if (!finished && !receivedText) {
    throw new Error("Stream ended without a response");
  }
}

function ResultPanel({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <article className="result">
      <header className="result-head">
        <span className="result-title">{title}</span>
        <CopyButton text={text} label="Copy" />
      </header>

      <div className="answer-content">
        {formatAIResponse(text)}
      </div>
    </article>
  );
}

function Segmented<T extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: T[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset className="field">
      <legend>{label}</legend>

      <div className="segmented">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            onClick={() => onChange(option)}
          >
            {option}
          </button>
        ))}
      </div>
    </fieldset>
  );
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

  // ---------------- NAVIGATION + CHAT EXTRAS ----------------

  const [tab, setTab] = useState<Tab>("ask");
  const [sourceType, setSourceType] =
    useState<SourceType | null>(null);
  const [webSources, setWebSources] =
    useState<WebSource[]>([]);
  const [chatError, setChatError] = useState("");
  const [resumeError, setResumeError] = useState("");
  const [interviewError, setInterviewError] = useState("");
  const questionInput =
    useRef<HTMLTextAreaElement>(null);

  // ---------------- MOCK INTERVIEW ----------------

  const [mockTopic, setMockTopic] = useState("DSA");
  const [mockDifficulty, setMockDifficulty] =
    useState("Medium");
  const [mockQuestion, setMockQuestion] = useState("");
  const [mockRound, setMockRound] = useState(0);
  const [mockAnswer, setMockAnswer] = useState("");
  const [mockEvaluation, setMockEvaluation] =
    useState("");
  const [mockHistory, setMockHistory] = useState<
    MockRound[]
  >([]);
  const [mockBusy, setMockBusy] = useState<
    "start" | "evaluate" | null
  >(null);
  const [mockError, setMockError] = useState("");

  // ---------------- SERVER WARM-UP ----------------
  // The Render free tier sleeps after ~15 minutes idle.
  // Ping it as soon as the page opens so it wakes up while the
  // user is reading, and tell them if it's taking a while.

  const [serverState, setServerState] =
    useState<ServerState>("checking");

  useEffect(() => {
    let cancelled = false;

    // Only say "starting up" if the ping is actually slow,
    // so a warm server never flashes a notice.
    const slowTimer = setTimeout(() => {
      if (!cancelled) {
        setServerState((current) =>
          current === "checking" ? "waking" : current
        );
      }
    }, 2000);

    fetch(`${API_URL}/`)
      .then((response) => {
        if (!cancelled) {
          setServerState(response.ok ? "ready" : "offline");
        }
      })
      .catch(() => {
        if (!cancelled) setServerState("offline");
      })
      .finally(() => clearTimeout(slowTimer));

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
    setSourceType(null);
    setWebSources([]);
    setChatError("");

    try {
      // Preferred path: stream the answer as it is generated.
      await streamChat(message.trim(), {
        onMeta: (meta) => {
          setSources(meta.sources);
          setSourceType(meta.sourceType);
        },
        onToken: (text) =>
          setReply((previous) => previous + text),
        onDone: (info) => setWebSources(info.webSources),
        // Any text that already arrived stays on screen;
        // the error is shown separately underneath it.
        onError: (errorMessage) => setChatError(errorMessage),
      });
    } catch (streamError) {
      console.error(
        "Streaming failed, using standard request:",
        streamError
      );

      // Fallback path: the original single-response request.
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
          setSourceType(data.sourceType ?? null);
          setWebSources(data.webSources || []);
        } else {
          setChatError(
            data.message ||
              "Something went wrong."
          );
        }
      } catch (error) {
        console.error(error);

        setChatError(
          "Unable to connect to SmartPrep AI. Please try again."
        );
      }
    } finally {
      setChatLoading(false);
    }
  };

  // ---------------- RESUME ----------------

  const analyzeResume = async () => {
    if (!resume) return;

    setResumeLoading(true);
    setAnalysis("");
    setResumeError("");

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
        setResumeError(
          data.message ||
            "Resume analysis failed."
        );
      }
    } catch (error) {
      console.error(error);

      setResumeError(
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
    setInterviewError("");

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
        setInterviewError(
          data.message ||
            "Failed to generate questions."
        );
      }
    } catch (error) {
      console.error(error);

      setInterviewError(
        "Unable to connect to the interview generator."
      );
    } finally {
      setInterviewLoading(false);
    }
  };

  // ---------------- MOCK INTERVIEW ----------------

  // Fetches the next question. `rounds` is the session so far,
  // sent to the server so it does not repeat a question.
  const startMockQuestion = async (
    rounds: MockRound[] = mockHistory
  ) => {
    setMockBusy("start");
    setMockError("");

    try {
      const response = await fetch(
        `${API_URL}/mock-interview/start`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            topic: mockTopic,
            difficulty: mockDifficulty,
            previousQuestions: rounds.map(
              (round) => round.question
            ),
          }),
        }
      );

      const data = await response.json();

      if (
        data.success &&
        typeof data.question === "string" &&
        data.question.trim()
      ) {
        setMockQuestion(data.question.trim());
        setMockRound(rounds.length + 1);
        setMockAnswer("");
        setMockEvaluation("");
      } else {
        setMockError(
          friendlyError(
            response.status,
            data.message,
            "Couldn't get a question. Try again."
          )
        );
      }
    } catch (error) {
      console.error(error);

      setMockError(
        "Can't reach the server. Check your connection and try again."
      );
    } finally {
      setMockBusy(null);
    }
  };

  const submitMockAnswer = async () => {
    const answer = mockAnswer.trim();

    if (!answer || !mockQuestion || mockBusy) return;

    setMockBusy("evaluate");
    setMockError("");

    try {
      const response = await fetch(
        `${API_URL}/mock-interview/evaluate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            topic: mockTopic,
            question: mockQuestion,
            answer,
          }),
        }
      );

      const data = await response.json();

      if (
        data.success &&
        typeof data.evaluation === "string" &&
        data.evaluation.trim()
      ) {
        setMockEvaluation(data.evaluation);
        setMockHistory((rounds) => [
          ...rounds,
          {
            question: mockQuestion,
            score: parseScore(data.evaluation),
          },
        ]);
      } else {
        setMockError(
          friendlyError(
            response.status,
            data.message,
            "Couldn't review your answer. Try again."
          )
        );
      }
    } catch (error) {
      console.error(error);

      setMockError(
        "Can't reach the server. Check your connection and try again."
      );
    } finally {
      setMockBusy(null);
    }
  };

  const skipMockQuestion = () => {
    const rounds: MockRound[] = [
      ...mockHistory,
      { question: mockQuestion, score: null, skipped: true },
    ];

    setMockHistory(rounds);
    startMockQuestion(rounds);
  };

  const endMockInterview = () => {
    setMockQuestion("");
    setMockRound(0);
    setMockAnswer("");
    setMockEvaluation("");
    setMockHistory([]);
    setMockError("");
  };

  const scoredRounds = mockHistory.filter(
    (round) => round.score !== null
  );

  const averageScore = scoredRounds.length
    ? scoredRounds.reduce(
        (total, round) => total + (round.score ?? 0),
        0
      ) / scoredRounds.length
    : null;

  const currentScore = mockEvaluation
    ? parseScore(mockEvaluation)
    : null;

  const progressText =
    sourceType === "study_material"
      ? `Found ${sources.length} ${
          sources.length === 1 ? "passage" : "passages"
        } in your notes. Writing the answer…`
      : sourceType === "web"
        ? "Nothing in your notes matched closely. Searching the web…"
        : "Searching your notes…";

  const sourcesPanel = (
    <aside
      className="margin"
      aria-label="Sources for this answer"
    >
      {sourceType === "study_material" && (
        <>
          <h2>From your notes</h2>

          <p className="margin-note">
            Ranked by how closely each passage matches
            your question.
          </p>

          <ul className="source-list">
            {sources.map((item, index) => {
              const percent = Math.round(item.score * 100);

              return (
                <li
                  className="source"
                  key={`${item.source}-${item.chunkIndex}-${index}`}
                >
                  <div className="source-name">
                    {prettySource(item.source)}
                  </div>

                  <div className="match">
                    <span
                      className="match-bar"
                      aria-hidden="true"
                    >
                      <span style={{ width: `${percent}%` }} />
                    </span>

                    <span className="match-pct">
                      {percent}% match
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {sourceType === "web" && (
        <>
          <h2>From the web</h2>

          <p className="margin-note">
            Nothing in your notes matched closely, so
            this answer used web search.
          </p>

          {webSources.length > 0 ? (
            <ul className="source-list">
              {webSources.map((item) => (
                <li className="source" key={item.url}>
                  <a
                    className="web-link"
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {item.title}
                  </a>

                  <span className="web-host">
                    {hostOf(item.url)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="margin-note">
              {chatLoading
                ? "Links appear when the answer finishes."
                : "No links were returned."}
            </p>
          )}
        </>
      )}

      {sourceType === null && (
        <>
          <h2>Sources</h2>

          <p className="margin-note">
            Passages from your notes show up here as soon as
            they are found, with how closely each one
            matches.
          </p>
        </>
      )}
    </aside>
  );

  return (
    <div className="shell">
      <aside className="rail">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <Highlighter size={16} />
          </span>

          <span className="brand-name">SmartPrep AI</span>
        </div>

        <nav className="nav" aria-label="Tools">
          {NAV_ITEMS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              className="nav-item"
              aria-current={tab === id ? "page" : undefined}
              onClick={() => setTab(id)}
            >
              <Icon size={17} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="rail-footer" role="status">
          <span
            className={`status-dot status-${serverState}`}
            aria-hidden="true"
          />

          <span>{SERVER_LABELS[serverState]}</span>
        </div>
      </aside>

      <main className="workspace">
        {serverState === "waking" && (
          <p className="notice" role="status">
            The server was idle and is starting up. The
            first answer can take up to a minute.
          </p>
        )}

        {serverState === "offline" && (
          <p className="notice" role="status">
            Can't reach the server. Check your connection and
            refresh the page.
          </p>
        )}

        {/* ---------------- ASK ---------------- */}

        {tab === "ask" && (
          <div className="ask-layout">
            <section
              className="column"
              aria-labelledby="ask-title"
            >
              <header className="page-head">
                <h1 id="ask-title">
                  Ask about any placement topic
                </h1>

                <p>
                  Answers come from your study notes first.
                  When the notes don't cover a question,
                  SmartPrep searches the web instead.
                </p>
              </header>

              <div className="composer">
                <textarea
                  ref={questionInput}
                  aria-label="Your question"
                  value={message}
                  onChange={(e) =>
                    setMessage(e.target.value)
                  }
                  onKeyDown={(e) => {
                    if (
                      (e.metaKey || e.ctrlKey) &&
                      e.key === "Enter"
                    ) {
                      e.preventDefault();

                      if (!chatLoading) sendMessage();
                    }
                  }}
                  placeholder="Explain binary search in simple terms"
                />

                <div className="composer-bar">
                  <span className="hint">
                    Ctrl or ⌘ + Enter to send
                  </span>

                  <button
                    className="primary-button"
                    onClick={sendMessage}
                    disabled={
                      chatLoading || !message.trim()
                    }
                  >
                    {chatLoading ? (
                      <>
                        <LoaderCircle
                          className="spin"
                          size={16}
                          aria-hidden="true"
                        />
                        Working
                      </>
                    ) : (
                      "Ask"
                    )}
                  </button>
                </div>
              </div>

              {chatLoading && !reply && (
                <p className="progress" role="status">
                  <LoaderCircle
                    className="spin"
                    size={16}
                    aria-hidden="true"
                  />
                  {progressText}
                </p>
              )}

              {chatError && !reply && (
                <ErrorNote message={chatError} />
              )}

              {!chatLoading && !reply && (
                <div className="examples">
                  <p>Not sure where to start? Try one of these.</p>

                  {EXAMPLE_QUESTIONS.map((example) => (
                    <button
                      key={example}
                      type="button"
                      className="example"
                      onClick={() => {
                        setMessage(example);
                        questionInput.current?.focus();
                      }}
                    >
                      {example}
                    </button>
                  ))}
                </div>
              )}

              {reply && (
                <article
                  className="answer"
                  aria-busy={chatLoading}
                >
                  <header className="result-head">
                    <span className="result-title">
                      SmartPrep AI
                    </span>

                    {!chatLoading && (
                      <CopyButton
                        text={reply}
                        label="Copy answer"
                      />
                    )}
                  </header>

                  <div className="answer-content">
                    {formatAIResponse(reply)}
                  </div>

                  {chatLoading && (
                    <span
                      className="caret"
                      aria-hidden="true"
                    />
                  )}
                </article>
              )}

              {chatError && reply && (
                <ErrorNote message={chatError} />
              )}
            </section>

            {sourcesPanel}
          </div>
        )}

        {/* ---------------- RESUME ---------------- */}

        {tab === "resume" && (
          <section
            className="column"
            aria-labelledby="resume-title"
          >
            <header className="page-head">
              <h1 id="resume-title">Check your resume</h1>

              <p>
                Upload a PDF under 5 MB to get an ATS score,
                skill gaps, and the fixes to make first.
              </p>
            </header>

            <label className="dropzone">
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => {
                  const file =
                    e.target.files?.[0] || null;

                  setResume(file);
                  setAnalysis("");
                  setResumeError("");
                }}
              />

              <FileUp size={22} aria-hidden="true" />

              <span className="dropzone-text">
                {resume ? (
                  <>
                    <strong>{resume.name}</strong>

                    <span className="sub">
                      {Math.max(
                        1,
                        Math.round(resume.size / 1024)
                      )}{" "}
                      KB. Click to choose a different file.
                    </span>
                  </>
                ) : (
                  <>
                    <strong>Choose a PDF resume</strong>

                    <span className="sub">
                      PDF only, up to 5 MB
                    </span>
                  </>
                )}
              </span>
            </label>

            <div className="actions">
              <button
                className="primary-button"
                onClick={analyzeResume}
                disabled={!resume || resumeLoading}
              >
                {resumeLoading ? (
                  <>
                    <LoaderCircle
                      className="spin"
                      size={16}
                      aria-hidden="true"
                    />
                    Analyzing
                  </>
                ) : (
                  "Analyze resume"
                )}
              </button>
            </div>

            {resumeError && (
              <ErrorNote message={resumeError} />
            )}

            {analysis && (
              <ResultPanel
                title="Resume analysis"
                text={analysis}
              />
            )}
          </section>
        )}

        {/* ---------------- INTERVIEW ---------------- */}

        {tab === "interview" && (
          <section
            className="column"
            aria-labelledby="interview-title"
          >
            <header className="page-head">
              <h1 id="interview-title">
                Practice interview questions
              </h1>

              <p>
                Pick a topic and a difficulty. You get
                questions only, so you can try to answer
                before you look anything up.
              </p>
            </header>

            <div className="controls">
              <label className="field">
                <span className="field-label">Topic</span>

                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                >
                  {TOPICS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <Segmented
                label="Difficulty"
                value={difficulty}
                options={DIFFICULTIES}
                onChange={setDifficulty}
              />

              <Segmented
                label="Questions"
                value={count}
                options={QUESTION_COUNTS}
                onChange={setCount}
              />
            </div>

            <div className="actions">
              <button
                className="primary-button"
                onClick={generateInterview}
                disabled={interviewLoading}
              >
                {interviewLoading ? (
                  <>
                    <LoaderCircle
                      className="spin"
                      size={16}
                      aria-hidden="true"
                    />
                    Generating
                  </>
                ) : (
                  "Generate questions"
                )}
              </button>
            </div>

            {interviewError && (
              <ErrorNote message={interviewError} />
            )}

            {questions && (
              <ResultPanel
                title="Interview questions"
                text={questions}
              />
            )}
          </section>
        )}

        {/* ---------------- MOCK INTERVIEW ---------------- */}

        {tab === "mock" && (
          <div className="ask-layout">
            <section
              className="column"
              aria-labelledby="mock-title"
            >
              <header className="page-head">
                <h1 id="mock-title">Mock interview</h1>

                <p>
                  Answer one question at a time, then get a
                  score and feedback on what you missed.
                  Nothing is saved after you leave the page.
                </p>
              </header>

              {!mockQuestion ? (
                <>
                  <div className="controls">
                    <label className="field">
                      <span className="field-label">
                        Topic
                      </span>

                      <select
                        value={mockTopic}
                        onChange={(e) =>
                          setMockTopic(e.target.value)
                        }
                      >
                        {TOPICS.map((option) => (
                          <option
                            key={option}
                            value={option}
                          >
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>

                    <Segmented
                      label="Difficulty"
                      value={mockDifficulty}
                      options={DIFFICULTIES}
                      onChange={setMockDifficulty}
                    />
                  </div>

                  <div className="actions">
                    <button
                      className="primary-button"
                      onClick={() => startMockQuestion()}
                      disabled={mockBusy !== null}
                    >
                      {mockBusy === "start" ? (
                        <>
                          <LoaderCircle
                            className="spin"
                            size={16}
                            aria-hidden="true"
                          />
                          Starting
                        </>
                      ) : (
                        "Start interview"
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="question">
                    <span className="result-title">
                      Question {mockRound}
                    </span>

                    <p>{mockQuestion}</p>
                  </div>

                  {!mockEvaluation ? (
                    <div className="composer">
                      <textarea
                        aria-label="Your answer"
                        value={mockAnswer}
                        onChange={(e) =>
                          setMockAnswer(e.target.value)
                        }
                        onKeyDown={(e) => {
                          if (
                            (e.metaKey || e.ctrlKey) &&
                            e.key === "Enter"
                          ) {
                            e.preventDefault();
                            submitMockAnswer();
                          }
                        }}
                        placeholder="Answer the way you would say it in the interview"
                        disabled={mockBusy !== null}
                      />

                      <div className="composer-bar">
                        <span className="hint">
                          Ctrl or ⌘ + Enter to submit
                        </span>

                        <div className="bar-actions">
                          <button
                            type="button"
                            className="ghost-button"
                            onClick={skipMockQuestion}
                            disabled={mockBusy !== null}
                          >
                            Skip question
                          </button>

                          <button
                            className="primary-button"
                            onClick={submitMockAnswer}
                            disabled={
                              mockBusy !== null ||
                              !mockAnswer.trim()
                            }
                          >
                            {mockBusy === "evaluate" ? (
                              <>
                                <LoaderCircle
                                  className="spin"
                                  size={16}
                                  aria-hidden="true"
                                />
                                Reviewing
                              </>
                            ) : (
                              "Submit answer"
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="yours-label">
                        Your answer
                      </p>

                      <blockquote className="yours">
                        {mockAnswer}
                      </blockquote>

                      <article className="result">
                        <header className="result-head">
                          <div className="result-head-main">
                            <span className="result-title">
                              Feedback
                            </span>

                            {currentScore !== null && (
                              <span
                                className={scoreClass(
                                  currentScore
                                )}
                              >
                                {currentScore}
                                <small>/10</small>
                              </span>
                            )}
                          </div>

                          <CopyButton
                            text={prepareEvaluation(
                              mockEvaluation
                            )}
                            label="Copy"
                          />
                        </header>

                        <div className="answer-content">
                          {formatAIResponse(
                            prepareEvaluation(mockEvaluation)
                          )}
                        </div>
                      </article>

                      <div className="actions actions-row">
                        <button
                          className="primary-button"
                          onClick={() => startMockQuestion()}
                          disabled={mockBusy !== null}
                        >
                          {mockBusy === "start" ? (
                            <>
                              <LoaderCircle
                                className="spin"
                                size={16}
                                aria-hidden="true"
                              />
                              Getting question
                            </>
                          ) : (
                            "Next question"
                          )}
                        </button>

                        <button
                          type="button"
                          className="ghost-button"
                          onClick={endMockInterview}
                          disabled={mockBusy !== null}
                        >
                          End interview
                        </button>
                      </div>
                    </>
                  )}

                  {mockBusy === "evaluate" && (
                    <p className="progress" role="status">
                      <LoaderCircle
                        className="spin"
                        size={16}
                        aria-hidden="true"
                      />
                      Reviewing your answer…
                    </p>
                  )}

                  {!mockEvaluation && (
                    <div className="actions">
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={endMockInterview}
                        disabled={mockBusy !== null}
                      >
                        End interview
                      </button>
                    </div>
                  )}
                </>
              )}

              {mockError && <ErrorNote message={mockError} />}
            </section>

            <aside
              className="margin"
              aria-label="This session"
            >
              <h2>This session</h2>

              {mockHistory.length === 0 ? (
                <p className="margin-note">
                  Your score for each question shows up here
                  as you go.
                </p>
              ) : (
                <>
                  <p className="margin-note">
                    {averageScore !== null
                      ? `Average ${
                          Math.round(averageScore * 10) / 10
                        }/10 over ${scoredRounds.length} ${
                          scoredRounds.length === 1
                            ? "answer"
                            : "answers"
                        }.`
                      : "No scored answers yet."}
                  </p>

                  <ul className="source-list">
                    {mockHistory.map((round, index) => (
                      <li
                        className="source"
                        key={`${index}-${round.question}`}
                      >
                        <div className="source-name clamp">
                          {round.question}
                        </div>

                        <div className="history-score">
                          {round.skipped
                            ? "Skipped"
                            : round.score !== null
                              ? `${round.score}/10`
                              : "No score"}
                        </div>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;