import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { ErrorNote } from "../components/ErrorNote";
import { Segmented } from "../components/Segmented";
import { TopicPicker } from "../components/TopicPicker";
import { award } from "../lib/progress";
import {
  describeWait,
  dueCards,
  recordReview,
  saveMissed,
  useReview,
} from "../lib/review";
import { studyRequest, type Flashcard } from "../lib/study";

const COUNTS = [5, 10, 15];

type Props = { active: boolean };

export function FlashcardsView({ active }: Props) {
  const review = useReview();
  const [source, setSource] = useState<"new" | "review">("new");
  const [topic, setTopic] = useState("DSA");
  const [count, setCount] = useState(10);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // The deck as dealt, plus the live queue (missed cards go to the back once).
  const [deck, setDeck] = useState<Flashcard[]>([]);
  const [queue, setQueue] = useState<Flashcard[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [firstTry, setFirstTry] = useState(0);
  const [missed, setMissed] = useState<Flashcard[]>([]);
  const [requeued, setRequeued] = useState<Set<string>>(new Set());

  const due = dueCards(review.cards);
  const nextDue = review.cards.length
    ? Math.min(...review.cards.map((c) => c.due))
    : null;

  const playing = deck.length > 0;
  const done = playing && index >= queue.length;
  const card = queue[index];

  const deal = (cards: Flashcard[]) => {
    setDeck(cards);
    setQueue(cards);
    setIndex(0);
    setFlipped(false);
    setFirstTry(0);
    setMissed([]);
    setRequeued(new Set());
  };

  const generate = async () => {
    setBusy(true);
    setError("");

    try {
      const data = await studyRequest<{ cards: Flashcard[] }>("flashcards", {
        topic: topic.trim() || "DSA",
        count,
      });

      setSource("new");
      deal(data.cards.map((c) => ({ ...c, topic: topic.trim() || "DSA" })));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const startReview = () => {
    setError("");
    setSource("review");
    deal(
      due.slice(0, 20).map((c) => ({ q: c.q, a: c.a, topic: c.topic }))
    );
  };

  const grade = (knew: boolean) => {
    if (!card || !flipped) return;

    const isRepeat = requeued.has(card.q);
    const next = index + 1;

    // Only the first try at a card changes what is saved.
    if (!isRepeat) {
      if (source === "review") recordReview(card, knew);
      else if (!knew) saveMissed([card]);
    }

    if (knew) {
      if (!isRepeat) setFirstTry((n) => n + 1);
    } else if (!isRepeat) {
      setMissed((list) => [...list, card]);
      setRequeued((set) => new Set(set).add(card.q));
      setQueue((list) => [...list, card]);
    }

    setIndex(next);
    setFlipped(false);

    // Last card of the final pass: give XP once.
    if (next >= (knew || isRepeat ? queue.length : queue.length + 1)) {
      const first = knew && !isRepeat ? firstTry + 1 : firstTry;
      award("cards", 10 + first * 2);
    }
  };

  useEffect(() => {
    if (!active || !playing || done) return;

    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

      if (event.key === " " || event.key === "Enter") {
        if (target?.tagName === "BUTTON") return;
        event.preventDefault();
        setFlipped((f) => !f);
      } else if (event.key === "ArrowLeft" || event.key === "1") {
        grade(false);
      } else if (event.key === "ArrowRight" || event.key === "2") {
        grade(true);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <section className="column" aria-labelledby="cards-title">
      <header className="page-head">
        <h1 id="cards-title">Flashcards</h1>

        <p>
          Flip a card, then mark whether you knew it. Cards you miss come
          back once at the end, then return on later days until you know them.
        </p>
      </header>

      {!playing && review.cards.length > 0 && (
        <div className="review-box">
          <div>
            <strong>
              {due.length > 0
                ? `${due.length} ${
                    due.length === 1 ? "card" : "cards"
                  } due for review`
                : "Nothing due for review"}
            </strong>

            <span>
              {review.cards.length} saved
              {review.mastered > 0 && ` · ${review.mastered} mastered`}
              {due.length === 0 &&
                nextDue !== null &&
                ` · next ${describeWait(nextDue)}`}
            </span>
          </div>

          {due.length > 0 && (
            <button className="primary-button" onClick={startReview}>
              Start review
            </button>
          )}
        </div>
      )}

      {!playing && (
        <>
          <div className="controls">
            <TopicPicker
              value={topic}
              onChange={setTopic}
              allowCustom
              disabled={busy}
            />

            <Segmented
              label="Cards"
              value={count}
              options={COUNTS}
              onChange={setCount}
            />
          </div>

          <div className="actions">
            <button
              className="primary-button"
              onClick={generate}
              disabled={busy || !topic.trim()}
            >
              {busy ? (
                <>
                  <LoaderCircle className="spin" size={16} aria-hidden="true" />
                  Building deck
                </>
              ) : (
                "Build deck"
              )}
            </button>
          </div>
        </>
      )}

      {playing && !done && card && (
        <>
          <p className="deck-progress" role="status">
            Card {Math.min(index + 1, queue.length)} of {queue.length}
            {queue.length > deck.length && " (includes retries)"}
          </p>

          <button
            type="button"
            className={`flash${flipped ? " is-flipped" : ""}`}
            onClick={() => setFlipped((f) => !f)}
            aria-label={flipped ? "Answer shown. Flip back" : "Flip to see the answer"}
          >
            <span className="flash-inner">
              <span className="flash-face flash-front">
                <small>Question</small>
                {card.q}
              </span>

              <span className="flash-face flash-back">
                <small>Answer</small>
                {card.a}
              </span>
            </span>
          </button>

          <div className="actions actions-row">
            <button
              type="button"
              className="ghost-button"
              onClick={() => grade(false)}
              disabled={!flipped}
            >
              Missed it
            </button>

            <button
              type="button"
              className="primary-button"
              onClick={() => grade(true)}
              disabled={!flipped}
            >
              Knew it
            </button>

            <span className="hint">
              Space flips · ← missed · → knew it
            </span>
          </div>
        </>
      )}

      {done && (
        <div className="result deck-result">
          <h2>{source === "review" ? "Review done" : "Deck done"}</h2>

          <p>
            You knew {firstTry} of {deck.length} on the first try.
            {missed.length > 0
              ? ` ${missed.length} ${
                  missed.length === 1 ? "card" : "cards"
                } saved to come back tomorrow.`
              : " A clean sweep."}
          </p>

          <div className="actions actions-row">
            {missed.length > 0 && (
              <button
                className="primary-button"
                onClick={() => deal(missed)}
              >
                Retry missed cards
              </button>
            )}

            <button
              className="ghost-button"
              onClick={() => {
                setDeck([]);
                setQueue([]);
              }}
            >
              New deck
            </button>
          </div>
        </div>
      )}

      {error && <ErrorNote message={error} />}
    </section>
  );
}
