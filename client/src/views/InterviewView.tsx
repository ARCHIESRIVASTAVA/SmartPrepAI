import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { API_URL } from "../api";
import { ErrorNote } from "../components/ErrorNote";
import { ResultPanel } from "../components/ResultPanel";
import { Segmented } from "../components/Segmented";
import { DIFFICULTIES, TOPICS } from "../constants";

const QUESTION_COUNTS = [3, 5, 10];

export function InterviewView() {
  const [topic, setTopic] = useState("DSA");
  const [difficulty, setDifficulty] =
    useState("Medium");
  const [count, setCount] = useState(5);
  const [questions, setQuestions] = useState("");
  const [interviewLoading, setInterviewLoading] =
    useState(false);
  const [interviewError, setInterviewError] = useState("");

  const generateInterview = async () => {
    setInterviewLoading(true);
    setQuestions("");
    setInterviewError("");

    try {
      const response = await fetch(
        `${API_URL}/interview/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            topic,
            difficulty,
            count,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        setQuestions(data.questions);
      } else {
        setInterviewError(
          data.message ||
            "Failed to generate questions."
        );
      }
    } catch (error) {
      console.error(error);

      setInterviewError(
        "Unable to connect to the interview generator."
      );
    } finally {
      setInterviewLoading(false);
    }
  };

  return (
    <section
      className="column"
      aria-labelledby="interview-title"
    >
      <header className="page-head">
        <h1 id="interview-title">
          Practice interview questions
        </h1>

        <p>
          Pick a topic and a difficulty. You get
          questions only, so you can try to answer
          before you look anything up.
        </p>
      </header>

      <div className="controls">
        <label className="field">
          <span className="field-label">Topic</span>

          <select
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          >
            {TOPICS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <Segmented
          label="Difficulty"
          value={difficulty}
          options={DIFFICULTIES}
          onChange={setDifficulty}
        />

        <Segmented
          label="Questions"
          value={count}
          options={QUESTION_COUNTS}
          onChange={setCount}
        />
      </div>

      <div className="actions">
        <button
          className="primary-button"
          onClick={generateInterview}
          disabled={interviewLoading}
        >
          {interviewLoading ? (
            <>
              <LoaderCircle
                className="spin"
                size={16}
                aria-hidden="true"
              />
              Generating
            </>
          ) : (
            "Generate questions"
          )}
        </button>
      </div>

      {interviewError && (
        <ErrorNote message={interviewError} />
      )}

      {questions && (
        <ResultPanel
          title="Interview questions"
          text={questions}
        />
      )}
    </section>
  );
}
