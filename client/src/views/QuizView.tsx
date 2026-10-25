import { useEffect, useRef, useState } from "react";
import { Heart, LoaderCircle } from "lucide-react";
import { ErrorNote } from "../components/ErrorNote";
import { Segmented } from "../components/Segmented";
import { TopicPicker } from "../components/TopicPicker";
import { DIFFICULTIES } from "../constants";
import { award } from "../lib/progress";
import { addSeen, getSeen } from "../lib/seen";
import { CHEERS, emit, ENCOURAGEMENTS, pick } from "../lib/rewards";
import { studyRequest, type QuizQuestion } from "../lib/study";

const SECONDS = 20;
const LIVES = 3;

type Props = { active: boolean };

type Phase = "setup" | "question" | "reveal" | "over";

export function QuizView({ active }: Props) {
  const [topic, setTopic] = useState("DSA");
  const [difficulty, setDifficulty] = useState("Medium");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [phase, setPhase] = useState<Phase>("setup");
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [left, setLeft] = useState(SECONDS);
  const [lives, setLives] = useState(LIVES);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [points, setPoints] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [gain, setGain] = useState(0);
  const [reward, setReward] = useState(0);

  const question = questions[index];

  // The countdown lives in a ref so the timer callback can see the
  // current time and the latest answer handler without an extra effect.
  const leftRef = useRef(SECONDS);
  const answerRef = useRef<(choice: number) => void>(() => {});

  const resetTimer = () => {
    leftRef.current = SECONDS;
    setLeft(SECONDS);
  };

  const start = async () => {
    setBusy(true);
    setError("");

    try {
      const data = await studyRequest<{ questions: QuizQuestion[] }>("quiz", {
        topic: topic.trim() || "DSA",
        difficulty,
        count: 10,
        exclude: getSeen(topic),
      });

      addSeen(topic, data.questions.map((q) => q.q));

      setQuestions(data.questions);
      setIndex(0);
      setPicked(null);
      resetTimer();
      setLives(LIVES);
      setStreak(0);
      setBestStreak(0);
      setPoints(0);
      setCorrect(0);
      setAnswered(0);
      setGain(0);
      setPhase("question");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const finish = (finalPoints: number, finalCorrect: number, finalAnswered: number) => {
    const xp = Math.round(finalPoints / 2);

    setReward(xp);
    setPhase("over");

    if (finalAnswered > 0 && finalCorrect / finalAnswered >= 0.7) {
      emit({ type: "confetti" });
    }

    if (finalAnswered > 0) {
      award("quiz", xp, {
        topic: topic.trim(),
        score: (finalCorrect / finalAnswered) * 10,
      });
    }
  };

  // choice -1 means time ran out
  const answer = (choice: number) => {
    if (phase !== "question" || !question) return;

    const right = choice === question.answer;
    const nextStreak = right ? streak + 1 : 0;
    const earned = right
      ? 10 + Math.min(streak, 4) * 5 + Math.round(left / 2)
      : 0;

    setPicked(choice);
    setStreak(nextStreak);
    setBestStreak((best) => Math.max(best, nextStreak));
    setPoints((p) => p + earned);
    setGain(earned);
    setAnswered((n) => n + 1);
    if (right) setCorrect((n) => n + 1);
    if (!right) setLives((l) => l - 1);
    setPhase("reveal");

    emit({
      type: "say",
      mood: right ? "happy" : "sad",
      text: right
        ? nextStreak >= 3
          ? `${nextStreak} in a row!`
          : pick(CHEERS)
        : choice === -1
          ? "Time ran out. Go with your first instinct."
          : pick(ENCOURAGEMENTS),
    });
  };

  const next = () => {
    if (phase !== "reveal") return;

    const outOfLives = lives <= 0;
    const lastQuestion = index + 1 >= questions.length;

    if (outOfLives || lastQuestion) {
      finish(points, correct, answered);
      return;
    }

    setIndex(index + 1);
    setPicked(null);
    resetTimer();
    setPhase("question");
  };

  // Countdown, paused while this tab is hidden.
  useEffect(() => {
    if (phase !== "question" || !active) return;

    const timer = window.setInterval(() => {
      leftRef.current = Math.max(0, leftRef.current - 0.1);
      setLeft(leftRef.current);

      if (leftRef.current <= 0) answerRef.current(-1);
    }, 100);

    return () => window.clearInterval(timer);
  }, [phase, active]);

  useEffect(() => {
    answerRef.current = answer;
  });

  useEffect(() => {
    if (!active) return;

    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

      if (phase === "question" && event.key >= "1" && event.key <= "4") {
        answer(Number(event.key) - 1);
      } else if (
        phase === "reveal" &&
        (event.key === "Enter" || event.key === " ")
      ) {
        if (target?.tagName === "BUTTON") return;
        event.preventDefault();
        next();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const multiplier = Math.min(streak, 4);

  return (
    <section className="column" aria-labelledby="quiz-title">
      <header className="page-head">
        <h1 id="quiz-title">Quiz blitz</h1>

        <p>
          Ten questions, {SECONDS} seconds each, three lives. Streaks and
          speed score extra. Keys 1 to 4 pick an answer.
        </p>
      </header>

      {phase === "setup" && (
        <>
          <div className="controls">
            <TopicPicker
              value={topic}
              onChange={setTopic}
              allowCustom
              disabled={busy}
            />

            <Segmented
              label="Difficulty"
              value={difficulty}
              options={DIFFICULTIES}
              onChange={setDifficulty}
            />
          </div>

          <div className="actions">
            <button
              className="primary-button"
              onClick={start}
              disabled={busy || !topic.trim()}
            >
              {busy ? (
                <>
                  <LoaderCircle className="spin" size={16} aria-hidden="true" />
                  Loading questions
                </>
              ) : (
                "Start blitz"
              )}
            </button>
          </div>
        </>
      )}

      {(phase === "question" || phase === "reveal") && question && (
        <>
          <div className="quiz-hud">
            <span className="lives" aria-label={`${Math.max(0, lives)} lives left`}>
              {Array.from({ length: LIVES }, (_, i) => (
                <Heart
                  key={i}
                  size={16}
                  aria-hidden="true"
                  className={i < lives ? "on" : ""}
                />
              ))}
            </span>

            <span>
              Question {index + 1}/{questions.length}
            </span>

            <span>{points} pts</span>

            {multiplier > 0 && (
              <span className="streak-badge">Streak ×{streak}</span>
            )}
          </div>

          <div
            className="timer"
            role="timer"
            aria-label={`${Math.ceil(left)} seconds left`}
          >
            <span
              className={left < 6 ? "low" : ""}
              style={{ width: `${(left / SECONDS) * 100}%` }}
            />
          </div>

          <div className="question">
            <span className="result-title">{topic.trim()}</span>
            <p>{question.q}</p>
          </div>

          <ul className="choices">
            {question.options.map((option, i) => {
              const state =
                phase === "reveal"
                  ? i === question.answer
                    ? "right"
                    : i === picked
                      ? "wrong"
                      : "dim"
                  : "";

              return (
                <li key={i}>
                  <button
                    type="button"
                    className={`choice ${state}`}
                    disabled={phase === "reveal"}
                    onClick={() => answer(i)}
                  >
                    <kbd>{i + 1}</kbd>
                    {option}
                  </button>
                </li>
              );
            })}
          </ul>

          {phase === "reveal" && (
            <div className="reveal" role="status">
              <p className="reveal-verdict">
                {picked === question.answer
                  ? `Correct, +${gain} pts`
                  : picked === -1
                    ? "Time's up."
                    : "Not quite."}
              </p>

              {question.explanation && <p>{question.explanation}</p>}

              <button className="primary-button" onClick={next}>
                {lives <= 0 || index + 1 >= questions.length
                  ? "See results"
                  : "Next question"}
              </button>
            </div>
          )}
        </>
      )}

      {phase === "over" && (
        <div className="result deck-result">
          <h2>{lives <= 0 ? "Out of lives" : "Blitz complete"}</h2>

          <p>
            {correct} of {answered} correct · {points} pts · best streak{" "}
            {bestStreak}. You earned {reward} XP.
          </p>

          <div className="actions actions-row">
            <button className="primary-button" onClick={start} disabled={busy}>
              Play again
            </button>

            <button className="ghost-button" onClick={() => setPhase("setup")}>
              Change topic
            </button>
          </div>
        </div>
      )}

      {error && <ErrorNote message={error} />}
    </section>
  );
}
