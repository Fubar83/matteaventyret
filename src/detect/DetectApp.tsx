import { useEffect, useRef, useState } from "react";
import { preloadRecognizer } from "../recognition/recognizer";
import type { Stroke } from "../recognition/preprocess";
import { InkCanvas, type InkCanvasHandle } from "../mathinput/InkCanvas";
import { detectAll, type DetectedItem, type GlyphType } from "./detectSymbols";

const DEFAULT_DEBOUNCE_MS = 700;
const CANVAS_W = 900;
const CANVAS_H = 320;

const GLYPH_COLOR: Record<GlyphType, string> = {
  digit: "#0284c7", // sky
  operator: "#d97706", // amber
  dot: "#9333ea", // purple
  letter: "#16a34a", // green
};
const LINE_COLOR = "#dc2626"; // red

export function DetectApp() {
  const inkRef = useRef<InkCanvasHandle>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const strokesRef = useRef<Stroke[]>([]);

  const [live, setLive] = useState(true);
  const [debounceMs, setDebounceMs] = useState(DEFAULT_DEBOUNCE_MS);
  const [items, setItems] = useState<DetectedItem[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    preloadRecognizer();
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  async function interpret(strokes: Stroke[]) {
    if (strokes.length === 0) {
      setItems([]);
      return;
    }
    setBusy(true);
    try {
      setItems(await detectAll(strokes));
    } finally {
      setBusy(false);
    }
  }

  function handleStrokesChange(next: Stroke[]) {
    strokesRef.current = next;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (live) debounceTimer.current = setTimeout(() => interpret(strokesRef.current), debounceMs);
  }

  function handleInterpretClick() {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    void interpret(strokesRef.current);
  }

  function handleClear() {
    inkRef.current?.clear();
    strokesRef.current = [];
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setItems([]);
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center gap-6 py-8 px-4">
      <div className="max-w-2xl text-center">
        <h1 className="text-2xl font-bold text-slate-800">Linjer & tecken</h1>
        <p className="text-slate-500 text-sm mt-1">
          Rita fritt. Varje form avgörs för sig: en rak form (streck, bråkstreck, minustecken) blir en <span className="text-red-600 font-semibold">linje</span> rent geometriskt,
          utan att fråga modellen - allt annat (siffror, punkter, +&minus;&times;&divide; och andra tecken) skickas till igenkänningsmodellen.
        </p>
      </div>

      {/* InkCanvas itself renders at a fixed CANVAS_H px tall (only its width is responsive), so the wrapper gets that same fixed height - an aspect-ratio-computed height here would drift from it as the wrapper's width changes, misaligning the overlay below. */}
      <div className="relative w-full max-w-3xl" style={{ height: CANVAS_H }}>
        <InkCanvas ref={inkRef} width={CANVAS_W} height={CANVAS_H} onStrokesChange={handleStrokesChange} />
        <svg viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
          {items.map((item, i) =>
            item.type === "line" ? (
              <line key={i} x1={item.x1} y1={item.y1} x2={item.x2} y2={item.y2} stroke={LINE_COLOR} strokeWidth={2.5} strokeDasharray="6 4" />
            ) : (
              <rect
                key={i}
                x={item.bbox.x}
                y={item.bbox.y}
                width={item.bbox.w}
                height={item.bbox.h}
                fill="none"
                stroke={GLYPH_COLOR[item.type]}
                strokeWidth={2}
                rx={4}
              />
            )
          )}
        </svg>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={() => inkRef.current?.undo()} className="px-4 h-10 rounded-lg bg-slate-200 text-slate-700 font-semibold text-sm">
          Ångra
        </button>
        <button type="button" onClick={handleClear} className="px-4 h-10 rounded-lg bg-amber-400 text-white font-semibold text-sm">
          Rensa
        </button>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} />
          Tolka live
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          Fördröjning
          <input type="range" min={200} max={2000} step={100} value={debounceMs} disabled={!live} onChange={(e) => setDebounceMs(Number(e.target.value))} className="w-32" />
          {debounceMs} ms
        </label>
        <button type="button" onClick={handleInterpretClick} className="px-5 h-10 rounded-lg bg-sky-600 text-white font-bold text-sm shadow disabled:opacity-50" disabled={busy}>
          {busy ? "Tolkar..." : "Tolka"}
        </button>
      </div>

      <div className="w-full max-w-2xl flex flex-col gap-2">
        <div className="flex flex-wrap gap-3 text-xs text-slate-500 justify-center">
          <Legend color={LINE_COLOR} label="linje" />
          <Legend color={GLYPH_COLOR.digit} label="siffra" />
          <Legend color={GLYPH_COLOR.operator} label="tecken" />
          <Legend color={GLYPH_COLOR.dot} label="punkt" />
          <Legend color={GLYPH_COLOR.letter} label="bokstav" />
        </div>
        <pre className="bg-slate-900 text-slate-100 text-xs rounded-xl p-4 overflow-x-auto min-h-[4rem]">
          {items.length === 0 ? "[]" : JSON.stringify(items, null, 2)}
        </pre>
      </div>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
