import type { Mood } from "../lib/rewards";

/**
 * Pip, the study buddy: a round little amber blob that blinks,
 * bounces when happy, and droops when things go wrong.
 */
export function Pip({ mood = "idle", size = 56 }: { mood?: Mood; size?: number }) {
  return (
    <svg
      className={`pip pip-${mood}`}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Pip, your study buddy"
    >
      <ellipse className="pip-shadow" cx="32" cy="58" rx="16" ry="3.5" />

      <g className="pip-body">
        <path
          className="pip-tuft"
          d="M32 8 C30 3 24 3 24 7 M32 8 C34 2 40 3 39 7"
          fill="none"
        />

        <circle className="pip-face" cx="32" cy="34" r="22" />
        <ellipse className="pip-cheek" cx="19" cy="40" rx="4" ry="2.6" />
        <ellipse className="pip-cheek" cx="45" cy="40" rx="4" ry="2.6" />

        <g className="pip-eyes">
          <ellipse className="pip-eye" cx="24" cy="32" rx="3" ry="4.2" />
          <ellipse className="pip-eye" cx="40" cy="32" rx="3" ry="4.2" />
        </g>

        {mood === "sad" ? (
          <path className="pip-mouth" d="M26 45 Q32 40 38 45" fill="none" />
        ) : mood === "happy" || mood === "cheer" ? (
          <path className="pip-mouth pip-mouth-open" d="M25 41 Q32 51 39 41 Z" />
        ) : (
          <path className="pip-mouth" d="M27 42 Q32 47 37 42" fill="none" />
        )}
      </g>
    </svg>
  );
}
