/*
  A tiny event bus for moments the interface should react to:
  XP earned, level ups, a finished daily goal, and mood changes for
  the companion. Anything can emit; the shell listens.
*/

export type Mood = "idle" | "happy" | "sad" | "cheer";

export type RewardEvent =
  | { type: "xp"; amount: number }
  | { type: "level"; level: number }
  | { type: "goal" }
  | { type: "confetti" }
  | { type: "say"; mood: Mood; text: string };

const listeners = new Set<(event: RewardEvent) => void>();

export function onReward(listener: (event: RewardEvent) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emit(event: RewardEvent) {
  listeners.forEach((listener) => listener(event));
}

export const pick = <T,>(items: readonly T[]): T =>
  items[Math.floor(Math.random() * items.length)];

export const CHEERS = [
  "Nice one!",
  "That's the way.",
  "You're on a roll.",
  "Sharp thinking.",
  "Look at you go.",
] as const;

export const ENCOURAGEMENTS = [
  "Tricky one. It's saved so you can beat it later.",
  "Missing is how it sticks. Next one.",
  "Close. It'll come back tomorrow.",
  "Everyone misses that one at first.",
] as const;
