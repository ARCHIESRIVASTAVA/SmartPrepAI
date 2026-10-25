/*
  Remembers the questions this browser has already been shown, per
  topic, so the next deck or quiz can ask the AI for different ones.
*/

const KEY = "smartprep-seen-v1";
const PER_TOPIC = 30;

type Seen = Record<string, string[]>;

function read(): Seen {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

const norm = (topic: string) => topic.trim().toLowerCase();

export function getSeen(topic: string): string[] {
  return read()[norm(topic)] ?? [];
}

export function addSeen(topic: string, questions: string[]) {
  const all = read();
  const key = norm(topic);
  const merged = [...(all[key] ?? []), ...questions];
  // De-duplicate, keeping the most recent ones.
  const unique = merged.filter((q, i) => merged.lastIndexOf(q) === i);

  all[key] = unique.slice(-PER_TOPIC);

  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // Storage can be blocked; variety then relies on the AI alone.
  }
}
