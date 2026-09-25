import { useEffect, useRef, useState } from "react";
import type { Point, Stroke } from "../recognition/preprocess";

const SETTLE_MS = 800; // waits for a second stroke (open 4, crossed 7) before reading the cell

/** The standalone-canvas default size, used e.g. throughout Träningsverkstan - preprocessStrokes needs to know it to tell a small mark from a character drawn small on a compact board cell. */
export const DEFAULT_CANVAS_SIZE = 120;

interface DigitCanvasProps {
  /** Fires once, ~800ms after the pen lifts and no new stroke has started (so multi-stroke digits stay one read). */
  onSettled: (strokes: Stroke[]) => void;
  disabled?: boolean;
  /** Bumped by the parent to force a visual clear (e.g. after the cell is accepted). */
  resetToken?: number;
  /** Side length in px. Defaults to a large standalone canvas; pass a board cell's own size to draw in place. */
  size?: number;
  /** Hides the Ångra/Sudda footer in favour of a small in-corner clear button, for use inline on the board. */
  compact?: boolean;
  className?: string;
}

/** One small handwriting cell: pointer-based stroke capture, smoothed, multi-stroke aware. Recognition is the caller's job. */
export function DigitCanvas({ onSettled, disabled, resetToken, size = DEFAULT_CANVAS_SIZE, compact = false, className }: DigitCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const drawingRef = useRef(false);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  function getCtx() {
    return canvasRef.current?.getContext("2d") ?? null;
  }

  function redraw() {
    const ctx = getCtx();
    if (!ctx) return;
    ctx.clearRect(0, 0, size, size);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(3, size / 15);
    ctx.strokeStyle = "#1e293b";
    for (const stroke of strokesRef.current) {
      if (stroke.length === 0) continue;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for (let i = 1; i < stroke.length - 1; i++) {
        const mid = { x: (stroke[i].x + stroke[i + 1].x) / 2, y: (stroke[i].y + stroke[i + 1].y) / 2 };
        ctx.quadraticCurveTo(stroke[i].x, stroke[i].y, mid.x, mid.y);
      }
      if (stroke.length === 1) ctx.lineTo(stroke[0].x + 0.1, stroke[0].y);
      ctx.stroke();
    }
  }

  function clearAll() {
    strokesRef.current = [];
    if (settleTimer.current) clearTimeout(settleTimer.current);
    setIsEmpty(true);
    redraw();
  }

  useEffect(() => {
    clearAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetToken]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => redraw(), [size]);

  useEffect(() => {
    return () => {
      if (settleTimer.current) clearTimeout(settleTimer.current);
    };
  }, []);

  function scheduleSettle() {
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      if (strokesRef.current.length === 0) return;
      onSettled(strokesRef.current);
    }, SETTLE_MS);
  }

  function pointFromEvent(e: React.PointerEvent<HTMLCanvasElement>): Point {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return;
    try {
      // Keeps the drag tracked even if the pointer leaves the canvas bounds. Can throw
      // (NotFoundError) if the browser no longer considers the pointer active - harmless
      // to skip, the stroke just won't track past the canvas edge in that rare case.
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    if (settleTimer.current) clearTimeout(settleTimer.current);
    drawingRef.current = true;
    strokesRef.current = [...strokesRef.current, [pointFromEvent(e)]];
    setIsEmpty(false);
    redraw();
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const strokes = strokesRef.current;
    const last = strokes[strokes.length - 1];
    strokes[strokes.length - 1] = [...last, pointFromEvent(e)];
    redraw();
  }

  function handlePointerUp() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    scheduleSettle();
  }

  function undo() {
    strokesRef.current = strokesRef.current.slice(0, -1);
    setIsEmpty(strokesRef.current.length === 0);
    if (settleTimer.current) clearTimeout(settleTimer.current);
    redraw();
    if (strokesRef.current.length > 0) scheduleSettle();
  }

  const canvasEl = (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`rounded-md border-2 bg-white touch-none ${disabled ? "opacity-40 border-slate-200" : "border-sky-400 border-dashed"} ${className ?? ""}`}
      style={{ width: size, height: size }}
    />
  );

  if (compact) {
    return (
      <div className="relative inline-block">
        {canvasEl}
        {!isEmpty && !disabled && (
          <button
            type="button"
            onClick={clearAll}
            aria-label="Sudda"
            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] leading-none flex items-center justify-center shadow"
          >
            ×
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {canvasEl}
      <div className="flex gap-2">
        <button type="button" onClick={undo} disabled={disabled || isEmpty} className="px-3 h-8 rounded-lg bg-slate-200 text-slate-700 text-sm font-semibold disabled:opacity-40">
          Ångra
        </button>
        <button type="button" onClick={clearAll} disabled={disabled || isEmpty} className="px-3 h-8 rounded-lg bg-amber-400 text-white text-sm font-semibold disabled:opacity-40">
          Sudda
        </button>
      </div>
    </div>
  );
}
