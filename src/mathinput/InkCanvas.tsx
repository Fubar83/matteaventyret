import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import getStroke from "perfect-freehand";
import type { Point, Stroke } from "../recognition/preprocess";

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

export interface InkCanvasHandle {
  undo: () => void;
  clear: () => void;
}

interface InkCanvasProps {
  width?: number;
  height?: number;
  /** Fires with the full current stroke list whenever a stroke finishes (pen up), or is undone/cleared. */
  onStrokesChange: (strokes: Stroke[]) => void;
  disabled?: boolean;
}

/** A free-form, multi-symbol, multi-stroke ink surface - unlike DigitCanvas, strokes stay on the page until cleared, so a whole expression can be built up. */
export const InkCanvas = forwardRef<InkCanvasHandle, InkCanvasProps>(function InkCanvas(
  { width = 900, height = 320, onStrokesChange, disabled },
  ref
) {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const drawingRef = useRef(false);

  useImperativeHandle(ref, () => ({
    undo() {
      const next = strokes.slice(0, -1);
      setStrokes(next);
      onStrokesChange(next);
    },
    clear() {
      setStrokes([]);
      onStrokesChange([]);
    },
  }));

  function pointFromEvent(e: React.PointerEvent<SVGSVGElement>): Point | null {
    // currentTarget can be null on a stray/out-of-order event from some
    // input-automation tools; a real pointer/mouse/touch input never does this.
    const rect = e.currentTarget?.getBoundingClientRect();
    if (!rect) return null;
    return { x: ((e.clientX - rect.left) / rect.width) * width, y: ((e.clientY - rect.top) / rect.height) * height };
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
    drawingRef.current = true;
    setStrokes((s) => [...s, [p]]);
  }

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!drawingRef.current) return;
    const p = pointFromEvent(e);
    if (!p) return;
    setStrokes((s) => {
      const next = s.slice();
      next[next.length - 1] = [...next[next.length - 1], p];
      return next;
    });
  }

  function finishStroke() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    onStrokesChange(strokes);
  }

  const paths = strokes.map((stroke) =>
    svgPathFromOutline(getStroke(stroke.map((p) => [p.x, p.y] as [number, number]), { size: 7, thinning: 0.4, smoothing: 0.55, streamline: 0.55 }))
  );

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      // Without this, the SVG letterboxes to preserve the viewBox's aspect
      // ratio whenever the rendered box's ratio doesn't match it exactly
      // (near-guaranteed with a "100%"-wide, fixed-height element) - and
      // pointFromEvent's rect-to-viewBox mapping below assumes no letterboxing,
      // so ink would land off from the actual pointer position.
      preserveAspectRatio="none"
      width="100%"
      height={height}
      className={`rounded-xl border-2 bg-white touch-none ${disabled ? "opacity-50 border-slate-200" : "border-sky-400"}`}
      style={{
        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 39px, #e2e8f0 40px)",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishStroke}
      onPointerCancel={finishStroke}
    >
      {paths.map((d, i) => (
        <path key={i} d={d} fill="#1e293b" />
      ))}
    </svg>
  );
});
