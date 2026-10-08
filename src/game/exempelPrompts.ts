import { digitAt } from "../engine/digits";
import { computeSubtractionPlan } from "../engine/methods/columnSub";
import type { Cell, MethodId } from "../engine/types";
import { classifyAdditionCarries } from "../engine/verifier";
import { t } from "../i18n";

/** The actual multiplication carry-in at `col`, recomputed independently (single-digit multiplier only). */
function multiplicationCarryInAt(top: number, multiplier: number, col: number): number {
  let carry = 0;
  for (let i = 0; i < col; i++) {
    const product = digitAt(top, i) * multiplier + carry;
    carry = Math.floor(product / 10);
  }
  return carry;
}

/** One small question per step, e.g. "Hur mycket är 7 + 8?" (see build brief "Exempel"). */
export function exempelPrompt(method: MethodId, cell: Cell, top: number, bottom: number): string {
  const topDigit = digitAt(top, cell.col);
  const bottomDigit = digitAt(bottom, cell.col);

  if (method === "columnAdd") {
    if (cell.type === "carry") return t("exempel.add.carry");
    // A column with an incoming carry must ask about all three addends -
    // otherwise "How much is 3 + 1?" invites an answer that's short by the carry.
    const carryIn = classifyAdditionCarries(top, bottom).columnsWithCarry.includes(cell.col - 1) ? 1 : 0;
    if (carryIn > 0) {
      return t("exempel.add.resultWithCarry", { top: topDigit, bottom: bottomDigit, carry: carryIn });
    }
    return t("exempel.add.result", { top: topDigit, bottom: bottomDigit });
  }

  if (method === "columnMul") {
    // `bottom` is the single-digit multiplier, applied to every column of `top` -
    // unlike addition/subtraction, it is not itself indexed by column.
    if (cell.type === "carry") return t("exempel.mul.carry");
    const carryIn = multiplicationCarryInAt(top, bottom, cell.col);
    if (carryIn > 0) {
      return t("exempel.mul.resultWithCarry", { top: topDigit, bottom, carry: carryIn });
    }
    return t("exempel.mul.result", { top: topDigit, bottom });
  }

  // columnSub
  if (cell.type === "strike") {
    // "6 minus 7 går inte" is about the column that has to borrow, not the one
    // being crossed out to lend it (regression: 36 - 17 said "3 minus 1 går
    // inte"). That's the nearest column to the right that receives a borrowed
    // ten - also across a run of zeros being passed through (1003 - 457).
    // Its value is what it has left - a column that already lent a ten to its
    // own right neighbour has one less than its printed digit (713 - 286: the
    // tens have 0, not 1).
    const plan = computeSubtractionPlan(top, bottom);
    const needing = plan
      .filter((c) => c.col < cell.col && c.receivedBorrow)
      .reduce<(typeof plan)[number] | null>((best, c) => (best === null || c.col > best.col ? c : best), null);
    if (!needing) return t("exempel.sub.strike", { top: topDigit, bottom: bottomDigit });
    return t("exempel.sub.strike", { top: needing.adjustedBase, bottom: needing.bottomDigit });
  }
  if (cell.type === "borrowTen") return t("exempel.sub.borrowTen");
  return t("exempel.sub.result");
}
