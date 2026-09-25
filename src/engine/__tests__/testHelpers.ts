import { digitsToNumber } from "../digits";
import type { CellGraph } from "../types";

/** Reconstructs the true final answer from a graph's "result" cells. */
export function assembleAnswer(graph: CellGraph): number {
  const resultCells = graph.cells.filter((c) => c.type === "result");
  const maxCol = Math.max(...resultCells.map((c) => c.col));
  const digits = new Array(maxCol + 1).fill(0);
  for (const c of resultCells) {
    digits[c.col] = typeof c.expected === "number" ? c.expected : 0;
  }
  return digitsToNumber(digits);
}
