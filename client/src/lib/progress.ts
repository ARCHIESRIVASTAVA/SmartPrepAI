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
  /** recent days (YYYY-M-D) on which something was completed */
  days: string[];
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
  days: [],
};

const dayKey = (date = new Date()) =>
  `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;

const num = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : 0;

/** Turns untrusted saved or downloaded data into a valid Progress. */
export function sanitizeProgress(raw: unknown): Progress {
  const saved = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;

  const clears = { ...EMPTY.clears };
  const savedClears = (saved.clears ?? {}) as Record<string, unknown>;
  (Object.keys(clears) as Tab[]).forEach((key) => {
    clears[key] = num(savedClears[key]);
  });

  const topics: Record<string, TopicStat> = {};
  const savedTopics = (saved.topics ?? {}) as Record<string, TopicStat>;
  Object.keys(savedTopics)
    .slice(0, 50)
    .forEach((name) => {
      const stat = savedTopics[name];
      if (stat && num(stat.count) > 0) {
        topics[name.slice(0, 60)] = {
          total: num(stat.total),
          count: num(stat.count),
        };
      }
    });

  return {
    xp: num(saved.xp),
    streak: num(saved.streak),
    lastDay: typeof saved.lastDay === "string" ? saved.lastDay.slice(0, 12) : "",
    clears,
    topics,
    resume: typeof saved.resume === "string" ? saved.resume.slice(0, 3000) : "",
    dayXp: num(saved.dayXp),
    dayXpDate:
      typeof saved.dayXpDate === "string" ? saved.dayXpDate.slice(0, 12) : "",
    days: Array.isArray(saved.days)
      ? saved.days
          .filter((d): d is string => typeof d === "string")
          .map((d) => d.slice(0, 12))
          .slice(-60)
      : [],
  };
}

function load(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? sanitizeProgress(JSON.parse(raw)) : EMPTY;
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
    days: state.days.includes(today)
      ? state.days
      : [...state.days, today].slice(-60),
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

/**
 * The streak to show. A streak only grows when something is finished,
 * so it stays "pending" until then; once a full day is missed it is 0.
 */
export function streakNow(progress: Progress): {
  count: number;
  doneToday: boolean;
} {
  if (progress.lastDay === dayKey()) {
    return { count: progress.streak, doneToday: true };
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  return progress.lastDay === dayKey(yesterday)
    ? { count: progress.streak, doneToday: false }
    : { count: 0, doneToday: false };
}

/** XP earned today (resets at midnight). */
export function todayXp(progress: Progress): number {
  return progress.dayXpDate === dayKey() ? progress.dayXp : 0;
}

/** The last `count` days, oldest first, with whether each had activity. */
export function lastDays(progress: Progress, count = 7) {
  const out: { key: string; label: string; active: boolean; today: boolean }[] =
    [];

  for (let i = count - 1; i >= 0; i -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const key = dayKey(date);

    out.push({
      key,
      label: date.toLocaleDateString("en-US", { weekday: "narrow" }),
      active: progress.days.includes(key),
      today: i === 0,
    });
  }

  return out;
}

// ---------------- sync hooks ----------------

export const getProgress = () => state;

/** Replaces the whole state, for example with merged cloud data. */
export function replaceProgress(next: Progress) {
  commit(sanitizeProgress(next));
}

export function subscribeProgress(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
