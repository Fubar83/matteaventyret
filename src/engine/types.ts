/**
 * Core types for the maths engine. This module has no UI dependency and
 * no floating-point arithmetic: every quantity is an exact integer.
 *
 * The cell-type union covers every method in the build brief (addition,
 * subtraction, multiplication, short division, long division) so plugins
 * added later do not require changing this file. Only "columnAdd" and
 * "columnSub" are implemented in version 1; the rest are typed stubs.
 */

/** Every kind of writable/strikeable square that can appear on the board. */
export type CellType =
  | "result" // result digit (all methods)
  | "carry" // minnessiffra (addition, multiplication)
  | "strike" // strike-through on a printed digit or on a written "10" (subtraction)
  | "newValue" // reduced/kept value written above a struck digit (subtraction)
  | "borrowTen" // one digit ('1' or '0') of a borrowed ten, written above the receiving column
  | "partialProduct" // one digit of a partial-product row (multiplication)
  | "placeholderZero" // placeholder zero at the start of a partial row (multiplication)
  | "quotient" // quotient digit (short/long division)
  | "remainder" // minnesrest / final remainder digit
  | "productRow" // liggande stolen: product-row digit
  | "difference" // liggande stolen: difference digit
  | "broughtDown"; // liggande stolen: brought-down digit

/** A digit 0-9, or the "struck" marker for strike-through cells. */
export type CellValue = number | "struck";

/** Method identifiers. Only columnAdd/columnSub have real plugins in v1. */
export type MethodId = "columnAdd" | "columnSub" | "columnMul" | "shortDiv" | "longDiv";

export type Phase = "guidat" | "egenOrdning" | "fritt";

export interface Cell {
  /** Unique within the problem's cell graph. */
  id: string;
  type: CellType;
  /** Place-value column, 0 = ones, increasing leftward. */
  col: number;
  /** Row index, for multi-row methods (multiplication partial products). 0 for addition/subtraction. */
  row: number;
  /**
   * The correct value. `null` means the cell has no meaningful expected
   * value to write (e.g. a minnessiffra column where no carry occurred);
   * such cells are never scored.
   */
  expected: CellValue | null;
  /** Whether an empty or wrong value here counts as an error at check time. */
  required: boolean;
  /** Cell ids that must be written before this cell is "ready" in Guidat/Egen ordning. */
  dependsOn: string[];
  /** Optional i18n key for a Guidat prompt specific to this cell. */
  promptKey?: string;
  /** Free-form metadata for method-specific rendering (e.g. which half of a borrowed ten). */
  meta?: Record<string, unknown>;
}

export interface CellGraph {
  cells: Cell[];
}

export type WrittenMap = Record<string, CellValue>;
export type AttemptsMap = Record<string, number>;

export interface ProblemState {
  method: MethodId;
  /** Method-specific operands, e.g. { top, bottom } for column methods. */
  operands: Record<string, number>;
  graph: CellGraph;
  written: WrittenMap;
  phase: Phase;
  attempts: AttemptsMap;
  /** Ids of cells solved via the mini-tutorial (counts as "helped", never an error at scoring time). */
  helped: string[];
}

export interface BuildOptions {
  /** Order the minnessiffra and result digit are expected within a column. Default "resultFirst". */
  carryOrder?: "resultFirst" | "carryFirst";
}

export interface MethodPlugin<Params> {
  id: MethodId;
  buildGraph(params: Params, options?: BuildOptions): CellGraph;
}

/** Result of checking a single cell against the true expected value. */
export interface CellCheckResult {
  cellId: string;
  status: "correct" | "wrong" | "followOnError" | "unattempted" | "notRequired";
}

export interface CheckReport {
  results: CellCheckResult[];
  /** Original errors only (excludes följdfel and non-required cells) — what stars are scored on. */
  errorCount: number;
  followOnErrorCount: number;
  allCorrect: boolean;
}
