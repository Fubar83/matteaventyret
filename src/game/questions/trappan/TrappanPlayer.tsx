import { useMemo } from "react";
import { decimalText, type TrappanProblem } from "../../../engine/questions/trappan";
import { t } from "../../../i18n";
import { GuidedColumn, type GuidedResult } from "../../../mathinput/GuidedColumn";
import type { QuestionOutcome } from "../questionOutcome";
import { shiftedText, trappanPlan } from "./trappanPlan";

interface TrappanPlayerProps {
  problem: TrappanProblem;
  onSolved: (outcome: QuestionOutcome) => void;
  /** The round's first question: the digits are there to trace from the start (they can be switched off). */
  first?: boolean;
  /** The gallery's step-by-step pictures: open the board at this step. */
  startAt?: number;
}

/**
 * A division with trappan: the board (trappanPlan.ts) walked box by box -
 * how many times, multiply back, subtract, bring down. A divisor with
 * decimals is first made whole (both commas moved the same number of
 * places), shown before the board; a question to round says so.
 */
export function TrappanPlayer({ problem, onSolved, first = false, startAt }: TrappanPlayerProps) {
  const plan = useMemo(() => trappanPlan(problem), [problem]);
  const question = `${decimalText(problem.dividend)} ÷ ${decimalText(problem.divisor)}`;

  function done(result: GuidedResult) {
    // Tracing is help like a shown digit: the stars for doing it alone are earned with "Spåra" off.
    const helped = result.shown > 0 || result.traced > 0;
    onSolved({
      helped,
      fullSetup: !helped,
      wrongFirstAttempts: result.wrong > 0 ? 1 : 0,
      hintUsed: helped,
      miniTutorialUsed: false,
    });
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <p className="text-slate-700 text-center font-medium">{t(problem.withRest ? "trappan.promptRest" : problem.roundTo === undefined ? "trappan.prompt" : problem.roundTo === 1 ? "trappan.promptRound1" : "trappan.promptRound", { n: problem.roundTo ?? 0 })}</p>
      <div className="rounded-2xl bg-white border-2 border-slate-200 px-6 py-3 text-3xl font-semibold text-slate-800 shadow-sm tabular-nums">{question}</div>
      {problem.shift > 0 && (
        <div className="max-w-xl rounded-xl bg-sky-50 border border-sky-200 px-4 py-3 text-sky-900 text-center">
          <p>{t("trappan.shift", { n: problem.shift })}</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">
            {question} = {shiftedText(problem)}
          </p>
        </div>
      )}
      <GuidedColumn plan={plan} onDone={done} trace={first} startAt={startAt} />
    </div>
  );
}
