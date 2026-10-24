import { useEffect, useState } from "react";
import {
  FileSearch,
  ListChecks,
  MessageSquare,
  Mic,
  type LucideIcon,
} from "lucide-react";
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
    id: "resume",
    number: "02",
    name: "Resume",
    place: "The Scanner",
    blurb:
      "Drop in your PDF resume and get feedback on strengths, gaps and ATS fixes.",
    perks: ["PDF upload", "ATS tips", "Gap report"],
    Icon: FileSearch,
  },
  {
    id: "interview",
    number: "03",
    name: "Questions",
    place: "The Forge",
    blurb:
      "Pick a topic, difficulty and count, and forge a set of placement-style interview questions.",
    perks: ["5 topics", "3 difficulties", "Up to your count"],
    Icon: ListChecks,
  },
  {
    id: "mock",
    number: "04",
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

  const stage = STAGES[index];

  const launch = (id: Tab) => {
    setLaunching(id);
    // Short zoom-in before the tool opens.
    window.setTimeout(() => onLaunch(id), 380);
  };

  useEffect(() => {
    if (launching) return;

    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        setIndex((i) => Math.min(STAGES.length - 1, i + 1));
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        setIndex((i) => Math.max(0, i - 1));
      } else if (event.key >= "1" && event.key <= "4") {
        setIndex(Number(event.key) - 1);
      } else if (event.key === "Enter") {
        // Let a focused button handle its own Enter.
        if (target?.tagName === "BUTTON") return;
        event.preventDefault();
        launch(STAGES[index].id);
      } else if (event.key === "Escape") {
        onBack();
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
      <div className="bar bar-top" aria-hidden="true" />
      <div className="bar bar-bottom" aria-hidden="true" />

      <header className="map-head">
        <button type="button" className="map-back" onClick={onBack}>
          ← Title
        </button>

        <h2>Select stage</h2>

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
                <Icon size={selected ? 26 : 22} aria-hidden="true" />
              </span>

              <span className="node-label">
                <span className="node-num">Stage {item.number}</span>
                <span className="node-name">{item.name}</span>
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

        <button
          type="button"
          className="enter-stage"
          onClick={() => launch(stage.id)}
        >
          Enter stage
        </button>
      </article>

      <p className="map-hint">
        <kbd>←</kbd> <kbd>→</kbd> move · <kbd>1</kbd>–<kbd>4</kbd> jump ·{" "}
        <kbd>Enter</kbd> start · <kbd>Esc</kbd> back
      </p>
    </section>
  );
}
