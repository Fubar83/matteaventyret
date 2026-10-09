/**
 * Division with trappan - the written method taught in Swedish schools: the
 * divisor to the left of the bracket's stem, the dividend under its bar, the
 * quotient above, and the work stepping down under it like stairs. Each step
 * the same four moves: how many times does the divisor go into the part
 * (a quotient digit), multiply back, subtract, bring down the next digit.
 *
 * The levels climb from 2-digit ÷ 1-digit up to decimal ÷ decimal:
 *   2.5.1  2-siffrigt ÷ 1-siffrigt          84 ÷ 4
 *   2.5.2  3-siffrigt ÷ 1-siffrigt          764 ÷ 4, a 0 in the answer (412 ÷ 4)
 *   2.5.8  med rest                         17 ÷ 5 = 3 rest 2 - it doesn't go evenly, and what's left is the rest
 *   2.5.3  svar med decimaler               7 ÷ 4 = 1,75 - on past the comma with zeros
 *   2.5.4  ÷ 2-siffrigt tal                 672 ÷ 12
 *   2.5.5  decimaltal ÷ heltal              12,6 ÷ 3
 *   2.5.6  decimaltal ÷ decimaltal          13,2 ÷ 5,28 - the commas moved until the divisor is whole
 *   2.5.7  avrunda                          125,25 ÷ 12,7 ≈ 9,9 - it never ends: one decimal more, then rounded
 *
 * Numbers are kept as digit strings and whole numbers wherever possible, so
 * no floating point decides a digit.
 */
import { pick, randInt, type Rng } from "../rng";
import { questionType } from "./questionType";

export type TrappanStageId = "2.5.1" | "2.5.2" | "2.5.8" | "2.5.3" | "2.5.4" | "2.5.5" | "2.5.6" | "2.5.7";

/** A number as written: its digits and how many of them come after the decimal comma ("13,2": "132", 1). */
export interface Decimal {
  digits: string;
  decimals: number;
}

export interface TrappanProblem {
  stageId: TrappanStageId;
  kind: "trappan";
  /** The division as asked: 13,2 ÷ 5,28. */
  dividend: Decimal;
  divisor: Decimal;
  /** How many places both commas move right so the divisor is whole (2 for 5,28) - 0 for a whole divisor. */
  shift: number;
  /** The answer: exact, or rounded to `roundTo` decimals. */
  answer: number;
  /** Round the answer to this many decimals (2.5.7) - the walk goes one decimal further first. */
  roundTo?: number;
  /** Whole numbers only (2.5.8): no going on past the comma - the answer is `answer` and the rest the walk ends with (17 ÷ 5 = 3 rest 2). */
  withRest?: true;
}

/** One stair of the trappan: the part divided, its quotient digit, the product written under it, what's left - and the digit brought down next. */
export interface TrappanStep {
  /** The column (of the written dividend, left to right) the part ends in - where its quotient digit goes. */
  col: number;
  part: number;
  quotientDigit: number;
  product: number;
  rest: number;
  /** The digit brought down next to the rest (from the dividend, or a 0 added after its comma), or null at the last step. */
  broughtDown: number | null;
  /** The brought-down digit is a 0 added after the dividend's last digit. */
  addedZero: boolean;
}

export interface TrappanWalk {
  /** The dividend as worked: after the commas moved, with any zeros added after its comma. */
  dividend: Decimal;
  divisor: number;
  steps: TrappanStep[];
  /** The quotient's digits, from the first step's column on, and how many are decimals. */
  quotient: Decimal;
  /** Leftover at the end (0 when it goes evenly). */
  rest: number;
}

/** A Decimal's value. */
export function valueOf(n: Decimal): number {
  return Number(n.digits) / 10 ** n.decimals;
}

/** A Decimal the Swedish way: "13,2", "5,28", "764". */
export function decimalText(n: Decimal): string {
  const whole = n.digits.slice(0, n.digits.length - n.decimals) || "0";
  return n.decimals > 0 ? `${whole},${n.digits.slice(n.digits.length - n.decimals)}` : whole;
}

/** A whole number of tenths/hundredths as a Decimal, trailing zeros after the comma dropped (4,20 → 4,2). */
function decimal(scaled: number, decimals: number): Decimal {
  let digits = String(scaled);
  let d = decimals;
  while (d > 0 && digits.endsWith("0")) {
    digits = digits.slice(0, -1);
    d--;
  }
  while (digits.length <= d) digits = `0${digits}`;
  return { digits, decimals: d };
}

/** Both commas moved `shift` places right: the dividend's digits (zeros added when it runs out of decimals), the divisor whole. */
export function shifted(problem: TrappanProblem): { dividend: Decimal; divisor: number } {
  const s = problem.shift;
  const { dividend, divisor } = problem;
  const extra = Math.max(0, s - dividend.decimals);
  const dividendDigits = dividend.digits + "0".repeat(extra);
  const divisorDigits = divisor.digits + "0".repeat(Math.max(0, s - divisor.decimals));
  return {
    dividend: { digits: dividendDigits.replace(/^0+(?=\d)/, ""), decimals: Math.max(0, dividend.decimals - s) },
    divisor: Number(divisorDigits),
  };
}

/**
 * The trappan worked through: the first part is as few leading digits as the
 * divisor goes into, then one stair per digit brought down - zeros added
 * after the comma while there's a rest and `maxDecimals` allows.
 */
export function walk(dividend: Decimal, divisor: number, maxDecimals: number): TrappanWalk {
  const digits = dividend.digits.split("").map(Number);
  const intLen = digits.length - dividend.decimals;
  const steps: TrappanStep[] = [];
  let col = 0;
  let part = digits[0];
  while (part < divisor && col < intLen - 1) {
    col++;
    part = part * 10 + digits[col];
  }
  for (;;) {
    const q = Math.floor(part / divisor);
    const product = q * divisor;
    const rest = part - product;
    const nextCol = col + 1;
    const decimalsSoFar = Math.max(0, col - (intLen - 1));
    const more = nextCol < digits.length || (rest !== 0 && decimalsSoFar < maxDecimals);
    if (!more) {
      steps.push({ col, part, quotientDigit: q, product, rest, broughtDown: null, addedZero: false });
      break;
    }
    const addedZero = nextCol >= digits.length;
    const next = addedZero ? 0 : digits[nextCol];
    if (addedZero) digits.push(0);
    steps.push({ col, part, quotientDigit: q, product, rest, broughtDown: next, addedZero });
    part = rest * 10 + next;
    col = nextCol;
  }
  const last = steps[steps.length - 1];
  const quotientDecimals = Math.max(0, last.col - (intLen - 1));
  return {
    dividend: { digits: digits.join(""), decimals: digits.length - intLen },
    divisor,
    steps,
    quotient: { digits: steps.map((s) => s.quotientDigit).join(""), decimals: quotientDecimals },
    rest: last.rest,
  };
}

/** The walk a problem is worked with: commas moved, as many decimals as the answer needs (one more than it's rounded to). */
export function walkOf(problem: TrappanProblem): TrappanWalk {
  const { dividend, divisor } = shifted(problem);
  return walk(dividend, divisor, problem.withRest ? 0 : problem.roundTo !== undefined ? problem.roundTo + 1 : 4);
}

/** Rounded to `decimals` places, half away from zero - as taught. */
export function roundTo(value: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(value * f + 1e-9) / f;
}


function problem(stageId: TrappanStageId, dividend: Decimal, divisor: Decimal, roundDecimals?: number): TrappanProblem {
  const p: TrappanProblem = { stageId, kind: "trappan", dividend, divisor, shift: divisor.decimals, answer: 0, ...(roundDecimals !== undefined ? { roundTo: roundDecimals } : {}) };
  const w = walkOf(p);
  const exact = valueOf(w.quotient);
  return { ...p, answer: roundDecimals !== undefined ? roundTo(exact, roundDecimals) : exact };
}

const whole = (n: number): Decimal => ({ digits: String(n), decimals: 0 });

/** 2-siffrigt ÷ 1-siffrigt: 84 ÷ 4, 72 ÷ 3 - a rest to carry on with at the first stair now and then. */
function stage251(rng: Rng): TrappanProblem {
  const d = randInt(rng, 2, 9);
  const q = randInt(rng, 11, Math.floor(99 / d));
  return problem("2.5.1", whole(q * d), whole(d));
}

/** 3-siffrigt ÷ 1-siffrigt: 764 ÷ 4 - and now and then a 0 in the answer (412 ÷ 4 = 103). */
function stage252(rng: Rng): TrappanProblem {
  const d = randInt(rng, 2, 9);
  const max = Math.floor(999 / d);
  for (;;) {
    const q = rng() < 0.3 ? randInt(rng, 1, Math.floor(max / 100)) * 100 + randInt(rng, 1, 9) : randInt(rng, 101, max);
    if (q >= 101 && q <= max && q * d >= 100) return problem("2.5.2", whole(q * d), whole(d));
  }
}

/** Med rest: 17 ÷ 5 = 3 rest 2, 158 ÷ 6 = 26 rest 2 - whole numbers that don't go evenly; what's left over at the end is the rest. */
function stage258(rng: Rng): TrappanProblem {
  const d = randInt(rng, 2, 9);
  const r = randInt(rng, 1, d - 1);
  // Mostly two digits (one stair or two), now and then three.
  const q = rng() < 0.6 ? randInt(rng, Math.ceil((10 - r) / d), Math.floor((99 - r) / d)) : randInt(rng, Math.ceil((100 - r) / d), Math.floor((999 - r) / d));
  return { stageId: "2.5.8", kind: "trappan", dividend: whole(q * d + r), divisor: whole(d), shift: 0, answer: q, withRest: true };
}

/** Svar med decimaler: a whole number that doesn't go evenly - on past the comma with zeros (7 ÷ 4 = 1,75). */
function stage253(rng: Rng): TrappanProblem {
  for (;;) {
    const d = pick(rng, [2, 4, 5, 8]);
    const n = randInt(rng, d + 1, 99);
    if (n % d !== 0 && (n * 1000) % d === 0) return problem("2.5.3", whole(n), whole(d));
  }
}

/** ÷ 2-siffrigt tal: 672 ÷ 12. */
function stage254(rng: Rng): TrappanProblem {
  const d = randInt(rng, 11, 25);
  const q = randInt(rng, 12, 60);
  return problem("2.5.4", whole(q * d), whole(d));
}

/** Decimaltal ÷ heltal: 12,6 ÷ 3, 7,35 ÷ 5 - the comma in the answer straight above the dividend's. */
function stage255(rng: Rng): TrappanProblem {
  for (;;) {
    const d = randInt(rng, 2, 9);
    const decimals = rng() < 0.5 ? 1 : 2;
    const scaledQ = decimals === 1 ? randInt(rng, 11, 99) : randInt(rng, 101, 499);
    const scaledD = scaledQ * d;
    if (scaledD % 10 === 0) continue; // keeps a decimal in the dividend
    return problem("2.5.5", decimal(scaledD, decimals), whole(d));
  }
}

/** Decimaltal ÷ decimaltal: 4,5 ÷ 0,3, 13,2 ÷ 5,28 - both commas moved until the divisor is whole. */
function stage256(rng: Rng): TrappanProblem {
  for (;;) {
    const twoPlaces = rng() < 0.4;
    const scaledDivisor = twoPlaces ? randInt(rng, 101, 999) : randInt(rng, 2, 99);
    if (scaledDivisor % 10 === 0) continue;
    const divisorDecimals = twoPlaces ? 2 : 1;
    // The answer whole, or with one decimal - so the stairs end.
    const scaledQ = rng() < 0.5 ? randInt(rng, 2, 30) * 10 : randInt(rng, 11, 99);
    const scaledDividend = scaledDivisor * scaledQ; // in units of 10^-(divisorDecimals + 1)
    const dividend = decimal(scaledDividend, divisorDecimals + 1);
    if (Number(dividend.digits) / 10 ** dividend.decimals < 0.5) continue;
    return problem("2.5.6", dividend, decimal(scaledDivisor, divisorDecimals));
  }
}

/**
 * Avrunda: 125,25 ÷ 12,7 - two decimal numbers whose division never ends.
 * Worked to two decimals (a rest still left) and rounded to one. The divisor
 * has one decimal, so after the commas move it is at most 299 - its times
 * table is still one to look things up in.
 */
function stage257(rng: Rng): TrappanProblem {
  for (;;) {
    const scaledDivisor = randInt(rng, 15, 299); // 1,5 - 29,9
    if (scaledDivisor % 10 === 0) continue;
    const dividendDecimals = rng() < 0.5 ? 1 : 2;
    const ratio = 1.5 + rng() * 10;
    const scaledDividend = Math.round(scaledDivisor * ratio * 10 ** (dividendDecimals - 1));
    if (scaledDividend % 10 === 0) continue;
    const p = problem("2.5.7", decimal(scaledDividend, dividendDecimals), decimal(scaledDivisor, 1), 1);
    // Only ones that really don't end within the two decimals worked.
    if (walkOf(p).rest === 0) continue;
    return p;
  }
}

export const TRAPPAN_QUESTIONS = questionType({
  id: "trappan",
  kinds: ["trappan"],
  levels: {
    "2.5.1": stage251,
    "2.5.2": stage252,
    "2.5.8": stage258,
    "2.5.3": stage253,
    "2.5.4": stage254,
    "2.5.5": stage255,
    "2.5.6": stage256,
    "2.5.7": stage257,
  },
  key: (p) => `${p.kind}:${p.dividend.digits}/${p.dividend.decimals}:${p.divisor.digits}/${p.divisor.decimals}`,
});
