import katex from "katex";
import "katex/dist/katex.min.css";
import "mathlive";
import type { MathfieldElement } from "mathlive";
import { useEffect, useRef, useState } from "react";
import { formatSwedishNumber } from "../engine/digits";
import { rememberInk } from "../recognition/personal";
import { preloadRecognizer } from "../recognition/recognizer";
import { ALL_WRITING_LEVELS, WRITING_LEVELS, type WritingLevel } from "../recognition/levels";
import type { Stroke } from "../recognition/preprocess";
import { InkCanvas, InkToolPicker, type InkCanvasHandle, type InkTool } from "./InkCanvas";
import { recognizeExpression, type ExpressionResult, type Pin, type RecognizedSymbol } from "./recognizeExpression";
import type { MarkStatus, WorkCheck } from "./verify";
import { printedSymbols, templateById, templateIdFromUrl, TEMPLATE_URL_PARAM, type TemplateId } from "./templates";
import { TemplateGuides, TemplatePicker } from "./TemplateGuides";
import { colorStrokesByChecks } from "./inkColors";
import { planGuided, readOperands, type GuidedPlan } from "./guidedPlan";
import { GuidedColumn } from "./GuidedColumn";
import { TestCaseSaver } from "./TestCaseSaver";

const DEFAULT_DEBOUNCE_MS = 700;
const EMPTY_RESULT: ExpressionResult = { latex: "", symbols: [], checks: [] };
const MARK_COLOR: Record<MarkStatus, string> = {
  correct: "#16a34a", // green
  wrong: "#dc2626", // red
  followOnError: "#d97706", // amber
  missing: "#64748b", // slate
};
const NO_COLORS: ReadonlyMap<Stroke, string> = new Map();
/** A symbol the recognizer wasn't sure about - violet, apart from every verdict color. */
const UNSURE_COLOR = "#7c3aed";

/** What each level reads, for the page's intro. */
const LEVEL_HELP: Record<WritingLevel, string> = {
  1: "Åk 1–3: siffror, + − = < > och gånger (· eller ×). Spegelvända siffror räknas som rätt siffra.",
  2: "Åk 4–6: dessutom decimaltal, bråk, / % ≈, parenteser och skala (1:500), och x som okänt tal.",
  3: "Åk 7–9: dessutom ≤ ≥ ≠, potenser, rötter, π, grader, bokstäverna a b c d h k m n r u v x y z och A V.",
  4: "Gymnasiet: dessutom f(x) och f′(x), sin/cos/tan, lg/ln, lim (h → 0), integraler med gränser, ±, |x|, ∞ och α β θ Δ.",
};

/** Fritt or Guidat, kept in the address bar like the template (?lage=guidat). */
const MODE_URL_PARAM = "lage";
/** The templates Guidat can walk through (see guidedPlan.ts). */
const GUIDED_TEMPLATES: TemplateId[] = ["add", "mul"];

/** The writing level, kept in the address bar like the template (?niva=1..4). */
const LEVEL_URL_PARAM = "niva";
function levelFromUrl(search: string): WritingLevel {
  const n = Number(new URLSearchParams(search).get(LEVEL_URL_PARAM));
  return ALL_WRITING_LEVELS.includes(n as WritingLevel) ? (n as WritingLevel) : 4;
}

const sameInk = (a: readonly Stroke[], b: readonly Stroke[]) => a.length === b.length && a.every((s) => b.includes(s));

export function MathInputApp() {
  const inkRef = useRef<InkCanvasHandle>(null);
  const katexRef = useRef<HTMLDivElement | null>(null);
  const mathFieldContainerRef = useRef<HTMLDivElement | null>(null);
  const mathFieldRef = useRef<MathfieldElement | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const strokesRef = useRef<Stroke[]>([]);
  /** The writer's answers to "Menade du?" - see RecognizeOptions.pins. */
  const pinsRef = useRef<Pin[]>([]);
  /** The ink of the uncertain symbol whose "Menade du?" is open. */
  const [asking, setAsking] = useState<readonly Stroke[] | null>(null);

  const [live, setLive] = useState(true);
  const [debounceMs, setDebounceMs] = useState(DEFAULT_DEBOUNCE_MS);
  const [result, setResult] = useState<ExpressionResult>(EMPTY_RESULT);
  const [inkColors, setInkColors] = useState<ReadonlyMap<Stroke, string>>(NO_COLORS);
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
  const [showChecks, setShowChecks] = useState(true);
  const [tool, setTool] = useState<InkTool>("pen");
  const [templateId, setTemplateId] = useState<TemplateId>(() => templateIdFromUrl(window.location.search));
  const template = templateById(templateId);
  // Read by interpret(), which can run from a debounce timer set before the latest render.
  const templateRef = useRef(template);
  const [level, setLevel] = useState<WritingLevel>(() => levelFromUrl(window.location.search));
  const levelRef = useRef(level);
  const [selectionCount, setSelectionCount] = useState(0);
  /** Guidat (see guidedPlan.ts): write the numbers, then "Starta" walks through the work box by box. */
  const [guided, setGuided] = useState(() => new URLSearchParams(window.location.search).get(MODE_URL_PARAM) === "guidat");
  const [plan, setPlan] = useState<GuidedPlan | null>(null);
  const canGuide = GUIDED_TEMPLATES.includes(templateId);
  const guiding = guided && canGuide;
  const operands = guiding ? readOperands([...result.symbols.map((s) => ({ char: s.char, box: s.box, struck: s.struck })), ...printedSymbols(template)]) : null;

  function handleToolChange(next: InkTool) {
    setTool(next);
    setSelectionCount(0); // the canvas drops its selection on a tool switch
  }

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

  // Runs even with nothing written: a template whose printed parts make an
  // expression by themselves (kort division) shows it right away - see
  // recognizeExpression, which returns an empty result for everything else.
  async function interpret(strokes: Stroke[]) {
    setBusy(true);
    try {
      const t = templateRef.current;
      // In a template every operator and line is printed, so the ink can only be digits (see RecognizeOptions.digitsOnly).
      // A pin whose ink was (partly) erased no longer names a symbol on the page.
      pinsRef.current = pinsRef.current.filter((p) => p.strokes.every((s) => strokes.includes(s)));
      const r = await recognizeExpression(strokes, { printed: printedSymbols(t), digitsOnly: t.id !== "free", pins: pinsRef.current, level: levelRef.current });
      setResult(r);
      // Still unsure after this read? Keep its question open; otherwise it settled itself.
      setAsking((a) => (a && r.symbols.some((sym) => !sym.confident && sameInk(sym.strokes, a)) ? a : null));
      setInkColors(colorStrokesByChecks(strokes, r.checks, MARK_COLOR));
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
    pinsRef.current = [];
    setAsking(null);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setResult(EMPTY_RESULT);
    setInkColors(NO_COLORS);
    void interpret([]);
  }

  /** Forgets the page's ink and what was read from it (a fresh drawing area). */
  function forgetInk() {
    strokesRef.current = [];
    pinsRef.current = [];
    setAsking(null);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    setResult(EMPTY_RESULT);
    setInkColors(NO_COLORS);
    setSelectionCount(0);
  }

  function handleGuidedChange(next: boolean) {
    setGuided(next);
    setPlan(null);
    const url = new URL(window.location.href);
    if (next) url.searchParams.set(MODE_URL_PARAM, "guidat");
    else url.searchParams.delete(MODE_URL_PARAM);
    window.history.replaceState(null, "", url);
  }

  /** The numbers are written: lay the work out for exactly them and walk through it. The writing area is left behind. */
  function handleStartGuided() {
    if (!operands) return;
    setPlan(planGuided(operands.operator, operands.top, operands.bottom));
    forgetInk();
  }

  /** "Nya tal": back to an empty template to write the next numbers in. */
  function handleExitGuided() {
    setPlan(null);
    forgetInk();
    void interpret([]);
  }

  function handleUndo() {
    inkRef.current?.undo();
  }

  /** Who's writing: the same ink is read again with that level's model and characters. */
  function handleLevelChange(next: WritingLevel) {
    levelRef.current = next;
    setLevel(next);
    const url = new URL(window.location.href);
    if (next === 4) url.searchParams.delete(LEVEL_URL_PARAM);
    else url.searchParams.set(LEVEL_URL_PARAM, String(next));
    window.history.replaceState(null, "", url);
    pinsRef.current = [];
    void interpret(strokesRef.current);
  }

  /** A new template starts a fresh drawing area (InkCanvas is keyed on it) - ink written for one layout doesn't belong in another. */
  function handleTemplateChange(id: TemplateId) {
    const next = templateById(id);
    templateRef.current = next;
    setTemplateId(id);
    // Keep the choice in the address bar, so a reload (or a shared link) opens the same template.
    const url = new URL(window.location.href);
    if (id === "free") url.searchParams.delete(TEMPLATE_URL_PARAM);
    else url.searchParams.set(TEMPLATE_URL_PARAM, id);
    window.history.replaceState(null, "", url);
    setPlan(null);
    forgetInk();
    void interpret([]);
  }

  // A template opened straight from the URL (?mall=shortDiv) shows its empty expression on load too.
  useEffect(() => {
    void interpret([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  function pick(symbol: RecognizedSymbol, char: string) {
    // The writer said what this ink is: remembered on this device, so their handwriting reads better next time.
    rememberInk(symbol.strokes, char);
    pinsRef.current = [...pinsRef.current.filter((p) => !sameInk(p.strokes, symbol.strokes)), { strokes: symbol.strokes, char }];
    setAsking(null);
    void interpret(strokesRef.current);
  }

  const uncertain = result.symbols.filter((s) => !s.confident);
  const uncertainCount = uncertain.length;
  const askedSymbol = asking ? uncertain.find((s) => sameInk(s.strokes, asking)) : undefined;
  // Uncertain ink is violet whether or not the verdicts are shown - its verdict can't be trusted anyway.
  const shownColors = new Map(showChecks ? inkColors : NO_COLORS);
  for (const sym of uncertain) for (const stroke of sym.strokes) shownColors.set(stroke, UNSURE_COLOR);
  const isBlockLayout = result.latex.includes("\\begin{array}");

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center gap-6 py-8 px-4">
      <div className="max-w-2xl text-center">
        <h1 className="text-2xl font-bold text-slate-800">Handskrift till LaTeX</h1>
        <p className="text-slate-500 text-sm mt-1">
          Skriv ett tal eller ett helt uttryck för hand, gärna på flera rader. Välj nivå - tolkningen känner bara igen det som
          skrivs på den nivån, och är extra förlåtande för de yngsta: {LEVEL_HELP[level]} Decimaltecken skrivs med komma (en punkt
          på raden går också), tusental med mellanslag (12 500). Skriv bråkstrecket som ett vanligt vågrätt streck med något
          ovanför och något under, en exponent litet och högt upp till höger, och rottecknet med ett streck över allt som ska stå
          under roten (en liten siffra i rottecknets vinkel blir rotens index, t.ex. &#8731;).
        </p>
        <p className="text-slate-500 text-sm mt-1">
          Blev något fel? Välj <b>Markera &amp; flytta</b> och dra isär tecken som hamnat för nära varandra (tryck på ett streck, eller
          dra en ruta runt flera), eller <b>Sudda</b> och tryck/dra över det som ska bort.
        </p>
      </div>

      <TemplatePicker value={templateId} onChange={handleTemplateChange} />
      {templateId === "free" && <LevelPicker value={level} onChange={handleLevelChange} />}
      {canGuide && <ModePicker guided={guided} onChange={handleGuidedChange} />}

      {guiding && plan ? (
        <GuidedColumn key={plan.title} plan={plan} onExit={handleExitGuided} trace />
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <InkToolPicker tool={tool} onChange={handleToolChange} />
            {tool === "select" && selectionCount > 0 && (
              <button type="button" onClick={() => inkRef.current?.deleteSelected()} className="px-4 h-10 rounded-lg bg-rose-500 text-white font-semibold text-sm">
                Ta bort markerade
              </button>
            )}
          </div>

          {/* The drawing area keeps its template's shape at any width (fit="aspect"), and the check overlay uses the same box, so marks line up with the ink. */}
          <div className="relative w-full max-w-4xl" style={{ aspectRatio: `${template.width} / ${template.height}` }}>
            <InkCanvas
              key={template.id}
              ref={inkRef}
              width={template.width}
              height={template.height}
              fit="aspect"
              lined={template.id === "free"}
              guides={<TemplateGuides template={template} />}
              tool={tool}
              onSelectionChange={setSelectionCount}
              onStrokesChange={handleStrokesChange}
              inkColors={shownColors}
            />
            {/* HTML over the drawing, not part of it: a tap here must not become a stroke. */}
            {uncertain.map((sym) => (
              <button
                key={`${sym.box.minX}-${sym.box.minY}`}
                type="button"
                aria-label="Menade du?"
                onClick={() => setAsking(sym.strokes)}
                className="absolute -translate-y-full w-8 h-8 rounded-full text-white font-bold shadow-md"
                style={{
                  left: `${(sym.box.maxX / template.width) * 100}%`,
                  top: `${(sym.box.minY / template.height) * 100}%`,
                  background: UNSURE_COLOR,
                  outline: askedSymbol === sym ? `3px solid ${UNSURE_COLOR}` : undefined,
                  outlineOffset: 2,
                }}
              >
                ?
              </button>
            ))}
            {/* The verdicts color the ink itself (inkColors); only a missing digit - which has no ink to color - gets a dashed placeholder where it belongs. */}
            {showChecks && (
              <svg viewBox={`0 0 ${template.width} ${template.height}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none">
                {result.checks.flatMap((check, ci) =>
                  check.marks
                    .filter((m) => m.status === "missing")
                    .map((m, mi) => (
                      <rect
                        key={`${ci}-${mi}`}
                        x={m.box.minX - 3}
                        y={m.box.minY - 3}
                        width={m.box.width + 6}
                        height={m.box.height + 6}
                        rx={6}
                        fill="none"
                        stroke={MARK_COLOR.missing}
                        strokeWidth={2}
                        strokeDasharray="5 4"
                        strokeOpacity={m.optional ? 0.4 : 0.9}
                      />
                    ))
                )}
              </svg>
            )}
          </div>

          {askedSymbol && (
            <div className="flex flex-col items-center gap-1">
              <p className="text-xs text-slate-500">Menade du?</p>
              <div className="flex gap-2 items-center">
                {askedSymbol.alternatives.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => pick(askedSymbol, c)}
                    className="min-w-11 h-11 px-3 rounded-xl bg-violet-600 text-white text-xl font-bold"
                  >
                    {c}
                  </button>
                ))}
                <button type="button" onClick={() => setAsking(null)} className="h-11 px-3 rounded-xl bg-slate-200 text-slate-700 text-sm font-semibold">
                  Stäng
                </button>
              </div>
            </div>
          )}

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

          {guiding && (
            <div className="w-full max-w-2xl flex flex-col items-center gap-3 bg-white rounded-xl border-2 border-sky-200 p-6">
              <p className="text-slate-600 text-center">
                Skriv de två talen i rutorna. Sedan lägger Guidat upp uträkningen för just de talen och visar en ruta i taget.
              </p>
              <button
                type="button"
                onClick={handleStartGuided}
                disabled={!operands}
                className="px-6 h-12 rounded-xl bg-emerald-600 text-white font-bold shadow disabled:opacity-40"
              >
                {operands ? `Starta: ${formatSwedishNumber(operands.top)} ${operands.operator === "+" ? "+" : "·"} ${formatSwedishNumber(operands.bottom)}` : "Starta"}
              </button>
              {!operands && <p className="text-xs text-slate-400">Knappen går att trycka på när båda talen går att läsa.</p>}
            </div>
          )}

          <div className="w-full max-w-2xl flex flex-col items-center gap-3 bg-white rounded-xl border-2 border-slate-200 p-6 min-h-[6rem]">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 self-start">Tolkat automatiskt</p>
            <div ref={katexRef} className="text-2xl" />
            {!result.latex && <p className="text-slate-400 text-sm">Resultatet visas här.</p>}
            {result.latex && !isBlockLayout && <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 self-start">Rätta om något blev fel</p>}
            {/* MathLive can't show an array's lines (\hline), so uppställningar are left out of the editor - the LaTeX below is still copyable. */}
            {isBlockLayout && <p className="text-xs text-slate-400">Uppställningar kan inte redigeras här - kopiera LaTeX-koden nedan istället.</p>}
            {/* Always mounted (even before a first result) so the effect that creates the <math-field> element always finds it. */}
            <div ref={mathFieldContainerRef} className={`w-full ${result.latex && !isBlockLayout ? "" : "hidden"}`} />
            {result.latex && (
              <div className="w-full flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 w-full max-w-lg">
                  <code className="flex-1 bg-slate-100 rounded-lg px-3 py-2 text-sm text-slate-700 overflow-x-auto select-text">{editedLatex}</code>
                  <button type="button" onClick={handleCopy} className="px-3 h-9 rounded-lg bg-slate-200 text-slate-700 text-sm font-semibold shrink-0">
                    {copied ? "Kopierat!" : "Kopiera"}
                  </button>
                </div>
                {uncertainCount > 0 && (
                  <p className="text-xs text-amber-600">{uncertainCount} tecken är markerade med ? - tryck på dem för att välja vad du menade.</p>
                )}
                {templateId === "free" && (
                  <TestCaseSaver strokes={() => strokesRef.current} expected={editedLatex} read={result.latex} level={level} template={templateId} />
                )}
              </div>
            )}
          </div>

          {result.checks.length > 0 && !guiding && (
            <div className="w-full max-w-2xl flex flex-col gap-3 bg-white rounded-xl border-2 border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Kontroll</p>
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input type="checkbox" checked={showChecks} onChange={(e) => setShowChecks(e.target.checked)} />
                  Visa på ritytan
                </label>
              </div>
              {result.checks.map((check, i) => (
                <CheckSummary key={i} check={check} />
              ))}
              <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                <Legend color={MARK_COLOR.correct} label="rätt" />
                <Legend color={MARK_COLOR.wrong} label="fel" />
                <Legend color={MARK_COLOR.followOnError} label="följdfel (rätt utifrån ett tidigare fel)" />
                <Legend color={MARK_COLOR.missing} label="saknas" dashed />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Fritt: write the whole uppställning and have it checked. Guidat: write the numbers, then go through the work one box at a time. */
function ModePicker({ guided, onChange }: { guided: boolean; onChange: (guided: boolean) => void }) {
  return (
    <div className="inline-flex rounded-lg bg-slate-200 p-1 gap-1" role="radiogroup" aria-label="Läge">
      {[false, true].map((g) => (
        <button
          key={String(g)}
          type="button"
          role="radio"
          aria-checked={guided === g}
          onClick={() => onChange(g)}
          className={`px-4 h-9 rounded-md text-sm font-semibold ${guided === g ? "bg-white text-sky-700 shadow" : "text-slate-600"}`}
        >
          {g ? "Guidat" : "Fritt"}
        </button>
      ))}
    </div>
  );
}

function LevelPicker({ value, onChange }: { value: WritingLevel; onChange: (level: WritingLevel) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-slate-500">Nivå:</span>
      <div className="inline-flex flex-wrap justify-center rounded-lg bg-slate-200 p-1 gap-1" role="radiogroup" aria-label="Nivå">
        {ALL_WRITING_LEVELS.map((l) => (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={value === l}
            onClick={() => onChange(l)}
            className={`px-3 h-9 rounded-md text-sm font-semibold ${value === l ? "bg-white text-sky-700 shadow" : "text-slate-600"}`}
          >
            {WRITING_LEVELS[l].name}
          </button>
        ))}
      </div>
    </div>
  );
}

function CheckSummary({ check }: { check: WorkCheck }) {
  const parts: string[] = [];
  if (check.errors > 0) parts.push(`${check.errors} fel`);
  if (check.followOnErrors > 0) parts.push(`${check.followOnErrors} följdfel`);
  if (check.missing > 0) parts.push(`${check.missing} saknas`);
  return (
    <div className="flex flex-col gap-1">
      {/* The whole calculation - its answer only once it's right, so it doesn't give away what "Visa rätt svar" holds back. */}
      <p className="font-semibold text-slate-700">
        {check.title}
        {check.answer && ` = ${check.allCorrect ? check.answer : "?"}`}
      </p>
      {check.allCorrect ? (
        <p className="text-green-700 font-semibold">Allt rätt!</p>
      ) : (
        parts.length > 0 && <p className="text-red-700 font-semibold">{parts.join(", ")}</p>
      )}
      {check.notice && <p className="text-sm text-amber-700">{check.notice}</p>}
      {check.answer && !check.allCorrect && (
        <details className="text-sm text-slate-500">
          <summary className="cursor-pointer">Visa rätt svar</summary>
          {check.answer}
        </details>
      )}
    </div>
  );
}

/** A solid swatch is an ink color; a dashed one is the placeholder drawn where a digit is missing. */
function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="flex items-center gap-1.5">
      <span
        className="w-3 h-3 rounded-sm inline-block"
        style={dashed ? { border: `2px dashed ${color}` } : { backgroundColor: color }}
      />
      {label}
    </span>
  );
}
