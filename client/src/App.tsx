import { useEffect, useState } from "react";
import {
  FileSearch,
  Highlighter,
  ListChecks,
  MessageSquare,
  Mic,
  type LucideIcon,
} from "lucide-react";
import { API_URL } from "./api";
import { AskView } from "./views/AskView";
import { InterviewView } from "./views/InterviewView";
import { MockInterviewView } from "./views/MockInterviewView";
import { ResumeView } from "./views/ResumeView";
import "./App.css";

type Tab = "ask" | "resume" | "interview" | "mock";

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

function App() {
  const [tab, setTab] = useState<Tab>("ask");

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

        {/* The views stay mounted so a half-finished answer, upload or
            interview survives switching tabs. */}

        <div hidden={tab !== "ask"}>
          <AskView />
        </div>

        <div hidden={tab !== "resume"}>
          <ResumeView />
        </div>

        <div hidden={tab !== "interview"}>
          <InterviewView />
        </div>

        <div hidden={tab !== "mock"}>
          <MockInterviewView />
        </div>
      </main>
    </div>
  );
}

export default App;
