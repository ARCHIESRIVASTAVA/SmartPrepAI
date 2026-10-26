import { useEffect, useRef, useState } from "react";
import { Pip } from "./Pip";
import {
  DAILY_GOAL,
  levelInfo,
  streakNow,
  todayXp,
  useProgress,
} from "../lib/progress";
import { dueCards, useReview } from "../lib/review";
import { CHEERS, onReward, pick, type Mood } from "../lib/rewards";
import type { Tab } from "../types";

const TIPS: Record<Tab, string> = {
  ask: "Ask me anything. I'll show you where in your notes it came from.",
  cards: "Flip, then be honest. Missed cards come back to help you.",
  slides: "Type your own topic if it isn't in the list.",
  quiz: "Keys 1 to 4 answer fast. Streaks score extra.",
  resume: "Upload your resume and I'll point out what to fix first.",
  interview: "Try answering each question out loud before looking anything up.",
  mock: "Take your time. A calm, structured answer beats a rushed one.",
};

type Props = {
  tab: Tab;
  /** true while the tools screen is showing */
  visible: boolean;
};

/** Pip plus a speech bubble that reacts to progress and gives tips. */
export function Companion({ tab, visible }: Props) {
  const progress = useProgress();
  const review = useReview();
  const [mood, setMood] = useState<Mood>("idle");
  const [text, setText] = useState("");
  const timer = useRef<number | undefined>(undefined);

  const say = (message: string, nextMood: Mood = "idle", ms = 7000) => {
    window.clearTimeout(timer.current);
    setText(message);
    setMood(nextMood);

    timer.current = window.setTimeout(() => {
      setText("");
      setMood("idle");
    }, ms);
  };

  // Greeting and per-tool tip whenever the tools screen or tab changes.
  useEffect(() => {
    if (!visible) return;

    const greet = () => {

    const due = dueCards(review.cards).length;
    const doneToday = todayXp(progress) > 0;
    const streak = streakNow(progress).count;

    if (due > 0 && tab === "cards") {
      say(`${due} ${due === 1 ? "card is" : "cards are"} waiting for review.`);
    } else if (streak > 0 && !doneToday) {
      say(
        `${streak}-day streak. Do one thing today to keep it.`,
        "happy"
      );
    } else {
      say(TIPS[tab]);
    }
    };

    // Deferred a tick so the bubble opens after the screen switch.
    const id = window.setTimeout(greet, 250);
    return () => window.clearTimeout(id);
    // Only when the screen or tab changes, not on every XP change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, visible]);

  useEffect(
    () =>
      onReward((event) => {
        if (event.type === "xp") {
          say(`+${event.amount} XP. ${pick(CHEERS)}`, "happy", 3500);
        } else if (event.type === "level") {
          say(`Level ${event.level}! You're getting good at this.`, "cheer", 6000);
        } else if (event.type === "goal") {
          say("Daily goal done. That's a good day's work.", "cheer", 6000);
        } else if (event.type === "say") {
          say(event.text, event.mood, 5000);
        }
      }),
    []
  );

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const goal = Math.min(1, todayXp(progress) / DAILY_GOAL);
  const info = levelInfo(progress.xp);
  const circumference = 2 * Math.PI * 15;

  return (
    <div className="companion">
      <div className="companion-top">
        <Pip mood={mood} size={52} />

        <div className="companion-stats">
          <span className="companion-level">Level {info.level}</span>

          <span
            className="goal-ring-wrap"
            title={`Daily goal: ${Math.min(
              todayXp(progress),
              DAILY_GOAL
            )} of ${DAILY_GOAL} XP`}
          >
            <svg width="38" height="38" viewBox="0 0 38 38" aria-hidden="true">
              <circle className="goal-track" cx="19" cy="19" r="15" />
              <circle
                className="goal-fill"
                cx="19"
                cy="19"
                r="15"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - goal)}
              />
            </svg>

            <span className="goal-label">
              {goal >= 1 ? "Goal met" : `${todayXp(progress)}/${DAILY_GOAL} XP today`}
            </span>
          </span>
        </div>
      </div>

      <p className={`bubble${text ? " is-open" : ""}`} role="status" aria-live="polite">
        {text}
      </p>
    </div>
  );
}
