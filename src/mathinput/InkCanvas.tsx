import { forwardRef, useImperativeHandle, useRef, useState, type ReactNode } from "react";
import getStroke from "perfect-freehand";
import type { Point, Stroke } from "../recognition/preprocess";
import { useBlockTouchGestures } from "./blockTouchGestures";
import { INK_CURSORS } from "./inkCursors";

/** perfect-freehand returns an outline polygon; this is its own docs' standard helper to turn that into a smooth closed SVG path. */
function svgPathFromOutline(points: number[][]): string {
  if (points.length === 0) return "";
  const d = points.reduce<(string | number)[]>(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ["M", ...points[0], "Q"]
  );
  d.push("Z");
  return d.join(" ");
}

/**
 * - pen: draw new strokes.
 * - select: tap a stroke to select it (or drag a box over empty space to
 *   select several), then drag any selected stroke to move the selection -
 *   e.g. to pull apart two digits of "100" that were written overlapping.
 * - erase: tap or swipe across strokes to remove them.
 */
export type InkTool = "pen" | "select" | "erase";

export interface InkCanvasHandle {
  /** Undoes the last change of any kind - a new stroke, a move, an erase, a delete or a clear. */
  undo: () => void;
  clear: () => void;
  deleteSelected: () => void;
  /** Removes these particular strokes (e.g. a wrong digit, so the child can write it again). */
  remove: (strokes: ReadonlySet<Stroke>) => void;
  /** Swaps strokes for new ones in place - e.g. a digit written backwards, turned the right way round. */
  replace: (swaps: ReadonlyMap<Stroke, Stroke>) => void;
}

interface InkCanvasProps {
  width?: number;
  height?: number;
  /** Fires with the full current stroke list whenever the page changes: a stroke finishes (pen up), strokes are moved/erased/deleted, or a change is undone/cleared. */
  onStrokesChange: (strokes: Stroke[]) => void;
  disabled?: boolean;
  tool?: InkTool;
  /** Fires with how many strokes are selected whenever the selection changes from inside the canvas. */
  onSelectionChange?: (count: number) => void;
  /** Per-stroke ink color (e.g. green/red from the verifier - see inkColors.ts), keyed by the stroke itself; others draw in the default ink. */
  inkColors?: ReadonlyMap<Stroke, string>;
  /** Drawn under the ink, in the same viewBox coordinates - e.g. a writing template's guide boxes (TemplateGuides). */
  guides?: ReactNode;
  /** Ruled paper lines in the background (default on); a template brings its own guides instead. */
  lined?: boolean;
  /** How far apart the ruled lines are, in screen pixels (default 40). */
  lineGap?: number;
  /**
   * "fixed" (default): `height` px tall, width stretching to fit.
   * "aspect": keeps the viewBox's shape at any width - the drawing area (and
   * a template's boxes) grow with the screen instead of being stretched,
   * which is what makes them finger-sized on a tablet.
   */
  fit?: "fixed" | "aspect";
}

/** How close (viewBox units) a tap must land to a stroke to hit it. A fingertip is far less precise than a mouse or pen tip, so it gets a bigger radius. */
const HIT_RADIUS = { mouse: 10, pen: 10, touch: 20 } as const;
/** Pointer travel (viewBox units) below which a press counts as a tap, not a drag. */
const DRAG_THRESHOLD = 6;
const EMPTY: ReadonlySet<number> = new Set();

type Gesture =
  | { kind: "draw" }
  | { kind: "move"; ids: ReadonlySet<number>; start: Point; offset: Point }
  | { kind: "marquee"; start: Point; end: Point }
  | { kind: "erase"; ids: Set<number>; last: Point; radius: number };

function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function distanceToStroke(p: Point, stroke: Stroke): number {
  if (stroke.length === 1) return Math.hypot(p.x - stroke[0].x, p.y - stroke[0].y);
  let min = Infinity;
  for (let i = 0; i < stroke.length - 1; i++) min = Math.min(min, distanceToSegment(p, stroke[i], stroke[i + 1]));
  return min;
}

/** The stroke nearest to p within radius, or null - the nearest, not the first, so a tap on two overlapping digits picks the one actually under the finger. */
function strokeAt(p: Point, strokes: Stroke[], radius: number): number | null {
  let best: number | null = null;
  let bestDist = radius;
  strokes.forEach((s, i) => {
    const d = distanceToStroke(p, s);
    if (d <= bestDist) {
      best = i;
      bestDist = d;
    }
  });
  return best;
}

function strokeBounds(strokes: Stroke[]): { minX: number; minY: number; maxX: number; maxY: number } | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of strokes) {
    for (const p of s) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
  }
  return minX === Infinity ? null : { minX, minY, maxX, maxY };
}

function rectFrom(a: Point, b: Point) {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) };
}

/** A free-form, multi-symbol, multi-stroke ink surface - unlike DigitCanvas, strokes stay on the page until cleared, so a whole expression can be built up. */
export const InkCanvas = forwardRef<InkCanvasHandle, InkCanvasProps>(function InkCanvas(
  { width = 900, height = 320, onStrokesChange, disabled, tool = "pen", onSelectionChange, guides, lined = true, lineGap = 40, fit = "fixed", inkColors },
  ref
) {
  const [strokes, setStrokesState] = useState<Stroke[]>([]);
  // The committed page, readable from event handlers without waiting for a re-render.
  const strokesRef = useRef<Stroke[]>([]);
  // Snapshots of the page before each change, for undo.
  const historyRef = useRef<Stroke[][]>([]);
  const gestureRef = useRef<Gesture | null>(null);
  const [gesture, setGesture] = useState<Gesture | null>(null);
  const [selected, setSelectedState] = useState<ReadonlySet<number>>(EMPTY);
  const svgRef = useRef<SVGSVGElement>(null);
  // A finger draws here instead of scrolling the page (iOS Safari needs more than touch-action: none).
  useBlockTouchGestures(svgRef, !disabled);

  // Switching tools drops the selection (see React docs: "Adjusting state when a prop changes").
  const [prevTool, setPrevTool] = useState(tool);
  if (tool !== prevTool) {
    setPrevTool(tool);
    setSelectedState(EMPTY);
  }

  function setStrokes(next: Stroke[]) {
    strokesRef.current = next;
    setStrokesState(next);
  }

  function setSelected(next: ReadonlySet<number>) {
    setSelectedState(next);
    onSelectionChange?.(next.size);
  }

  function updateGesture(next: Gesture | null) {
    gestureRef.current = next;
    setGesture(next);
  }

  /** Every change to the page goes through here, so each one can be undone. */
  function commit(next: Stroke[]) {
    historyRef.current.push(strokesRef.current);
    setStrokes(next);
    onStrokesChange(next);
  }

  function removeStrokes(ids: ReadonlySet<number>) {
    if (ids.size === 0) return;
    commit(strokesRef.current.filter((_, i) => !ids.has(i)));
    setSelected(EMPTY);
  }

  useImperativeHandle(ref, () => ({
    undo() {
      const prev = historyRef.current.pop();
      if (!prev) return;
      setStrokes(prev);
      onStrokesChange(prev);
      setSelected(EMPTY);
    },
    clear() {
      if (strokesRef.current.length > 0) commit([]);
      setSelected(EMPTY);
    },
    deleteSelected() {
      removeStrokes(selected);
    },
    remove(strokes) {
      if (!strokesRef.current.some((s) => strokes.has(s))) return;
      commit(strokesRef.current.filter((s) => !strokes.has(s)));
      setSelected(EMPTY);
    },
    replace(swaps) {
      if (!strokesRef.current.some((s) => swaps.has(s))) return;
      commit(strokesRef.current.map((s) => swaps.get(s) ?? s));
    },
  }));

  function pointFromEvent(e: React.PointerEvent<SVGSVGElement>): Point | null {
    // currentTarget can be null on a stray/out-of-order event from some
    // input-automation tools; a real pointer/mouse/touch input never does this.
    const rect = e.currentTarget?.getBoundingClientRect();
    if (!rect) return null;
    return { x: ((e.clientX - rect.left) / rect.width) * width, y: ((e.clientY - rect.top) / rect.height) * height };
  }

  function hitRadius(e: React.PointerEvent): number {
    return HIT_RADIUS[e.pointerType as keyof typeof HIT_RADIUS] ?? HIT_RADIUS.mouse;
  }

  /** Marks every stroke within radius of the pointer's path from a to b - sampled along the path, so a fast swipe doesn't skip over strokes between two pointer events. */
  function eraseAlong(ids: Set<number>, a: Point, b: Point, radius: number) {
    const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / (radius / 2)));
    for (let k = 0; k <= steps; k++) {
      const p = { x: a.x + ((b.x - a.x) * k) / steps, y: a.y + ((b.y - a.y) * k) / steps };
      strokesRef.current.forEach((s, i) => {
        if (!ids.has(i) && distanceToStroke(p, s) <= radius) ids.add(i);
      });
    }
  }

  function handlePointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if (disabled) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // A stale/inactive pointer id can throw here; harmless to skip (see DigitCanvas).
    }
    const p = pointFromEvent(e);
    if (!p) return;

    if (tool === "pen") {
      historyRef.current.push(strokesRef.current);
      setStrokes([...strokesRef.current, [p]]);
      updateGesture({ kind: "draw" });
    } else if (tool === "erase") {
      const ids = new Set<number>();
      const radius = hitRadius(e);
      eraseAlong(ids, p, p, radius);
      updateGesture({ kind: "erase", ids, last: p, radius });
    } else {
      const hit = strokeAt(p, strokesRef.current, hitRadius(e));
      if (hit === null) {
        updateGesture({ kind: "marquee", start: p, end: p });
        return;
      }
      // Grabbing an already-selected stroke drags the whole selection; grabbing any other stroke selects just that one and drags it.
      const ids = selected.has(hit) ? selected : new Set([hit]);
      if (ids !== selected) setSelected(ids);
      updateGesture({ kind: "move", ids, start: p, offset: { x: 0, y: 0 } });
    }
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const g = gestureRef.current;
    if (!g) return;
    const p = pointFromEvent(e);
    if (!p) return;

    if (g.kind === "draw") {
      const next = strokesRef.current.slice();
      next[next.length - 1] = [...next[next.length - 1], p];
      setStrokes(next);
    } else if (g.kind === "erase") {
      eraseAlong(g.ids, g.last, p, g.radius);
      updateGesture({ ...g, last: p });
    } else if (g.kind === "move") {
      updateGesture({ ...g, offset: { x: p.x - g.start.x, y: p.y - g.start.y } });
    } else {
      updateGesture({ ...g, end: p });
    }
  }

  function finishGesture() {
    const g = gestureRef.current;
    if (!g) return;
    updateGesture(null);

    if (g.kind === "draw") {
      // The history snapshot was taken on pointer-down, before the stroke existed.
      onStrokesChange(strokesRef.current);
    } else if (g.kind === "erase") {
      removeStrokes(g.ids);
    } else if (g.kind === "move") {
      if (Math.hypot(g.offset.x, g.offset.y) < DRAG_THRESHOLD) return; // just a tap: the stroke is selected, nothing moved
      commit(strokesRef.current.map((s, i) => (g.ids.has(i) ? s.map((pt) => ({ x: pt.x + g.offset.x, y: pt.y + g.offset.y })) : s)));
    } else {
      const r = rectFrom(g.start, g.end);
      if (r.w < DRAG_THRESHOLD && r.h < DRAG_THRESHOLD) {
        setSelected(EMPTY); // a tap on empty space deselects
        return;
      }
      // A stroke is in the box when its own center is - lenient enough for a quick sloppy box, strict enough not to grab a neighbor it merely clips.
      const ids = new Set<number>();
      strokesRef.current.forEach((s, i) => {
        const b = strokeBounds([s]);
        if (!b) return;
        const cx = (b.minX + b.maxX) / 2;
        const cy = (b.minY + b.maxY) / 2;
        if (cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h) ids.add(i);
      });
      setSelected(ids);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<SVGSVGElement>) {
    if ((e.key === "Delete" || e.key === "Backspace") && selected.size > 0) {
      e.preventDefault();
      removeStrokes(selected);
    }
  }

  const moveOffset = gesture?.kind === "move" ? gesture.offset : null;
  const erasing = gesture?.kind === "erase" ? gesture.ids : EMPTY;
  const selectionBox = selected.size > 0 ? strokeBounds(strokes.filter((_, i) => selected.has(i))) : null;
  const marquee = gesture?.kind === "marquee" ? rectFrom(gesture.start, gesture.end) : null;
  // Moving a selection shows the browser's "grabbing" hand; otherwise each tool has its own drawn cursor (inkCursors.ts).
  const cursor = gesture?.kind === "move" ? "grabbing" : INK_CURSORS[tool];

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      // Without this, the SVG letterboxes to preserve the viewBox's aspect
      // ratio whenever the rendered box's ratio doesn't match it exactly
      // (near-guaranteed with a "100%"-wide, fixed-height element) - and
      // pointFromEvent's rect-to-viewBox mapping below assumes no letterboxing,
      // so ink would land off from the actual pointer position.
      preserveAspectRatio="none"
      width="100%"
      height={fit === "fixed" ? height : undefined}
      tabIndex={0}
      className={`block rounded-xl border-2 bg-white touch-none outline-none ${disabled ? "opacity-50 border-slate-200" : "border-sky-400"}`}
      style={{
        backgroundImage: lined ? `repeating-linear-gradient(0deg, transparent, transparent ${lineGap - 1}px, #e2e8f0 ${lineGap}px)` : undefined,
        aspectRatio: fit === "aspect" ? `${width} / ${height}` : undefined,
        cursor,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishGesture}
      onPointerCancel={finishGesture}
      onKeyDown={handleKeyDown}
    >
      {guides}
      {strokes.map((stroke, i) => {
        const isSelected = selected.has(i);
        const d = svgPathFromOutline(
          getStroke(stroke.map((p) => [p.x, p.y] as [number, number]), { size: 7, thinning: 0.4, smoothing: 0.55, streamline: 0.55 })
        );
        return (
          <path
            key={i}
            d={d}
            fill={isSelected ? "#0284c7" : (inkColors?.get(stroke) ?? "#1e293b")}
            opacity={erasing.has(i) ? 0.2 : 1}
            transform={isSelected && moveOffset ? `translate(${moveOffset.x} ${moveOffset.y})` : undefined}
          />
        );
      })}
      {selectionBox && (
        <rect
          x={selectionBox.minX - 8 + (moveOffset?.x ?? 0)}
          y={selectionBox.minY - 8 + (moveOffset?.y ?? 0)}
          width={selectionBox.maxX - selectionBox.minX + 16}
          height={selectionBox.maxY - selectionBox.minY + 16}
          fill="none"
          stroke="#0284c7"
          strokeWidth={1.5}
          strokeDasharray="6 4"
          rx={6}
          pointerEvents="none"
        />
      )}
      {marquee && (
        <rect x={marquee.x} y={marquee.y} width={marquee.w} height={marquee.h} fill="#0284c7" fillOpacity={0.08} stroke="#0284c7" strokeWidth={1} strokeDasharray="4 3" pointerEvents="none" />
      )}
    </svg>
  );
});

const TOOLS: { tool: InkTool; label: string; icon: string }[] = [
  { tool: "pen", label: "Penna", icon: "✏️" },
  { tool: "select", label: "Markera & flytta", icon: "✋" },
  { tool: "erase", label: "Sudda", icon: "🧽" },
];

/** Segmented tool switcher for InkCanvas - big enough to hit with a finger on a tablet. */
export function InkToolPicker({ tool, onChange }: { tool: InkTool; onChange: (tool: InkTool) => void }) {
  return (
    <div className="inline-flex rounded-lg bg-slate-200 p-1 gap-1" role="radiogroup" aria-label="Verktyg">
      {TOOLS.map((t) => (
        <button
          key={t.tool}
          type="button"
          role="radio"
          aria-checked={tool === t.tool}
          onClick={() => onChange(t.tool)}
          className={`px-3 h-9 rounded-md text-sm font-semibold flex items-center gap-1.5 ${
            tool === t.tool ? "bg-white text-sky-700 shadow" : "text-slate-600"
          }`}
        >
          <span aria-hidden>{t.icon}</span>
          {t.label}
        </button>
      ))}
    </div>
  );
}
