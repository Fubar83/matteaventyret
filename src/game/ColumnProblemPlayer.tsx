import { useEffect, useMemo, useRef, useState } from "react";
import { playEffect } from "../audio/sound";
import { buildGraph, checkAll, readyCells } from "../engine/arithmetic";
import type { GeneratedProblem } from "../engine/generator";
import { diagnoseHint } from "../engine/hints";
import type { Cell, Phase, WrittenMap } from "../engine/types";
import { t } from "../i18n";
import type { Stroke } from "../recognition/preprocess";
import { resolveImplicitlyReady } from "./cellFlow";
import type { CellVerdict } from "./ColumnBoard";
import { ColumnBoard, operatorFor } from "./ColumnBoard";
import { Numpad } from "./Numpad";

export interface ColumnProblemSummary {
  wrongFirstAttempts: number;
  hintUsed: boolean;
  miniTutorialUsed: boolean;
  nudgeUsed: boolean;
  hadOriginalError: boolean;
}

type ColumnProblem = Extract<GeneratedProblem, { kind: "columnAdd" } | { kind: "columnSub" } | { kind: "columnMul" }>;

interface ColumnProblemPlayerProps {
  problem: ColumnProblem;
  phase: Phase;
  inputMode?: "numpad" | "handwriting";
  onSolved: (summary: ColumnProblemSummary) => void;
}

export function ColumnProblemPlayer({ problem, phase, inputMode = "numpad", onSolved }: ColumnProblemPlayerProps) {
  const method = problem.kind;
  const operands = { top: problem.top, bottom: problem.bottom };
  const graph = useMemo(() => buildGraph(method, operands), [method, problem.top, problem.bottom]);

  const [written, setWritten] = useState<WrittenMap>({});
  const [attempts, setAttempts] = useState<Record<string, number>>({});
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);
  const [verdicts, setVerdicts] = useState<Record<string, CellVerdict>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [forcedGuidat, setForcedGuidat] = useState(false);
  const [pendingCellId, setPendingCellId] = useState<string | null>(null);
  const [pendingGuesses, setPendingGuesses] = useState<[number, number] | null>(null);
  const [canvasResetTokens, setCanvasResetTokens] = useState<Record<string, number>>({});

  const wrongCells = useRef<Set<string>>(new Set());
  const hintCells = useRef<Set<string>>(new Set());
  const miniTutorialCells = useRef<Set<string>>(new Set());
  const nudgeUsed = useRef(false);
  const hadOriginalError = useRef(false);
  const solved = useRef(false);

  const effectivePhase: Phase = forcedGuidat ? "guidat" : phase;

  // A minnessiffra of 0 (or an optional leading zero) is never written, so it
  // never becomes an active/prompted step in a guided phase - it just stays a
  // faint, skippable box (see build brief "Addition rules"). It's still
  // implicitly "filled in" (without ever being shown) so later columns that
  // depend on it can become ready in turn; `written` itself - what's
  // rendered - never gets these implicit values.
  const readyWithImplicit = useMemo(() => resolveImplicitlyReady(graph, written), [graph, written]);
  const ready = useMemo(() => readyCells(graph, readyWithImplicit).filter((c) => c.required), [graph, readyWithImplicit]);

  // Every cell in `ready` belongs to the same "step": readiness only ever
  // advances to a new column once every cell of the previous one is filled,
  // so a column's result digit and its minnessiffra become ready together
  // and can be written in either order (see build brief: "Steps 1 and 2 can
  // be done in either order"). Guidat only differs from Egen ordning in
  // whether a not-yet-ready cell is locked outright or just nudges.
  const activeCellIds = useMemo(() => {
    if (effectivePhase === "fritt") return new Set(graph.cells.map((c) => c.id));
    return new Set(ready.map((c) => c.id));
  }, [effectivePhase, ready, graph]);

  function finish() {
    if (solved.current) return;
    solved.current = true;
    onSolved({
      wrongFirstAttempts: wrongCells.current.size,
      hintUsed: hintCells.current.size > 0,
      miniTutorialUsed: miniTutorialCells.current.size > 0,
      nudgeUsed: nudgeUsed.current,
      hadOriginalError: hadOriginalError.current,
    });
  }

  // Guidat/Egen ordning: a problem is done once every required cell is filled
  // (a cell is only ever written there once it is known correct, or revealed).
  useEffect(() => {
    if (effectivePhase === "fritt" || solved.current) return;
    const requiredCells = graph.cells.filter((c) => c.required);
    if (requiredCells.length > 0 && requiredCells.every((c) => written[c.id] !== undefined)) {
      finish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [written, effectivePhase, graph]);

  function recordWrongAttempt(cell: Cell, writtenValue: number): number {
    playEffect("wrong");
    hadOriginalError.current = true;
    const count = (attempts[cell.id] ?? 0) + 1;
    setAttempts((a) => ({ ...a, [cell.id]: count }));
    wrongCells.current.add(cell.id);
    if (count === 1) {
      setMessage(t("ui.tryAgain"));
    } else if (count === 2) {
      hintCells.current.add(cell.id);
      const hint = diagnoseHint({
        method,
        cellType: cell.type,
        col: cell.col,
        top: problem.top,
        bottom: problem.bottom,
        writtenValue,
      });
      setMessage(hint ? t(`hint.${hint.key}`, hint.vars) : t("ui.tryAgain"));
    } else {
      miniTutorialCells.current.add(cell.id);
      setMessage(t("ui.revealAnswer", { answer: cell.expected as number }));
      setWritten((w) => ({ ...w, [cell.id]: cell.expected as number }));
      setVerdicts((v) => ({ ...v, [cell.id]: "correct" }));
      setSelectedCellId(null);
    }
    return count;
  }

  /** Shared by numpad (via selectedCellId) and handwriting (direct cell) input. */
  function commitDigit(cell: Cell, digit: number) {
    if (effectivePhase === "fritt") {
      setWritten((w) => ({ ...w, [cell.id]: digit }));
      return;
    }
    if (cell.expected === digit) {
      playEffect("correct");
      setWritten((w) => ({ ...w, [cell.id]: digit }));
      setVerdicts((v) => ({ ...v, [cell.id]: "correct" }));
      setSelectedCellId(null);
      setMessage(null);
    } else {
      recordWrongAttempt(cell, digit);
    }
  }

  function handleCellTap(cell: Cell) {
    if (effectivePhase === "fritt") {
      if (cell.type === "strike") {
        setWritten((w) => {
          const next = { ...w };
          if (next[cell.id] === "struck") delete next[cell.id];
          else next[cell.id] = "struck";
          return next;
        });
        return;
      }
      if (inputMode === "handwriting") {
        // Tapping a written cell clears it so it becomes a blank canvas again.
        if (written[cell.id] !== undefined) {
          setWritten((w) => {
            const next = { ...w };
            delete next[cell.id];
            return next;
          });
        }
        return;
      }
      setSelectedCellId(cell.id);
      return;
    }

    if (written[cell.id] !== undefined) return; // already solved, locked
    if (!activeCellIds.has(cell.id)) {
      if (effectivePhase === "egenOrdning") {
        nudgeUsed.current = true;
        setMessage(t("ui.notReadyYet"));
      }
      return;
    }

    setMessage(null);
    if (cell.type === "strike") {
      // Only ever wired up for cells that genuinely need striking, so this is always correct.
      playEffect("correct");
      setWritten((w) => ({ ...w, [cell.id]: "struck" }));
      setVerdicts((v) => ({ ...v, [cell.id]: "correct" }));
    } else {
      setSelectedCellId(cell.id);
    }
  }

  function handleDigit(digit: number) {
    if (!selectedCellId) return;
    const cell = graph.cells.find((c) => c.id === selectedCellId);
    if (!cell) return;
    commitDigit(cell, digit);
  }

  function handleDelete() {
    if (!selectedCellId || effectivePhase !== "fritt") return;
    setWritten((w) => {
      const next = { ...w };
      delete next[selectedCellId];
      return next;
    });
  }

  /** Writing in place: a board cell's own canvas settled on some strokes. TF.js is loaded on first use. */
  async function handleCellStrokes(cell: Cell, strokes: Stroke[], canvasSize: number) {
    const { recognizeDigitStrokes } = await import("../recognition/recognizer");
    const result = await recognizeDigitStrokes(strokes, canvasSize);
    if (result.confident) {
      applyHandwrittenDigit(cell, result.digit);
    } else {
      // An unsure read is never counted - the child's own choice is what gets checked.
      setPendingCellId(cell.id);
      setPendingGuesses([result.topTwo.first.digit, result.topTwo.second.digit]);
    }
  }

  function applyHandwrittenDigit(cell: Cell, digit: number) {
    commitDigit(cell, digit);
    if (effectivePhase !== "fritt" && cell.expected !== digit) {
      // Wrong and the cell is still blank (not yet revealed) - clear the canvas for a retry.
      setCanvasResetTokens((t) => ({ ...t, [cell.id]: (t[cell.id] ?? 0) + 1 }));
    }
  }

  function resolvePending(digit: number) {
    const cell = graph.cells.find((c) => c.id === pendingCellId);
    setPendingCellId(null);
    setPendingGuesses(null);
    if (cell) applyHandwrittenDigit(cell, digit);
  }

  function handleCheck() {
    const report = checkAll(method, operands, written, "fritt");
    const nextVerdicts: Record<string, CellVerdict> = {};
    const clearable: string[] = [];
    for (const r of report.results) {
      if (r.status === "correct") nextVerdicts[r.cellId] = "correct";
      else if (r.status === "followOnError") nextVerdicts[r.cellId] = "followOn";
      else if (r.status === "wrong") {
        nextVerdicts[r.cellId] = "wrong";
        clearable.push(r.cellId);
      }
    }
    setVerdicts(nextVerdicts);
    if (report.errorCount > 0) {
      hadOriginalError.current = true;
      wrongCells.current = new Set([...wrongCells.current, ...clearable]);
      setMessage(null);
      setWritten((w) => {
        const next = { ...w };
        for (const id of clearable) delete next[id];
        return next;
      });
      setSelectedCellId(null);
    } else if (report.allCorrect) {
      finish();
    }
  }

  const selectedCell = graph.cells.find((c) => c.id === selectedCellId) ?? null;
  const canType = effectivePhase === "fritt" ? !!selectedCell : !!selectedCell && selectedCell.type !== "strike";

  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-center gap-4 lg:gap-12">
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          <span>{t(`ui.phase.${effectivePhase}`)}</span>
          {!forcedGuidat && effectivePhase !== "guidat" && (
            <button type="button" className="underline" onClick={() => setForcedGuidat(true)}>
              {t("ui.showOrder")}
            </button>
          )}
        </div>

        <ColumnBoard
          graph={graph}
          top={problem.top}
          bottom={problem.bottom}
          operator={operatorFor(method)}
          written={written}
          selectedCellId={selectedCellId}
          activeCellIds={activeCellIds}
          verdicts={verdicts}
          onCellTap={handleCellTap}
          inputMode={inputMode}
          onCellStrokes={handleCellStrokes}
          pendingCellId={pendingCellId}
          canvasResetTokens={canvasResetTokens}
        />

        <div className="min-h-[3rem] flex flex-col items-center gap-2">
          <p className="text-sm text-slate-600 text-center max-w-xs">{message}</p>
          {pendingCellId && pendingGuesses && (
            <div className="flex flex-col items-center gap-1">
              <p className="text-xs text-slate-500">{t("ui.didYouMean")}</p>
              <div className="flex gap-2">
                {pendingGuesses.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => resolvePending(d)}
                    className="w-11 h-11 rounded-xl bg-sky-500 text-white text-xl font-bold"
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {effectivePhase === "fritt" && (
          <button
            type="button"
            onClick={handleCheck}
            className={`h-12 px-8 rounded-xl bg-emerald-600 text-white font-bold shadow ${inputMode === "numpad" ? "lg:hidden" : ""}`}
          >
            {t("ui.check")}
          </button>
        )}
      </div>

      {inputMode === "numpad" && (
        <div className="flex flex-col items-center gap-4">
          <Numpad onDigit={handleDigit} onDelete={handleDelete} disabled={!canType} />
          {effectivePhase === "fritt" && (
            <button
              type="button"
              onClick={handleCheck}
              className="hidden lg:block h-12 px-8 rounded-xl bg-emerald-600 text-white font-bold shadow"
            >
              {t("ui.check")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
