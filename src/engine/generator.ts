/**
 * Pattern-based problem generator for level 1.1, stages 1-7 (see the build
 * brief's "Problem generation and validation" table). Every problem is built
 * column by column to match its stage's exact carry/växling pattern, then
 * independently re-verified before being handed back — a generator bug
 * should never reach a child.
 */
import { digitAt, digitsToNumber } from "./digits";
import { computeShortDivisionPlan } from "./methods/shortDiv";
import {
  classifyAdditionCarries,
  classifyMultiplicationCarries,
  classifySubtractionBorrows,
  verifyAddition,
  verifyDivision,
  verifyMultiplication,
  verifySubtraction,
} from "./verifier";
import type { Rng } from "./rng";
import { randInt } from "./rng";

export type StageId =
  | "1.1.1"
  | "1.1.2"
  | "1.1.3"
  | "1.1.4"
  | "1.1.5"
  | "1.1.6"
  | "1.1.7"
  | "2.1.1"
  | "2.1.2"
  | "2.1.3"
  | "2.2.1"
  | "2.2.2"
  | "2.2.3"
  | "2.2.4";

type AddSubStageId = "1.1.2" | "1.1.3" | "1.1.4" | "1.1.5" | "1.1.6" | "1.1.7";
type MulStageId = "2.1.1" | "2.1.2" | "2.1.3";
type DivStageId = "2.2.1" | "2.2.2" | "2.2.3" | "2.2.4";

export type GeneratedProblem =
  | { stageId: "1.1.1"; kind: "placeValue"; number: number; columnAsked: number; answer: number }
  | { stageId: AddSubStageId; kind: "columnAdd"; top: number; bottom: number; answer: number }
  | { stageId: AddSubStageId; kind: "columnSub"; top: number; bottom: number; answer: number }
  | { stageId: MulStageId; kind: "columnMul"; top: number; bottom: number; answer: number }
  | { stageId: DivStageId; kind: "shortDiv"; dividend: number; divisor: number; answer: number; remainder: number };

const MAX_ATTEMPTS = 200;

function isTrivial(top: number, bottom: number, op: "add" | "sub"): boolean {
  if (top <= 1 || bottom <= 1) return true;
  if (top === bottom) return true;
  if (op === "sub" && top - bottom === 0) return true;
  return false;
}

/** Number of 0 digits in `n`. Used to enforce "at most one 0 per operand". */
function zeroDigitCount(n: number): number {
  return n
    .toString()
    .split("")
    .filter((d) => d === "0").length;
}

/** True if either operand has more than one 0 digit (not allowed outside stage 7 zero-borrow problems). */
function hasTooManyZeros(top: number, bottom: number): boolean {
  return zeroDigitCount(top) > 1 || zeroDigitCount(bottom) > 1;
}

/** Builds an addition problem of `len` digits per operand with an exact carry pattern. */
function buildAdditionWithCarryPattern(rng: Rng, len: number, carryAt: Set<number>): { top: number; bottom: number } {
  const topDigits: number[] = new Array(len);
  const bottomDigits: number[] = new Array(len);
  let carryIn = 0;
  for (let col = 0; col < len; col++) {
    const leading = col === len - 1;
    const wantCarry = carryAt.has(col);
    let topDigit: number;
    let bottomDigit: number;
    if (wantCarry) {
      // topDigit must be at least 1 so a bottom digit big enough to force a
      // carry (>= 10 - carryIn - topDigit) always exists within 0-9.
      topDigit = randInt(rng, 1, 9);
      const minBottom = Math.max(0, 10 - carryIn - topDigit);
      bottomDigit = randInt(rng, minBottom, 9 - carryIn);
    } else {
      topDigit = randInt(rng, leading ? 1 : 0, 9 - carryIn);
      const maxBottom = 9 - carryIn - topDigit;
      bottomDigit = randInt(rng, 0, maxBottom);
    }
    topDigits[col] = topDigit;
    bottomDigits[col] = bottomDigit;
    const sum = topDigit + bottomDigit + carryIn;
    carryIn = sum >= 10 ? 1 : 0;
  }
  return { top: digitsToNumber(topDigits), bottom: digitsToNumber(bottomDigits) };
}

/** Builds a subtraction problem of `len` digits with an exact borrow pattern (top >= bottom guaranteed). */
function buildSubtractionWithBorrowPattern(
  rng: Rng,
  len: number,
  borrowAt: Set<number>,
  zeroColumns: Set<number> = new Set()
): { top: number; bottom: number } {
  const topDigits: number[] = new Array(len);
  const bottomDigits: number[] = new Array(len);
  const adjusted: number[] = new Array(len);

  for (let col = 0; col < len; col++) {
    const leading = col === len - 1;
    if (zeroColumns.has(col) && !leading) {
      topDigits[col] = 0;
    } else if (borrowAt.has(col) && !leading) {
      // A column asked to be independently deficient must not be accidentally
      // swept up as a zero-passthrough by another column's cascade search,
      // and must stay below 9 so a bottom digit greater than it always exists.
      topDigits[col] = randInt(rng, 1, 8);
    } else {
      topDigits[col] = randInt(rng, leading ? 1 : 0, 9);
    }
    adjusted[col] = topDigits[col];
  }

  // Resolve any requested borrow that would run into a zero column by lending
  // it forward first, mirroring the engine's own cascade so the requested
  // pattern is exactly what the child will see.
  for (let col = 0; col < len; col++) {
    if (!borrowAt.has(col)) continue;
    let j = col + 1;
    while (j < len && adjusted[j] === 0) {
      adjusted[j] = 9;
      j++;
    }
    if (j < len) adjusted[j] -= 1;
  }

  for (let col = 0; col < len; col++) {
    const wantBorrow = borrowAt.has(col);
    const cap = adjusted[col]; // the top value actually available at this column
    if (wantBorrow) {
      bottomDigits[col] = randInt(rng, cap + 1, 9);
    } else {
      bottomDigits[col] = randInt(rng, 0, cap);
    }
  }

  return { top: digitsToNumber(topDigits), bottom: digitsToNumber(bottomDigits) };
}

/**
 * Builds a `top * multiplier` problem (single-digit multiplier) of `len`
 * digits with an exact carry pattern. Returns null if the requested pattern
 * is infeasible for this multiplier (caller retries with a fresh multiplier).
 */
function buildMultiplicationWithCarryPattern(
  rng: Rng,
  len: number,
  multiplier: number,
  carryAt: Set<number>
): { top: number } | null {
  const topDigits: number[] = new Array(len);
  let carryIn = 0;
  for (let col = 0; col < len; col++) {
    const leading = col === len - 1;
    const minDigit = leading ? 1 : 0;
    const wantCarry = carryAt.has(col);
    let topDigit: number;
    if (wantCarry) {
      const minForCarry = Math.ceil((10 - carryIn) / multiplier);
      if (minForCarry > 9) return null;
      topDigit = randInt(rng, Math.max(minDigit, minForCarry), 9);
    } else {
      const maxForNoCarry = Math.floor((9 - carryIn) / multiplier);
      if (maxForNoCarry < minDigit) return null;
      topDigit = randInt(rng, minDigit, maxForNoCarry);
    }
    topDigits[col] = topDigit;
    const product = topDigit * multiplier + carryIn;
    carryIn = Math.floor(product / 10);
  }
  return { top: digitsToNumber(topDigits) };
}

function chooseColumns(rng: Rng, fromCols: readonly number[], count: number): Set<number> {
  const chosen = new Set<number>();
  const n = Math.min(count, fromCols.length);
  while (chosen.size < n) chosen.add(fromCols[randInt(rng, 0, fromCols.length - 1)]);
  return chosen;
}

function makeKey(p: GeneratedProblem): string {
  if (p.kind === "placeValue") return `pv:${p.number}:${p.columnAsked}`;
  if (p.kind === "shortDiv") return `${p.kind}:${p.dividend}:${p.divisor}`;
  return `${p.kind}:${p.top}:${p.bottom}`;
}

function isTrivialMul(top: number, bottom: number): boolean {
  return top <= 1 || bottom <= 1;
}

function generateStage1(rng: Rng): GeneratedProblem {
  const number = randInt(rng, 1000, 9999);
  const columnAsked = randInt(rng, 0, 3);
  const digit = digitAt(number, columnAsked);
  const answer = digit * 10 ** columnAsked;
  return { stageId: "1.1.1", kind: "placeValue", number, columnAsked, answer };
}

function generateStage2(rng: Rng): GeneratedProblem {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const len = randInt(rng, 2, 3);
    const { top, bottom } = buildAdditionWithCarryPattern(rng, len, new Set());
    if (isTrivial(top, bottom, "add") || hasTooManyZeros(top, bottom)) continue;
    return finalizeAdd("1.1.2", top, bottom);
  }
  throw new Error("generateStage2: exhausted attempts");
}

function generateStage3(rng: Rng): GeneratedProblem {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const len = randInt(rng, 2, 3);
    const { top, bottom } = buildSubtractionWithBorrowPattern(rng, len, new Set());
    if (top - bottom < 10) continue;
    if (isTrivial(top, bottom, "sub") || hasTooManyZeros(top, bottom)) continue;
    return finalizeSub("1.1.3", top, bottom);
  }
  throw new Error("generateStage3: exhausted attempts");
}

function generateStage4(rng: Rng): GeneratedProblem {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const { top, bottom } = buildAdditionWithCarryPattern(rng, 2, new Set([0]));
    if (top + bottom < 20 || top + bottom > 99) continue;
    if (isTrivial(top, bottom, "add")) continue;
    return finalizeAdd("1.1.4", top, bottom);
  }
  throw new Error("generateStage4: exhausted attempts");
}

function generateStage5(rng: Rng): GeneratedProblem {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const { top, bottom } = buildSubtractionWithBorrowPattern(rng, 2, new Set([0]));
    if (top - bottom < 10 || top - bottom > 89) continue;
    if (isTrivial(top, bottom, "sub")) continue;
    return finalizeSub("1.1.5", top, bottom);
  }
  throw new Error("generateStage5: exhausted attempts");
}

function generateStage6(rng: Rng): GeneratedProblem {
  const isAdd = rng() < 0.5;
  const len = 3;
  const allCols = Array.from({ length: len }, (_, i) => i);
  const nonLeadingCols = allCols.slice(0, len - 1); // subtraction: the leading column can never borrow
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (isAdd) {
      const carryCols = chooseColumns(rng, allCols, randInt(rng, 2, 3));
      const { top, bottom } = buildAdditionWithCarryPattern(rng, len, carryCols);
      if (top + bottom > 1998) continue;
      if (isTrivial(top, bottom, "add") || hasTooManyZeros(top, bottom)) continue;
      return finalizeAdd("1.1.6", top, bottom);
    } else {
      const borrowCols = chooseColumns(rng, nonLeadingCols, randInt(rng, 2, nonLeadingCols.length));
      const { top, bottom } = buildSubtractionWithBorrowPattern(rng, len, borrowCols);
      if (top - bottom < 10) continue;
      if (isTrivial(top, bottom, "sub") || hasTooManyZeros(top, bottom)) continue;
      return finalizeSub("1.1.6", top, bottom);
    }
  }
  throw new Error("generateStage6: exhausted attempts");
}

function generateStage7(rng: Rng): GeneratedProblem {
  const isAdd = rng() < 0.5;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const len = randInt(rng, 3, 4);
    const allCols = Array.from({ length: len }, (_, i) => i);
    const nonLeadingCols = allCols.slice(0, len - 1);
    if (isAdd) {
      const carryCols = chooseColumns(rng, allCols, randInt(rng, 2, Math.min(3, len)));
      const { top, bottom } = buildAdditionWithCarryPattern(rng, len, carryCols);
      if (top + bottom > 19998) continue;
      if (isTrivial(top, bottom, "add") || hasTooManyZeros(top, bottom)) continue;
      return finalizeAdd("1.1.7", top, bottom);
    } else {
      const zeroAcrossBorrow = rng() < 0.4 && len >= 3;
      let zeroColumns = new Set<number>();
      let borrowCols = chooseColumns(rng, nonLeadingCols, randInt(rng, 2, Math.min(3, nonLeadingCols.length)));
      if (zeroAcrossBorrow) {
        // Force the ones column's borrow to cross 1-2 zero columns.
        const maxZeros = Math.min(2, len - 2);
        const zerosToCross = randInt(rng, 1, maxZeros);
        zeroColumns = new Set(Array.from({ length: zerosToCross }, (_, k) => k + 1));
        borrowCols = new Set([0, ...borrowCols]);
      }
      const { top, bottom } = buildSubtractionWithBorrowPattern(rng, len, borrowCols, zeroColumns);
      if (top - bottom < 10) continue;
      if (isTrivial(top, bottom, "sub")) continue;
      if (!zeroAcrossBorrow && hasTooManyZeros(top, bottom)) continue;
      return finalizeSub("1.1.7", top, bottom);
    }
  }
  throw new Error("generateStage7: exhausted attempts");
}

function generateStage201(rng: Rng): GeneratedProblem {
  // 2-digit x 1-digit, no minnessiffra.
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const multiplier = randInt(rng, 2, 9);
    const built = buildMultiplicationWithCarryPattern(rng, 2, multiplier, new Set());
    if (!built) continue;
    if (isTrivialMul(built.top, multiplier)) continue;
    return finalizeMul("2.1.1", built.top, multiplier);
  }
  throw new Error("generateStage201: exhausted attempts");
}

function generateStage202(rng: Rng): GeneratedProblem {
  // 2-digit x 1-digit, with a minnessiffra from the ones column.
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const multiplier = randInt(rng, 2, 9);
    const built = buildMultiplicationWithCarryPattern(rng, 2, multiplier, new Set([0]));
    if (!built) continue;
    if (isTrivialMul(built.top, multiplier)) continue;
    return finalizeMul("2.1.2", built.top, multiplier);
  }
  throw new Error("generateStage202: exhausted attempts");
}

function generateStage203(rng: Rng): GeneratedProblem {
  // 3-digit x 1-digit, carries in one or two columns.
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const multiplier = randInt(rng, 2, 9);
    const carryCols = chooseColumns(rng, [0, 1], randInt(rng, 1, 2));
    const built = buildMultiplicationWithCarryPattern(rng, 3, multiplier, carryCols);
    if (!built) continue;
    if (isTrivialMul(built.top, multiplier)) continue;
    return finalizeMul("2.1.3", built.top, multiplier);
  }
  throw new Error("generateStage203: exhausted attempts");
}

function finalizeAdd(stageId: AddSubStageId, top: number, bottom: number): GeneratedProblem {
  const answer = top + bottom;
  const check = verifyAddition(top, bottom, answer);
  if (!check.valid) throw new Error(`generator/verifier mismatch for ${top}+${bottom}: ${check.reason}`);
  return { stageId, kind: "columnAdd", top, bottom, answer };
}

function finalizeSub(stageId: AddSubStageId, top: number, bottom: number): GeneratedProblem {
  const answer = top - bottom;
  const check = verifySubtraction(top, bottom, answer);
  if (!check.valid) throw new Error(`generator/verifier mismatch for ${top}-${bottom}: ${check.reason}`);
  return { stageId, kind: "columnSub", top, bottom, answer };
}

function finalizeMul(stageId: MulStageId, top: number, bottom: number): GeneratedProblem {
  const answer = top * bottom;
  const check = verifyMultiplication(top, bottom, answer);
  if (!check.valid) throw new Error(`generator/verifier mismatch for ${top}*${bottom}: ${check.reason}`);
  return { stageId, kind: "columnMul", top, bottom, answer };
}

function finalizeDiv(stageId: DivStageId, dividend: number, divisor: number): GeneratedProblem {
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

// Stages generate a random 3-digit dividend and single-digit divisor, then
// independently re-derive the column-by-column plan (the same logic buildGraph
// itself uses) to check the pattern actually matches the stage. 2.2.1 and 2.2.3
// target patterns too rare to reliably hit by rejection-sampling a random
// dividend within MAX_ATTEMPTS, so they construct digits directly instead.
function generateStage221(rng: Rng): GeneratedProblem {
  // No minnesrest: every digit must itself be an exact multiple of the divisor.
  const divisor = randInt(rng, 2, 9);
  const valid = digitsDivisibleBy(divisor);
  const leadingChoices = valid.filter((d) => d > 0); // divisor itself is always one such digit
  const leading = leadingChoices[randInt(rng, 0, leadingChoices.length - 1)];
  const middle = valid[randInt(rng, 0, valid.length - 1)];
  const ones = valid[randInt(rng, 0, valid.length - 1)];
  return finalizeDiv("2.2.1", leading * 100 + middle * 10 + ones, divisor);
}

function generateStage222(rng: Rng): GeneratedProblem {
  // With minnesrest: at least one column carries a remainder, but the division is still exact overall.
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const divisor = randInt(rng, 2, 9);
    const dividend = randInt(rng, 100, 999);
    if (dividend % divisor !== 0) continue;
    const { columns } = computeShortDivisionPlan(dividend, divisor);
    if (columns[0].quotientDigit === 0) continue;
    if (!columns.some((c) => c.col > 0 && c.remainderOut > 0)) continue;
    return finalizeDiv("2.2.2", dividend, divisor);
  }
  throw new Error("generateStage222: exhausted attempts");
}

function generateStage223(rng: Rng): GeneratedProblem {
  // Zero in the quotient: force it at the tens column by making the hundreds
  // column divide exactly (no carry in) and the tens digit itself < divisor
  // (so tens' own quotient digit is 0); the ones digit is then chosen so the
  // whole division still comes out exact.
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const divisor = randInt(rng, 2, 9);
    const validLead = digitsDivisibleBy(divisor).filter((d) => d > 0);
    const leading = validLead[randInt(rng, 0, validLead.length - 1)];
    const middle = randInt(rng, 0, divisor - 1);
    const onesCandidates: number[] = [];
    for (let d = 0; d <= 9; d++) if ((middle * 10 + d) % divisor === 0) onesCandidates.push(d);
    if (onesCandidates.length === 0) continue;
    const ones = onesCandidates[randInt(rng, 0, onesCandidates.length - 1)];
    return finalizeDiv("2.2.3", leading * 100 + middle * 10 + ones, divisor);
  }
  throw new Error("generateStage223: exhausted attempts");
}

function generateStage224(rng: Rng): GeneratedProblem {
  // Division with a genuine leftover remainder.
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const divisor = randInt(rng, 2, 9);
    const dividend = randInt(rng, 100, 999);
    if (dividend % divisor === 0) continue;
    const { columns } = computeShortDivisionPlan(dividend, divisor);
    if (columns[0].quotientDigit === 0) continue;
    return finalizeDiv("2.2.4", dividend, divisor);
  }
  throw new Error("generateStage224: exhausted attempts");
}

const GENERATORS: Record<StageId, (rng: Rng) => GeneratedProblem> = {
  "1.1.1": generateStage1,
  "1.1.2": generateStage2,
  "1.1.3": generateStage3,
  "1.1.4": generateStage4,
  "1.1.5": generateStage5,
  "1.1.6": generateStage6,
  "1.1.7": generateStage7,
  "2.1.1": generateStage201,
  "2.1.2": generateStage202,
  "2.1.3": generateStage203,
  "2.2.1": generateStage221,
  "2.2.2": generateStage222,
  "2.2.3": generateStage223,
  "2.2.4": generateStage224,
};

export function generateProblem(stageId: StageId, rng: Rng): GeneratedProblem {
  return GENERATORS[stageId](rng);
}

/**
 * Generates a full round: no duplicate within the round, and none repeated
 * from `recentKeys` (problems from the last two rounds, caller-maintained).
 */
export function generateRound(
  stageId: StageId,
  count: number,
  rng: Rng,
  recentKeys: ReadonlySet<string> = new Set()
): { problems: GeneratedProblem[]; keys: string[] } {
  const problems: GeneratedProblem[] = [];
  const keys: string[] = [];
  const seenThisRound = new Set<string>();

  for (let i = 0; i < count; i++) {
    let problem: GeneratedProblem | null = null;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const candidate = generateProblem(stageId, rng);
      const key = makeKey(candidate);
      if (seenThisRound.has(key) || recentKeys.has(key)) continue;
      problem = candidate;
      seenThisRound.add(key);
      keys.push(key);
      break;
    }
    if (!problem) throw new Error(`generateRound: could not find a fresh problem for ${stageId} after ${MAX_ATTEMPTS} attempts`);
    problems.push(problem);
  }

  return { problems, keys };
}

export { classifyAdditionCarries, classifyMultiplicationCarries, classifySubtractionBorrows, makeKey };
