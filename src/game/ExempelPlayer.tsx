import { useMemo, useState } from "react";
import { playEffect } from "../audio/sound";
import { buildGraph, readyCells } from "../engine/arithmetic";
import { generateProblem, type StageId } from "../engine/generator";
import { makeRng } from "../engine/rng";
import type { Cell, MethodId, WrittenMap } from "../engine/types";
import { t } from "../i18n";
import type { Stroke } from "../recognition/preprocess";
import { resolveImplicitlyReady } from "./cellFlow";
import { ColumnBoard, operatorFor } from "./ColumnBoard";
import { exempelPrompt } from "./exempelPrompts";
import { Numpad } from "./Numpad";

type PlayableMethod = Extract<MethodId, "columnAdd" | "columnSub" | "columnMul">;

interface ExempelPlayerProps {
  stageId: StageId;
  method: PlayableMethod;
  count?: number;
  inputMode?: "numpad" | "handwriting";
  onDone: () => void;
}

/** "Exempel": the app solves together with the child, one small question per step (see build brief "Exempel"). */
export function ExempelPlayer({ stageId, method, count = 2, inputMode = "numpad", onDone }: ExempelPlayerProps) {
  const rngRef = useState(() => makeRng(Date.now()))[0];
  const problems = useMemo(() => {
    const list = [];
    for (let i = 0; i < count; i++) {
      let p;
      do {
        p = generateProblem(stageId, rngRef);
        // shortDiv isn't wired into this player yet (see RoundScreen.tsx) - not
        // reachable since no StageMeta uses a shortDiv stage id yet. statistics
        // and chart stages skip Exempel entirely (see RoundScreen.tsx, same as placeValue).
      } while (p.kind === "placeValue" || p.kind === "shortDiv" || p.kind === "statistics" || p.kind === "chart");
      list.push(p);
    }
    return list;
  }, [stageId, count, rngRef]);

  const [index, setIndex] = useState(0);
  const [written, setWritten] = useState<WrittenMap>({});
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);
  const [nudge, setNudge] = useState(false);
  const [pendingCellId, setPendingCellId] = useState<string | null>(null);
  const [pendingGuesses, setPendingGuesses] = useState<[number, number] | null>(null);
  const [canvasResetTokens, setCanvasResetTokens] = useState<Record<string, number>>({});

  const problem = problems[index];
  const decimalPlaces = problem.kind === "columnMul" ? 0 : (problem.decimalPlaces ?? 0);
  const graph = useMemo(() => buildGraph(method, { top: problem.top, bottom: problem.bottom }), [method, problem.top, problem.bottom]);
  const readyWithImplicit = resolveImplicitlyReady(graph, written);
  const ready = readyCells(graph, readyWithImplicit).filter((c) => c.required);
  const activeCell = ready[0] ?? null;
  const activeCellIds = new Set(activeCell ? [activeCell.id] : []);

  function handleCellTap(cell: Cell) {
    if (!activeCell || cell.id !== activeCell.id) return;
    if (cell.type === "strike") {
      playEffect("correct");
      setWritten((w) => ({ ...w, [cell.id]: "struck" }));
      setNudge(false);
    } else {
      setSelectedCellId(cell.id);
    }
  }

  /** Shared by numpad (selectedCellId) and handwriting (direct cell) input. */
  function commitDigit(cell: Cell, digit: number) {
    if (cell.expected === digit) {
      playEffect("correct");
      const next = { ...written, [cell.id]: digit };
      setWritten(next);
      setSelectedCellId(null);
      setNudge(false);
      const requiredCells = graph.cells.filter((c) => c.required);
      if (requiredCells.every((c) => next[c.id] !== undefined)) {
        if (index + 1 >= problems.length) onDone();
        else {
          setIndex((i) => i + 1);
          setWritten({});
          setSelectedCellId(null);
        }
      }
    } else {
      playEffect("wrong");
      setNudge(true);
    }
  }

  function handleDigit(digit: number) {
    if (!activeCell || selectedCellId !== activeCell.id) return;
    commitDigit(activeCell, digit);
  }

  /** Writing in place: the active cell's own canvas settled on some strokes. TF.js is loaded on first use. */
  async function handleCellStrokes(cell: Cell, strokes: Stroke[], canvasSize: number) {
    const { recognizeDigitStrokes } = await import("../recognition/recognizer");
    const result = await recognizeDigitStrokes(strokes, canvasSize);
    if (result.confident) {
      applyHandwrittenDigit(cell, result.digit);
    } else {
      setPendingCellId(cell.id);
      setPendingGuesses([result.topTwo.first.digit, result.topTwo.second.digit]);
    }
  }

  function applyHandwrittenDigit(cell: Cell, digit: number) {
    commitDigit(cell, digit);
    if (cell.expected !== digit) {
      setCanvasResetTokens((t) => ({ ...t, [cell.id]: (t[cell.id] ?? 0) + 1 }));
    }
  }

  function resolvePending(digit: number) {
    const cell = graph.cells.find((c) => c.id === pendingCellId);
    setPendingCellId(null);
    setPendingGuesses(null);
    if (cell) applyHandwrittenDigit(cell, digit);
  }

  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-center gap-4 lg:gap-12">
      <div className="flex flex-col items-center gap-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {t("ui.exempel")} {index + 1}/{problems.length}
        </p>
        <ColumnBoard
          graph={graph}
          top={problem.top}
          bottom={problem.bottom}
          operator={operatorFor(method)}
          written={written}
          selectedCellId={selectedCellId}
          activeCellIds={activeCellIds}
          verdicts={{}}
          onCellTap={handleCellTap}
          inputMode={inputMode}
          onCellStrokes={handleCellStrokes}
          pendingCellId={pendingCellId}
          canvasResetTokens={canvasResetTokens}
          decimalPlaces={decimalPlaces}
        />
        <div className="bg-sky-50 border-2 border-sky-200 rounded-xl px-4 py-3 text-slate-700 text-center max-w-xs min-h-[3rem] flex flex-col items-center gap-2">
          <span>{activeCell && exempelPrompt(method, activeCell, problem.top, problem.bottom)}</span>
          {nudge && <div className="text-rose-500 text-sm">{t("exempel.nudge")}</div>}
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
      </div>
      {inputMode === "numpad" && <Numpad onDigit={handleDigit} onDelete={() => {}} disabled={!selectedCellId} />}
    </div>
  );
}
