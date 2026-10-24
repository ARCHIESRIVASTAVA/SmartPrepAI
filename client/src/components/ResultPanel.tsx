import { formatAIResponse } from "../lib/format";
import { CopyButton } from "./CopyButton";

export function ResultPanel({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <article className="result">
      <header className="result-head">
        <span className="result-title">{title}</span>
        <CopyButton text={text} label="Copy" />
      </header>

      <div className="answer-content">
        {formatAIResponse(text)}
      </div>
    </article>
  );
}
