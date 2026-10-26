import { useEffect, useRef, useState, type FormEvent } from "react";
import { MessageCircle, RotateCcw, Send, X } from "lucide-react";
import { Pip } from "./Pip";
import { formatAIResponse } from "../lib/format";
import {
  loadChat,
  saveChat,
  streamTutor,
  type ChatTurn,
  type TutorContext,
} from "../lib/tutor";

const STARTERS = [
  "Explain a hash map simply",
  "How do I answer 'tell me about yourself'?",
  "Make me a 3-day revision plan",
  "Difference between process and thread",
];

type Props = {
  context: TutorContext;
  /** hide the launcher on screens where it would be in the way */
  hidden?: boolean;
};

/** Floating study-buddy chat powered by Gemini. */
export function TutorChat({ context, hidden }: Props) {
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>(loadChat);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const abort = useRef<AbortController | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  // Keep the newest message in view as text streams in.
  useEffect(() => {
    const node = scroller.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [turns, open, error]);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => () => abort.current?.abort(), []);

  const send = async (text: string) => {
    const clean = text.trim().slice(0, 2000);
    if (!clean || busy) return;

    const history: ChatTurn[] = [...turns, { role: "user", text: clean }];
    setTurns([...history, { role: "model", text: "" }]);
    setDraft("");
    setError("");
    setBusy(true);

    const controller = new AbortController();
    abort.current = controller;
    let reply = "";

    const update = (value: string) =>
      setTurns([...history, { role: "model", text: value }]);

    try {
      await streamTutor(
        history,
        context,
        {
          onToken: (piece) => {
            reply += piece;
            update(reply);
          },
          onError: (message) => setError(message),
        },
        controller.signal
      );
    } catch (err) {
      if ((err as Error).name !== "AbortError" && !reply) {
        setError("Can't reach Pip right now. Check your connection and try again.");
      }
    } finally {
      setBusy(false);
      const finalTurns = reply
        ? [...history, { role: "model" as const, text: reply }]
        : history;
      setTurns(finalTurns);
      saveChat(finalTurns);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void send(draft);
  };

  const reset = () => {
    abort.current?.abort();
    setTurns([]);
    setError("");
    saveChat([]);
  };

  if (hidden) return null;

  return (
    <>
      {!open && (
        <button
          type="button"
          className="tutor-fab"
          aria-label="Chat with Pip"
          onClick={() => setOpen(true)}
        >
          <MessageCircle size={22} aria-hidden="true" />
          <span>Ask Pip</span>
        </button>
      )}

      {open && (
        <section className="tutor-panel" role="dialog" aria-label="Chat with Pip">
          <header className="tutor-head">
            <Pip mood={busy ? "cheer" : "happy"} size={34} />
            <div>
              <strong>Pip</strong>
              <small>Your study buddy</small>
            </div>

            {turns.length > 0 && (
              <button
                type="button"
                className="tutor-icon"
                aria-label="Start a new chat"
                title="New chat"
                onClick={reset}
              >
                <RotateCcw size={16} aria-hidden="true" />
              </button>
            )}

            <button
              type="button"
              className="tutor-icon"
              aria-label="Close chat"
              onClick={() => setOpen(false)}
            >
              <X size={18} aria-hidden="true" />
            </button>
          </header>

          <div className="tutor-log" ref={scroller} aria-live="polite">
            {turns.length === 0 && (
              <div className="tutor-empty">
                <p>
                  Hi! Ask me anything about DSA, core CS subjects, resumes or
                  interviews.
                </p>
                <div className="tutor-starters">
                  {STARTERS.map((text) => (
                    <button key={text} type="button" onClick={() => void send(text)}>
                      {text}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {turns.map((turn, i) => (
              <div key={i} className={`tutor-msg is-${turn.role}`}>
                {turn.role === "model" ? (
                  turn.text ? (
                    <div className="answer-content">
                      {formatAIResponse(turn.text)}
                    </div>
                  ) : (
                    <span className="tutor-typing" aria-label="Pip is typing">
                      <i /><i /><i />
                    </span>
                  )
                ) : (
                  turn.text
                )}
              </div>
            ))}

            {error && (
              <p className="tutor-error" role="alert">
                {error}
              </p>
            )}
          </div>

          <form className="tutor-form" onSubmit={submit}>
            <textarea
              ref={input}
              rows={1}
              value={draft}
              maxLength={2000}
              placeholder="Ask Pip anything"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send(draft);
                }
              }}
            />
            <button
              type="submit"
              className="tutor-send"
              aria-label="Send"
              disabled={busy || !draft.trim()}
            >
              <Send size={18} aria-hidden="true" />
            </button>
          </form>
        </section>
      )}
    </>
  );
}
