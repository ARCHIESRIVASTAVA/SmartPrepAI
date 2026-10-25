import { API_URL } from "../api";
import { friendlyError } from "./mock";

export type Flashcard = { q: string; a: string; topic?: string };
export type Slide = { title: string; bullets: string[]; note?: string };
export type QuizQuestion = {
  q: string;
  options: string[];
  answer: number;
  explanation: string;
};

/** POSTs to a /study route and returns the parsed body or throws a readable Error. */
export async function studyRequest<T>(
  path: "flashcards" | "slides" | "quiz",
  body: Record<string, unknown>
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${API_URL}/study/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(
      "Can't reach the server. Check your connection and try again."
    );
  }

  let data: { success?: boolean; message?: string } & Record<string, unknown>;

  try {
    data = await response.json();
  } catch {
    throw new Error("The server sent an unexpected reply. Try again.");
  }

  if (!response.ok || !data.success) {
    throw new Error(
      friendlyError(
        response.status,
        data.message,
        typeof data.message === "string" && response.status === 502
          ? data.message
          : "Something went wrong. Try again."
      )
    );
  }

  return data as T;
}
