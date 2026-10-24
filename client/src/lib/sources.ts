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
