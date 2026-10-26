import { useEffect } from "react";
import { AccountChip } from "../components/AccountChip";
import { useAuth } from "../lib/cloud";
import { Pip } from "../components/Pip";
import type { ServerState } from "../types";

const STATUS_TEXT: Record<ServerState, string> = {
  checking: "Connecting to server",
  waking: "Waking the server, up to a minute",
  ready: "Server online",
  offline: "Server unreachable, you can still look around",
};

type Props = {
  serverState: ServerState;
  onStart: () => void;
};

export function TitleScreen({ serverState, onStart }: Props) {
  const { modalOpen } = useAuth();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (modalOpen || tag === "INPUT" || tag === "BUTTON") return;

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onStart();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onStart, modalOpen]);

  const loading = serverState === "checking" || serverState === "waking";

  return (
    <section
      className="title-screen"
      aria-label="SmartPrep AI title screen"
      onClick={onStart}
    >
      <div className="fx-grid" aria-hidden="true" />
      <div className="fx-glow" aria-hidden="true" />
      <div className="fx-scan" aria-hidden="true" />

      <div
        className="title-account"
        onClick={(event) => event.stopPropagation()}
      >
        <AccountChip />
      </div>

      <div className="title-center">
        <div className="title-pip">
          <Pip mood="happy" size={84} />
        </div>

        <p className="title-kicker">Placement prep, level by level</p>

        <h1 className="title-logo">
          <span>Smart</span>
          <span className="title-logo-accent">Prep</span>
          <span className="title-logo-ai">AI</span>
        </h1>

        <div
          className={`load-bar${loading ? " is-loading" : " is-done"}`}
          aria-hidden="true"
        >
          <span />
        </div>

        <p className="title-status" role="status">
          {STATUS_TEXT[serverState]}
        </p>

        <button
          type="button"
          className="press-start"
          onClick={(event) => {
            event.stopPropagation();
            onStart();
          }}
        >
          Press Enter to start
        </button>
      </div>

      <p className="title-foot">7 stages · 1 boss fight</p>
    </section>
  );
}
