import { useEffect, useMemo, useRef } from "react";

const GLYPHS = [
  "{ }", "</>", "O(n)", "SELECT *", "0110", "=>", "&&", "git push",
  "def f():", "TCP", "JOIN", "O(log n)", "NULL", "main()", "#include",
  "stack", "hash", "mutex",
];

/**
 * A living backdrop for the tools: glow that follows the cursor,
 * drifting orbs, and code symbols floating up. Purely decorative.
 */
export function AmbientBackground() {
  const root = useRef<HTMLDivElement>(null);

  const floaters = useMemo(
    () =>
      GLYPHS.map((text, i) => ({
        text,
        left: (i * 53) % 96,
        size: 12 + ((i * 7) % 10),
        duration: 32 + ((i * 11) % 34),
        delay: -((i * 17) % 50),
        sway: 14 + ((i * 5) % 22),
      })),
    []
  );

  useEffect(() => {
    const node = root.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let x = 0.5;
    let y = 0.4;

    const apply = () => {
      frame = 0;
      node.style.setProperty("--mx", String(x));
      node.style.setProperty("--my", String(y));
    };

    const move = (event: PointerEvent) => {
      x = event.clientX / window.innerWidth;
      y = event.clientY / window.innerHeight;
      if (!frame) frame = requestAnimationFrame(apply);
    };

    window.addEventListener("pointermove", move, { passive: true });

    return () => {
      window.removeEventListener("pointermove", move);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="ambient" ref={root} aria-hidden="true">
      <span className="orb orb-a" />
      <span className="orb orb-b" />
      <span className="orb orb-c" />
      <span className="ambient-dots" />
      <span className="ambient-spot" />

      {floaters.map((f) => (
        <span
          key={f.text}
          className="glyph"
          style={
            {
              left: `${f.left}%`,
              fontSize: `${f.size}px`,
              animationDuration: `${f.duration}s`,
              animationDelay: `${f.delay}s`,
              "--sway": `${f.sway}px`,
            } as React.CSSProperties
          }
        >
          {f.text}
        </span>
      ))}
    </div>
  );
}
