import { TOPICS } from "../constants";
import { topicAverage, type Progress } from "../lib/progress";

/** Radar chart of average mock-interview score per topic (0-10). */
export function SkillRadar({ progress }: { progress: Progress }) {
  const size = 260;
  const c = size / 2;
  const radius = 92;
  const n = TOPICS.length;

  const point = (i: number, value: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const r = (radius * value) / 10;
    return [c + Math.cos(angle) * r, c + Math.sin(angle) * r] as const;
  };

  const values = TOPICS.map(
    (t) => topicAverage(progress.topics[t]) ?? 0
  );

  const shape = values
    .map((v, i) => point(i, v).join(","))
    .join(" ");

  const summary = TOPICS.map(
    (t, i) => `${t} ${Math.round(values[i] * 10) / 10}`
  ).join(", ");

  return (
    <svg
      viewBox={`-30 0 ${size + 60} ${size}`}
      className="radar"
      role="img"
      aria-label={`Average score out of 10 by topic: ${summary}`}
    >
      {[2.5, 5, 7.5, 10].map((ring) => (
        <polygon
          key={ring}
          className="radar-ring"
          points={TOPICS.map((_, i) => point(i, ring).join(",")).join(" ")}
        />
      ))}

      {TOPICS.map((_, i) => {
        const [x, y] = point(i, 10);
        return <line key={i} className="radar-ring" x1={c} y1={c} x2={x} y2={y} />;
      })}

      <polygon className="radar-shape" points={shape} />

      {TOPICS.map((topic, i) => {
        const [x, y] = point(i, 12.6);
        return (
          <text
            key={topic}
            className="radar-label"
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {topic === "Operating Systems"
              ? "OS"
              : topic === "Computer Networks"
                ? "Networks"
                : topic}
          </text>
        );
      })}
    </svg>
  );
}
