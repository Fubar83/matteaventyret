import { useMemo, useRef, useState } from "react";
import { playEffect } from "../audio/sound";
import { buildGraph, readyCells } from "../engine/arithmetic";
import { generateProblem, type GeneratedProblem, type StageId } from "../engine/generator";
import { makeRng } from "../engine/rng";
import type { Cell, MethodId, WrittenMap } from "../engine/types";
import { t } from "../i18n";
import { resolveImplicitlyReady, tensCellFor } from "./cellFlow";
import type { BoxReading } from "./draw/boardTypes";
import { activeBoxes, boxValues, buildColumnBoard, operatorFor } from "./draw/columnBoardLayout";
import { DrawBoard, type DrawBoardHandle } from "./draw/DrawBoard";
import { PendingChoice } from "./draw/PendingChoice";
import { rememberBoxDigit } from "./draw/rememberBox";
import { useUnsureBoxes } from "./draw/useUnsureBoxes";
import { exempelPrompt } from "./exempelPrompts";

type PlayableMethod = Extract<MethodId, "columnAdd" | "columnSub" | "columnMul">;

interface ExempelPlayerProps {
  stageId: StageId;
  method: PlayableMethod;
  count?: number;
  onDone: () => void;
}

/** "Exempel": the app solves together with the child, one small question per step (see build brief "Exempel"). */
export function ExempelPlayer({ stageId, method, count = 2, onDone }: ExempelPlayerProps) {
  const rngRef = useState(() => makeRng(Date.now()))[0];
  const problems = useMemo(() => {
    // Only column problems are worked through here: answer-only and written-work
    // stages skip Exempel (see RoundScreen.tsx), and shortDiv has no player yet.
    const list: Extract<GeneratedProblem, { kind: "columnAdd" | "columnSub" | "columnMul" }>[] = [];
    for (let attempt = 0; list.length < count && attempt < 1000; attempt++) {
      const p = generateProblem(stageId, rngRef);
      if (p.kind === "columnAdd" || p.kind === "columnSub" || p.kind === "columnMul") list.push(p);
    }
    return list;
  }, [stageId, count, rngRef]);

  const boardRef = useRef<DrawBoardHandle>(null);
  const [index, setIndex] = useState(0);
  const [written, setWritten] = useState<WrittenMap>({});
  const [nudge, setNudge] = useState(false);
  const marks = useUnsureBoxes();
  const question = marks.question;

  const problem = problems[index];
  const decimalPlaces = problem.kind === "columnMul" ? 0 : (problem.decimalPlaces ?? 0);
  const graph = useMemo(() => buildGraph(method, { top: problem.top, bottom: problem.bottom }), [method, problem.top, problem.bottom]);
  const readyWithImplicit = resolveImplicitlyReady(graph, written);
  const ready = readyCells(graph, readyWithImplicit).filter((c) => c.required);
  // One step at a time: the prompt below talks about exactly this cell.
  const activeCell = ready[0] ?? null;
  const activeCellIds = new Set(activeCell ? [activeCell.id] : []);
  const board = buildColumnBoard(graph, problem.top, problem.bottom, operatorFor(method), written, decimalPlaces);
  const active = activeBoxes(board, activeCellIds, written, false);

  function accept(entries: [Cell, WrittenMap[string]][]) {
    playEffect("correct");
    const next = { ...written };
    for (const [cell, value] of entries) next[cell.id] = value;
    setWritten(next);
    setNudge(false);
    const requiredCells = graph.cells.filter((c) => c.required);
    if (requiredCells.every((c) => next[c.id] !== undefined)) {
      if (index + 1 >= problems.length) onDone();
      else {
        setIndex((i) => i + 1);
        setWritten({});
        marks.reset();
        boardRef.current?.clearAll();
      }
    }
  }

  /**
   * One box's ink can answer more than one step: a borrowed "10" is its tens
   * and ones steps, and "16" in an answer box is the answer plus the carry.
   * They're accepted in the order the example asks for them, for as long as
   * each is right; if the very first is wrong, the box is cleared to try again.
   */
  function applyDigits(boxId: string, digits: number[]) {
    const target = board.targets[boxId];
    if (!activeCell || !target || target.kind === "top") return;
    const offered = new Map<string, number>();
    if (target.kind === "ten") {
      [target.tens, target.ones].forEach((c, i) => digits[i] !== undefined && offered.set(c.id, digits[i]));
    } else {
      const tensCell = tensCellFor(graph, target.cell);
      if (digits.length >= 2 && tensCell) offered.set(tensCell.id, digits[0]);
      offered.set(target.cell.id, digits[digits.length - 1]);
    }
    const accepted: [Cell, number][] = [];
    const sofar = { ...written };
    for (;;) {
      const step = readyCells(graph, resolveImplicitlyReady(graph, sofar)).filter((c) => c.required)[0];
      if (!step || offered.get(step.id) !== step.expected) break;
      accepted.push([step, step.expected as number]);
      sofar[step.id] = step.expected as number;
    }
    if (accepted.length > 0) {
      accept(accepted);
    } else {
      playEffect("wrong");
      setNudge(true);
      boardRef.current?.clearBox(boxId);
    }
  }

  function handleRead(boxId: string, reading: BoxReading) {
    const target = board.targets[boxId];
    if (!target) return;
    if (reading.kind === "unsure") {
      marks.mark(boxId, reading.guesses);
      return;
    }
    marks.settle(boxId);
    if (reading.kind === "strike") {
      const strikeCell = target.kind === "cell" ? null : target.strike;
      if (strikeCell && activeCell?.id === strikeCell.id) accept([[strikeCell, "struck"]]);
      else boardRef.current?.removeStrokes(reading.strokes);
    } else if (reading.kind === "invalid") {
      boardRef.current?.removeStrokes(reading.strokes);
    } else if (reading.kind === "digits") {
      applyDigits(boxId, reading.digits);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {t("ui.exempel")} {index + 1}/{problems.length}
      </p>
      <DrawBoard
        key={index}
        ref={boardRef}
        layout={board.layout}
        active={active}
        values={boxValues(board, written)}
        unsure={marks.unsure}
        asking={question?.boxId ?? null}
        onAsk={marks.ask}
        onRead={handleRead}
      />
      <div className="bg-sky-50 border-2 border-sky-200 rounded-xl px-4 py-3 text-slate-700 text-center max-w-xs min-h-[3rem] flex flex-col items-center gap-2">
        <span>{activeCell && exempelPrompt(method, activeCell, problem.top, problem.bottom)}</span>
        {nudge && <div className="text-rose-500 text-sm">{t("exempel.nudge")}</div>}
        {question && (
          <PendingChoice
            guesses={question.guesses}
            onPick={(g) => {
              marks.settle(question.boxId);
              rememberBoxDigit(boardRef.current, question.boxId, g);
              applyDigits(question.boxId, g);
            }}
            onRewrite={() => {
              marks.settle(question.boxId);
              boardRef.current?.clearBox(question.boxId);
            }}
          />
        )}
      </div>
    </div>
  );
}
