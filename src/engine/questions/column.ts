/**
 * Uppställning: addition, subtraktion and multiplikation set up in columns
 * (åk 1-6), each level with its exact carry/växling pattern. Every question
 * is built column by column to match its level's pattern, then independently
 * re-verified before it's handed back - a generator bug should never reach a
 * child.
 *
 * Decimals (2.3.3, 2.3.4) are exact integer arithmetic at a fixed scale: 4,7
 * is the integer 47 with decimalPlaces 1, worked the same way - only the board
 * draws the comma.
 *
 * How it works, and what must stay true: docs/question-types/column.md.
 */
import { digitAt, digitsToNumber } from "../digits";
import { randInt, type Rng } from "../rng";
import { verifyAddition, verifyMultiplication, verifySubtraction } from "../verifier";
import { questionType, retry } from "./questionType";

type AddSubStageId = "1.1.2" | "1.1.3" | "1.1.4" | "1.1.5" | "1.1.6" | "1.1.7";
type MulStageId = "2.1.1" | "2.1.2" | "2.1.3";
type DecimalStageId = "2.3.3" | "2.3.4";
export type ColumnStageId = AddSubStageId | MulStageId | DecimalStageId;

/**
 * Addition and subtraction can have decimals: the numbers are integers at the
 * scale `decimalPlaces` (4,7 is 47 with 1). Where one number has fewer
 * decimals than that (the 3,5 in 3,5 + 1,25), `topDecimals`/`bottomDecimals`
 * say so - its last digit is a 0 to think of, which the board shows faint.
 */
interface DecimalFields {
  decimalPlaces?: number;
  topDecimals?: number;
  bottomDecimals?: number;
}

export type ColumnProblem =
  | ({ stageId: AddSubStageId | DecimalStageId; kind: "columnAdd"; top: number; bottom: number; answer: number } & DecimalFields)
  | ({ stageId: AddSubStageId | DecimalStageId; kind: "columnSub"; top: number; bottom: number; answer: number } & DecimalFields)
  | { stageId: MulStageId; kind: "columnMul"; top: number; bottom: number; answer: number };

// --- Building numbers to a pattern -------------------------------------------

function isTrivial(top: number, bottom: number, op: "add" | "sub"): boolean {
  if (top <= 1 || bottom <= 1) return true;
  if (top === bottom) return true;
  if (op === "sub" && top - bottom === 0) return true;
  return false;
}

const isTrivialMul = (top: number, bottom: number) => top <= 1 || bottom <= 1;

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
function buildMultiplicationWithCarryPattern(rng: Rng, len: number, multiplier: number, carryAt: Set<number>): { top: number } | null {
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

// --- Verified questions --------------------------------------------------------

/** Decimals: the scale both numbers are worked at, and each number's own decimals where they differ (3,5 + 1,25). */
interface Decimals {
  places: number;
  top?: number;
  bottom?: number;
}

const decimalFields = (d?: Decimals) =>
  d ? { decimalPlaces: d.places, ...(d.top !== undefined && d.top !== d.places ? { topDecimals: d.top } : {}), ...(d.bottom !== undefined && d.bottom !== d.places ? { bottomDecimals: d.bottom } : {}) } : {};

function add(stageId: AddSubStageId | DecimalStageId, top: number, bottom: number, decimals?: Decimals): ColumnProblem {
  const answer = top + bottom;
  const check = verifyAddition(top, bottom, answer);
  if (!check.valid) throw new Error(`generator/verifier mismatch for ${top}+${bottom}: ${check.reason}`);
  return { stageId, kind: "columnAdd", top, bottom, answer, ...decimalFields(decimals) };
}

function sub(stageId: AddSubStageId | DecimalStageId, top: number, bottom: number, decimals?: Decimals): ColumnProblem {
  const answer = top - bottom;
  const check = verifySubtraction(top, bottom, answer);
  if (!check.valid) throw new Error(`generator/verifier mismatch for ${top}-${bottom}: ${check.reason}`);
  return { stageId, kind: "columnSub", top, bottom, answer, ...decimalFields(decimals) };
}

function mul(stageId: MulStageId, top: number, bottom: number): ColumnProblem {
  const answer = top * bottom;
  const check = verifyMultiplication(top, bottom, answer);
  if (!check.valid) throw new Error(`generator/verifier mismatch for ${top}*${bottom}: ${check.reason}`);
  return { stageId, kind: "columnMul", top, bottom, answer };
}

// --- The levels ------------------------------------------------------------------

/** 1.1.2: addition, no carry. */
const additionNoCarry = (rng: Rng) =>
  retry("1.1.2", () => {
    const len = randInt(rng, 2, 3);
    const { top, bottom } = buildAdditionWithCarryPattern(rng, len, new Set());
    return isTrivial(top, bottom, "add") || hasTooManyZeros(top, bottom) ? null : add("1.1.2", top, bottom);
  });

/** 1.1.3: subtraction, no växling. */
const subtractionNoBorrow = (rng: Rng) =>
  retry("1.1.3", () => {
    const len = randInt(rng, 2, 3);
    const { top, bottom } = buildSubtractionWithBorrowPattern(rng, len, new Set());
    if (top - bottom < 10) return null;
    return isTrivial(top, bottom, "sub") || hasTooManyZeros(top, bottom) ? null : sub("1.1.3", top, bottom);
  });

/** 1.1.4: two-digit addition, carry from the ones. */
const additionOneCarry = (rng: Rng) =>
  retry("1.1.4", () => {
    const { top, bottom } = buildAdditionWithCarryPattern(rng, 2, new Set([0]));
    if (top + bottom < 20 || top + bottom > 99) return null;
    return isTrivial(top, bottom, "add") ? null : add("1.1.4", top, bottom);
  });

/** 1.1.5: two-digit subtraction, växling from the tens. */
const subtractionOneBorrow = (rng: Rng) =>
  retry("1.1.5", () => {
    const { top, bottom } = buildSubtractionWithBorrowPattern(rng, 2, new Set([0]));
    if (top - bottom < 10 || top - bottom > 89) return null;
    return isTrivial(top, bottom, "sub") ? null : sub("1.1.5", top, bottom);
  });

/** 1.1.6: three digits, carries or växling in two or more columns - additions and subtractions mixed. */
function mixedSeveral(rng: Rng): ColumnProblem {
  const isAdd = rng() < 0.5;
  const len = 3;
  const allCols = Array.from({ length: len }, (_, i) => i);
  const nonLeadingCols = allCols.slice(0, len - 1); // subtraction: the leading column can never borrow
  return retry("1.1.6", () => {
    if (isAdd) {
      const carryCols = chooseColumns(rng, allCols, randInt(rng, 2, 3));
      const { top, bottom } = buildAdditionWithCarryPattern(rng, len, carryCols);
      if (top + bottom > 1998) return null;
      return isTrivial(top, bottom, "add") || hasTooManyZeros(top, bottom) ? null : add("1.1.6", top, bottom);
    }
    const borrowCols = chooseColumns(rng, nonLeadingCols, randInt(rng, 2, nonLeadingCols.length));
    const { top, bottom } = buildSubtractionWithBorrowPattern(rng, len, borrowCols);
    if (top - bottom < 10) return null;
    return isTrivial(top, bottom, "sub") || hasTooManyZeros(top, bottom) ? null : sub("1.1.6", top, bottom);
  });
}

/** 1.1.7: borrowing across zeros - mostly subtractions that do, some additions to keep it mixed. */
function acrossZeros(rng: Rng): ColumnProblem {
  const isAdd = rng() < 0.25;
  return retry("1.1.7", () => {
    const len = randInt(rng, 3, 4);
    const allCols = Array.from({ length: len }, (_, i) => i);
    const nonLeadingCols = allCols.slice(0, len - 1);
    if (isAdd) {
      const carryCols = chooseColumns(rng, allCols, randInt(rng, 2, Math.min(3, len)));
      const { top, bottom } = buildAdditionWithCarryPattern(rng, len, carryCols);
      if (top + bottom > 19998) return null;
      return isTrivial(top, bottom, "add") || hasTooManyZeros(top, bottom) ? null : add("1.1.7", top, bottom);
    }
    const zeroAcrossBorrow = rng() < 0.85 && len >= 3;
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
    if (top - bottom < 10 || isTrivial(top, bottom, "sub")) return null;
    if (!zeroAcrossBorrow && hasTooManyZeros(top, bottom)) return null;
    return sub("1.1.7", top, bottom);
  });
}

/** Multiplication by a one-digit number, `len` digits, carries where `carries` says. */
const multiplication = (stageId: MulStageId, len: number, carries: (rng: Rng) => Set<number>) => (rng: Rng) =>
  retry(stageId, () => {
    const multiplier = randInt(rng, 2, 9);
    const built = buildMultiplicationWithCarryPattern(rng, len, multiplier, carries(rng));
    return !built || isTrivialMul(built.top, multiplier) ? null : mul(stageId, built.top, multiplier);
  });

/**
 * 2.3.3: tenths - 4,7 + 2,5, 6,2 − 3,8 - with a minnessiffra or a växling
 * across the comma more often than not: the comma changes nothing about how
 * it's done.
 */
function tenths(rng: Rng): ColumnProblem {
  const isAdd = rng() < 0.5;
  return retry("2.3.3", () => {
    const len = randInt(rng, 2, 3); // 4,7 or 12,5
    const cols = Array.from({ length: len }, (_, i) => i);
    if (isAdd) {
      const { top, bottom } = buildAdditionWithCarryPattern(rng, len, chooseColumns(rng, cols, randInt(rng, 0, 2)));
      return isTrivial(top, bottom, "add") ? null : add("2.3.3", top, bottom, { places: 1 });
    }
    const { top, bottom } = buildSubtractionWithBorrowPattern(rng, len, chooseColumns(rng, cols.slice(0, -1), randInt(rng, 0, 1)));
    return top - bottom < 10 || isTrivial(top, bottom, "sub") ? null : sub("2.3.3", top, bottom, { places: 1 });
  });
}

/**
 * 2.3.4: olika antal decimaler - 3,5 + 1,25, 4,2 − 1,75: one number with
 * hundredths, the other with tenths only. The commas go under each other
 * and the missing hundredth is a 0 to think of (the board shows it faint) -
 * which, when it's on top in a subtraction, has to borrow.
 */
function differentDecimals(rng: Rng): ColumnProblem {
  const isAdd = rng() < 0.5;
  const tenthsOnTop = rng() < 0.5;
  const tenthsOnly = (n: number) => n - (n % 10);
  return retry("2.3.4", () => {
    const len = randInt(rng, 3, 4); // 3,50 or 12,50
    const cols = Array.from({ length: len }, (_, i) => i);
    const built = isAdd
      ? buildAdditionWithCarryPattern(rng, len, chooseColumns(rng, cols, randInt(rng, 0, 2)))
      : buildSubtractionWithBorrowPattern(rng, len, chooseColumns(rng, cols.slice(0, -1), randInt(rng, 0, 1)));
    // The one with tenths only: its hundredths digit made 0 - the other keeps one that isn't.
    const top = tenthsOnTop ? tenthsOnly(built.top) : built.top;
    const bottom = tenthsOnTop ? built.bottom : tenthsOnly(built.bottom);
    if (digitAt(tenthsOnTop ? bottom : top, 0) === 0) return null;
    const decimals = { places: 2, top: tenthsOnTop ? 1 : 2, bottom: tenthsOnTop ? 2 : 1 };
    if (isAdd) return isTrivial(top, bottom, "add") ? null : add("2.3.4", top, bottom, decimals);
    return top - bottom < 10 || isTrivial(top, bottom, "sub") ? null : sub("2.3.4", top, bottom, decimals);
  });
}

export const COLUMN_QUESTIONS = questionType({
  id: "column",
  kinds: ["columnAdd", "columnSub", "columnMul"],
  levels: {
    "1.1.2": additionNoCarry,
    "1.1.3": subtractionNoBorrow,
    "1.1.4": additionOneCarry,
    "1.1.5": subtractionOneBorrow,
    "1.1.6": mixedSeveral,
    "1.1.7": acrossZeros,
    // 2-digit · 1-digit without a minnessiffra, with one from the ones, then 3-digit with carries in one or two columns.
    "2.1.1": multiplication("2.1.1", 2, () => new Set()),
    "2.1.2": multiplication("2.1.2", 2, () => new Set([0])),
    "2.1.3": multiplication("2.1.3", 3, (rng) => chooseColumns(rng, [0, 1], randInt(rng, 1, 2))),
    "2.3.3": tenths,
    "2.3.4": differentDecimals,
  },
  key: (p) => `${p.kind}:${p.top}:${p.bottom}`,
});
