/*
  Parsing and validation for the JSON that Gemini returns for
  flashcards, slides and quizzes. Anything malformed is dropped
  rather than sent to the client.
*/

export type Flashcard = { q: string; a: string };
export type Slide = { title: string; bullets: string[]; note?: string };
export type QuizQuestion = {
  q: string;
  options: string[];
  answer: number;
  explanation: string;
};

/** Pulls a JSON value out of a model reply, even inside code fences. */
export function parseJson(text: string | undefined): unknown {
  if (!text) return null;

  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.search(/[\[{]/);
    const end = Math.max(cleaned.lastIndexOf("]"), cleaned.lastIndexOf("}"));

    if (start === -1 || end <= start) return null;

    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

const str = (value: unknown, max: number): string =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

/** Accepts an array, or an object wrapping one under a known key. */
function asArray(value: unknown, key: string): unknown[] {
  if (Array.isArray(value)) return value;

  if (value && typeof value === "object") {
    const inner = (value as Record<string, unknown>)[key];
    if (Array.isArray(inner)) return inner;
  }

  return [];
}

export function validateFlashcards(value: unknown): Flashcard[] {
  return asArray(value, "cards")
    .map((item) => {
      const card = item as Record<string, unknown>;
      return { q: str(card?.q, 300), a: str(card?.a, 600) };
    })
    .filter((card) => card.q && card.a);
}

export function validateSlides(value: unknown): Slide[] {
  return asArray(value, "slides")
    .map((item) => {
      const slide = item as Record<string, unknown>;
      const bullets = Array.isArray(slide?.bullets)
        ? slide.bullets
            .map((bullet) => str(bullet, 200))
            .filter(Boolean)
            .slice(0, 6)
        : [];
      const note = str(slide?.note, 400);

      return {
        title: str(slide?.title, 90),
        bullets,
        ...(note && { note }),
      };
    })
    .filter((slide) => slide.title && slide.bullets.length > 0);
}

export function validateQuiz(value: unknown): QuizQuestion[] {
  return asArray(value, "questions")
    .map((item) => {
      const entry = item as Record<string, unknown>;
      const options = Array.isArray(entry?.options)
        ? entry.options.map((option) => str(option, 160)).filter(Boolean)
        : [];

      return {
        q: str(entry?.q, 400),
        options,
        answer: Number(entry?.answer),
        explanation: str(entry?.explanation, 400),
      };
    })
    .filter(
      (question) =>
        question.q &&
        question.options.length === 4 &&
        Number.isInteger(question.answer) &&
        question.answer >= 0 &&
        question.answer < 4
    );
}

/** Topic text from the client: short, single line, no control characters. */
export function cleanTopic(value: unknown, fallback = "DSA"): string {
  const topic =
    typeof value === "string"
      ? value.replace(/[\u0000-\u001f]+/g, " ").trim().slice(0, 60)
      : "";

  return topic || fallback;
}

export function clampCount(
  value: unknown,
  min: number,
  max: number,
  fallback: number
): number {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}
