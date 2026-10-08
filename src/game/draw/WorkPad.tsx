import { useEffect, useMemo, useRef, useState } from "react";
import { t } from "../../i18n";
import { highlightInLatex, strokesOfNumbers, SUSPECT_COLOR } from "../../mathinput/highlightNumbers";
import { InkCanvas, type InkCanvasHandle, type InkTool } from "../../mathinput/InkCanvas";
import { recognizeExpression, type RecognizedSymbol } from "../../mathinput/recognizeExpression";
import type { Stroke } from "../../recognition/preprocess";
import type { WritingLevel } from "../../recognition/levels";
import type { RecognitionProfile } from "../../recognition/profiles";
import { StrokeOrderDemo } from "../StrokeOrderDemo";
import { Tex } from "../Tex";

/** How long after the last stroke the writing is read. */
const READ_AFTER_MS = 700;
const NONE: readonly number[] = [];
/** Ink not written the way it's taught (a strict profile - see orderDecode.ts). */
const ORDER_COLOR = "#d97706";

interface WorkPadProps {
  /** A line to trace (LaTeX), shown faint under the ink - Guidat's help from the start (StepSolver.tsx). */
  trace?: string;
  /** Whose handwriting it is (recognition/levels.ts). */
  level: WritingLevel;
  /** The line over the pad. */
  title: string;
  /** The smaller line under the title. */
  subtitle?: string;
  /** Room to write: a few lines for a calculation, more for a solution. */
  rows?: number;
  /** Fires with what the writing reads as (layout.ts's LaTeX), each time it's read. */
  onChange: (latex: string) => void;
  /** Bumped by the parent to wipe the pad (a new question). */
  resetToken?: number;
  disabled?: boolean;
  /** Numbers to point out in the writing (in red, in the ink and in its reading) - e.g. one that isn't in the question. */
  highlight?: readonly number[];
  /** The question type's recognition profile (recognition/profiles.ts): its characters, and whether powers are read - instead of the whole level's. */
  profile?: RecognitionProfile;
}

/**
 * Free writing, read as maths while the child writes - for "Visa hur du
 * tänkte" under an answer, and for the solution of an åk 7+ question. What
 * it reads is shown typeset underneath, so a misread is noticed right away.
 */
export function WorkPad({ level, title, subtitle, rows = 3, onChange, resetToken = 0, disabled, highlight = NONE, profile, trace }: WorkPadProps) {
  const inkRef = useRef<InkCanvasHandle>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(0);
  const [tool, setTool] = useState<InkTool>("pen");
  const [latex, setLatex] = useState("");
  /** What the ink was last read as, symbol by symbol - to find a number to point out in it. */
  const [symbols, setSymbols] = useState<RecognizedSymbol[]>([]);
  const inkColors = useMemo(() => {
    const colors = new Map<Stroke, string>();
    for (const sym of symbols) if (sym.orderProblem) for (const stroke of sym.strokes) colors.set(stroke, ORDER_COLOR);
    for (const stroke of strokesOfNumbers(symbols, highlight)) colors.set(stroke, SUSPECT_COLOR);
    return colors;
  }, [symbols, highlight]);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  // A new question: nothing read yet (state follows the prop during render), and the ink goes (the canvas is outside React).
  const [seenReset, setSeenReset] = useState(resetToken);
  if (seenReset !== resetToken) {
    setSeenReset(resetToken);
    setLatex("");
    setSymbols([]);
  }
  useEffect(() => {
    inkRef.current?.clear();
  }, [resetToken]);

  function handleStrokes(strokes: Stroke[]) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const call = ++latest.current;
      const result = strokes.length > 0 ? await recognizeExpression(strokes, { level, profile }) : { latex: "", symbols: [] };
      if (call !== latest.current) return; // a newer read is on its way
      setLatex(result.latex);
      setSymbols(result.symbols);
      onChangeRef.current(result.latex);
    }, READ_AFTER_MS);
  }

  const height = 70 + rows * 70;
  return (
    <div className={`w-full max-w-2xl flex flex-col gap-2 ${disabled ? "pointer-events-none opacity-60" : ""}`}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="font-semibold text-slate-700">{title}</div>
          {subtitle && <div className="text-xs text-slate-500">{subtitle}</div>}
        </div>
        <div className="flex gap-1 rounded-lg bg-slate-200 p-1" role="radiogroup" aria-label="Verktyg">
          {(["pen", "erase"] as const).map((tl) => (
            <button
              key={tl}
              type="button"
              role="radio"
              aria-checked={tool === tl}
              onClick={() => setTool(tl)}
              className={`px-3 h-8 rounded-md text-sm font-semibold ${tool === tl ? "bg-white text-sky-700 shadow" : "text-slate-600"}`}
            >
              {tl === "pen" ? "✏️" : "🧽"}
            </button>
          ))}
          <button type="button" onClick={() => inkRef.current?.clear()} className="px-3 h-8 rounded-md text-sm font-semibold text-slate-600">
            {t("work.clear")}
          </button>
        </div>
      </div>
      <InkCanvas
        ref={inkRef}
        width={800}
        height={height}
        fit="aspect"
        tool={tool}
        onStrokesChange={handleStrokes}
        inkColors={inkColors}
        guides={
          trace ? (
            // Written-size and faint, on the first line - to trace over, not to read off.
            <foreignObject x={24} y={8} width={760} height={Math.min(height - 16, 120)} pointerEvents="none">
              <div style={{ fontSize: 54, color: "#94a3b8", opacity: 0.6, lineHeight: 1.5 }}>
                <Tex latex={trace} />
              </div>
            </foreignObject>
          ) : undefined
        }
      />
      <OrderHint symbols={symbols} />
      <div className="min-h-[2.5rem] text-slate-600 text-sm flex items-center gap-2">
        {latex && (
          <>
            <span className="text-xs text-slate-400">{t("work.read")}</span>
            <Tex latex={highlightInLatex(latex, highlight)} />
          </>
        )}
      </div>
    </div>
  );
}

/**
 * The first symbol not written the way it's taught, if any: in amber in the
 * ink, and here how to write it - the character drawn stroke by stroke, or
 * for a fraction, that the numerator comes before the bar.
 */
function OrderHint({ symbols }: { symbols: readonly RecognizedSymbol[] }) {
  const problem = symbols.find((s) => s.orderProblem);
  if (!problem) return null;
  return (
    <div role="status" className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-900">
      {problem.orderProblem === "numeratorFirst" ? (
        <span>{t("order.numeratorFirst")}</span>
      ) : (
        <>
          <span>{t("order.strokes", { char: problem.char })}</span>
          <StrokeOrderDemo char={problem.char} size={64} />
        </>
      )}
    </div>
  );
}
