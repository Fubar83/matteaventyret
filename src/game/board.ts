/**
 * Presentation-only helpers that turn an engine CellGraph into something a
 * React component can lay out. No maths lives here - only grouping and
 * ordering decisions for the uppställning board.
 */
import { digitAt } from "../engine/digits";
import type { Cell, CellGraph } from "../engine/types";

export interface TenSlot {
  kind: "ten";
  tens: Cell;
  ones: Cell;
  /** The strike cell that, once written, draws a line across this "10" (null if this ten is never struck). */
  strikeCell: Cell | null;
}
export interface SingleSlot {
  kind: "single";
  cell: Cell;
}
export type AnnotationSlot = TenSlot | SingleSlot;

export interface ColumnDisplay {
  col: number;
  /** Small cells shown above the digit rows, ordered bottom-to-top (earliest written first). */
  annotations: AnnotationSlot[];
  topDigit: number | null;
  /** The strike cell that, once written, draws a line across the printed top digit (null if it is never struck). */
  topStrikeCell: Cell | null;
  bottomDigit: number | null;
  resultCell: Cell | null;
}

export function buildColumns(graph: CellGraph, top: number, bottom: number): ColumnDisplay[] {
  const maxCol = Math.max(0, ...graph.cells.map((c) => c.col));
  const columns: ColumnDisplay[] = [];

  for (let col = maxCol; col >= 0; col--) {
    const cellsHere = graph.cells.filter((c) => c.col === col);
    const resultCell = cellsHere.find((c) => c.type === "result") ?? null;
    const strikeOnTop = cellsHere.find((c) => c.type === "strike" && c.meta?.strikes === "printedTop");
    const strikeOnBorrowTen = cellsHere.find((c) => c.type === "strike" && c.meta?.strikes === "borrowTen");
    const boxCells = cellsHere.filter((c) => c.type !== "result" && c.type !== "strike");

    const annotations: AnnotationSlot[] = [];
    for (let i = 0; i < boxCells.length; i++) {
      const cell = boxCells[i];
      if (cell.type === "borrowTen" && cell.meta?.part === "tens") {
        const onesCell = boxCells[i + 1];
        if (onesCell?.type === "borrowTen" && onesCell.meta?.part === "ones") {
          annotations.push({ kind: "ten", tens: cell, ones: onesCell, strikeCell: strikeOnBorrowTen ?? null });
          i++;
          continue;
        }
      }
      annotations.push({ kind: "single", cell });
    }

    columns.push({
      col,
      annotations,
      topDigit: digitExists(top, col) ? digitAt(top, col) : null,
      topStrikeCell: strikeOnTop ?? null,
      bottomDigit: digitExists(bottom, col) ? digitAt(bottom, col) : null,
      resultCell,
    });
  }

  return columns;
}

function digitLength(n: number): number {
  return n === 0 ? 1 : Math.floor(Math.log10(n)) + 1;
}

function digitExists(n: number, col: number): boolean {
  return col < digitLength(n);
}
