import { Router } from "express";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { guard, sendAiError } from "../lib/gemini";
import {
  clampCount,
  cleanTopic,
  parseJson,
  validateFlashcards,
  validateQuiz,
  validateSlides,
} from "./studyParse";

dotenv.config();

const router = Router();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("❌ GEMINI_API_KEY not found in .env");
}

const ai = new GoogleGenAI({ apiKey });


/**
 * Identical prompts make the model return near-identical content, so
 * every request gets a random angle, a higher temperature, and a list
 * of questions this player has already seen.
 */
const ANGLES = [
  "core definitions and fundamentals",
  "tricky edge cases and common mistakes",
  "real-world scenarios and practical use",
  "comparisons between similar concepts",
  "how it works internally, step by step",
  "questions interviewers use to catch weak answers",
  "performance, complexity and trade-offs",
  "small examples and what-would-happen questions",
];

const pickAngle = () => ANGLES[Math.floor(Math.random() * ANGLES.length)];

/** Past questions from the client, trimmed to a safe size. */
function cleanExclude(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.replace(/[\u0000-\u001f]+/g, " ").trim().slice(0, 160))
    .filter(Boolean)
    .slice(-30);
}

const variety = (exclude: string[]) => `
Focus this time on: ${pickAngle()}.
Make this set different from any other you might write for the same topic.
${
  exclude.length
    ? `Do not repeat or closely rephrase any of these questions the student has already seen:\n${exclude
        .map((q) => `- ${q}`)
        .join("\n")}\n`
    : ""
}`;

/**
 * Asks Gemini for JSON and validates it. Tries twice because the
 * model occasionally returns malformed JSON.
 */
async function generate<T>(
  prompt: string,
  validate: (value: unknown) => T[],
  minimum: number
): Promise<T[]> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const response = await guard((model) =>
      ai.models.generateContent({
        model,
        contents: prompt,
        config: { responseMimeType: "application/json", temperature: 1.2 },
      })
    );

    const items = validate(parseJson(response.text));

    if (items.length >= minimum) return items;
  }

  return [];
}

function fail(res: any, error: any, fallback: string) {
  return sendAiError(res, error, fallback);
}

/* FLASHCARDS */

router.post("/flashcards", async (req, res) => {
  try {
    const topic = cleanTopic(req.body?.topic);
    const count = clampCount(req.body?.count, 3, 20, 10);

    const prompt = `
You are creating flashcards for a software engineering placement interview.

Topic: ${topic}

Create ${count} flashcards. Each has a short question on the front and a
clear, correct answer on the back (1 to 3 sentences, include a tiny example
if it helps). Cover the most commonly asked ideas, from basic to harder.

${variety(cleanExclude(req.body?.exclude))}
Return ONLY JSON in this shape:
[{"q": "question", "a": "answer"}]
`;

    const cards = await generate(prompt, validateFlashcards, 1);

    if (cards.length === 0) {
      return res.status(502).json({
        success: false,
        message: "Couldn't build a deck this time. Try again.",
      });
    }

    return res.status(200).json({ success: true, topic, cards });
  } catch (error) {
    return fail(res, error, "Failed to generate flashcards");
  }
});

/* SLIDES */

router.post("/slides", async (req, res) => {
  try {
    const topic = cleanTopic(req.body?.topic);

    const prompt = `
You are a teacher preparing a short slide deck so a student can learn
"${topic}" for a software engineering placement interview.

Create 7 slides:
1. Title-style overview slide
2-6. Key ideas, each with a clear title and 3 to 5 short bullet points
7. "Common interview questions" slide with 3 to 4 bullets

Rules:
- Bullets are short phrases or one sentence, not paragraphs.
- Be technically correct and specific.
- "note" is one optional sentence of speaker advice, such as a mnemonic or a common mistake.

${variety([])}
Return ONLY JSON in this shape:
[{"title": "string", "bullets": ["string"], "note": "string"}]
`;

    const slides = await generate(prompt, validateSlides, 3);

    if (slides.length === 0) {
      return res.status(502).json({
        success: false,
        message: "Couldn't build the slides this time. Try again.",
      });
    }

    return res.status(200).json({ success: true, topic, slides });
  } catch (error) {
    return fail(res, error, "Failed to generate slides");
  }
});

/* QUIZ */

router.post("/quiz", async (req, res) => {
  try {
    const topic = cleanTopic(req.body?.topic);
    const difficulty = ["Easy", "Medium", "Hard"].includes(
      req.body?.difficulty
    )
      ? req.body.difficulty
      : "Medium";
    const count = clampCount(req.body?.count, 3, 15, 10);

    const prompt = `
You are writing a multiple-choice quiz for a software engineering placement test.

Topic: ${topic}
Difficulty: ${difficulty}

Write ${count} questions. Each has exactly 4 options, exactly one correct.
Make wrong options plausible. Vary which position is correct.
"answer" is the 0-based index of the correct option.
"explanation" is one or two sentences on why it is correct.

${variety(cleanExclude(req.body?.exclude))}
Return ONLY JSON in this shape:
[{"q": "string", "options": ["a","b","c","d"], "answer": 0, "explanation": "string"}]
`;

    const questions = await generate(prompt, validateQuiz, 3);

    if (questions.length === 0) {
      return res.status(502).json({
        success: false,
        message: "Couldn't build the quiz this time. Try again.",
      });
    }

    return res.status(200).json({
      success: true,
      topic,
      difficulty,
      questions,
    });
  } catch (error) {
    return fail(res, error, "Failed to generate quiz");
  }
});

export default router;
