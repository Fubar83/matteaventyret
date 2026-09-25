/**
 * Independent verification of generated problems. Deliberately does not
 * import from generator.ts or methods/columnSub.ts: it recomputes answers
 * with plain arithmetic and reclassifies the carry/borrow pattern with its
 * own straightforward column loop, so a bug shared between the generator
 * and this module is unlikely.
 */
import { digitAt, digitsOf } from "./digits";

export interface VerifyResult {
  valid: boolean;
  reason?: string;
}

export function verifyAddition(top: number, bottom: number, expectedAnswer: number): VerifyResult {
  const trueAnswer = top + bottom;
  if (trueAnswer !== expectedAnswer) {
    return { valid: false, reason: `expected ${expectedAnswer}, plain arithmetic gives ${trueAnswer}` };
  }
  return { valid: true };
}

export function verifySubtraction(top: number, bottom: number, expectedAnswer: number): VerifyResult {
  if (top < bottom) {
    return { valid: false, reason: "top must be >= bottom" };
  }
  const trueAnswer = top - bottom;
  if (trueAnswer !== expectedAnswer) {
    return { valid: false, reason: `expected ${expectedAnswer}, plain arithmetic gives ${trueAnswer}` };
  }
  return { valid: true };
}

export interface CarryPattern {
  /** Columns (0 = ones) whose sum, including incoming carry, is 10 or more. */
  columnsWithCarry: number[];
}

export function classifyAdditionCarries(top: number, bottom: number): CarryPattern {
  const n = Math.max(digitsOf(top).length, digitsOf(bottom).length);
  const columnsWithCarry: number[] = [];
  let carry = 0;
  for (let i = 0; i < n; i++) {
    const sum = digitAt(top, i) + digitAt(bottom, i) + carry;
    if (sum >= 10) columnsWithCarry.push(i);
    carry = sum >= 10 ? 1 : 0;
  }
  return { columnsWithCarry };
}

/** Single-digit multiplier only - see columnMul.ts scope note. */
export function verifyMultiplication(top: number, bottom: number, expectedAnswer: number): VerifyResult {
  if (!Number.isInteger(bottom) || bottom < 1 || bottom > 9) {
    return { valid: false, reason: "multiplier must be a single digit 1-9 (v1 scope)" };
  }
  const trueAnswer = top * bottom;
  if (trueAnswer !== expectedAnswer) {
    return { valid: false, reason: `expected ${expectedAnswer}, plain arithmetic gives ${trueAnswer}` };
  }
  return { valid: true };
}

/** Columns (0 = ones) whose product with the single-digit multiplier, including incoming carry, is 10 or more. */
export function classifyMultiplicationCarries(top: number, bottom: number): CarryPattern {
  const n = digitsOf(top).length;
  const columnsWithCarry: number[] = [];
  let carry = 0;
  for (let i = 0; i < n; i++) {
    const product = digitAt(top, i) * bottom + carry;
    if (product >= 10) columnsWithCarry.push(i);
    carry = Math.floor(product / 10);
  }
  return { columnsWithCarry };
}

export interface BorrowPattern {
  /** Columns (0 = ones) that could not subtract directly and needed a växling. */
  columnsWithBorrow: number[];
  /** How many zero columns were crossed while searching for a lender, in total. */
  zeroColumnsCrossed: number;
}

export function classifySubtractionBorrows(top: number, bottom: number): BorrowPattern {
  if (top < bottom) throw new Error("classifySubtractionBorrows requires top >= bottom");
  const n = digitsOf(top).length;
  const adjusted = Array.from({ length: n }, (_, i) => digitAt(top, i));
  const bottomDigits = Array.from({ length: n }, (_, i) => digitAt(bottom, i));
  const columnsWithBorrow: number[] = [];
  let zeroColumnsCrossed = 0;

  for (let i = 0; i < n; i++) {
    if (adjusted[i] < bottomDigits[i]) {
      columnsWithBorrow.push(i);
      let j = i + 1;
      while (j < n && adjusted[j] === 0) {
        adjusted[j] = 9;
        zeroColumnsCrossed++;
        j++;
      }
      if (j < n) adjusted[j] -= 1;
    }
  }
  return { columnsWithBorrow, zeroColumnsCrossed };
}
