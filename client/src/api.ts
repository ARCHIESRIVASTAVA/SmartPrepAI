export const API_URL = "https://smartprepai-5ujb.onrender.com";

export type Source = {
  source: string;
  chunkIndex: number;
  score: number;
  /** the sentence of the passage that best matches the question */
  excerpt?: string;
};

export type SourceType = "study_material" | "web";

export type WebSource = {
  title: string;
  url: string;
};

// ---------------- STREAMING CHAT ----------------
// Reads Server-Sent Events from POST /chat/stream and reports
// each piece to the caller as it arrives.

export type StreamHandlers = {
  onMeta: (meta: {
    sources: Source[];
    sourceType: SourceType;
  }) => void;
  onToken: (text: string) => void;
  onDone: (info: { webSources: WebSource[] }) => void;
  onError: (message: string) => void;
};

// Throws if the stream could not be started or broke before
// any text arrived, so the caller can fall back to POST /chat.
// Errors the server reports itself go to onError instead.
export async function streamChat(
  message: string,
  handlers: StreamHandlers
): Promise<void> {
  const response = await fetch(`${API_URL}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  // Rate limited: show the server's message instead of retrying with
  // POST /chat, which would only use up more of the shared quota.
  if (response.status === 429) {
    const body = await response.json().catch(() => ({}));
    handlers.onError(
      body.message || "The AI is very busy. Please try again in a minute."
    );
    return;
  }

  if (!response.ok || !response.body) {
    throw new Error(`Stream failed (${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let buffer = "";
  let receivedText = false;
  let finished = false;

  const handleEvent = (raw: string) => {
    let event = "message";
    let data = "";

    for (const line of raw.split("\n")) {
      if (line.startsWith("event:")) {
        event = line.slice(6).trim();
      } else if (line.startsWith("data:")) {
        data += line.slice(5).trim();
      }
    }

    if (!data) return;

    const payload = JSON.parse(data);

    if (event === "meta") {
      handlers.onMeta({
        sources: payload.sources || [],
        sourceType: payload.sourceType,
      });
    } else if (event === "token") {
      receivedText = true;
      handlers.onToken(payload.text || "");
    } else if (event === "done") {
      finished = true;
      handlers.onDone({
        webSources: payload.webSources || [],
      });
    } else if (event === "error") {
      finished = true;
      handlers.onError(
        payload.message || "Something went wrong."
      );
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE events are separated by a blank line.
      const parts = buffer.split("\n\n");
      buffer = parts.pop() || "";

      parts.forEach(handleEvent);
    }
  } catch (error) {
    // Connection dropped mid-stream. Keep what we have if any
    // text arrived; otherwise let the caller fall back.
    if (!receivedText) throw error;
  }

  if (!finished && !receivedText) {
    throw new Error("Stream ended without a response");
  }
}
