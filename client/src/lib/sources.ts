/** "OS_Full_Notes.pdf" -> "OS Full Notes" */
export function prettySource(name: string) {
  return name
    .replace(/\.pdf$/i, "")
    .replace(/_+/g, " ")
    .trim();
}

export function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const SKIP = new Set(
  "the and for with what how why does explain about between difference".split(" ")
);

/** Splits text into pieces, marking the words that also appear in the question. */
export function highlightTerms(
  text: string,
  question: string
): { text: string; hit: boolean }[] {
  const terms = question
    .toLowerCase()
    .split(/[^a-z0-9+#]+/)
    .filter((word) => word.length > 2 && !SKIP.has(word));

  if (terms.length === 0) return [{ text, hit: false }];

  const escaped = terms.map((term) =>
    term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  );

  const pattern = new RegExp(`(${escaped.join("|")})`, "gi");

  return text
    .split(pattern)
    .filter(Boolean)
    .map((piece) => ({
      text: piece,
      hit: terms.includes(piece.toLowerCase()),
    }));
}
