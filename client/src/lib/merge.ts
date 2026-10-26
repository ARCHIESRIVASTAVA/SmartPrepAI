import type { Progress } from "./progress";
import type { ReviewCard, ReviewState } from "./review";
import type { Seen } from "./seen";

/*
  Combines two copies of a player's data (this device and the cloud)
  without losing either side. Pure functions, so they are easy to test.
*/

/** Day keys look like 2026-10-26 without padding, so parse them. */
const dayValue = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return y && m && d ? y * 372 + m * 31 + d : 0;
};

export function mergeProgress(a: Progress, b: Progress): Progress {
  const clears = { ...a.clears };
  (Object.keys(clears) as (keyof typeof clears)[]).forEach((key) => {
    clears[key] = Math.max(a.clears[key], b.clears[key]);
  });

  const topics = { ...a.topics };
  for (const [name, stat] of Object.entries(b.topics)) {
    const mine = topics[name];
    if (!mine || stat.count > mine.count) topics[name] = stat;
  }

  // The side active most recently owns the streak.
  const newer = dayValue(b.lastDay) > dayValue(a.lastDay) ? b : a;
  const streak =
    a.lastDay === b.lastDay ? Math.max(a.streak, b.streak) : newer.streak;

  const dayNewer = dayValue(b.dayXpDate) > dayValue(a.dayXpDate) ? b : a;
  const sameDay = a.dayXpDate === b.dayXpDate;

  const days = [...new Set([...a.days, ...b.days])]
    .sort((x, y) => dayValue(x) - dayValue(y))
    .slice(-60);

  return {
    xp: Math.max(a.xp, b.xp),
    streak,
    lastDay: newer.lastDay,
    clears,
    topics,
    resume: a.resume || b.resume,
    dayXp: sameDay ? Math.max(a.dayXp, b.dayXp) : dayNewer.dayXp,
    dayXpDate: dayNewer.dayXpDate,
    days,
  };
}

export function mergeReview(a: ReviewState, b: ReviewState): ReviewState {
  const byId = new Map<string, ReviewCard>();

  for (const card of [...a.cards, ...b.cards]) {
    const old = byId.get(card.id);
    if (
      !old ||
      card.box > old.box ||
      (card.box === old.box && card.due > old.due)
    ) {
      byId.set(card.id, card);
    }
  }

  const cards = [...byId.values()].sort((x, y) => x.due - y.due).slice(0, 300);
  return { cards, mastered: Math.max(a.mastered, b.mastered) };
}

export function mergeSeen(a: Seen, b: Seen): Seen {
  const out: Seen = {};

  for (const topic of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const merged = [...(b[topic] ?? []), ...(a[topic] ?? [])];
    out[topic] = merged.filter((q, i) => merged.indexOf(q) === i).slice(-30);
  }

  return out;
}

export type CloudData = {
  progress: Progress;
  review: ReviewState;
  seen: Seen;
};

export const mergeAll = (a: CloudData, b: CloudData): CloudData => ({
  progress: mergeProgress(a.progress, b.progress),
  review: mergeReview(a.review, b.review),
  seen: mergeSeen(a.seen, b.seen),
});
