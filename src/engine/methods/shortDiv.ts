/**
 * shortDiv: kort division, single-digit divisor (stages 2.2.1-2.2.4). Liggande
 * stolen (2.2.5-2.2.7, including 2-digit divisors) needs a genuinely
 * different "bracket" board layout - deferred, see build brief "2.2 Skriftlig
 * division".
 *
 * Unlike every other method here, kort division is solved most-significant
 * digit first (left to right): at each column, combine whatever remainder
 * was carried in from the column to the left with this column's own digit,
 * divide, write the quotient digit, and carry the new remainder into the
 * column to the right. A leading zero quotient digit is never written; once
 * any digit has been written (or the ones column is reached), every further
 * digit is, including internal zeros (stage 3: "zero in the quotient").
 *
 * Convention: the remainder carried out of column `col` is displayed as a
 * small digit at column `col - 1` (the column it is about to combine with),
 * per Swedish textbook layout. Divisor is always a single digit, so a
 * carried remainder is always a single digit too - no "tens/ones" pair
 * needed, unlike columnAdd's minnessiffra or columnSub's borrowed ten.
 */
import { digitAt, digitsOf } from "../digits";
import type { BuildOptions, Cell, CellGraph, CellValue, CheckReport, WrittenMap } from "../types";

export interface ShortDivParams {
  dividend: number;
  divisor: number; // single digit, 2-9 (see assertSingleDigitDivisor)
}

export interface DivColumnPlan {
  col: number;
  dividendDigit: number;
  carriedIn: number;
  quotientDigit: number;
  remainderOut: number;
}

function assertSingleDigitDivisor(divisor: number): void {
  if (!Number.isInteger(divisor) || divisor < 2 || divisor > 9) {
    throw new Error(`shortDiv (v1): divisor must be a single digit 2-9, got ${divisor}`);
  }
}

/** Columns are returned most-significant first - the true solving order for this method. */
export function computeShortDivisionPlan(dividend: number, divisor: number): { columns: DivColumnPlan[]; finalRemainder: number } {
  assertSingleDigitDivisor(divisor);
  const n = digitsOf(dividend).length;
  const columns: DivColumnPlan[] = [];
  let carry = 0;
  for (let col = n - 1; col >= 0; col--) {
    const dividendDigit = digitAt(dividend, col);
    const current = carry * 10 + dividendDigit;
    const quotientDigit = Math.floor(current / divisor);
    const remainderOut = current % divisor;
    columns.push({ col, dividendDigit, carriedIn: carry, quotientDigit, remainderOut });
    carry = remainderOut;
  }
  return { columns, finalRemainder: carry };
}

const quotientId = (col: number) => `div-q${col}`;
const remainderId = (col: number) => `div-rem${col}`;
const FINAL_REMAINDER_ID = "div-remFinal";

export function buildGraph(params: ShortDivParams, _options?: BuildOptions): CellGraph {
  const { columns, finalRemainder } = computeShortDivisionPlan(params.dividend, params.divisor);
  const cells: Cell[] = [];
  let previousId: string | null = null;
  const chain = (cell: Cell) => {
    cell.dependsOn = previousId ? [previousId] : [];
    cells.push(cell);
    previousId = cell.id;
  };

  let started = false;
  for (const c of columns) {
    const required = started || c.quotientDigit > 0 || c.col === 0;
    if (required) started = true;
    if (required) {
      chain({ id: quotientId(c.col), type: "quotient", col: c.col, row: 0, expected: c.quotientDigit, required: true, dependsOn: [] });
    }
    if (c.col > 0 && c.remainderOut > 0) {
      chain({
        id: remainderId(c.col - 1),
        type: "remainder",
        col: c.col - 1,
        row: 0,
        expected: c.remainderOut,
        required: true,
        dependsOn: [],
      });
    }
  }

  if (finalRemainder > 0) {
    chain({ id: FINAL_REMAINDER_ID, type: "remainder", col: -1, row: 0, expected: finalRemainder, required: true, dependsOn: [], meta: { final: true } });
  }

  return { cells };
}

/**
 * Checks every quotient digit against the true value, then against the value
 * that follows from the child's own carried-remainder digit, if they wrote
 * one - a quotient digit wrong only because an earlier remainder was
 * mis-copied is a följdfel, not a fresh error. Remainder cells themselves are
 * always structural (never a följdfel target), like columnAdd's carry cells.
 */
export function checkAll(params: ShortDivParams, written: WrittenMap): CheckReport {
  const { divisor } = params;
  const { columns, finalRemainder } = computeShortDivisionPlan(params.dividend, divisor);
  const results: CheckReport["results"] = [];
  let errorCount = 0;
  let followOnErrorCount = 0;

  const remainderWritten = (col: number): number | undefined => {
    const v = written[remainderId(col)];
    return typeof v === "number" ? v : undefined;
  };

  let started = false;
  for (const c of columns) {
    const followOnCarriedIn = c.col === columns[0].col ? 0 : (remainderWritten(c.col) ?? c.carriedIn);
    const followOnCurrent = followOnCarriedIn * 10 + c.dividendDigit;
    const followOnQ = Math.floor(followOnCurrent / divisor);

    const required = started || c.quotientDigit > 0 || c.col === 0;
    if (required) started = true;

    if (required) {
      results.push(
        classify(quotientId(c.col), written[quotientId(c.col)], c.quotientDigit, followOnQ, true, (s) => {
          if (s === "wrong") errorCount++;
          if (s === "followOnError") followOnErrorCount++;
        })
      );
    }
    if (c.col > 0 && c.remainderOut > 0) {
      results.push(
        classify(remainderId(c.col - 1), written[remainderId(c.col - 1)], c.remainderOut, c.remainderOut, true, (s) => {
          if (s === "wrong") errorCount++;
        })
      );
    }
  }

  if (finalRemainder > 0) {
    results.push(
      classify(FINAL_REMAINDER_ID, written[FINAL_REMAINDER_ID], finalRemainder, finalRemainder, true, (s) => {
        if (s === "wrong") errorCount++;
      })
    );
  }

  return {
    results,
    errorCount,
    followOnErrorCount,
    allCorrect: results.every((r) => r.status === "correct" || r.status === "notRequired"),
  };
}

function classify(
  cellId: string,
  writtenValue: CellValue | undefined,
  trueExpected: CellValue,
  followOnExpected: CellValue,
  required: boolean,
  tally: (status: "correct" | "wrong" | "followOnError" | "unattempted" | "notRequired") => void
): CheckReport["results"][number] {
  if (!required) {
    tally("notRequired");
    return { cellId, status: "notRequired" };
  }
  if (writtenValue === undefined) {
    tally("unattempted");
    return { cellId, status: "unattempted" };
  }
  if (writtenValue === trueExpected) {
    tally("correct");
    return { cellId, status: "correct" };
  }
  if (writtenValue === followOnExpected) {
    tally("followOnError");
    return { cellId, status: "followOnError" };
  }
  tally("wrong");
  return { cellId, status: "wrong" };
}
