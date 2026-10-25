import { ArrowRight, Flame } from "lucide-react";
import { TOPICS } from "../constants";
import {
  DAILY_GOAL,
  lastDays,
  levelInfo,
  todayXp,
  topicAverage,
  useProgress,
  weakestTopic,
} from "../lib/progress";
import { dueCards, useReview } from "../lib/review";
import type { Tab } from "../types";

type Props = { onGo: (tab: Tab) => void };

/** Side panel that fills the wide screen with the player's day. */
export function TodayPanel({ onGo }: Props) {
  const progress = useProgress();
  const review = useReview();

  const info = levelInfo(progress.xp);
  const week = lastDays(progress, 7);
  const today = todayXp(progress);
  const due = dueCards(review.cards).length;
  const weak = weakestTopic(progress, TOPICS);

  const next: { text: string; tab: Tab } =
    due > 0
      ? {
          text: `Review ${due} ${due === 1 ? "card" : "cards"}`,
          tab: "cards",
        }
      : today < DAILY_GOAL
        ? { text: `Quick quiz on ${weak.topic}`, tab: "quiz" }
        : { text: "Try a mock interview", tab: "mock" };

  return (
    <aside className="today" aria-label="Your day">
      <h2>Today</h2>

      <div className="today-week" aria-label="Last 7 days">
        {week.map((day) => (
          <span
            key={day.key}
            className={`day${day.active ? " on" : ""}${day.today ? " now" : ""}`}
          >
            {day.active ? <Flame size={13} aria-hidden="true" /> : <i />}
            <small>{day.label}</small>
          </span>
        ))}
      </div>

      <p className="today-streak">
        {progress.streak > 0
          ? `${progress.streak}-day streak`
          : "Start a streak today"}
      </p>

      <div className="today-level">
        <div>
          <strong>Level {info.level}</strong>
          <span>
            {info.into}/{info.needed} XP
          </span>
        </div>

        <span className="bar-track">
          <span style={{ width: `${info.fraction * 100}%` }} />
        </span>
      </div>

      <div className="today-level">
        <div>
          <strong>Daily goal</strong>
          <span>
            {Math.min(today, DAILY_GOAL)}/{DAILY_GOAL} XP
          </span>
        </div>

        <span className="bar-track goal">
          <span style={{ width: `${Math.min(1, today / DAILY_GOAL) * 100}%` }} />
        </span>
      </div>

      <div className="today-topics">
        <h3>Topics</h3>

        {TOPICS.map((topic) => {
          const avg = topicAverage(progress.topics[topic]);

          return (
            <div key={topic} className="topic-row">
              <span>
                {topic === "Operating Systems"
                  ? "OS"
                  : topic === "Computer Networks"
                    ? "Networks"
                    : topic}
              </span>

              <span className="bar-track">
                <span style={{ width: `${((avg ?? 0) / 10) * 100}%` }} />
              </span>

              <small>{avg === null ? "new" : `${Math.round(avg * 10) / 10}`}</small>
            </div>
          );
        })}
      </div>

      <button type="button" className="next-up" onClick={() => onGo(next.tab)}>
        <span>
          <small>Next up</small>
          {next.text}
        </span>

        <ArrowRight size={16} aria-hidden="true" />
      </button>
    </aside>
  );
}
