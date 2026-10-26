/*
  Remembers recent answers to the Ask question so a repeated question
  (very common when friends try the app together) costs no Gemini
  calls at all. In memory only; it resets when the server restarts.
*/

export type CachedAnswer = {
  sourceType: "study_material" | "web";
  reply: string;
  sources: unknown[];
  webSources: { title: string; url: string }[];
  retrievedChunks: number;
};

const TTL_MS = 6 * 60 * 60 * 1000;
const MAX_ENTRIES = 300;

const store = new Map<string, { at: number; value: CachedAnswer }>();

/** "What is  Polymorphism?" and "what is polymorphism" share a key. */
export const normalizeQuestion = (question: string) =>
  question
    .toLowerCase()
    .replace(/[^a-z0-9+#\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function getAnswer(question: string): CachedAnswer | null {
  const key = normalizeQuestion(question);
  const hit = store.get(key);
  if (!hit) return null;

  if (Date.now() - hit.at > TTL_MS) {
    store.delete(key);
    return null;
  }

  // Refresh recency so popular questions stay.
  store.delete(key);
  store.set(key, hit);
  return hit.value;
}

export function saveAnswer(question: string, value: CachedAnswer) {
  const key = normalizeQuestion(question);
  if (!key || !value.reply.trim()) return;

  store.delete(key);
  store.set(key, { at: Date.now(), value });

  while (store.size > MAX_ENTRIES) {
    const oldest = store.keys().next().value;
    if (oldest === undefined) break;
    store.delete(oldest);
  }
}
