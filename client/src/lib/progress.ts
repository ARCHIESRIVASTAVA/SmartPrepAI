import { useSyncExternalStore } from "react";
import type { Tab } from "../types";
import { emit } from "./rewards";

/*
  Player progress, kept in this browser's localStorage.
  XP, level, daily streak, per-stage clears and per-topic scores.
*/

export type TopicStat = { total: number; count: number };

export type Progress = {
  xp: number;
  streak: number;
  lastDay: string;
  /** how many times each stage was completed */
  clears: Record<Tab, number>;
  /** mock interview scores per topic */
  topics: Record<string, TopicStat>;
  /** latest resume analysis, used to personalise the mock interview */
  resume: string;
  /** XP earned on `dayXpDate`, for the daily goal */
  dayXp: number;
  dayXpDate: string;
};

export const DAILY_GOAL = 30;

const KEY = "smartprep-progress-v1";

const EMPTY: Progress = {
  xp: 0,
  streak: 0,
  lastDay: "",
  clears: {
    ask: 0,
    cards: 0,
    slides: 0,
    quiz: 0,
    resume: 0,
    interview: 0,
    mock: 0,
  },
  topics: {},
  resume: "",
  dayXp: 0,
  dayXpDate: "",
};

const dayKey = (date = new Date()) =>
  `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;

    const saved = JSON.parse(raw) as Partial<Progress>;

    return {
      ...EMPTY,
      ...saved,
      clears: { ...EMPTY.clears, ...saved.clears },
      topics: { ...saved.topics },
    };
  } catch {
    return EMPTY;
  }
}

let state: Progress = load();
const listeners = new Set<() => void>();

function commit(next: Progress) {
  state = next;

  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage can be blocked; progress then lasts for this visit only.
  }

  listeners.forEach((listener) => listener());
}

export function useProgress(): Progress {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state
  );
}

// ---------------- levels ----------------

/** XP needed to reach a level: 0, 100, 300, 600, 1000 ... */
export const xpForLevel = (level: number) => 50 * level * (level - 1);

export function levelInfo(xp: number) {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level += 1;

  const floor = xpForLevel(level);
  const next = xpForLevel(level + 1);

  return {
    level,
    into: xp - floor,
    needed: next - floor,
    fraction: (xp - floor) / (next - floor),
  };
}

export function stars(clears: number): 0 | 1 | 2 | 3 {
  if (clears >= 6) return 3;
  if (clears >= 3) return 2;
  if (clears >= 1) return 1;
  return 0;
}

export const bossUnlocked = (progress: Progress) =>
  progress.clears.ask > 0 &&
  progress.clears.resume > 0 &&
  progress.clears.interview > 0;

// ---------------- actions ----------------

export const XP = { ask: 10, resume: 25, interview: 15 } as const;

function withStreak(current: Progress): Pick<Progress, "streak" | "lastDay"> {
  const today = dayKey();
  if (current.lastDay === today) {
    return { streak: current.streak, lastDay: today };
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  return {
    streak: current.lastDay === dayKey(yesterday) ? current.streak + 1 : 1,
    lastDay: today,
  };
}

/** Records a finished action in a stage and gives XP. */
export function award(
  stage: Tab,
  xp: number,
  extra?: { topic?: string; score?: number; resume?: string }
) {
  const topics = { ...state.topics };

  if (extra?.topic && typeof extra.score === "number") {
    const old = topics[extra.topic] ?? { total: 0, count: 0 };
    topics[extra.topic] = {
      total: old.total + extra.score,
      count: old.count + 1,
    };
  }

  const before = levelInfo(state.xp).level;
  const today = dayKey();
  const dayBefore = state.dayXpDate === today ? state.dayXp : 0;
  const dayAfter = dayBefore + xp;

  commit({
    ...state,
    ...withStreak(state),
    dayXp: dayAfter,
    dayXpDate: today,
    xp: state.xp + xp,
    clears: { ...state.clears, [stage]: state.clears[stage] + 1 },
    topics,
    resume: extra?.resume ?? state.resume,
  });

  emit({ type: "xp", amount: xp });

  const after = levelInfo(state.xp).level;
  if (after > before) emit({ type: "level", level: after });
  else if (dayBefore < DAILY_GOAL && dayAfter >= DAILY_GOAL) {
    emit({ type: "goal" });
  }
}

export function resetProgress() {
  commit(EMPTY);
}

// ---------------- derived ----------------

export function topicAverage(stat: TopicStat | undefined): number | null {
  return stat && stat.count ? stat.total / stat.count : null;
}

/** Practised topic with the lowest average, or the first untouched one. */
export function weakestTopic(
  progress: Progress,
  topics: readonly string[]
): { topic: string; average: number | null } {
  const untouched = topics.find((t) => !progress.topics[t]?.count);
  if (untouched) return { topic: untouched, average: null };

  let worst = topics[0];
  let worstAvg = Infinity;

  for (const topic of topics) {
    const avg = topicAverage(progress.topics[topic]) ?? 10;
    if (avg < worstAvg) {
      worst = topic;
      worstAvg = avg;
    }
  }

  return { topic: worst, average: worstAvg };
}

/** XP earned today (resets at midnight). */
export function todayXp(progress: Progress): number {
  return progress.dayXpDate === dayKey() ? progress.dayXp : 0;
}
