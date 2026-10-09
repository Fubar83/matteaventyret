/** Questions of your own, for the stories: a division for trappan, a multiplication for the guided board. */
import type { MulGuidedProblem, MulGuidedStageId } from "../engine/questions/multiply";
import { roundTo, valueOf, walkOf, type Decimal, type TrappanProblem, type TrappanStageId } from "../engine/questions/trappan";

/** "125,25" (or "125.25") as written: its digits and how many come after the comma. */
export function asDecimal(text: string): Decimal {
  const [whole, frac = ""] = text.trim().split(/[,.]/);
  return { digits: (whole + frac).replace(/^0+(?=\d)/, "") || "0", decimals: frac.length };
}

/** Whether a number is written so it can be read: digits, with at most one comma. */
export const isNumber = (text: string) => /^\d+([,.]\d+)?$/.test(text.trim());

/** A division of your own: rounded to `round` decimals, or ending with a rest - or exact, as far as it goes. */
export function ownDivision(stageId: TrappanStageId, dividend: string, divisor: string, how: { round?: number; withRest?: boolean }): TrappanProblem | null {
  if (!isNumber(dividend) || !isNumber(divisor) || valueOf(asDecimal(divisor)) === 0) return null;
  const d = asDecimal(divisor);
  const p: TrappanProblem = {
    stageId,
    kind: "trappan",
    dividend: asDecimal(dividend),
    divisor: d,
    shift: d.decimals,
    answer: 0,
    ...(how.withRest ? { withRest: true as const } : how.round !== undefined ? { roundTo: how.round } : {}),
  };
  const exact = valueOf(walkOf(p).quotient);
  return { ...p, answer: p.roundTo !== undefined ? roundTo(exact, p.roundTo) : exact };
}

/** A multiplication of your own: 0,2 · 0,03. */
export function ownMultiplication(stageId: MulGuidedStageId, a: string, b: string): MulGuidedProblem | null {
  if (!isNumber(a) || !isNumber(b)) return null;
  const top = asDecimal(a);
  const bottom = asDecimal(b);
  const decimals = top.decimals + bottom.decimals;
  return { stageId, kind: "mulGuided", top, bottom, answer: (Number(top.digits) * Number(bottom.digits)) / 10 ** decimals };
}
