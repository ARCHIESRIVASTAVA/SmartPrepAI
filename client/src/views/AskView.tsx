import { useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import {
  streamChat,
  API_URL,
  type Source,
  type SourceType,
  type WebSource,
} from "../api";
import { CopyButton } from "../components/CopyButton";
import { ErrorNote } from "../components/ErrorNote";
import { formatAIResponse } from "../lib/format";
import { hostOf, prettySource } from "../lib/sources";

const EXAMPLE_QUESTIONS = [
  "Explain how paging works in an operating system",
  "What are the ACID properties? Give an example for each",
  "What is the difference between a process and a thread?",
  "Write binary search in C++ and explain its time complexity",
];

export function AskView() {
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");
  const [sources, setSources] =
    useState<Source[]>([]);
  const [chatLoading, setChatLoading] =
    useState(false);
  const [sourceType, setSourceType] =
    useState<SourceType | null>(null);
  const [webSources, setWebSources] =
    useState<WebSource[]>([]);
  const [chatError, setChatError] = useState("");
  const questionInput =
    useRef<HTMLTextAreaElement>(null);

  const sendMessage = async () => {
    if (!message.trim()) return;

    setChatLoading(true);
    setReply("");
    setSources([]);
    setSourceType(null);
    setWebSources([]);
    setChatError("");

    try {
      // Preferred path: stream the answer as it is generated.
      await streamChat(message.trim(), {
        onMeta: (meta) => {
          setSources(meta.sources);
          setSourceType(meta.sourceType);
        },
        onToken: (text) =>
          setReply((previous) => previous + text),
        onDone: (info) => setWebSources(info.webSources),
        // Any text that already arrived stays on screen;
        // the error is shown separately underneath it.
        onError: (errorMessage) => setChatError(errorMessage),
      });
    } catch (streamError) {
      console.error(
        "Streaming failed, using standard request:",
        streamError
      );

      // Fallback path: the original single-response request.
      try {
        const response = await fetch(
          `${API_URL}/chat`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              message: message.trim(),
            }),
          }
        );

        const data = await response.json();

        if (data.success) {
          setReply(data.reply || "");
          setSources(data.sources || []);
          setSourceType(data.sourceType ?? null);
          setWebSources(data.webSources || []);
        } else {
          setChatError(
            data.message ||
              "Something went wrong."
          );
        }
      } catch (error) {
        console.error(error);

        setChatError(
          "Unable to connect to SmartPrep AI. Please try again."
        );
      }
    } finally {
      setChatLoading(false);
    }
  };

  const progressText =
    sourceType === "study_material"
      ? `Found ${sources.length} ${
          sources.length === 1 ? "passage" : "passages"
        } in your notes. Writing the answer…`
      : sourceType === "web"
        ? "Nothing in your notes matched closely. Searching the web…"
        : "Searching your notes…";

  const sourcesPanel = (
    <aside
      className="margin"
      aria-label="Sources for this answer"
    >
      {sourceType === "study_material" && (
        <>
          <h2>From your notes</h2>

          <p className="margin-note">
            Ranked by how closely each passage matches
            your question.
          </p>

          <ul className="source-list">
            {sources.map((item, index) => {
              const percent = Math.round(item.score * 100);

              return (
                <li
                  className="source"
                  key={`${item.source}-${item.chunkIndex}-${index}`}
                >
                  <div className="source-name">
                    {prettySource(item.source)}
                  </div>

                  <div className="match">
                    <span
                      className="match-bar"
                      aria-hidden="true"
                    >
                      <span style={{ width: `${percent}%` }} />
                    </span>

                    <span className="match-pct">
                      {percent}% match
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {sourceType === "web" && (
        <>
          <h2>From the web</h2>

          <p className="margin-note">
            Nothing in your notes matched closely, so
            this answer used web search.
          </p>

          {webSources.length > 0 ? (
            <ul className="source-list">
              {webSources.map((item) => (
                <li className="source" key={item.url}>
                  <a
                    className="web-link"
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {item.title}
                  </a>

                  <span className="web-host">
                    {hostOf(item.url)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="margin-note">
              {chatLoading
                ? "Links appear when the answer finishes."
                : "No links were returned."}
            </p>
          )}
        </>
      )}

      {sourceType === null && (
        <>
          <h2>Sources</h2>

          <p className="margin-note">
            Passages from your notes show up here as soon as
            they are found, with how closely each one
            matches.
          </p>
        </>
      )}
    </aside>
  );

  return (
    <div className="ask-layout">
      <section
        className="column"
        aria-labelledby="ask-title"
      >
        <header className="page-head">
          <h1 id="ask-title">
            Ask about any placement topic
          </h1>

          <p>
            Answers come from your study notes first.
            When the notes don't cover a question,
            SmartPrep searches the web instead.
          </p>
        </header>

        <div className="composer">
          <textarea
            ref={questionInput}
            aria-label="Your question"
            value={message}
            onChange={(e) =>
              setMessage(e.target.value)
            }
            onKeyDown={(e) => {
              if (
                (e.metaKey || e.ctrlKey) &&
                e.key === "Enter"
              ) {
                e.preventDefault();

                if (!chatLoading) sendMessage();
              }
            }}
            placeholder="Explain binary search in simple terms"
          />

          <div className="composer-bar">
            <span className="hint">
              Ctrl or ⌘ + Enter to send
            </span>

            <button
              className="primary-button"
              onClick={sendMessage}
              disabled={
                chatLoading || !message.trim()
              }
            >
              {chatLoading ? (
                <>
                  <LoaderCircle
                    className="spin"
                    size={16}
                    aria-hidden="true"
                  />
                  Working
                </>
              ) : (
                "Ask"
              )}
            </button>
          </div>
        </div>

        {chatLoading && !reply && (
          <p className="progress" role="status">
            <LoaderCircle
              className="spin"
              size={16}
              aria-hidden="true"
            />
            {progressText}
          </p>
        )}

        {chatError && !reply && (
          <ErrorNote message={chatError} />
        )}

        {!chatLoading && !reply && (
          <div className="examples">
            <p>Not sure where to start? Try one of these.</p>

            {EXAMPLE_QUESTIONS.map((example) => (
              <button
                key={example}
                type="button"
                className="example"
                onClick={() => {
                  setMessage(example);
                  questionInput.current?.focus();
                }}
              >
                {example}
              </button>
            ))}
          </div>
        )}

        {reply && (
          <article
            className="answer"
            aria-busy={chatLoading}
          >
            <header className="result-head">
              <span className="result-title">
                SmartPrep AI
              </span>

              {!chatLoading && (
                <CopyButton
                  text={reply}
                  label="Copy answer"
                />
              )}
            </header>

            <div className="answer-content">
              {formatAIResponse(reply)}
            </div>

            {chatLoading && (
              <span
                className="caret"
                aria-hidden="true"
              />
            )}
          </article>
        )}

        {chatError && reply && (
          <ErrorNote message={chatError} />
        )}
      </section>

      {sourcesPanel}
    </div>
  );
}
