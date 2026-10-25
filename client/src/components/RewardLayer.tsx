import { useEffect, useRef, useState } from "react";
import { onReward } from "../lib/rewards";

type Toast = { id: number; text: string; big?: boolean };
type Piece = { id: number; x: number; dx: number; dr: number; delay: number; hue: number };

const COLORS = ["#f5c451", "#6ee7b7", "#7cc4ff", "#ff8a8a", "#e7ecf5"];

/** Floating XP toasts, level-up banners and confetti. */
export function RewardLayer() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const nextId = useRef(1);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const toast = (text: string, big = false, ms = 1800) => {
      const id = nextId.current++;
      setToasts((list) => [...list, { id, text, big }]);
      window.setTimeout(
        () => setToasts((list) => list.filter((t) => t.id !== id)),
        ms
      );
    };

    const burst = () => {
      if (reduce) return;

      const base = nextId.current;
      nextId.current += 48;

      const made = Array.from({ length: 48 }, (_, i) => ({
        id: base + i,
        x: 30 + Math.random() * 40,
        dx: (Math.random() - 0.5) * 70,
        dr: (Math.random() - 0.5) * 900,
        delay: Math.random() * 0.25,
        hue: i % COLORS.length,
      }));

      setPieces((list) => [...list, ...made]);

      window.setTimeout(
        () =>
          setPieces((list) =>
            list.filter((p) => p.id < base || p.id >= base + 48)
          ),
        2600
      );
    };

    return onReward((event) => {
      if (event.type === "xp") toast(`+${event.amount} XP`);
      else if (event.type === "level") {
        toast(`Level ${event.level}`, true, 3000);
        burst();
      } else if (event.type === "goal") {
        toast("Daily goal complete", true, 3000);
        burst();
      } else if (event.type === "confetti") burst();
    });
  }, []);

  return (
    <div className="reward-layer" aria-hidden="true">
      {toasts.map((t) => (
        <span key={t.id} className={`toast${t.big ? " toast-big" : ""}`}>
          {t.text}
        </span>
      ))}

      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti"
          style={
            {
              left: `${p.x}%`,
              background: COLORS[p.hue],
              animationDelay: `${p.delay}s`,
              "--dx": `${p.dx}vw`,
              "--dr": `${p.dr}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
