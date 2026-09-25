/**
 * Method-agnostic entry points used by the UI: build a cell graph, check a
 * single cell immediately (Guidat/Egen ordning), check everything at once
 * with följdfel (Fritt's "Rätta"), and compute which cells are ready to
 * write next. All methods plug in here; only columnAdd/columnSub exist yet.
 */
import * as columnAdd from "./methods/columnAdd";
import * as columnMul from "./methods/columnMul";
import * as columnSub from "./methods/columnSub";
import type { BuildOptions, Cell, CellGraph, CellValue, CheckReport, MethodId, Phase, WrittenMap } from "./types";

export function buildGraph(method: MethodId, operands: Record<string, number>, options?: BuildOptions): CellGraph {
  switch (method) {
    case "columnAdd":
      return columnAdd.buildGraph({ top: operands.top, bottom: operands.bottom }, options);
    case "columnSub":
      return columnSub.buildGraph({ top: operands.top, bottom: operands.bottom }, options);
    case "columnMul":
      return columnMul.buildGraph({ top: operands.top, bottom: operands.bottom }, options);
    default:
      throw new Error(`No plugin implemented yet for method "${method}" (v1 only ships columnAdd/columnSub/columnMul)`);
  }
}

export function checkAll(
  method: MethodId,
  operands: Record<string, number>,
  written: WrittenMap,
  phase: Phase = "fritt"
): CheckReport {
  switch (method) {
    case "columnAdd":
      return columnAdd.checkAll({ top: operands.top, bottom: operands.bottom }, written);
    case "columnSub":
      return columnSub.checkAll({ top: operands.top, bottom: operands.bottom }, written, phase);
    case "columnMul":
      return columnMul.checkAll({ top: operands.top, bottom: operands.bottom }, written);
    default:
      throw new Error(`No plugin implemented yet for method "${method}" (v1 only ships columnAdd/columnSub/columnMul)`);
  }
}

/** A cell is ready once every cell it depends on has been written (any value). */
export function isReady(cell: Cell, written: WrittenMap): boolean {
  return cell.dependsOn.every((id) => written[id] !== undefined);
}

/** Cells not yet written whose dependencies are all satisfied. */
export function readyCells(graph: CellGraph, written: WrittenMap): Cell[] {
  return graph.cells.filter((c) => written[c.id] === undefined && isReady(c, written));
}

/** Immediate per-cell check, used in Guidat and Egen ordning (no följdfel there). */
export function checkCell(cell: Cell, value: CellValue): "correct" | "wrong" | "notRequired" {
  if (!cell.required || cell.expected === null) return "notRequired";
  return value === cell.expected ? "correct" : "wrong";
}
