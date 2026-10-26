import { useSyncExternalStore } from "react";
import type { Flashcard } from "./study";

/*
  Spaced repetition for flashcards (a Leitner system).

  Cards you miss are saved here. Each time you get one right in a
  review it moves up a box and comes back later; get it wrong and it
  drops back to box 1. Past the last box it counts as mastered and is
  removed. Stored in this browser's localStorage.
*/

export type ReviewCard = {
  id: string;
  q: string;
  a: string;
  topic: string;
  /** 1 to 4; due again after INTERVAL_DAYS[box] days */
  box: number;
  /** epoch ms when the card is next due */
  due: number;
};

export type ReviewState = { cards: ReviewCard[]; mastered: number };

const KEY = "smartprep-review-v1";
const DAY = 24 * 60 * 60 * 1000;

/** Days until a card is due again, by box (index 0 is unused). */
export const INTERVAL_DAYS = [0, 1, 3, 7, 14];
export const MAX_BOX = INTERVAL_DAYS.length - 1;
const MAX_CARDS = 300;

export const cardId = (topic: string, q: string) =>
  `${topic.trim().toLowerCase()}|${q.trim().toLowerCase()}`;

/** Turns untrusted saved or downloaded data into a valid ReviewState. */
export function sanitizeReview(raw: unknown): ReviewState {
  const saved = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;

  const cards: ReviewCard[] = [];
  if (Array.isArray(saved.cards)) {
    for (const item of saved.cards.slice(0, MAX_CARDS)) {
      const c = item as Partial<ReviewCard> | null;
      if (
        c &&
        typeof c.id === "string" &&
        typeof c.q === "string" &&
        typeof c.a === "string" &&
        typeof c.due === "number" &&
        Number.isFinite(c.due)
      ) {
        cards.push({
          id: c.id.slice(0, 400),
          q: c.q.slice(0, 600),
          a: c.a.slice(0, 1200),
          topic: typeof c.topic === "string" ? c.topic.slice(0, 60) : "General",
          box: Math.min(MAX_BOX, Math.max(1, Math.round(Number(c.box) || 1))),
          due: c.due,
        });
      }
    }
  }

  const mastered = Number(saved.mastered);
  return {
    cards,
    mastered: Number.isFinite(mastered) && mastered > 0 ? Math.floor(mastered) : 0,
  };
}

function load(): ReviewState {
  try {
    const raw = localStorage.getItem(KEY);
    return sanitizeReview(raw ? JSON.parse(raw) : null);
  } catch {
    return { cards: [], mastered: 0 };
  }
}

let state = load();
const listeners = new Set<() => void>();

function commit(next: ReviewState) {
  state = next;

  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage can be blocked; review then lasts for this visit only.
  }

  listeners.forEach((listener) => listener());
}

export function useReview(): ReviewState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state
  );
}

// ---------------- pure helpers ----------------

export const dueCards = (cards: ReviewCard[], now = Date.now()) =>
  cards.filter((card) => card.due <= now).sort((a, b) => a.due - b.due);

/** Result of answering a card: the updated card, or null when mastered. */
export function nextState(
  card: ReviewCard,
  knew: boolean,
  now = Date.now()
): ReviewCard | null {
  if (!knew) {
    return { ...card, box: 1, due: now + INTERVAL_DAYS[1] * DAY };
  }

  const box = card.box + 1;
  if (box > MAX_BOX) return null;

  return { ...card, box, due: now + INTERVAL_DAYS[box] * DAY };
}

/** "now", "in 3 hours", "tomorrow", "in 5 days" */
export function describeWait(due: number, now = Date.now()): string {
  const ms = due - now;
  if (ms <= 0) return "now";

  const hours = Math.round(ms / (60 * 60 * 1000));
  if (hours < 1) return "in under an hour";
  if (hours < 24) return `in ${hours} ${hours === 1 ? "hour" : "hours"}`;

  const days = Math.round(ms / DAY);
  return days <= 1 ? "tomorrow" : `in ${days} days`;
}

// ---------------- actions ----------------

/** Saves cards the player missed, due again in a day. */
export function saveMissed(cards: Flashcard[], now = Date.now()) {
  let list = [...state.cards];

  for (const card of cards) {
    const topic = card.topic ?? "General";
    const id = cardId(topic, card.q);

    const entry: ReviewCard = {
      id,
      q: card.q,
      a: card.a,
      topic,
      box: 1,
      due: now + INTERVAL_DAYS[1] * DAY,
    };

    list = [...list.filter((c) => c.id !== id), entry];
  }

  // Keep the soonest-due cards if the box ever overflows.
  list.sort((a, b) => a.due - b.due);
  commit({ ...state, cards: list.slice(0, MAX_CARDS) });
}

/** Records the result of a review answer. */
export function recordReview(card: Flashcard, knew: boolean, now = Date.now()) {
  const id = cardId(card.topic ?? "General", card.q);
  const existing = state.cards.find((c) => c.id === id);
  if (!existing) return;

  const updated = nextState(existing, knew, now);

  commit({
    cards: updated
      ? state.cards.map((c) => (c.id === id ? updated : c))
      : state.cards.filter((c) => c.id !== id),
    mastered: state.mastered + (updated ? 0 : 1),
  });
}

export function clearReview() {
  commit({ cards: [], mastered: 0 });
}

// ---------------- sync hooks ----------------

export const getReview = () => state;

export function replaceReview(next: ReviewState) {
  commit(sanitizeReview(next));
}

export function subscribeReview(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
