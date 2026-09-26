import katex from "katex";
import "katex/dist/katex.min.css";
import "mathlive";
import type { MathfieldElement } from "mathlive";
import { useEffect, useRef, useState } from "react";
import { preloadRecognizer } from "../recognition/recognizer";
import type { Stroke } from "../recognition/preprocess";
import { InkCanvas, type InkCanvasHandle } from "./InkCanvas";
import { recognizeExpression, type ExpressionResult } from "./recognizeExpression";

const DEFAULT_DEBOUNCE_MS = 700;
const EMPTY_RESULT: ExpressionResult = { latex: "", symbols: [] };

export function MathInputApp() {
  const inkRef = useRef<InkCanvasHandle>(null);
  const katexRef = useRef<HTMLDivElement | null>(null);
  const mathFieldContainerRef = useRef<HTMLDivElement | null>(null);
  const mathFieldRef = useRef<MathfieldElement | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const strokesRef = useRef<Stroke[]>([]);

  const [live, setLive] = useState(true);
  const [debounceMs, setDebounceMs] = useState(DEFAULT_DEBOUNCE_MS);
  const [result, setResult] = useState<ExpressionResult>(EMPTY_RESULT);
  const [editedLatex, setEditedLatex] = useState("");
  // Resets editedLatex to match a fresh recognition result, without a
  // dedicated effect+extra render (see React docs: "Adjusting state when a
  // prop changes"). Further edits inside the MathLive field only ever touch
  // editedLatex itself, so they aren't clobbered by this on every render.
  const [syncedLatex, setSyncedLatex] = useState(result.latex);
  if (result.latex !== syncedLatex) {
    setSyncedLatex(result.latex);
    setEditedLatex(result.latex);
  }
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  // MathLive's <math-field> is a plain custom element, created imperatively
  // so this file doesn't need a JSX intrinsic-element declaration for it.
  useEffect(() => {
    const container = mathFieldContainerRef.current;
    if (!container) return;
    const mf = document.createElement("math-field") as MathfieldElement;
    mf.style.width = "100%";
    mf.style.fontSize = "1.4rem";
    mf.style.border = "2px solid #cbd5e1";
    mf.style.borderRadius = "0.75rem";
    mf.style.padding = "0.5rem 0.75rem";
    const onInput = () => setEditedLatex(mf.value);
    mf.addEventListener("input", onInput);
    container.appendChild(mf);
    mathFieldRef.current = mf;
    return () => {
      mf.removeEventListener("input", onInput);
      container.removeChild(mf);
      mathFieldRef.current = null;
    };
  }, []);

  useEffect(() => {
    preloadRecognizer();
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  useEffect(() => {
    const el = katexRef.current;
    if (!el) return;
    if (!result.latex) {
      el.textContent = "";
      return;
    }
    try {
      katex.render(result.latex, el, { throwOnError: false, displayMode: true });
    } catch {
      el.textContent = "(kunde inte tolka uttrycket som LaTeX)";
    }
  }, [result.latex]);

  // Pushing a fresh recognition result into the MathLive field is a genuine
  // effect (an external DOM element), so it stays in its own effect.
  useEffect(() => {
    if (mathFieldRef.current) mathFieldRef.current.value = result.latex;
  }, [result.latex]);

  async function interpret(strokes: Stroke[]) {
    if (strokes.length === 0) {
      setResult(EMPTY_RESULT);
      return;
    }
    setBusy(true);
    try {
      const r = await recognizeExpression(strokes);
      setResult(r);
    } finally {
      setBusy(false);
    }
  }

  function handleStrokesChange(next: Stroke[]) {
    strokesRef.current = next;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (live) {
      debounceTimer.current = setTimeout(() => interpret(strokesRef.current), debounceMs);
    }
  }

  function handleInterpretClick() {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    void interpret(strokesRef.current);
  }

  function handleClear() {
    inkRef.current?.clear();
    strokesRef.current = [];
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setResult(EMPTY_RESULT);
  }

  function handleUndo() {
    inkRef.current?.undo();
  }

  async function handleCopy() {
    if (!editedLatex) return;
    try {
      await navigator.clipboard.writeText(editedLatex);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be denied (permissions, insecure context); the
      // LaTeX is already shown as selectable text, so this is a nice-to-have.
    }
  }

  const uncertainCount = result.symbols.filter((s) => !s.confident).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center gap-6 py-8 px-4">
      <div className="max-w-2xl text-center">
        <h1 className="text-2xl font-bold text-slate-800">Handskrift till LaTeX</h1>
        <p className="text-slate-500 text-sm mt-1">
          Skriv ett tal eller ett helt uttryck för hand - siffror, bokstäver, +&minus;&times;&divide;, parenteser, bråkstreck och
          exponenter känns igen. Skriv bråkstrecket som ett vanligt vågrätt streck med något ovanför och något under, och en
          exponent antingen litet och högt upp, eller markera den uttryckligen med "^" innan.
        </p>
      </div>

      <InkCanvas ref={inkRef} onStrokesChange={handleStrokesChange} />

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={handleUndo} className="px-4 h-10 rounded-lg bg-slate-200 text-slate-700 font-semibold text-sm">
          Ångra
        </button>
        <button type="button" onClick={handleClear} className="px-4 h-10 rounded-lg bg-amber-400 text-white font-semibold text-sm">
          Rensa
        </button>
        <label className="flex items-center gap-2 text-sm text-slate-600 select-text">
          <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} />
          Tolka live
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600 select-text">
          Fördröjning
          <input
            type="range"
            min={200}
            max={2000}
            step={100}
            value={debounceMs}
            disabled={!live}
            onChange={(e) => setDebounceMs(Number(e.target.value))}
            className="w-32"
          />
          {debounceMs} ms
        </label>
        <button
          type="button"
          onClick={handleInterpretClick}
          className="px-5 h-10 rounded-lg bg-sky-600 text-white font-bold text-sm shadow disabled:opacity-50"
          disabled={busy}
        >
          {busy ? "Tolkar..." : "Tolka"}
        </button>
      </div>

      <div className="w-full max-w-2xl flex flex-col items-center gap-3 bg-white rounded-xl border-2 border-slate-200 p-6 min-h-[6rem]">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 self-start">Tolkat automatiskt</p>
        <div ref={katexRef} className="text-2xl" />
        {!result.latex && <p className="text-slate-400 text-sm">Resultatet visas här.</p>}
        {result.latex && <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 self-start">Rätta om något blev fel</p>}
        {/* Always mounted (even before a first result) so the effect that creates the <math-field> element always finds it. */}
        <div ref={mathFieldContainerRef} className={`w-full ${result.latex ? "" : "hidden"}`} />
        {result.latex && (
          <div className="w-full flex flex-col items-center gap-3">
            <div className="flex items-center gap-2 w-full max-w-lg">
              <code className="flex-1 bg-slate-100 rounded-lg px-3 py-2 text-sm text-slate-700 overflow-x-auto select-text">{editedLatex}</code>
              <button type="button" onClick={handleCopy} className="px-3 h-9 rounded-lg bg-slate-200 text-slate-700 text-sm font-semibold shrink-0">
                {copied ? "Kopierat!" : "Kopiera"}
              </button>
            </div>
            {uncertainCount > 0 && (
              <p className="text-xs text-amber-600">{uncertainCount} tecken var osäkert tolkade - kolla resultatet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
