import { useEffect, useState } from "react";
import {
  Layers,
  Presentation,
  Zap,
  Flame,
  Lock,
  Star,
  FileSearch,
  ListChecks,
  MessageSquare,
  Mic,
  type LucideIcon,
} from "lucide-react";
import { SkillRadar } from "../components/SkillRadar";
import { TOPICS } from "../constants";
import {
  bossUnlocked,
  levelInfo,
  resetProgress,
  stars,
  useProgress,
  weakestTopic,
} from "../lib/progress";
import { dueCards, useReview } from "../lib/review";
import { makeShareCard } from "../lib/shareCard";
import type { ServerState, Tab } from "../types";

type Stage = {
  id: Tab;
  number: string;
  name: string;
  place: string;
  blurb: string;
  perks: string[];
  boss?: boolean;
  Icon: LucideIcon;
};

const STAGES: Stage[] = [
  {
    id: "ask",
    number: "01",
    name: "Ask",
    place: "The Archive",
    blurb:
      "Ask anything about DSA, OOP, DBMS, OS or networks. Answers stream in, grounded in 12 placement PDFs.",
    perks: ["RAG answers", "Source passages", "Web fallback"],
    Icon: MessageSquare,
  },
  {
    id: "cards",
    number: "02",
    name: "Flashcards",
    place: "The Vault",
    blurb:
      "Flip through an AI-built deck on any topic. Mark what you knew, and the cards you missed come back.",
    perks: ["Any topic", "5 to 15 cards", "Missed cards repeat"],
    Icon: Layers,
  },
  {
    id: "slides",
    number: "03",
    name: "Slides",
    place: "The Lecture Hall",
    blurb:
      "Get a short study deck on a topic, flip through it with the arrow keys, and download it as a PowerPoint file.",
    perks: ["7 slides", "Your own topic", "Download .pptx"],
    Icon: Presentation,
  },
  {
    id: "quiz",
    number: "04",
    name: "Quiz blitz",
    place: "The Gauntlet",
    blurb:
      "Ten timed multiple-choice questions, three lives. Streaks and quick answers score extra.",
    perks: ["20s per question", "3 lives", "Streak bonus"],
    Icon: Zap,
  },
  {
    id: "resume",
    number: "05",
    name: "Resume",
    place: "The Scanner",
    blurb:
      "Drop in your PDF resume and get feedback on strengths, gaps and ATS fixes.",
    perks: ["PDF upload", "ATS tips", "Gap report"],
    Icon: FileSearch,
  },
  {
    id: "interview",
    number: "06",
    name: "Questions",
    place: "The Forge",
    blurb:
      "Pick a topic, difficulty and count, and forge a set of placement-style interview questions.",
    perks: ["5 topics", "3 difficulties", "Up to your count"],
    Icon: ListChecks,
  },
  {
    id: "mock",
    number: "07",
    name: "Mock interview",
    place: "The Arena",
    blurb:
      "Boss fight. One question at a time, every answer scored out of 10 with what you missed.",
    perks: ["Scored 0–10", "No repeats", "Skip or end anytime"],
    boss: true,
    Icon: Mic,
  },
];

type Props = {
  serverState: ServerState;
  onLaunch: (tab: Tab) => void;
  onBack: () => void;
};

export function StageSelect({ serverState, onLaunch, onBack }: Props) {
  const [index, setIndex] = useState(0);
  const [launching, setLaunching] = useState<Tab | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const progress = useProgress();
  const review = useReview();
  const dueCount = dueCards(review.cards).length;
  const info = levelInfo(progress.xp);
  const unlocked = bossUnlocked(progress);
  const weak = weakestTopic(progress, TOPICS);

  const stage = STAGES[index];

  const locked = (id: Tab) => id === "mock" && !unlocked;

  const launch = (id: Tab) => {
    if (locked(id)) return;
    setLaunching(id);
    // Short zoom-in before the tool opens.
    window.setTimeout(() => onLaunch(id), 380);
  };

  useEffect(() => {
    if (launching) return;

    const onKey = (event: KeyboardEvent) => {
      if (profileOpen) {
        if (event.key === "Escape") setProfileOpen(false);
        return;
      }

      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        setIndex((i) => Math.min(STAGES.length - 1, i + 1));
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        setIndex((i) => Math.max(0, i - 1));
      } else if (event.key >= "1" && event.key <= "7") {
        setIndex(Number(event.key) - 1);
      } else if (event.key === "Enter") {
        // Let a focused button handle its own Enter.
        if (target?.tagName === "BUTTON") return;
        event.preventDefault();
        launch(STAGES[index].id);
      } else if (event.key === "Escape") {
        onBack();
      } else if (event.key === "p" || event.key === "P") {
        setProfileOpen(true);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <section
      className={`stage-select${launching ? " is-launching" : ""}`}
      aria-label="Choose a stage"
    >
      <div className="fx-grid" aria-hidden="true" />
      <div className="fx-glow" aria-hidden="true" />

      <header className="map-head">
        <button type="button" className="map-back" onClick={onBack}>
          ← Title
        </button>

        <h2>Select stage</h2>

        <div className="map-right">
        <button
          type="button"
          className="hud"
          onClick={() => setProfileOpen(true)}
          aria-label={`Level ${info.level}, ${progress.xp} XP. Open profile`}
        >
          <span className="hud-level">LV {info.level}</span>

          <span className="hud-xp" aria-hidden="true">
            <span style={{ width: `${info.fraction * 100}%` }} />
          </span>

          {progress.streak > 0 && (
            <span className="hud-streak">
              <Flame size={13} aria-hidden="true" />
              {progress.streak}
            </span>
          )}
        </button>

        <span className="map-status">
          <span
            className={`status-dot status-${serverState}`}
            aria-hidden="true"
          />
          {serverState === "ready"
            ? "Online"
            : serverState === "offline"
              ? "Offline"
              : "Starting"}
        </span>
        </div>
      </header>

      <div className="map-track" role="listbox" aria-label="Stages">
        <div className="map-path" aria-hidden="true">
          <span
            className="map-path-fill"
            style={{ ["--progress" as string]: index / (STAGES.length - 1) }}
          />
        </div>

        {STAGES.map((item, i) => {
          const selected = i === index;
          const { Icon } = item;

          return (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={selected}
              className={`node${selected ? " is-selected" : ""}${
                item.boss ? " is-boss" : ""
              }`}
              onMouseEnter={() => setIndex(i)}
              onFocus={() => setIndex(i)}
              onClick={() => (selected ? launch(item.id) : setIndex(i))}
              onDoubleClick={() => launch(item.id)}
            >
              <span className="node-orb">
                {locked(item.id) ? (
                  <Lock size={20} aria-hidden="true" />
                ) : (
                  <Icon size={selected ? 26 : 22} aria-hidden="true" />
                )}
              </span>

              <span className="node-label">
                <span className="node-num">Stage {item.number}</span>
                <span className="node-name">{item.name}</span>

                <span
                  className="node-stars"
                  aria-label={`${stars(progress.clears[item.id])} of 3 stars`}
                >
                  {[1, 2, 3].map((n) => (
                    <Star
                      key={n}
                      size={13}
                      aria-hidden="true"
                      className={
                        n <= stars(progress.clears[item.id]) ? "on" : ""
                      }
                    />
                  ))}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <article className="briefing" key={stage.id} aria-live="polite">
        <p className="briefing-tag">
          {stage.boss ? "Boss stage" : `Stage ${stage.number}`} ·{" "}
          {stage.place}
        </p>

        <h3>{stage.name}</h3>
        <p className="briefing-blurb">{stage.blurb}</p>

        <ul className="briefing-perks">
          {stage.perks.map((perk) => (
            <li key={perk}>{perk}</li>
          ))}
        </ul>

        {locked(stage.id) ? (
          <p className="briefing-lock">
            <Lock size={14} aria-hidden="true" /> Clear Ask, Resume and Questions
            once each to unlock the boss.
          </p>
        ) : (
          <button
            type="button"
            className="enter-stage"
            onClick={() => launch(stage.id)}
          >
            Enter stage
          </button>
        )}

        {stage.id === "cards" && dueCount > 0 && (
          <p className="briefing-tip">
            {dueCount} {dueCount === 1 ? "card is" : "cards are"} due for
            review.
          </p>
        )}

        {(stage.id === "interview" || stage.id === "mock") && (
          <p className="briefing-tip">
            {weak.average === null
              ? `Tip: you haven't tried ${weak.topic} yet.`
              : `Tip: your weakest topic is ${weak.topic} (${
                  Math.round(weak.average * 10) / 10
                }/10).`}
          </p>
        )}
      </article>

      <p className="map-hint">
        <kbd>←</kbd> <kbd>→</kbd> move · <kbd>1</kbd>–<kbd>7</kbd> jump ·{" "}
        <kbd>Enter</kbd> start · <kbd>P</kbd> profile · <kbd>Esc</kbd> back
      </p>

      {profileOpen && (
        <div
          className="profile-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Player profile"
          onClick={() => setProfileOpen(false)}
        >
          <div className="profile" onClick={(e) => e.stopPropagation()}>
            <header>
              <h3>
                Level {info.level}
                <small>
                  {info.into}/{info.needed} XP to next level
                </small>
              </h3>

              <button
                type="button"
                className="ghost-button"
                autoFocus
                onClick={() => setProfileOpen(false)}
              >
                Close
              </button>
            </header>

            <SkillRadar progress={progress} />

            <p className="profile-note">
              Radar shows your average mock-interview score per topic.
              {progress.clears.mock === 0 &&
                " Finish a mock interview answer to fill it in."}
            </p>

            <ul className="profile-stats">
              <li>{progress.xp} XP</li>
              <li>{progress.streak} day streak</li>
              <li>{progress.clears.ask} answers</li>
              <li>{progress.clears.mock} mock answers</li>
            </ul>

            <div className="profile-actions">
              <button
                type="button"
                className="enter-stage"
                onClick={async () => {
                  const blob = await makeShareCard(progress);
                  if (!blob) return;
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "smartprep-card.png";
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                Download share card
              </button>

              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  if (window.confirm("Reset all progress on this browser?")) {
                    resetProgress();
                  }
                }}
              >
                Reset progress
              </button>
            </div>

            <p className="profile-note">
              Progress is saved in this browser only.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
