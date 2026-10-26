import { TOPICS } from "../constants";
import { levelInfo, streakNow, topicAverage, type Progress } from "./progress";

/** Draws a 1200x630 progress card and returns it as a PNG blob. */
export async function makeShareCard(progress: Progress): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;
  const g = canvas.getContext("2d");
  if (!g) return null;

  try {
    await document.fonts.load("800 80px 'Schibsted Grotesk Variable'");
    await document.fonts.load("500 24px 'IBM Plex Mono'");
  } catch {
    // fall back to system fonts
  }

  const sans = "'Schibsted Grotesk Variable', system-ui, sans-serif";
  const mono = "'IBM Plex Mono', monospace";
  const { level, fraction } = levelInfo(progress.xp);

  g.fillStyle = "#0e1420";
  g.fillRect(0, 0, 1200, 630);

  const glow = g.createRadialGradient(300, 140, 10, 300, 140, 600);
  glow.addColorStop(0, "rgba(245,196,81,0.22)");
  glow.addColorStop(1, "rgba(245,196,81,0)");
  g.fillStyle = glow;
  g.fillRect(0, 0, 1200, 630);

  g.fillStyle = "#e7ecf5";
  g.font = `800 64px ${sans}`;
  g.fillText("Smart", 70, 120);
  const w = g.measureText("Smart").width;
  g.fillStyle = "#f5c451";
  g.fillText("Prep AI", 70 + w + 8, 120);

  g.fillStyle = "#7f8ba5";
  g.font = `500 22px ${mono}`;
  g.fillText("PLACEMENT PREP PLAYER CARD", 72, 162);

  g.fillStyle = "#f5c451";
  g.font = `800 150px ${sans}`;
  g.fillText(`LV ${level}`, 70, 330);

  g.fillStyle = "#28324a";
  g.fillRect(74, 362, 420, 16);
  g.fillStyle = "#f5c451";
  g.fillRect(74, 362, 420 * Math.max(0.03, fraction), 16);

  g.fillStyle = "#a3aec6";
  g.font = `500 28px ${mono}`;
  g.fillText(`${progress.xp} XP`, 74, 424);
  g.fillText(
    `${streakNow(progress).count} day streak`,
    74,
    466
  );

  // topic bars
  g.font = `500 24px ${mono}`;
  TOPICS.forEach((topic, i) => {
    const y = 210 + i * 70;
    const avg = topicAverage(progress.topics[topic]);
    g.fillStyle = "#a3aec6";
    g.fillText(topic, 640, y);
    g.fillStyle = "#28324a";
    g.fillRect(640, y + 14, 480, 12);
    g.fillStyle = "#f5c451";
    g.fillRect(640, y + 14, 480 * ((avg ?? 0) / 10), 12);
    g.fillStyle = "#e7ecf5";
    g.textAlign = "right";
    g.fillText(avg === null ? "-" : `${Math.round(avg * 10) / 10}/10`, 1120, y);
    g.textAlign = "left";
  });

  g.fillStyle = "#7f8ba5";
  g.font = `500 22px ${mono}`;
  g.fillText(window.location.host, 70, 580);

  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}
