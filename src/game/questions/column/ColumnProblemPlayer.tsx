import { useEffect, useMemo, useRef, useState } from "react";
import { playEffect } from "../../../audio/sound";
import { buildGraph, checkAll, readyCells } from "../../../engine/arithmetic";
import type { ColumnProblem } from "../../../engine/questions/column";
import { diagnoseHint } from "../../../engine/hints";
import type { Cell, Phase, WrittenMap } from "../../../engine/types";
import { t } from "../../../i18n";
import { resolveImplicitlyReady, tensCellFor } from "../../cellFlow";
import type { BoxReading, BoxStatus } from "../../draw/boardTypes";
import { activeBoxes, boxForCell, boxStatuses, boxValues, buildColumnBoard, operatorFor } from "../../draw/columnBoardLayout";
import { DrawBoard, type DrawBoardHandle } from "../../draw/DrawBoard";
import { PendingChoice } from "../../draw/PendingChoice";
import { rememberBoxDigit } from "../../draw/rememberBox";
import { useUnsureBoxes } from "../../draw/useUnsureBoxes";
import { exempelPrompt } from "./exempelPrompts";
import { HelpLadder } from "../HelpLadder";
import type { QuestionOutcome } from "../questionOutcome";

/** A column problem's outcome: its stars (QuestionOutcome), and what the method phases learn from. */
export interface ColumnProblemSummary extends QuestionOutcome {
  nudgeUsed: boolean;
  hadOriginalError: boolean;
}

interface ColumnProblemPlayerProps {
  problem: ColumnProblem;
  phase: Phase;
  onSolved: (summary: ColumnProblemSummary) => void;
}

export function ColumnProblemPlayer({ problem, phase, onSolved }: ColumnProblemPlayerProps) {
  const method = problem.kind;
  const operands = { top: problem.top, bottom: problem.bottom };
  const decimalPlaces = problem.kind === "columnMul" ? 0 : (problem.decimalPlaces ?? 0);
  // 3,5 + 1,25: the 3,5's missing hundredth is shown as a faint 0.
  const operandDecimals = useMemo(
    () => (problem.kind === "columnMul" ? {} : { top: problem.topDecimals, bottom: problem.bottomDecimals }),
    [problem]
  );
  const graph = useMemo(() => buildGraph(method, operands), [method, problem.top, problem.bottom]);
  const boardRef = useRef<DrawBoardHandle>(null);

  const [written, setWritten] = useState<WrittenMap>({});
  const [attempts, setAttempts] = useState<Record<string, number>>({});
  const [verdicts, setVerdicts] = useState<Record<string, BoxStatus>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [forcedGuidat, setForcedGuidat] = useState(false);
  const marks = useUnsureBoxes();
  /** How far up the help ladder the child has gone (see HelpLadder). */
  const [helpUsed, setHelpUsed] = useState(0);
  const question = marks.question;

  const wrongCells = useRef<Set<string>>(new Set());
  const hintCells = useRef<Set<string>>(new Set());
  const miniTutorialCells = useRef<Set<string>>(new Set());
  const nudgeUsed = useRef(false);
  const hadOriginalError = useRef(false);
  const solved = useRef(false);

  const effectivePhase: Phase = forcedGuidat ? "guidat" : phase;
  const fritt = effectivePhase === "fritt";

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
    if (fritt) return new Set(graph.cells.map((c) => c.id));
    return new Set(ready.map((c) => c.id));
  }, [fritt, ready, graph]);

  const board = useMemo(
    () => buildColumnBoard(graph, problem.top, problem.bottom, operatorFor(method), written, decimalPlaces, operandDecimals),
    [graph, problem.top, problem.bottom, method, written, decimalPlaces, operandDecimals]
  );
  const active = useMemo(() => activeBoxes(board, activeCellIds, written, fritt), [board, activeCellIds, written, fritt]);

  function finish() {
    if (solved.current) return;
    solved.current = true;
    onSolved({
      // Help: the help ladder, the automatic hint and shown digits after wrong tries, or the guided order.
      helped: helpUsed > 0 || hintCells.current.size > 0 || miniTutorialCells.current.size > 0 || effectivePhase === "guidat",
      // The full setup: every cell of the uppställning - carries and borrowing included - right the first time.
      fullSetup: !hadOriginalError.current,
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
    if (fritt || solved.current) return;
    const requiredCells = graph.cells.filter((c) => c.required);
    if (requiredCells.length > 0 && requiredCells.every((c) => written[c.id] !== undefined)) {
      finish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [written, fritt, graph]);

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
    }
    return count;
  }

  /** One digit for one cell: written as-is in Fritt, checked right away in the guided phases. Returns whether it was right (Fritt: always). */
  function commitDigit(cell: Cell, digit: number): boolean {
    if (fritt) {
      setWritten((w) => ({ ...w, [cell.id]: digit }));
      return true;
    }
    if (cell.expected === digit) {
      playEffect("correct");
      setWritten((w) => ({ ...w, [cell.id]: digit }));
      setVerdicts((v) => ({ ...v, [cell.id]: "correct" }));
      setMessage(null);
      return true;
    }
    recordWrongAttempt(cell, digit);
    return false;
  }

  /**
   * A whole column sum written into a result box - "15" for 7 + 8: the ones
   * digit is the answer, the tens digit that column's minnessiffra (or, in
   * the last column, the overflow digit - see tensCellFor). Each is checked
   * on its own, so a right answer with a wrong carry counts only the carry.
   * Returns whether the answer digit was right.
   */
  function commitColumnSum(cell: Cell, tens: number, ones: number): boolean {
    const tensCell = tensCellFor(graph, cell);
    if (!tensCell) {
      // No column here can hold a two-digit answer (subtraction) - it's a wrong answer, not a carry.
      if (fritt) {
        setWritten((w) => ({ ...w, [cell.id]: ones }));
        return true;
      }
      recordWrongAttempt(cell, ones);
      return false;
    }
    // A minnessiffra of 0 is never written (see build brief "Addition rules") - "07" is just 7.
    const writesTens = tens > 0 || tensCell.required;
    if (fritt) {
      setWritten((w) => ({ ...w, [cell.id]: ones, ...(writesTens ? { [tensCell.id]: tens } : {}) }));
      return true;
    }
    if (!commitDigit(cell, ones)) return false;
    if (writesTens && written[tensCell.id] === undefined) {
      if (tensCell.expected === tens) {
        setWritten((w) => ({ ...w, [tensCell.id]: tens }));
        setVerdicts((v) => ({ ...v, [tensCell.id]: "correct" }));
      } else {
        recordWrongAttempt(tensCell, tens);
      }
    }
    return true;
  }

  function strike(cell: Cell, lineStrokes: BoxReading & { kind: "strike" }) {
    if (fritt) {
      setWritten((w) => ({ ...w, [cell.id]: "struck" }));
      return;
    }
    if (written[cell.id] !== undefined) return;
    if (!activeCellIds.has(cell.id)) {
      boardRef.current?.removeStrokes(lineStrokes.strokes);
      blocked();
      return;
    }
    // Only ever wired up for cells that genuinely need striking, so this is always correct.
    playEffect("correct");
    setWritten((w) => ({ ...w, [cell.id]: "struck" }));
    setVerdicts((v) => ({ ...v, [cell.id]: "correct" }));
    setMessage(null);
  }

  /** Digits read from a box, applied to its cell(s). A wrong digit in a guided phase clears the box to try again. */
  function applyDigits(boxId: string, digits: number[]) {
    const target = board.targets[boxId];
    if (!target || target.kind === "top") return;
    let allRight = true;
    if (target.kind === "cell") {
      allRight = digits.length >= 2 ? commitColumnSum(target.cell, digits[0], digits[1]) : commitDigit(target.cell, digits[0]);
    } else {
      // A borrowed "10": its digits in order, skipping whatever's already right.
      [target.tens, target.ones].forEach((cell, i) => {
        if (digits[i] === undefined || (!fritt && written[cell.id] !== undefined)) return;
        if (!commitDigit(cell, digits[i])) allRight = false;
      });
    }
    if (!allRight) boardRef.current?.clearBox(boxId);
  }

  /** The last rung of the help ladder: the next digit, written in for the child. */
  function revealNext() {
    const cell = ready[0];
    if (!cell || cell.expected === null) return;
    miniTutorialCells.current.add(cell.id);
    setWritten((w) => ({ ...w, [cell.id]: cell.expected as number | "struck" }));
    setVerdicts((v) => ({ ...v, [cell.id]: "correct" }));
  }

  function blocked() {
    if (fritt) return;
    if (effectivePhase === "egenOrdning") nudgeUsed.current = true;
    setMessage(t("ui.notReadyYet"));
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
      if (strikeCell) strike(strikeCell, reading);
      else boardRef.current?.removeStrokes(reading.strokes);
      return;
    }
    if (reading.kind === "invalid") {
      boardRef.current?.removeStrokes(reading.strokes);
      return;
    }
    if (reading.kind === "empty") {
      // Erased: in Fritt the box is blank again. (A guided box only ever holds a right answer, which stays.)
      if (fritt && target.kind !== "top") {
        const cells = target.kind === "cell" ? [target.cell] : [target.tens, target.ones];
        setWritten((w) => {
          const next = { ...w };
          for (const c of cells) delete next[c.id];
          return next;
        });
      }
      return;
    }
    if (reading.kind === "digits") applyDigits(boxId, reading.digits); // (no sign boxes on this board)
  }

  function resolvePending(digits: number[]) {
    if (!question) return;
    marks.settle(question.boxId);
    rememberBoxDigit(boardRef.current, question.boxId, digits);
    applyDigits(question.boxId, digits);
  }

  function rewritePending() {
    if (!question) return;
    marks.settle(question.boxId);
    boardRef.current?.clearBox(question.boxId);
  }

  function handleCheck() {
    // A marked box can't be checked yet - ask about it first.
    const firstUnsure = [...marks.unsure][0];
    if (firstUnsure !== undefined) {
      marks.ask(firstUnsure);
      return;
    }
    const report = checkAll(method, operands, written, "fritt");
    const nextVerdicts: Record<string, BoxStatus> = {};
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
      // The wrong digits' ink goes too, so they can be written again (their box stays red until then).
      for (const id of clearable) {
        const boxId = boxForCell(board, id);
        if (boxId) boardRef.current?.clearBox(boxId);
      }
    } else if (report.allCorrect) {
      finish();
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
        <span>{t(`ui.phase.${effectivePhase}`)}</span>
        {!forcedGuidat && effectivePhase !== "guidat" && (
          <button type="button" className="underline" onClick={() => setForcedGuidat(true)}>
            {t("ui.showOrder")}
          </button>
        )}
      </div>

      <DrawBoard
        ref={boardRef}
        layout={board.layout}
        active={active}
        values={boxValues(board, written)}
        statuses={boxStatuses(board, verdicts)}
        unsure={marks.unsure}
        asking={question?.boxId ?? null}
        onAsk={marks.ask}
        onRead={handleRead}
        onBlocked={(id) => (id ? blocked() : undefined)}
      />

      <div className="min-h-[3rem] flex flex-col items-center gap-2">
        <p className="text-sm text-slate-600 text-center max-w-xs">{message}</p>
        {question && <PendingChoice guesses={question.guesses} onPick={resolvePending} onRewrite={rewritePending} />}
      </div>

      <HelpLadder
        used={helpUsed}
        onUse={setHelpUsed}
        steps={[
          { title: t("help.tip"), content: ready[0] ? exempelPrompt(method, ready[0], problem.top, problem.bottom) : t("ui.tryAgain") },
          { title: t("help.showOrder"), content: t("help.orderShown"), onReveal: () => setForcedGuidat(true) },
          {
            title: t("help.revealNext"),
            content: ready[0] && typeof ready[0].expected === "number" ? t("help.nextDigit", { digit: ready[0].expected }) : t("help.orderShown"),
            onReveal: revealNext,
          },
        ]}
      />

      {fritt && (
        <button type="button" onClick={handleCheck} className="h-12 px-8 rounded-xl bg-emerald-600 text-white font-bold shadow">
          {t("ui.check")}
        </button>
      )}
    </div>
  );
}

