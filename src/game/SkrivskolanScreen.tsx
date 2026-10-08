import { useRef, useState } from "react";
import { t } from "../i18n";
import { InkCanvas, type InkCanvasHandle } from "../mathinput/InkCanvas";
import { rememberInk } from "../recognition/personal";
import type { Stroke } from "../recognition/preprocess";
import { templateFactors } from "../recognition/pathMatch";
import { recognizeStrokes } from "../recognition/recognizer";
import { followsOrder } from "../recognition/strokeOrder";
import { STROKE_TEMPLATES } from "../recognition/strokeTemplates";
import { StrokeOrderDemo } from "./StrokeOrderDemo";

/** The characters taught here: every one with a taught way of writing it. */
const CHARS = Object.keys(STROKE_TEMPLATES);
const CHAR_SET: ReadonlySet<string> = new Set(CHARS);
/** Written well this many times, a character gets its star. */
const STAR_AT = 3;
const PROGRESS_KEY = "matteaventyret-skrivskolan-v1";

function loadProgress(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

function saveProgress(progress: Record<string, number>) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Progress is a convenience - the practice works without it.
  }
}

type Verdict = "checking" | "good" | "order" | "unreadable" | null;

/**
 * Skrivskolan: how to write each digit and sign - where to start, which way
 * to go, which stroke comes first - shown animated, then written by the
 * child. In the question types from åk 7 the writing order counts (a
 * profile's strictOrder), so this is where it's learned. Each character
 * written well is also remembered as a sample of this child's handwriting,
 * on this device only (recognition/personal.ts), which helps the game read it.
 */
export function SkrivskolanScreen({ onClose }: { onClose: () => void }) {
  const inkRef = useRef<InkCanvasHandle>(null);
  const [char, setChar] = useState(CHARS[0]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [verdict, setVerdict] = useState<Verdict>(null);
  const [progress, setProgress] = useState(loadProgress);
  /** Bumped to restart the demo's animation from the first stroke. */
  const [replay, setReplay] = useState(0);

  function choose(next: string) {
    setChar(next);
    setVerdict(null);
    inkRef.current?.clear();
  }

  async function check() {
    if (strokes.length === 0 || verdict === "checking") return;
    if (!followsOrder(char, strokes)) {
      setVerdict("order");
      setReplay((r) => r + 1);
      return;
    }
    setVerdict("checking");
    // As the advanced question types read it: the picture, and how closely the pen followed the taught path.
    const read = await recognizeStrokes(strokes, undefined, "full", CHAR_SET, (labels) => templateFactors(strokes, labels));
    if (read.char !== char) {
      setVerdict("unreadable");
      return;
    }
    rememberInk(strokes, char);
    const next = { ...progress, [char]: (progress[char] ?? 0) + 1 };
    setProgress(next);
    saveProgress(next);
    setVerdict("good");
  }

  function again() {
    setVerdict(null);
    inkRef.current?.clear();
  }

  return (
    <div className="max-w-3xl mx-auto p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t("skriv.title")}</h1>
          <p className="text-sm text-slate-500">{t("skriv.intro")}</p>
        </div>
        <button type="button" onClick={onClose} className="px-4 h-10 rounded-xl bg-slate-200 text-slate-700 font-semibold">
          {t("skriv.close")}
        </button>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label={t("skriv.title")}>
        {CHARS.map((c) => (
          <button
            key={c}
            type="button"
            role="tab"
            aria-selected={c === char}
            onClick={() => choose(c)}
            className={`relative w-12 h-12 rounded-xl text-xl font-semibold ${c === char ? "bg-sky-600 text-white" : "bg-white text-slate-700 border border-slate-200"}`}
          >
            {c}
            {(progress[c] ?? 0) >= STAR_AT && <span className="absolute -top-1 -right-1 text-xs">⭐</span>}
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
        <div className="flex flex-col items-center gap-2">
          <StrokeOrderDemo key={`${char}-${replay}`} char={char} size={200} />
          <p className="text-xs text-slate-500 max-w-[12rem] text-center">{t("skriv.howTo")}</p>
        </div>
        <div className="flex-1 w-full flex flex-col gap-2">
          <InkCanvas ref={inkRef} width={300} height={360} fit="aspect" lined={false} onStrokesChange={setStrokes} disabled={verdict === "good"} />
          <div className="flex gap-2">
            {verdict === "good" ? (
              <button type="button" onClick={again} className="flex-1 h-12 rounded-xl bg-sky-600 text-white font-semibold">
                {t("skriv.again")}
              </button>
            ) : (
              <>
                <button type="button" onClick={again} className="px-4 h-12 rounded-xl bg-slate-200 text-slate-700 font-semibold">
                  {t("work.clear")}
                </button>
                <button type="button" onClick={check} disabled={strokes.length === 0 || verdict === "checking"} className="flex-1 h-12 rounded-xl bg-emerald-600 text-white font-semibold disabled:opacity-40">
                  {t("skriv.done")}
                </button>
              </>
            )}
          </div>
          <div role="status" className="min-h-[2.5rem] text-center font-semibold">
            {verdict === "checking" && <span className="text-slate-500">{t("skriv.checking")}</span>}
            {verdict === "good" && <span className="text-emerald-700">{t("skriv.good", { count: progress[char] ?? 0 })}</span>}
            {verdict === "order" && <span className="text-amber-700">{t("skriv.order")}</span>}
            {verdict === "unreadable" && <span className="text-rose-700">{t("skriv.unreadable", { char })}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
