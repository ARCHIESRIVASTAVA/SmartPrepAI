import { API_URL } from "../api";

export type ChatTurn = { role: "user" | "model"; text: string };

export type TutorContext = { stage?: string; weak?: string; level?: number };

/** Streams Pip's reply token by token. Throws if it could not start. */
export async function streamTutor(
  messages: ChatTurn[],
  context: TutorContext,
  handlers: {
    onToken: (text: string) => void;
    onError: (message: string) => void;
  },
  signal?: AbortSignal
): Promise<void> {
  const response = await fetch(`${API_URL}/tutor/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, context }),
    signal,
  });

  if (!response.ok || !response.body) {
    throw new Error(`Chat failed (${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finished = false;

  const handle = (raw: string) => {
    let event = "message";
    let data = "";
    for (const line of raw.split("\n")) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) data += line.slice(5).trim();
    }
    if (!data) return;

    const payload = JSON.parse(data);
    if (event === "token") handlers.onToken(payload.text || "");
    else if (event === "done") finished = true;
    else if (event === "error") {
      finished = true;
      handlers.onError(payload.message || "Something went wrong.");
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";
    parts.forEach(handle);
  }

  if (!finished) throw new Error("The reply was cut off");
}

// ---------------- saved conversation ----------------

const KEY = "smartprep-tutor-v1";
const KEEP = 40;

export function loadChat(): ChatTurn[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(
        (t) =>
          t &&
          (t.role === "user" || t.role === "model") &&
          typeof t.text === "string"
      )
      .slice(-KEEP);
  } catch {
    return [];
  }
}

export function saveChat(turns: ChatTurn[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(turns.slice(-KEEP)));
  } catch {
    // Storage can be blocked; the chat then lasts for this visit only.
  }
}
