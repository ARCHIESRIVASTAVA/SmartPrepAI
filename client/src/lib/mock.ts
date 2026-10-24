// ---------------- MOCK INTERVIEW HELPERS ----------------

/** Reads "Score: 7/10" (also "**Score: 7/10**", "Score: 7.5/10"). */
export function parseScore(evaluation: string): number | null {
  const match = evaluation.match(
    /score\s*:?\s*\**\s*(\d+(?:\.\d+)?)\s*\/\s*10/i
  );

  if (!match) return null;

  const value = Number(match[1]);

  return value >= 0 && value <= 10 ? value : null;
}

/**
 * Prepares the evaluation text for display: drops the score line
 * (it is shown as a badge instead) and turns the section labels
 * into headings so they read as sections.
 */
export function prepareEvaluation(evaluation: string): string {
  return evaluation
    .replace(
      /^[ \t]*\**[ \t]*score[ \t]*:?[ \t]*\**[ \t]*\d+(?:\.\d+)?[ \t]*\/[ \t]*10[ \t]*\**[ \t]*$/im,
      ""
    )
    .replace(
      /^[ \t]*\**[ \t]*(what you did well|what you missed|how to improve|ideal approach)[ \t]*:?[ \t]*\**[ \t]*$/gim,
      (_match, label: string) =>
        `### ${label.charAt(0).toUpperCase()}${label
          .slice(1)
          .toLowerCase()}`
    )
    .trim();
}

export function scoreClass(score: number) {
  if (score >= 7) return "score score-good";
  if (score < 5) return "score score-low";
  return "score";
}

/** Turns raw API errors (quota, network) into something readable. */
export function friendlyError(
  status: number,
  message: unknown,
  fallback: string
) {
  const text = typeof message === "string" ? message : "";

  if (status === 429 || /quota|rate.?limit|429/i.test(text)) {
    return "The AI service has hit its usage limit. Wait a minute and try again.";
  }

  return fallback;
}

// ---------------- END MOCK INTERVIEW HELPERS ----------------
