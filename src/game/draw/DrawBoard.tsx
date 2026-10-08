import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import { InkCanvas, type InkCanvasHandle, type InkTool } from "../../mathinput/InkCanvas";
import { t } from "../../i18n";
import type { Stroke } from "../../recognition/preprocess";
import type { BoardLayout, BoxReading, BoxStatus, DrawBox } from "./boardTypes";
import { boxForStroke, readBox } from "./readBox";

/** Waits for a second stroke (an open 4, a crossed 7, the "0" of a "10") before reading a box. */
const SETTLE_MS = 800;
const NONE = "";
const STATUS_COLOR: Record<BoxStatus, string> = { correct: "#16a34a", wrong: "#dc2626", followOn: "#d97706" };
const PRINTED_INK = "#1e293b";
/** A box the recognizer wasn't sure about - violet, so it can't be mistaken for a verdict (amber is a follow-on error). */
const UNSURE_COLOR = "#7c3aed";
/** Boxes the current step works with: an amber glow (amber-400 edge, amber-100 inside). */
const HIGHLIGHT = { stroke: "#fbbf24", glow: "#fef3c7", fill: "#fffbeb" };
const NO_HIGHLIGHT: ReadonlySet<string> = new Set();
/** How long a backwards digit takes to turn round. */
const FLIP_MS = 900;
/** After the last traced stroke, how long before tracing counts as done. */
const TRACE_DONE_MS = 700;

/** A digit written backwards, being turned round and then traced (see helpWithMirrored). */
interface MirrorHelp {
  boxId: string;
  /** The child's own ink, as written - animated turning round. */
  ink: Stroke[];
  /** The digit(s), shown dotted to trace. */
  text: string;
  phase: "flip" | "trace";
}

/** The same ink, turned round its own middle. */
function mirrorStrokes(strokes: readonly Stroke[]): Stroke[] {
  const xs = strokes.flat().map((p) => p.x);
  const mid = (Math.min(...xs) + Math.max(...xs)) / 2;
  return strokes.map((stroke) => stroke.map((p) => ({ ...p, x: 2 * mid - p.x })));
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface DrawBoardHandle {
  /** Removes the ink in one box (e.g. a wrong digit, so it can be written again). */
  clearBox: (id: string) => void;
  clearAll: () => void;
  removeStrokes: (strokes: readonly Stroke[]) => void;
  /** The ink in one box - e.g. to remember what a writer said an unsure digit was (recognition/personal.ts). */
  strokesOf: (id: string) => Stroke[];
}

const NO_TRACES: Readonly<Record<string, string>> = {};
/** The dashed outline of a digit to trace. */
const TRACE_INK = "#94a3b8";

interface DrawBoardProps {
  layout: BoardLayout;
  /** Boxes that can be written in right now; ink anywhere else is removed (and reported via onBlocked). */
  active: ReadonlySet<string>;
  /** Values shown in boxes that have no ink - e.g. an answer the game revealed. "struck" draws a line through a printed number. */
  values?: Readonly<Record<string, string>>;
  /** Verdicts, shown as the color of the box's ink (and outline). */
  statuses?: Readonly<Record<string, BoxStatus>>;
  /** Boxes read, but not surely (see useUnsureBoxes): their ink turns violet and a "?" button appears beside them. */
  unsure?: ReadonlySet<string>;
  /** The box whose "Menade du?" question is open, if any - highlighted. */
  asking?: string | null;
  /**
   * Ask about a marked box: fires when its "?" is tapped, and by itself once
   * every box that can be written in has ink and one of them is marked -
   * nothing's left to do without the answer.
   */
  onAsk?: (boxId: string) => void;
  onRead: (boxId: string, reading: BoxReading) => void;
  /** Ink was written where it can't go: in a box that isn't active (id), or outside every box (null). */
  onBlocked?: (boxId: string | null) => void;
  disabled?: boolean;
  /** Widest the board is drawn, in CSS px (it shrinks to fit narrower screens). Defaults to its own width. */
  maxWidth?: number;
  /**
   * A digit written backwards (a mirrored 3) counts as that digit - and is
   * shown turning the right way round, then dotted to trace once. For the
   * youngest (writing levels 1-2, which is every game stage today).
   */
  flipMirrored?: boolean;
  /** Boxes to light up (amber) as what the current step works with - just shown, it changes nothing about where ink can go. */
  highlight?: ReadonlySet<string>;
  /** A digit (or sign) to trace, shown dashed in an empty box - the guided boards' help from the start (GuidedColumn). */
  traces?: Readonly<Record<string, string>>;
}

/** The game's drawing area: one free-ink surface, read box by box (see boardTypes.ts). */
export const DrawBoard = forwardRef<DrawBoardHandle, DrawBoardProps>(function DrawBoard(
  { layout, active, values = {}, statuses = {}, unsure = new Set(), asking = null, onRead, onBlocked, onAsk, disabled, maxWidth, flipMirrored = true, highlight = NO_HIGHLIGHT, traces = NO_TRACES },
  ref
) {
  const inkRef = useRef<InkCanvasHandle>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const boxOf = useRef(new Map<Stroke, string>());
  const fresh = useRef(new Map<string, Stroke[]>());
  const dirty = useRef(new Set<string>());
  const silent = useRef(false);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The latest props, for the settle timer (which can fire after a re-render).
  const latest = useRef({ layout, active, onRead, onBlocked });
  useLayoutEffect(() => {
    latest.current = { layout, active, onRead, onBlocked };
  });

  const [tool, setTool] = useState<InkTool>("pen");
  const [inked, setInked] = useState<ReadonlySet<string>>(new Set());
  const [strokeBoxes, setStrokeBoxes] = useState<ReadonlyMap<Stroke, string>>(new Map());
  const [help, setHelp] = useState<MirrorHelp | null>(null);
  /** Ink being swapped in by the board itself (a turned-round digit) - placed in its box, never read. */
  const placing = useRef(false);
  /** While a turned-round digit is traced: the tracing ink (never read), and how to end it. */
  const tracing = useRef<{ boxId: string; ink: Stroke[]; timer: ReturnType<typeof setTimeout> | null; done: () => void } | null>(null);

  function removeStrokes(strokes: readonly Stroke[]) {
    if (strokes.length === 0) return;
    silent.current = true;
    try {
      inkRef.current?.remove(new Set(strokes));
    } finally {
      silent.current = false;
    }
  }

  function strokesIn(id: string): Stroke[] {
    return strokesRef.current.filter((s) => boxOf.current.get(s) === id);
  }

  useImperativeHandle(ref, () => ({
    clearBox: (id) => removeStrokes(strokesIn(id)),
    clearAll: () => removeStrokes(strokesRef.current),
    removeStrokes,
    strokesOf: (id) => strokesIn(id),
  }));

  async function settle() {
    const keys = [...dirty.current];
    dirty.current.clear();
    for (const key of keys) {
      const added = (fresh.current.get(key) ?? []).filter((s) => strokesRef.current.includes(s));
      fresh.current.delete(key);
      const { layout, active, onRead, onBlocked } = latest.current;
      const box: DrawBox | undefined = layout.boxes.find((b) => b.id === key);
      if (key === NONE || !box) {
        removeStrokes(added);
        if (added.length > 0) onBlocked?.(null);
        continue;
      }
      if (!active.has(key)) {
        // Not this box's turn (or it's done): new ink here goes. Erasing in it changes nothing.
        if (added.length > 0) {
          removeStrokes(added);
          onBlocked?.(key);
        }
        continue;
      }
      const reading = await readBox(box, strokesIn(key), added);
      if (flipMirrored && reading.kind === "digits" && reading.mirrored?.some(Boolean)) await helpWithMirrored(key, reading.digits);
      onRead(key, reading);
    }
  }

  /**
   * A digit written backwards: it still counts (the answer is read as soon as
   * this is done), but first the child sees their own ink turn the right way
   * round, and gets the digit dotted to trace once - not graded.
   */
  async function helpWithMirrored(boxId: string, digits: number[]) {
    const ink = strokesIn(boxId);
    setHelp({ boxId, ink, text: digits.join(""), phase: "flip" });
    await wait(FLIP_MS);
    const turned = mirrorStrokes(ink);
    // Silent too: taking the backwards strokes away isn't the child erasing - the box mustn't be read again for it.
    placing.current = true;
    silent.current = true;
    try {
      inkRef.current?.replace(new Map(ink.map((s, i) => [s, turned[i]])));
    } finally {
      placing.current = false;
      silent.current = false;
    }
    setHelp((h) => h && { ...h, phase: "trace" });
    await new Promise<void>((resolve) => {
      tracing.current = { boxId, ink: [], timer: null, done: resolve };
    });
    setHelp(null);
  }

  function endTracing() {
    const tr = tracing.current;
    if (!tr) return;
    tracing.current = null;
    if (tr.timer) clearTimeout(tr.timer);
    removeStrokes(tr.ink);
    tr.done();
  }

  function handleStrokesChange(next: Stroke[]) {
    const prev = strokesRef.current;
    strokesRef.current = next;
    const nextSet = new Set(next);
    for (const s of prev) {
      if (nextSet.has(s)) continue;
      const id = boxOf.current.get(s);
      boxOf.current.delete(s);
      if (!silent.current && id !== undefined && id !== NONE) dirty.current.add(id);
    }
    const boxes = latest.current.layout.boxes;
    for (const s of next) {
      if (boxOf.current.has(s)) continue;
      const id = boxForStroke(s, boxes) ?? NONE;
      boxOf.current.set(s, id);
      if (placing.current) continue;
      const tr = tracing.current;
      if (tr && id === tr.boxId) {
        // Tracing: it's not an answer. Done once the child stops for a moment.
        tr.ink.push(s);
        if (tr.timer) clearTimeout(tr.timer);
        tr.timer = setTimeout(endTracing, TRACE_DONE_MS);
        continue;
      }
      fresh.current.set(id, [...(fresh.current.get(id) ?? []), s]);
      dirty.current.add(id);
    }
    setInked(new Set([...boxOf.current.values()].filter((id) => id !== NONE)));
    setStrokeBoxes(new Map(boxOf.current));
    if (!silent.current && dirty.current.size > 0) {
      if (settleTimer.current) clearTimeout(settleTimer.current);
      settleTimer.current = setTimeout(() => void settle(), SETTLE_MS);
    }
  }

  // Nothing left to write without an answer to a marked box: ask it now.
  const writable = layout.boxes.filter((b) => active.has(b.id));
  const stuckOn = asking === null && writable.length > 0 && writable.every((b) => inked.has(b.id)) ? writable.find((b) => unsure.has(b.id)) : undefined;
  useEffect(() => {
    if (stuckOn) onAsk?.(stuckOn.id);
  }, [stuckOn, onAsk]);

  // "Menade du?" opens at the bottom of the screen: bring the box it asks about into view above it.
  const boardArea = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (asking === null) return;
    const frame = requestAnimationFrame(() => boardArea.current?.querySelector(`[data-box-id="${asking}"]`)?.scrollIntoView?.({ block: "center", behavior: "smooth" }));
    return () => cancelAnimationFrame(frame);
  }, [asking]);

  const inkColors = new Map<Stroke, string>();
  for (const [stroke, id] of strokeBoxes) {
    const status = statuses[id];
    if (status) inkColors.set(stroke, STATUS_COLOR[status]);
    else if (unsure.has(id)) inkColors.set(stroke, UNSURE_COLOR);
  }
  // While it turns round, the backwards ink is drawn by the animation instead.
  if (help?.phase === "flip") for (const stroke of help.ink) inkColors.set(stroke, "transparent");
  const helpBox = help ? layout.boxes.find((b) => b.id === help.boxId) : undefined;
  const marked = layout.boxes.filter((b) => unsure.has(b.id) && inked.has(b.id));

  return (
    <div className="flex flex-col items-center gap-2 w-full" style={{ maxWidth: maxWidth ?? layout.width }}>
      <div className="inline-flex rounded-lg bg-slate-200 p-1 gap-1" role="radiogroup" aria-label="Verktyg">
        {(["pen", "erase"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={tool === t}
            onClick={() => setTool(t)}
            className={`px-3 h-9 rounded-md text-sm font-semibold ${tool === t ? "bg-white text-sky-700 shadow" : "text-slate-600"}`}
          >
            {t === "pen" ? "✏️ Penna" : "🧽 Sudda"}
          </button>
        ))}
      </div>
      <div ref={boardArea} className={`relative w-full ${disabled ? "pointer-events-none opacity-60" : ""}`}>
        <InkCanvas
          ref={inkRef}
          width={layout.width}
          height={layout.height}
          fit="aspect"
          lined={false}
          tool={tool}
          inkColors={inkColors}
          guides={<BoardGuides layout={layout} active={active} values={values} statuses={statuses} inked={inked} unsure={unsure} asking={asking} highlight={highlight} traces={traces} />}
          onStrokesChange={handleStrokesChange}
        />
        {help && helpBox && <MirrorOverlay help={help} box={helpBox} width={layout.width} height={layout.height} />}
        {/* HTML, not part of the drawing: a tap here must not become a stroke. */}
        {marked.map((b) => (
          <button
            key={b.id}
            type="button"
            data-box-id={b.id}
            aria-label={t("ui.didYouMean")}
            onClick={() => onAsk?.(b.id)}
            className="absolute -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full text-white text-lg font-bold shadow-md"
            style={{ left: `${((b.x + b.w) / layout.width) * 100}%`, top: `${(b.y / layout.height) * 100}%`, background: UNSURE_COLOR }}
          >
            ?
          </button>
        ))}
      </div>
      {help?.phase === "trace" && (
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-sm text-sky-800 max-w-xs">{t("ui.mirroredHint")}</p>
          <button type="button" onClick={endTracing} className="h-10 px-4 rounded-xl bg-slate-200 text-slate-700 text-sm font-semibold">
            {t("ui.skip")}
          </button>
        </div>
      )}
    </div>
  );
});

/**
 * Over the board, in its coordinates: the child's backwards ink turning round
 * (a flip about its own middle), then the digit dotted in the box to trace.
 */
function MirrorOverlay({ help, box, width, height }: { help: MirrorHelp; box: DrawBox; width: number; height: number }) {
  return (
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
      <style>{`@keyframes mirror-flip { 0% { transform: scaleX(1); } 50% { transform: scaleX(0.05); } 100% { transform: scaleX(-1); } }
        @keyframes trace-pulse { 0%, 100% { opacity: 0.45; } 50% { opacity: 1; } }`}</style>
      {help.phase === "flip" ? (
        <g style={{ transformBox: "fill-box", transformOrigin: "center", animation: `mirror-flip ${FLIP_MS}ms ease-in-out forwards` }}>
          {help.ink.map((stroke, i) => (
            <polyline key={i} points={stroke.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke="#0284c7" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
          ))}
        </g>
      ) : (
        <text
          x={box.x + box.w / 2}
          y={box.y + box.h / 2}
          fontSize={box.h * 0.8}
          fill="none"
          stroke="#0ea5e9"
          strokeWidth={2.5}
          strokeDasharray="6 5"
          textAnchor="middle"
          dominantBaseline="central"
          fontWeight={700}
          style={{ animation: "trace-pulse 1.4s ease-in-out infinite" }}
        >
          {help.text}
        </text>
      )}
    </svg>
  );
}

function BoardGuides({
  layout,
  active,
  values,
  statuses,
  inked,
  unsure,
  asking,
  highlight,
  traces,
}: {
  layout: BoardLayout;
  active: ReadonlySet<string>;
  values: Readonly<Record<string, string>>;
  statuses: Readonly<Record<string, BoxStatus>>;
  inked: ReadonlySet<string>;
  unsure: ReadonlySet<string>;
  asking: string | null;
  highlight: ReadonlySet<string>;
  traces: Readonly<Record<string, string>>;
}) {
  /** An amber glow round a box the current step works with, drawn under it. */
  const glow = (b: DrawBox) =>
    highlight.has(b.id) && <rect x={b.x - 5} y={b.y - 5} width={b.w + 10} height={b.h + 10} rx={14} fill={HIGHLIGHT.glow} stroke={HIGHLIGHT.stroke} strokeWidth={3} />;
  return (
    <g pointerEvents="none">
      {layout.boxes.map((b) => {
        const status = statuses[b.id];
        const value = inked.has(b.id) ? undefined : values[b.id];
        const lit = highlight.has(b.id);
        if (b.kind === "printed") {
          return (
            <g key={b.id}>
              {glow(b)}
              <rect x={b.x} y={b.y} width={b.w} height={b.h} rx={10} fill={lit ? HIGHLIGHT.fill : "#ffffff"} stroke={active.has(b.id) ? "#38bdf8" : lit ? HIGHLIGHT.stroke : "#cbd5e1"} strokeWidth={active.has(b.id) || lit ? 3 : 2} />
              <text x={b.x + b.w / 2} y={b.y + b.h / 2} fontSize={b.h * 0.55} fill={PRINTED_INK} textAnchor="middle" dominantBaseline="central" fontWeight={600}>
                {b.text}
              </text>
              {value === "struck" && <line x1={b.x + b.w * 0.15} y1={b.y + b.h * 0.85} x2={b.x + b.w * 0.85} y2={b.y + b.h * 0.15} stroke={STATUS_COLOR.wrong} strokeWidth={4} strokeLinecap="round" />}
            </g>
          );
        }
        const isActive = active.has(b.id);
        const isUnsure = !status && unsure.has(b.id) && inked.has(b.id);
        const outline = status ? STATUS_COLOR[status] : isUnsure ? UNSURE_COLOR : isActive ? "#38bdf8" : "#e2e8f0";
        return (
          <g key={b.id}>
            {glow(b)}
            <rect
              x={b.x}
              y={b.y}
              width={b.w}
              height={b.h}
              rx={10}
              fill={isActive ? "#ffffff" : lit ? HIGHLIGHT.fill : "#f8fafc"}
              stroke={outline}
              strokeWidth={b.id === asking ? 5 : isActive || status || isUnsure ? 3 : 2}
              strokeDasharray={isActive && !status && !isUnsure ? "7 5" : undefined}
            />
            {value && value !== "struck" && (
              <text x={b.x + b.w / 2} y={b.y + b.h / 2} fontSize={b.h * 0.55} fill={status ? STATUS_COLOR[status] : PRINTED_INK} textAnchor="middle" dominantBaseline="central" fontWeight={700}>
                {value}
              </text>
            )}
            {!value && !inked.has(b.id) && traces[b.id] && (
              <text
                x={b.x + b.w / 2}
                y={b.y + b.h / 2}
                fontSize={b.h * 0.75}
                fill="none"
                stroke={TRACE_INK}
                strokeWidth={2}
                strokeDasharray="5 4"
                textAnchor="middle"
                dominantBaseline="central"
                fontWeight={400}
              >
                {traces[b.id]}
              </text>
            )}
          </g>
        );
      })}
      {layout.lines.map((l, i) => (
        <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke="#334155" strokeWidth={4} strokeLinecap="round" />
      ))}
      {layout.texts.map((t, i) => (
        <text key={i} x={t.x} y={t.y} fontSize={t.size} fill="#475569" textAnchor="middle" dominantBaseline="central" fontWeight={700}>
          {t.text}
        </text>
      ))}
    </g>
  );
}
