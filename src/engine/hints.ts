/**
 * Error diagnosis: maps a wrong (or about-to-be-explained) cell to a hint
 * key plus the concrete numbers involved. Hint KEYS (and which numbers they
 * need) are code; the actual Swedish/English wording lives in i18n data,
 * never here (see build brief: "stored in curriculum data, not code") - the
 * numbers are filled into that wording via i18n's {placeholder} interpolation
 * so every hint can show the real arithmetic, not just a vague pointer.
 */
import { digitAt } from "./digits";
import { computeSubtractionPlan } from "./methods/columnSub";
import { classifyAdditionCarries } from "./verifier";
import type { CellType, CellValue } from "./types";

export type HintKey =
  | "ones_over_ten" // "7 + 8 = 15. Det är 1 tiotal och 5 ental. ..." (no incoming carry)
  | "ones_over_ten_carry" // same, but a carry from the previous column is also in the sum
  | "carry_write" // "7 + 8 = 15. Det blir 1 tiotal över - skriv en liten 1:a ..."
  | "forgot_carry" // column result is exactly 1 too low: minnessiffra was dropped
  | "need_vaxling" // "2 − 7 går inte (2 är mindre än 7). Växla ett tiotal ..."
  | "borrow_from_zero" // "Nollan har inga tiotal att ge. Gå ett steg till vänster först."
  | "subtracted_smaller_from_larger" // known misconception: bottom - top instead of borrowing
  | "digit_times_over_ten" // "3 · 6 = 18. Det är 1 tiotal och 8 ental. ..." (no incoming carry)
  | "digit_times_over_ten_carry" // same, but a carry from the previous column is also added in
  | "mul_carry_write" // "3 · 6 = 18. Det blir 1 tiotal över - skriv en liten 1:a ..."
  | "forgot_mul_carry"; // column result is short by exactly the minnessiffra: it was dropped

export interface HintContext {
  method: "columnAdd" | "columnSub" | "columnMul";
  cellType: CellType;
  col: number;
  top: number;
  bottom: number;
  writtenValue: CellValue | undefined;
}

/** The actual multiplication carry-in at `col`, recomputed independently (single-digit multiplier only). */
function multiplicationCarryInAt(top: number, multiplier: number, col: number): number {
  let carry = 0;
  for (let i = 0; i < col; i++) {
    const product = digitAt(top, i) * multiplier + carry;
    carry = Math.floor(product / 10);
  }
  return carry;
}

export interface HintResult {
  key: HintKey;
  vars: Record<string, number>;
}

export function diagnoseHint(ctx: HintContext): HintResult | null {
  const { method, cellType, col, top, bottom, writtenValue } = ctx;

  if (method === "columnAdd") {
    const { columnsWithCarry } = classifyAdditionCarries(top, bottom);
    const carryIn = columnsWithCarry.includes(col - 1) ? 1 : 0;
    const thisColumnCarries = columnsWithCarry.includes(col);
    const topDigit = digitAt(top, col);
    const bottomDigit = digitAt(bottom, col);
    const sum = topDigit + bottomDigit + carryIn;

    if (cellType === "carry") {
      if (!thisColumnCarries) return null;
      return { key: "carry_write", vars: { a: topDigit, b: bottomDigit, carry: carryIn, sum, tens: Math.floor(sum / 10), ones: sum % 10 } };
    }
    if (cellType === "result") {
      if (carryIn > 0 && typeof writtenValue === "number") {
        const withoutCarry = (topDigit + bottomDigit) % 10;
        if (writtenValue === withoutCarry) {
          return { key: "forgot_carry", vars: { a: topDigit, b: bottomDigit, carry: carryIn, sum, withoutCarry } };
        }
      }
      if (thisColumnCarries) {
        const vars = { a: topDigit, b: bottomDigit, carry: carryIn, sum, tens: Math.floor(sum / 10), ones: sum % 10 };
        return carryIn > 0 ? { key: "ones_over_ten_carry", vars } : { key: "ones_over_ten", vars };
      }
    }
    return null;
  }

  if (method === "columnMul") {
    // `bottom` is the single-digit multiplier, applied to every column of `top`.
    const multiplier = bottom;
    const carryIn = multiplicationCarryInAt(top, multiplier, col);
    const topDigit = digitAt(top, col);
    const product = topDigit * multiplier + carryIn;
    const thisColumnCarries = product >= 10;

    if (cellType === "carry") {
      if (!thisColumnCarries) return null;
      return {
        key: "mul_carry_write",
        vars: { a: topDigit, b: multiplier, carry: carryIn, product, tens: Math.floor(product / 10), ones: product % 10 },
      };
    }
    if (cellType === "result") {
      if (carryIn > 0 && typeof writtenValue === "number") {
        const withoutCarry = (topDigit * multiplier) % 10;
        if (writtenValue === withoutCarry) {
          return { key: "forgot_mul_carry", vars: { a: topDigit, b: multiplier, carry: carryIn, product, withoutCarry } };
        }
      }
      if (thisColumnCarries) {
        const vars = { a: topDigit, b: multiplier, carry: carryIn, product, tens: Math.floor(product / 10), ones: product % 10 };
        return carryIn > 0 ? { key: "digit_times_over_ten_carry", vars } : { key: "digit_times_over_ten", vars };
      }
    }
    return null;
  }

  // columnSub: strike/borrowTen cells sit at the LENDING/receiving column,
  // which is often not the column that is actually deficient (e.g. striking
  // the hundreds digit to resolve a shortfall in the ones column) - find the
  // real deficient column so the hint's numbers make sense.
  const plan = computeSubtractionPlan(top, bottom);
  if (cellType === "strike") {
    if (digitAt(top, col) === 0) {
      // A zero passthrough column being struck: it has nothing of its own to lend.
      return { key: "borrow_from_zero", vars: {} };
    }
    const receiver = nearestReceiverBefore(plan, col);
    if (!receiver) return null;
    return { key: "need_vaxling", vars: { a: receiver.printedTop, b: receiver.bottomDigit } };
  }
  if (cellType === "borrowTen") {
    const receiver = plan[col];
    return { key: "need_vaxling", vars: { a: receiver.printedTop, b: receiver.bottomDigit } };
  }

  if (cellType === "result" && typeof writtenValue === "number") {
    const topDigit = digitAt(top, col);
    const bottomDigit = digitAt(bottom, col);
    if (topDigit < bottomDigit && writtenValue === Math.abs(bottomDigit - topDigit)) {
      const correct = 10 + topDigit - bottomDigit;
      return { key: "subtracted_smaller_from_larger", vars: { a: topDigit, b: bottomDigit, wrongWay: writtenValue, correct } };
    }
  }
  return null;
}

function nearestReceiverBefore(plan: ReturnType<typeof computeSubtractionPlan>, col: number) {
  for (let i = col - 1; i >= 0; i--) {
    if (plan[i].receivedBorrow) return plan[i];
  }
  return null;
}
