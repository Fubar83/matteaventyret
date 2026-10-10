import { useMemo } from "react";
import { decimalText } from "../../../engine/questions/trappan";
import type { MulGuidedProblem } from "../../../engine/questions/multiply";
import { t } from "../../../i18n";
import { GuidedColumn } from "../../../mathinput/GuidedColumn";
import { planGuided } from "../../../mathinput/guidedPlan";
import { guidedOutcome, type QuestionOutcome } from "../questionOutcome";

interface MulPlayerProps {
  problem: MulGuidedProblem;
  onSolved: (outcome: QuestionOutcome) => void;
  /** The round's first question: the digits are there to trace from the start (they can be switched off). */
  first?: boolean;
  /** The gallery's step-by-step pictures: open the board at this step. */
  startAt?: number;
}

/**
 * A multiplication set up in columns (engine/questions/multiply.ts), walked box by box
 * on the "Ställ upp" board (guidedPlan.ts): the partial products, adding them
 * up - and with decimals, the numbers made whole first and the decimals put
 * back at the end.
 */
export function MulPlayer({ problem, onSolved, first = false, startAt }: MulPlayerProps) {
  const plan = useMemo(
    () => planGuided("×", Number(problem.top.digits), Number(problem.bottom.digits), { top: problem.top.decimals, bottom: problem.bottom.decimals }),
    [problem]
  );

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <p className="text-slate-700 text-center font-medium">{t(problem.top.decimals + problem.bottom.decimals > 0 ? "mul.promptDecimals" : "mul.prompt")}</p>
      <div className="rounded-2xl bg-white border-2 border-slate-200 px-6 py-3 text-3xl font-semibold text-slate-800 shadow-sm tabular-nums">
        {decimalText(problem.top)} · {decimalText(problem.bottom)}
      </div>
      <GuidedColumn plan={plan} onDone={(result) => onSolved(guidedOutcome(result))} trace={first} startAt={startAt} />
    </div>
  );
}
