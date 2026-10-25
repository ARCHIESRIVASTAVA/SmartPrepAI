import { useEffect, useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { ErrorNote } from "../components/ErrorNote";
import { TopicPicker } from "../components/TopicPicker";
import { award } from "../lib/progress";
import { studyRequest, type Slide } from "../lib/study";

type Props = { active: boolean };

export function SlidesView({ active }: Props) {
  const [topic, setTopic] = useState("Operating Systems");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [slides, setSlides] = useState<Slide[]>([]);
  const [deckTopic, setDeckTopic] = useState("");
  const [index, setIndex] = useState(0);
  const [exporting, setExporting] = useState(false);

  const slide = slides[index];

  const generate = async () => {
    setBusy(true);
    setError("");

    try {
      const data = await studyRequest<{ slides: Slide[] }>("slides", {
        topic: topic.trim(),
      });

      setSlides(data.slides);
      setDeckTopic(topic.trim());
      setIndex(0);
      award("slides", 15);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const exportPptx = async () => {
    setExporting(true);

    try {
      // Loaded on demand so the library is not part of the first page load.
      const { default: PptxGenJS } = await import("pptxgenjs");
      const pptx = new PptxGenJS();
      pptx.layout = "LAYOUT_16x9";
      pptx.title = deckTopic;

      slides.forEach((item, i) => {
        const page = pptx.addSlide();
        page.background = { color: "0E1420" };

        page.addText(item.title, {
          x: 0.6,
          y: 0.4,
          w: 8.8,
          h: 0.9,
          fontFace: "Arial",
          fontSize: 30,
          bold: true,
          color: "F5C451",
        });

        page.addText(
          item.bullets.map((text) => ({
            text,
            options: { bullet: true, breakLine: true },
          })),
          {
            x: 0.7,
            y: 1.5,
            w: 8.6,
            h: 3.2,
            fontFace: "Arial",
            fontSize: 20,
            color: "E7ECF5",
            valign: "top",
            paraSpaceAfter: 10,
          }
        );

        if (item.note) {
          page.addText(item.note, {
            x: 0.7,
            y: 4.75,
            w: 8.6,
            h: 0.5,
            fontFace: "Arial",
            fontSize: 12,
            italic: true,
            color: "A3AEC6",
          });
        }

        page.addText(`${i + 1} / ${slides.length}`, {
          x: 8.6,
          y: 5.2,
          w: 1,
          h: 0.3,
          fontSize: 10,
          color: "7F8BA5",
          align: "right",
        });
      });

      await pptx.writeFile({
        fileName: `${deckTopic.replace(/[^\w ]+/g, "").trim() || "slides"}.pptx`,
      });
    } catch (e) {
      console.error(e);
      setError("Couldn't create the PowerPoint file. Try again.");
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (!active || slides.length === 0) return;

    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

      if (event.key === "ArrowRight" || event.key === "PageDown") {
        setIndex((i) => Math.min(slides.length - 1, i + 1));
      } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
        setIndex((i) => Math.max(0, i - 1));
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, slides.length]);

  return (
    <section className="column column-wide" aria-labelledby="slides-title">
      <header className="page-head">
        <h1 id="slides-title">Study slides</h1>

        <p>
          Pick a topic, or type your own, and get a short deck to flip
          through. Download it as a PowerPoint file if you want to keep it.
        </p>
      </header>

      <div className="controls">
        <TopicPicker
          value={topic}
          onChange={setTopic}
          allowCustom
          disabled={busy}
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
              Writing slides
            </>
          ) : slides.length ? (
            "New deck"
          ) : (
            "Make slides"
          )}
        </button>
      </div>

      {slide && (
        <>
          <div className="slide" key={index} aria-live="polite">
            <p className="slide-count">
              {deckTopic} · {index + 1} / {slides.length}
            </p>

            <h2>{slide.title}</h2>

            <ul>
              {slide.bullets.map((bullet, i) => (
                <li key={i} style={{ animationDelay: `${i * 90}ms` }}>
                  {bullet}
                </li>
              ))}
            </ul>

            {slide.note && <p className="slide-note">{slide.note}</p>}
          </div>

          <div className="slide-nav">
            <button
              type="button"
              className="ghost-button"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
            >
              ← Previous
            </button>

            <span className="slide-dots" aria-hidden="true">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  tabIndex={-1}
                  className={i === index ? "on" : ""}
                  onClick={() => setIndex(i)}
                />
              ))}
            </span>

            <button
              type="button"
              className="ghost-button"
              onClick={() => setIndex((i) => Math.min(slides.length - 1, i + 1))}
              disabled={index === slides.length - 1}
            >
              Next →
            </button>

            <button
              type="button"
              className="ghost-button"
              onClick={exportPptx}
              disabled={exporting}
            >
              {exporting ? (
                <LoaderCircle className="spin" size={15} aria-hidden="true" />
              ) : (
                <Download size={15} aria-hidden="true" />
              )}
              Download .pptx
            </button>
          </div>
        </>
      )}

      {error && <ErrorNote message={error} />}
    </section>
  );
}
