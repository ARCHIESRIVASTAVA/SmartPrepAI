import { useState } from "react";
import { LoaderCircle, Mic, Square, Volume2 } from "lucide-react";
import { API_URL } from "../api";
import { CopyButton } from "../components/CopyButton";
import { ErrorNote } from "../components/ErrorNote";
import { Segmented } from "../components/Segmented";
import { WeakSpot } from "../components/WeakSpot";
import { DIFFICULTIES, TOPICS } from "../constants";
import { formatAIResponse } from "../lib/format";
import { award, markActive, useProgress } from "../lib/progress";
import { canListen, canSpeak, speak, useDictation } from "../lib/voice";
import {
  friendlyError,
  parseScore,
  prepareEvaluation,
  scoreClass,
} from "../lib/mock";

type MockRound = {
  question: string;
  /** null when the question was skipped or no score could be read */
  score: number | null;
  skipped?: boolean;
};

const COMPANIES = [
  "Standard",
  "Service company",
  "Product company",
  "Startup",
];

export function MockInterviewView() {
  const progress = useProgress();
  const [company, setCompany] = useState("Standard");
  const [useResume, setUseResume] = useState(false);
  const [mockTopic, setMockTopic] = useState("DSA");
  const [mockDifficulty, setMockDifficulty] =
    useState("Medium");
  const [mockQuestion, setMockQuestion] = useState("");
  const [mockRound, setMockRound] = useState(0);
  const [mockAnswer, setMockAnswer] = useState("");
  const [mockEvaluation, setMockEvaluation] =
    useState("");
  const [mockHistory, setMockHistory] = useState<
    MockRound[]
  >([]);
  const [mockBusy, setMockBusy] = useState<
    "start" | "evaluate" | null
  >(null);
  const [mockError, setMockError] = useState("");

  const dictation = useDictation((text) =>
    setMockAnswer((previous) =>
      previous ? `${previous} ${text}` : text
    )
  );

  // Fetches the next question. `rounds` is the session so far,
  // sent to the server so it does not repeat a question.
  const startMockQuestion = async (
    rounds: MockRound[] = mockHistory
  ) => {
    markActive();
    setMockBusy("start");
    setMockError("");

    try {
      const response = await fetch(
        `${API_URL}/mock-interview/start`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            topic: mockTopic,
            difficulty: mockDifficulty,
            previousQuestions: rounds.map(
              (round) => round.question
            ),
            ...(company !== "Standard" && { company }),
            ...(useResume &&
              progress.resume && { resume: progress.resume }),
          }),
        }
      );

      const data = await response.json();

      if (
        data.success &&
        typeof data.question === "string" &&
        data.question.trim()
      ) {
        setMockQuestion(data.question.trim());
        setMockRound(rounds.length + 1);
        setMockAnswer("");
        setMockEvaluation("");
      } else {
        setMockError(
          friendlyError(
            response.status,
            data.message,
            "Couldn't get a question. Try again."
          )
        );
      }
    } catch (error) {
      console.error(error);

      setMockError(
        "Can't reach the server. Check your connection and try again."
      );
    } finally {
      setMockBusy(null);
    }
  };

  const submitMockAnswer = async () => {
    const answer = mockAnswer.trim();

    if (!answer || !mockQuestion || mockBusy) return;

    setMockBusy("evaluate");
    setMockError("");

    try {
      const response = await fetch(
        `${API_URL}/mock-interview/evaluate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            topic: mockTopic,
            question: mockQuestion,
            answer,
          }),
        }
      );

      const data = await response.json();

      if (
        data.success &&
        typeof data.evaluation === "string" &&
        data.evaluation.trim()
      ) {
        setMockEvaluation(data.evaluation);

        const score = parseScore(data.evaluation);
        award("mock", score === null ? 10 : score * 10, {
          topic: mockTopic,
          ...(score !== null && { score }),
        });
        setMockHistory((rounds) => [
          ...rounds,
          {
            question: mockQuestion,
            score: parseScore(data.evaluation),
          },
        ]);
      } else {
        setMockError(
          friendlyError(
            response.status,
            data.message,
            "Couldn't review your answer. Try again."
          )
        );
      }
    } catch (error) {
      console.error(error);

      setMockError(
        "Can't reach the server. Check your connection and try again."
      );
    } finally {
      setMockBusy(null);
    }
  };

  const skipMockQuestion = () => {
    const rounds: MockRound[] = [
      ...mockHistory,
      { question: mockQuestion, score: null, skipped: true },
    ];

    setMockHistory(rounds);
    startMockQuestion(rounds);
  };

  const endMockInterview = () => {
    setMockQuestion("");
    setMockRound(0);
    setMockAnswer("");
    setMockEvaluation("");
    setMockHistory([]);
    setMockError("");
  };

  const scoredRounds = mockHistory.filter(
    (round) => round.score !== null
  );

  const averageScore = scoredRounds.length
    ? scoredRounds.reduce(
        (total, round) => total + (round.score ?? 0),
        0
      ) / scoredRounds.length
    : null;

  const currentScore = mockEvaluation
    ? parseScore(mockEvaluation)
    : null;

  return (
    <div className="ask-layout">
      <section
        className="column"
        aria-labelledby="mock-title"
      >
        <header className="page-head">
          <h1 id="mock-title">Mock interview</h1>

          <p>
            Answer one question at a time, then get a
            score and feedback on what you missed.
            Scores earn XP and are saved in this browser.
          </p>
        </header>

        {!mockQuestion ? (
          <>
            <WeakSpot
              current={mockTopic}
              onPick={setMockTopic}
            />

            <div className="controls">
              <label className="field">
                <span className="field-label">
                  Topic
                </span>

                <select
                  value={mockTopic}
                  onChange={(e) =>
                    setMockTopic(e.target.value)
                  }
                >
                  {TOPICS.map((option) => (
                    <option
                      key={option}
                      value={option}
                    >
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <Segmented
                label="Difficulty"
                value={mockDifficulty}
                options={DIFFICULTIES}
                onChange={setMockDifficulty}
              />

              <Segmented
                label="Interview style"
                value={company}
                options={COMPANIES}
                onChange={setCompany}
              />
            </div>

            {progress.resume && (
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={useResume}
                  onChange={(e) =>
                    setUseResume(e.target.checked)
                  }
                />
                Ask about my resume (from your last Resume
                scan)
              </label>
            )}

            <div className="actions">
              <button
                className="primary-button"
                onClick={() => startMockQuestion()}
                disabled={mockBusy !== null}
              >
                {mockBusy === "start" ? (
                  <>
                    <LoaderCircle
                      className="spin"
                      size={16}
                      aria-hidden="true"
                    />
                    Starting
                  </>
                ) : (
                  "Start interview"
                )}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="question">
              <span className="result-title">
                Question {mockRound}
              </span>

              <p>{mockQuestion}</p>

              {canSpeak() && (
                <button
                  type="button"
                  className="ghost-button"
                  onClick={() => speak(mockQuestion)}
                >
                  <Volume2 size={15} aria-hidden="true" />
                  Read aloud
                </button>
              )}
            </div>

            {!mockEvaluation ? (
              <div className="composer">
                <textarea
                  aria-label="Your answer"
                  value={mockAnswer}
                  onChange={(e) =>
                    setMockAnswer(e.target.value)
                  }
                  onKeyDown={(e) => {
                    if (
                      (e.metaKey || e.ctrlKey) &&
                      e.key === "Enter"
                    ) {
                      e.preventDefault();
                      submitMockAnswer();
                    }
                  }}
                  placeholder="Answer the way you would say it in the interview"
                  disabled={mockBusy !== null}
                />

                <div className="composer-bar">
                  <span className="hint">
                    Ctrl or ⌘ + Enter to submit
                  </span>

                  <div className="bar-actions">
                    {canListen() && (
                      <button
                        type="button"
                        className="ghost-button"
                        onClick={
                          dictation.listening
                            ? dictation.stop
                            : dictation.start
                        }
                        aria-pressed={dictation.listening}
                      >
                        {dictation.listening ? (
                          <Square size={14} aria-hidden="true" />
                        ) : (
                          <Mic size={15} aria-hidden="true" />
                        )}
                        {dictation.listening
                          ? "Stop"
                          : "Speak answer"}
                      </button>
                    )}

                    <button
                      type="button"
                      className="ghost-button"
                      onClick={skipMockQuestion}
                      disabled={mockBusy !== null}
                    >
                      Skip question
                    </button>

                    <button
                      className="primary-button"
                      onClick={submitMockAnswer}
                      disabled={
                        mockBusy !== null ||
                        !mockAnswer.trim()
                      }
                    >
                      {mockBusy === "evaluate" ? (
                        <>
                          <LoaderCircle
                            className="spin"
                            size={16}
                            aria-hidden="true"
                          />
                          Reviewing
                        </>
                      ) : (
                        "Submit answer"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <p className="yours-label">
                  Your answer
                </p>

                <blockquote className="yours">
                  {mockAnswer}
                </blockquote>

                <article className="result">
                  <header className="result-head">
                    <div className="result-head-main">
                      <span className="result-title">
                        Feedback
                      </span>

                      {currentScore !== null && (
                        <span
                          className={scoreClass(
                            currentScore
                          )}
                        >
                          {currentScore}
                          <small>/10</small>
                        </span>
                      )}
                    </div>

                    <CopyButton
                      text={prepareEvaluation(
                        mockEvaluation
                      )}
                      label="Copy"
                    />
                  </header>

                  <div className="answer-content">
                    {formatAIResponse(
                      prepareEvaluation(mockEvaluation)
                    )}
                  </div>
                </article>

                <div className="actions actions-row">
                  <button
                    className="primary-button"
                    onClick={() => startMockQuestion()}
                    disabled={mockBusy !== null}
                  >
                    {mockBusy === "start" ? (
                      <>
                        <LoaderCircle
                          className="spin"
                          size={16}
                          aria-hidden="true"
                        />
                        Getting question
                      </>
                    ) : (
                      "Next question"
                    )}
                  </button>

                  <button
                    type="button"
                    className="ghost-button"
                    onClick={endMockInterview}
                    disabled={mockBusy !== null}
                  >
                    End interview
                  </button>
                </div>
              </>
            )}

            {mockBusy === "evaluate" && (
              <p className="progress" role="status">
                <LoaderCircle
                  className="spin"
                  size={16}
                  aria-hidden="true"
                />
                Reviewing your answer…
              </p>
            )}

            {!mockEvaluation && (
              <div className="actions">
                <button
                  type="button"
                  className="ghost-button"
                  onClick={endMockInterview}
                  disabled={mockBusy !== null}
                >
                  End interview
                </button>
              </div>
            )}
          </>
        )}

        {mockError && <ErrorNote message={mockError} />}
      </section>

      <aside
        className="margin"
        aria-label="This session"
      >
        <h2>This session</h2>

        {mockHistory.length === 0 ? (
          <p className="margin-note">
            Your score for each question shows up here
            as you go.
          </p>
        ) : (
          <>
            <p className="margin-note">
              {averageScore !== null
                ? `Average ${
                    Math.round(averageScore * 10) / 10
                  }/10 over ${scoredRounds.length} ${
                    scoredRounds.length === 1
                      ? "answer"
                      : "answers"
                  }.`
                : "No scored answers yet."}
            </p>

            <ul className="source-list">
              {mockHistory.map((round, index) => (
                <li
                  className="source"
                  key={`${index}-${round.question}`}
                >
                  <div className="source-name clamp">
                    {round.question}
                  </div>

                  <div className="history-score">
                    {round.skipped
                      ? "Skipped"
                      : round.score !== null
                        ? `${round.score}/10`
                        : "No score"}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </aside>
    </div>
  );
}
