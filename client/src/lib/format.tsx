import { type ReactElement } from "react";
import { CodeBlock } from "../components/CodeBlock";

export function formatAIResponse(text: string) {
  const lines = text.split("\n");
  const elements: ReactElement[] = [];

  let codeBuffer: string[] = [];
  let inCode = false;
  let codeLanguage = "";

  const flushCode = () => {
    if (codeBuffer.length > 0) {
      elements.push(
        <CodeBlock
          key={`code-${elements.length}`}
          language={codeLanguage || "code"}
          code={codeBuffer.join("\n")}
        />
      );

      codeBuffer = [];
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (trimmed.startsWith("```")) {
      if (inCode) {
        inCode = false;
        flushCode();
      } else {
        inCode = true;
        codeLanguage =
          trimmed.replace("```", "") || "code";
      }

      return;
    }

    if (inCode) {
      codeBuffer.push(line);
      return;
    }

    if (!trimmed) {
      elements.push(
        <div
          className="answer-space"
          key={`space-${index}`}
        />
      );

      return;
    }

    if (trimmed.startsWith("### ")) {
      elements.push(
        <h3
          className="answer-heading"
          key={index}
        >
          {trimmed.replace("### ", "")}
        </h3>
      );

      return;
    }

    if (trimmed.startsWith("## ")) {
      elements.push(
        <h2
          className="answer-heading"
          key={index}
        >
          {trimmed.replace("## ", "")}
        </h2>
      );

      return;
    }

    if (trimmed === "---") {
      elements.push(
        <hr
          className="answer-divider"
          key={index}
        />
      );

      return;
    }

    if (/^[-*]\s/.test(trimmed)) {
      elements.push(
        <div
          className="bullet-item"
          key={index}
        >
          <span>•</span>

          <span>
            {formatInline(trimmed.slice(2))}
          </span>
        </div>
      );

      return;
    }

    if (/^\d+\.\s/.test(trimmed)) {
      const match = trimmed.match(
        /^(\d+)\.\s(.+)/
      );

      if (match) {
        elements.push(
          <div
            className="number-item"
            key={index}
          >
            <span className="number-badge">
              {match[1]}
            </span>

            <span>
              {formatInline(match[2])}
            </span>
          </div>
        );

        return;
      }
    }

    elements.push(
      <p
        className="answer-paragraph"
        key={index}
      >
        {formatInline(trimmed)}
      </p>
    );
  });

  if (inCode) {
    flushCode();
  }

  return elements;
}

function formatInline(text: string) {
  const parts = text.split(
    /(\*\*.*?\*\*|`.*?`|\*[^*\s][^*]*\*)/g
  );

  return parts.map((part, index) => {
    if (
      part.startsWith("**") &&
      part.endsWith("**")
    ) {
      return (
        <strong key={index}>
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (
      part.startsWith("`") &&
      part.endsWith("`")
    ) {
      return (
        <code
          className="inline-code"
          key={index}
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    if (
      part.length > 2 &&
      part.startsWith("*") &&
      part.endsWith("*")
    ) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }

    return part;
  });
}
