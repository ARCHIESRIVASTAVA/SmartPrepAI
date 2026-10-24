import { useState } from "react";
import { FileUp, LoaderCircle } from "lucide-react";
import { API_URL } from "../api";
import { ErrorNote } from "../components/ErrorNote";
import { ResultPanel } from "../components/ResultPanel";

export function ResumeView() {
  const [resume, setResume] =
    useState<File | null>(null);
  const [analysis, setAnalysis] = useState("");
  const [resumeLoading, setResumeLoading] =
    useState(false);
  const [resumeError, setResumeError] = useState("");

  const analyzeResume = async () => {
    if (!resume) return;

    setResumeLoading(true);
    setAnalysis("");
    setResumeError("");

    try {
      const formData = new FormData();

      formData.append("resume", resume);

      const response = await fetch(
        `${API_URL}/resume/analyze`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (data.success) {
        setAnalysis(data.analysis);
      } else {
        setResumeError(
          data.message ||
            "Resume analysis failed."
        );
      }
    } catch (error) {
      console.error(error);

      setResumeError(
        "Unable to connect to the resume analyzer."
      );
    } finally {
      setResumeLoading(false);
    }
  };

  return (
    <section
      className="column"
      aria-labelledby="resume-title"
    >
      <header className="page-head">
        <h1 id="resume-title">Check your resume</h1>

        <p>
          Upload a PDF under 5 MB to get an ATS score,
          skill gaps, and the fixes to make first.
        </p>
      </header>

      <label className="dropzone">
        <input
          type="file"
          accept=".pdf"
          onChange={(e) => {
            const file =
              e.target.files?.[0] || null;

            setResume(file);
            setAnalysis("");
            setResumeError("");
          }}
        />

        <FileUp size={22} aria-hidden="true" />

        <span className="dropzone-text">
          {resume ? (
            <>
              <strong>{resume.name}</strong>

              <span className="sub">
                {Math.max(
                  1,
                  Math.round(resume.size / 1024)
                )}{" "}
                KB. Click to choose a different file.
              </span>
            </>
          ) : (
            <>
              <strong>Choose a PDF resume</strong>

              <span className="sub">
                PDF only, up to 5 MB
              </span>
            </>
          )}
        </span>
      </label>

      <div className="actions">
        <button
          className="primary-button"
          onClick={analyzeResume}
          disabled={!resume || resumeLoading}
        >
          {resumeLoading ? (
            <>
              <LoaderCircle
                className="spin"
                size={16}
                aria-hidden="true"
              />
              Analyzing
            </>
          ) : (
            "Analyze resume"
          )}
        </button>
      </div>

      {resumeError && (
        <ErrorNote message={resumeError} />
      )}

      {analysis && (
        <ResultPanel
          title="Resume analysis"
          text={analysis}
        />
      )}
    </section>
  );
}
