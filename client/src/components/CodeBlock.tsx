import { CopyButton } from "./CopyButton";

export function CodeBlock({
  language,
  code,
}: {
  language: string;
  code: string;
}) {
  return (
    <div className="code-block">
      <div className="code-header">
        <span>{language}</span>
        <CopyButton text={code} label="Copy" />
      </div>

      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}
