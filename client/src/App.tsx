import { useEffect, useState } from "react";
import {
  FileSearch,
  Highlighter,
  Layers,
  ListChecks,
  MessageSquare,
  Mic,
  Presentation,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { API_URL } from "./api";
import { Companion } from "./components/Companion";
import { ReminderButton } from "./components/ReminderButton";
import { RewardLayer } from "./components/RewardLayer";
import type { Screen, ServerState, Tab } from "./types";
import { StageSelect } from "./views/StageSelect";
import { TitleScreen } from "./views/TitleScreen";
import { AskView } from "./views/AskView";
import { FlashcardsView } from "./views/FlashcardsView";
import { QuizView } from "./views/QuizView";
import { SlidesView } from "./views/SlidesView";
import { InterviewView } from "./views/InterviewView";
import { MockInterviewView } from "./views/MockInterviewView";
import { ResumeView } from "./views/ResumeView";
import "./App.css";
import "./stages.css";
import "./study.css";
import "./life.css";

const NAV_ITEMS: { id: Tab; label: string; Icon: LucideIcon }[] = [
  { id: "ask", label: "Ask", Icon: MessageSquare },
  { id: "cards", label: "Flashcards", Icon: Layers },
  { id: "slides", label: "Slides", Icon: Presentation },
  { id: "quiz", label: "Quiz blitz", Icon: Zap },
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
  const [screen, setScreen] = useState<Screen>("title");

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
    <>
      <RewardLayer />

      {screen === "title" && (
        <TitleScreen
          serverState={serverState}
          onStart={() => setScreen("map")}
        />
      )}

      {screen === "map" && (
        <StageSelect
          serverState={serverState}
          onBack={() => setScreen("title")}
          onLaunch={(id) => {
            setTab(id);
            setScreen("app");
          }}
        />
      )}

    <div className="shell" hidden={screen !== "app"}>
      <aside className="rail">
        <button
          type="button"
          className="brand"
          title="Back to stage select"
          onClick={() => setScreen("map")}
        >
          <span className="brand-mark" aria-hidden="true">
            <Highlighter size={16} />
          </span>

          <span className="brand-name">SmartPrep AI</span>
        </button>

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

        <Companion tab={tab} visible={screen === "app"} />

        <ReminderButton />

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

        <div hidden={tab !== "cards"}>
          <FlashcardsView active={screen === "app" && tab === "cards"} />
        </div>

        <div hidden={tab !== "slides"}>
          <SlidesView active={screen === "app" && tab === "slides"} />
        </div>

        <div hidden={tab !== "quiz"}>
          <QuizView active={screen === "app" && tab === "quiz"} />
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
    </>
  );
}

export default App;
