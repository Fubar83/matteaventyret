/**
 * Multiplication set up in columns, the bigger kinds (the 1-digit multiplier
 * levels 2.1.1-2.1.3 are the column player's): guided box by box on the same
 * board as "Ställ upp" (mathinput/guidedPlan.ts).
 *
 *   2.1.4  2-siffrigt · 2-siffrigt     34 · 26 - two partial products, added up
 *   2.1.5  decimaltal · heltal         3,4 · 6 - 3,4 becomes 34 (one decimal away), 34 · 6 = 204, one decimal back: 20,4
 *   2.1.6  decimaltal · decimaltal     2,5 · 1,3, 0,2 · 0,03 - 2 · 3 = 6, 1 + 2 decimals back: 0,006
 *
 * Numbers are written as digit strings with their decimals (like trappan's),
 * and the answer is never one that ends in a 0 after the comma (2,5 · 1,2 =
 * 3,00) - that's a lesson of its own.
 *
 * How it works, and what must stay true: docs/question-types/mulGuided.md.
 */
import { randInt, type Rng } from "../rng";
import { questionType } from "./questionType";
import { valueOf, type Decimal } from "./trappan";

export type MulGuidedStageId = "2.1.4" | "2.1.5" | "2.1.6";

export interface MulGuidedProblem {
  stageId: MulGuidedStageId;
  kind: "mulGuided";
  top: Decimal;
  bottom: Decimal;
  answer: number;
}

const decimal = (scaled: number, decimals: number): Decimal => ({ digits: String(scaled), decimals });

function problem(stageId: MulGuidedStageId, top: Decimal, bottom: Decimal): MulGuidedProblem {
  const d = top.decimals + bottom.decimals;
  const scaled = Number(top.digits) * Number(bottom.digits);
  return { stageId, kind: "mulGuided", top, bottom, answer: Math.round(scaled) / 10 ** d };
}

/** The product without commas ends in 0 after the comma: 2,5 · 1,2 = 3,00. */
const endsInZeroDecimal = (top: Decimal, bottom: Decimal) => top.decimals + bottom.decimals > 0 && (Number(top.digits) * Number(bottom.digits)) % 10 === 0;

/** 2-siffrigt · 2-siffrigt: 34 · 26. No 0 digits - a 0 multiplier digit is a level's worth of its own. */
function stage214(rng: Rng): MulGuidedProblem {
  for (;;) {
    const a = randInt(rng, 12, 98);
    const b = randInt(rng, 12, 98);
    if (a % 10 === 0 || b % 10 === 0 || a % 11 === 0 || b % 11 === 0) continue;
    return problem("2.1.4", decimal(a, 0), decimal(b, 0));
  }
}

/** Decimaltal · heltal: 3,4 · 6, 2,35 · 4, now and then 1,6 · 12. */
function stage215(rng: Rng): MulGuidedProblem {
  for (;;) {
    const twoDecimals = rng() < 0.35;
    const scaled = twoDecimals ? randInt(rng, 101, 999) : randInt(rng, 11, 99);
    if (scaled % 10 === 0) continue;
    const b = rng() < 0.75 ? randInt(rng, 2, 9) : randInt(rng, 11, 19);
    const top = decimal(scaled, twoDecimals ? 2 : 1);
    const bottom = decimal(b, 0);
    if (endsInZeroDecimal(top, bottom)) continue;
    return problem("2.1.5", top, bottom);
  }
}

/**
 * Decimaltal · decimaltal: 2,5 · 1,3, 4,6 · 0,8, 1,25 · 0,4 - one or two
 * decimals each, at most three to put back - and now and then small ones
 * (0,2 · 0,03 = 0,006) where zeros go in front.
 */
function stage216(rng: Rng): MulGuidedProblem {
  for (;;) {
    const dA = rng() < 0.75 ? 1 : 2;
    const dB = rng() < 0.7 ? 1 : 2;
    if (dA + dB > 3) continue;
    const small = rng() < 0.25;
    const a = small ? randInt(rng, 2, 9) : randInt(rng, 11, dA === 1 ? 99 : 999);
    const b = small ? randInt(rng, 2, 9) : randInt(rng, 2, dB === 1 ? 39 : 99);
    if (a % 10 === 0 || b % 10 === 0) continue;
    const top = decimal(a, dA);
    const bottom = decimal(b, dB);
    if (endsInZeroDecimal(top, bottom)) continue;
    return problem("2.1.6", top, bottom);
  }
}

export const MUL_GUIDED_QUESTIONS = questionType({
  id: "mulGuided",
  kinds: ["mulGuided"],
  levels: {
    "2.1.4": stage214,
    "2.1.5": stage215,
    "2.1.6": stage216,
  },
  key: (p) => `${p.kind}:${p.top.digits}/${p.top.decimals}:${p.bottom.digits}/${p.bottom.decimals}`,
});

/** The product as the numbers are written: 3,4 · 6 = 20,4. */
export const productOf = (p: MulGuidedProblem) => valueOf(p.top) * valueOf(p.bottom);
