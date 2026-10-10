/**
 * Kort division (2.2.x): a three-digit number divided by a one-digit one.
 * The engine side is complete, but no level plays it yet (it has no player -
 * see game/questions/QuestionPlayer.tsx and game/stages.ts).
 *
 * Each level makes a random dividend and divisor, then re-derives the column
 * by column plan (the same one buildGraph uses) to check it has the level's
 * pattern. 2.2.1 and 2.2.3's patterns are too rare to hit by chance, so they
 * build the digits directly instead.
 *
 * How it works, and what must stay true: docs/question-types/shortDivision.md.
 */
import { computeShortDivisionPlan } from "../methods/shortDiv";
import { randInt, type Rng } from "../rng";
import { verifyDivision } from "../verifier";
import { questionType, retry } from "./questionType";

export type ShortDivisionStageId = "2.2.1" | "2.2.2" | "2.2.3" | "2.2.4";

export interface ShortDivisionProblem {
  stageId: ShortDivisionStageId;
  kind: "shortDiv";
  dividend: number;
  divisor: number;
  answer: number;
  remainder: number;
}

function division(stageId: ShortDivisionStageId, dividend: number, divisor: number): ShortDivisionProblem {
  const answer = Math.floor(dividend / divisor);
  const remainder = dividend % divisor;
  const check = verifyDivision(dividend, divisor, answer, remainder);
  if (!check.valid) throw new Error(`generator/verifier mismatch for ${dividend}/${divisor}: ${check.reason}`);
  return { stageId, kind: "shortDiv", dividend, divisor, answer, remainder };
}

/** Digits 0-9 that divide `divisor` evenly - the only digits that can appear in a no-carry kort division dividend. */
function digitsDivisibleBy(divisor: number): number[] {
  return Array.from({ length: 10 }, (_, d) => d).filter((d) => d % divisor === 0);
}

/** 2.2.1: no minnesrest - every digit is itself a multiple of the divisor. */
function noRemainders(rng: Rng): ShortDivisionProblem {
  const divisor = randInt(rng, 2, 9);
  const valid = digitsDivisibleBy(divisor);
  const leadingChoices = valid.filter((d) => d > 0); // divisor itself is always one such digit
  const leading = leadingChoices[randInt(rng, 0, leadingChoices.length - 1)];
  const middle = valid[randInt(rng, 0, valid.length - 1)];
  const ones = valid[randInt(rng, 0, valid.length - 1)];
  return division("2.2.1", leading * 100 + middle * 10 + ones, divisor);
}

/** 2.2.2: with minnesrest - a column carries a remainder, but it still goes evenly in the end. */
const withCarriedRemainder = (rng: Rng) =>
  retry("2.2.2", () => {
    const divisor = randInt(rng, 2, 9);
    const dividend = randInt(rng, 100, 999);
    if (dividend % divisor !== 0) return null;
    const { columns } = computeShortDivisionPlan(dividend, divisor);
    if (columns[0].quotientDigit === 0) return null;
    return columns.some((c) => c.col > 0 && c.remainderOut > 0) ? division("2.2.2", dividend, divisor) : null;
  });

/**
 * 2.2.3: a zero in the quotient, at the tens - the hundreds divide exactly and
 * the tens digit is smaller than the divisor; the ones digit then makes it go
 * evenly.
 */
const zeroInQuotient = (rng: Rng) =>
  retry("2.2.3", () => {
    const divisor = randInt(rng, 2, 9);
    const validLead = digitsDivisibleBy(divisor).filter((d) => d > 0);
    const leading = validLead[randInt(rng, 0, validLead.length - 1)];
    const middle = randInt(rng, 0, divisor - 1);
    const onesCandidates: number[] = [];
    for (let d = 0; d <= 9; d++) if ((middle * 10 + d) % divisor === 0) onesCandidates.push(d);
    if (onesCandidates.length === 0) return null;
    const ones = onesCandidates[randInt(rng, 0, onesCandidates.length - 1)];
    return division("2.2.3", leading * 100 + middle * 10 + ones, divisor);
  });

/** 2.2.4: a remainder left over at the end. */
const withRemainder = (rng: Rng) =>
  retry("2.2.4", () => {
    const divisor = randInt(rng, 2, 9);
    const dividend = randInt(rng, 100, 999);
    if (dividend % divisor === 0) return null;
    const { columns } = computeShortDivisionPlan(dividend, divisor);
    return columns[0].quotientDigit === 0 ? null : division("2.2.4", dividend, divisor);
  });

export const SHORT_DIVISION_QUESTIONS = questionType({
  id: "shortDivision",
  kinds: ["shortDiv"],
  levels: { "2.2.1": noRemainders, "2.2.2": withCarriedRemainder, "2.2.3": zeroInQuotient, "2.2.4": withRemainder },
  key: (p) => `${p.kind}:${p.dividend}:${p.divisor}`,
});
