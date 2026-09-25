/**
 * columnSub: written column subtraction with växling (uppställning med växling),
 * including cascading borrows across zeros (e.g. 1003 - 457) and columns that
 * both lend to their right neighbour and separately need to borrow from their
 * own left neighbour (e.g. 713 - 286, where the tens column does both).
 *
 * Algorithm, processed ones-first like a child actually works: for each
 * column i, check its current value (its printed digit, reduced by 1 if it
 * already lent to column i-1) against the bottom digit. If it is enough, the
 * column is "plain". Otherwise it borrows: scan leftward for the nearest
 * column whose current value is nonzero. Every zero column passed over
 * receives a ten (written "10"), immediately lends one ten onward, and keeps
 * 9. The lending source (and each zero passed through) is struck, but its
 * reduced value is never written down - only the borrowed "10" itself is
 * (by request: writing the reduced digit, e.g. "7" above a struck 8, is
 * extra bookkeeping a child doesn't need once they've crossed it out).
 * `newValueExpected` in the plan below still tracks that reduced value
 * internally, since the result formula needs it - it's just not a cell.
 *
 * Every non-"result" cell's expected value is a fixed structural constant
 * (0, 1, "struck"), independent of anything else the child writes. Only
 * "result" cells can be a följdfel: a child who correctly subtracts using
 * their OWN (wrong) borrowed-ten has made one original mistake, not two.
 */
import { digitAt, digitsOf } from "../digits";
import type { BuildOptions, Cell, CellGraph, CellValue, CheckReport, Phase, WrittenMap } from "../types";

export interface ColumnSubParams {
  top: number;
  bottom: number;
}

export type LendRole = "source" | "passThrough";

export interface SubColumnPlan {
  col: number;
  printedTop: number;
  bottomDigit: number;
  lentAs?: LendRole;
  newValueExpected?: number; // present iff lentAs is set
  receivedBorrow: boolean;
  adjustedBase: number; // true value feeding the result formula, before adding a borrowed ten
  resultExpected: number;
}

export function computeSubtractionPlan(top: number, bottom: number): SubColumnPlan[] {
  if (top < bottom) {
    throw new Error(`columnSub requires top >= bottom, got ${top} - ${bottom}`);
  }
  const n = digitsOf(top).length;
  const printedTop = Array.from({ length: n }, (_, i) => digitAt(top, i));
  const bottomDigits = Array.from({ length: n }, (_, i) => digitAt(bottom, i));
  const adjusted = printedTop.slice();
  const lentAs: (LendRole | undefined)[] = new Array(n);
  const newValueExpected: number[] = new Array(n);
  const receivedBorrow: boolean[] = new Array(n).fill(false);
  const plan: SubColumnPlan[] = [];

  for (let i = 0; i < n; i++) {
    if (adjusted[i] < bottomDigits[i]) {
      receivedBorrow[i] = true;
      let j = i + 1;
      const passThroughCols: number[] = [];
      while (j < n && adjusted[j] === 0) {
        passThroughCols.push(j);
        j++;
      }
      if (j >= n) {
        // Cannot happen when top >= bottom; guarded so a generator bug fails
        // loudly in development instead of silently mis-teaching.
        throw new Error(`columnSub: no digit to borrow from in ${top} - ${bottom}`);
      }
      lentAs[j] = "source";
      newValueExpected[j] = adjusted[j] - 1;
      adjusted[j] -= 1;
      for (const m of passThroughCols) {
        lentAs[m] = "passThrough";
        newValueExpected[m] = 9;
        adjusted[m] = 9;
      }
    }

    const adjustedBase = lentAs[i] !== undefined ? newValueExpected[i] : printedTop[i];
    const resultExpected = adjustedBase + (receivedBorrow[i] ? 10 : 0) - bottomDigits[i];
    plan.push({
      col: i,
      printedTop: printedTop[i],
      bottomDigit: bottomDigits[i],
      lentAs: lentAs[i],
      newValueExpected: lentAs[i] !== undefined ? newValueExpected[i] : undefined,
      receivedBorrow: receivedBorrow[i],
      adjustedBase,
      resultExpected,
    });
  }

  return plan;
}

const strikeSourceId = (col: number) => `sub-strike${col}`;
const borrowTenTensId = (col: number) => `sub-bt${col}-tens`;
const borrowTenOnesId = (col: number) => `sub-bt${col}-ones`;
const strikeBorrowTenId = (col: number) => `sub-strikebt${col}`;
const resultId = (col: number) => `sub-r${col}`;

export function buildGraph(params: ColumnSubParams, _options?: BuildOptions): CellGraph {
  const plan = computeSubtractionPlan(params.top, params.bottom);
  const cells: Cell[] = [];
  let previousId: string | null = null;
  const chain = (cell: Cell) => {
    cell.dependsOn = previousId ? [previousId] : [];
    cells.push(cell);
    previousId = cell.id;
  };

  // Crosses out a single lending column (source, or a zero passed through on
  // the way to one) - no newValue cell, see module docstring. Each column
  // lends at most once across the whole problem (see the docstring's cascade
  // search), so this never runs twice for the same column.
  const strikeAndReduce = (c: SubColumnPlan) => {
    chain({ id: strikeSourceId(c.col), type: "strike", col: c.col, row: 0, expected: "struck", required: true, dependsOn: [], meta: { strikes: "printedTop" } });
    if (c.lentAs === "passThrough") {
      chain({ id: borrowTenTensId(c.col), type: "borrowTen", col: c.col, row: 0, expected: 1, required: true, dependsOn: [], meta: { part: "tens" } });
      chain({ id: borrowTenOnesId(c.col), type: "borrowTen", col: c.col, row: 0, expected: 0, required: true, dependsOn: [], meta: { part: "ones" } });
      chain({ id: strikeBorrowTenId(c.col), type: "strike", col: c.col, row: 0, expected: "struck", required: true, dependsOn: [], meta: { strikes: "borrowTen" } });
    }
  };

  // Ones first, exactly how a child works the problem: for each column, if it
  // can't subtract directly, look one column left and (if that's a zero) keep
  // looking until a column to actually borrow from is found, striking/reducing
  // that whole cascade right then; only after that is this column's own
  // result computed. This is what makes hundreds-then-tens-then-ones NOT the
  // order here - a column further left is only ever touched because a column
  // to its right needed to borrow from it, not on its own "turn".
  const topColumn = plan.length - 1;
  for (let i = 0; i < plan.length; i++) {
    const c = plan[i];
    if (c.receivedBorrow) {
      let m = i + 1;
      while (plan[m].lentAs === "passThrough") {
        strikeAndReduce(plan[m]);
        m++;
      }
      strikeAndReduce(plan[m]);
      chain({ id: borrowTenTensId(i), type: "borrowTen", col: i, row: 0, expected: 1, required: true, dependsOn: [], meta: { part: "tens" } });
      chain({ id: borrowTenOnesId(i), type: "borrowTen", col: i, row: 0, expected: 0, required: true, dependsOn: [], meta: { part: "ones" } });
    }
    const isLeading = c.col === topColumn;
    const required = !(isLeading && c.resultExpected === 0);
    chain({ id: resultId(i), type: "result", col: i, row: 0, expected: c.resultExpected, required, dependsOn: [] });
  }

  return { cells };
}

export function checkAll(params: ColumnSubParams, written: WrittenMap, phase: Phase = "fritt"): CheckReport {
  const plan = computeSubtractionPlan(params.top, params.bottom);
  const results: CheckReport["results"] = [];
  let errorCount = 0;
  let followOnErrorCount = 0;

  const tally = (status: "correct" | "wrong" | "followOnError" | "unattempted" | "notRequired") => {
    if (status === "wrong") errorCount++;
    if (status === "followOnError") followOnErrorCount++;
  };

  for (let col = plan.length - 1; col >= 0; col--) {
    const c = plan[col];
    if (!c.lentAs) continue;
    results.push(classify(strikeSourceId(col), written[strikeSourceId(col)], "struck", true, tally));
    if (c.lentAs === "passThrough") {
      results.push(classify(borrowTenTensId(col), written[borrowTenTensId(col)], 1, true, tally));
      results.push(classify(borrowTenOnesId(col), written[borrowTenOnesId(col)], 0, true, tally));
      results.push(classify(strikeBorrowTenId(col), written[strikeBorrowTenId(col)], "struck", true, tally));
    }
  }

  for (const c of plan) {
    if (!c.receivedBorrow) continue;
    results.push(classify(borrowTenTensId(c.col), written[borrowTenTensId(c.col)], 1, true, tally));
    results.push(classify(borrowTenOnesId(c.col), written[borrowTenOnesId(c.col)], 0, true, tally));
  }

  const topColumn = plan.length - 1;
  for (const c of plan) {
    const isLeading = c.col === topColumn;
    const required = !(isLeading && c.resultExpected === 0);
    const followOnExpected = followOnResultExpected(c, written);
    results.push(
      classify(resultId(c.col), written[resultId(c.col)], c.resultExpected, required, tally, followOnExpected)
    );
  }

  void phase; // no phase-dependent leniency currently needed here

  return {
    results,
    errorCount,
    followOnErrorCount,
    allCorrect: results.every((r) => r.status === "correct" || r.status === "notRequired"),
  };
}

function followOnResultExpected(c: SubColumnPlan, written: WrittenMap): number {
  // The reduced value after lending (newValueExpected) is never written by the
  // child (see module docstring), so it can't itself be a följdfel source -
  // always the true value here.
  const base = c.lentAs ? c.newValueExpected! : c.printedTop;
  if (!c.receivedBorrow) return base - c.bottomDigit;
  const tens = written[borrowTenTensId(c.col)];
  const ones = written[borrowTenOnesId(c.col)];
  const borrowed = typeof tens === "number" && typeof ones === "number" ? tens * 10 + ones : 10;
  return base + borrowed - c.bottomDigit;
}

function classify(
  cellId: string,
  writtenValue: CellValue | undefined,
  trueExpected: CellValue,
  required: boolean,
  tally: (status: "correct" | "wrong" | "followOnError" | "unattempted" | "notRequired") => void,
  followOnExpected: CellValue = trueExpected
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
