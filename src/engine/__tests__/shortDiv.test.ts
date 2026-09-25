import { describe, expect, it } from "vitest";
import { buildGraph, checkAll } from "../methods/shortDiv";
import type { Cell } from "../types";

function cell(cells: Cell[], id: string) {
  const c = cells.find((x) => x.id === id);
  if (!c) throw new Error(`no such cell: ${id}`);
  return c;
}

function hasCell(cells: Cell[], id: string): boolean {
  return cells.some((x) => x.id === id);
}

describe("shortDiv: 684 / 2 (no minnesrest)", () => {
  const graph = buildGraph({ dividend: 684, divisor: 2 });

  it("quotient digits are 3, 4, 2 - no carried remainder anywhere", () => {
    expect(cell(graph.cells, "div-q2").expected).toBe(3);
    expect(cell(graph.cells, "div-q1").expected).toBe(4);
    expect(cell(graph.cells, "div-q0").expected).toBe(2);
    expect(hasCell(graph.cells, "div-rem1")).toBe(false);
    expect(hasCell(graph.cells, "div-rem0")).toBe(false);
    expect(hasCell(graph.cells, "div-remFinal")).toBe(false);
  });

  it("solves most-significant digit first", () => {
    const order = graph.cells.map((c) => c.id);
    expect(order).toEqual(["div-q2", "div-q1", "div-q0"]);
  });

  it("checkAll accepts the true answer", () => {
    const report = checkAll({ dividend: 684, divisor: 2 }, { "div-q2": 3, "div-q1": 4, "div-q0": 2 });
    expect(report.allCorrect).toBe(true);
    expect(report.errorCount).toBe(0);
  });
});

describe("shortDiv: 852 / 4 (one carried remainder)", () => {
  const graph = buildGraph({ dividend: 852, divisor: 4 });

  it("hundreds gives 2 with no remainder; tens gives 1 with remainder 1 carried into ones; ones gives 3", () => {
    expect(cell(graph.cells, "div-q2").expected).toBe(2);
    expect(hasCell(graph.cells, "div-rem1")).toBe(false); // hundreds' own remainder is 0
    expect(cell(graph.cells, "div-q1").expected).toBe(1);
    expect(cell(graph.cells, "div-rem0").expected).toBe(1); // the "1" carried into the ones column
    expect(cell(graph.cells, "div-q0").expected).toBe(3);
  });

  it("solves in the order a child writes it: q2, q1, rem0 (the carried 1), q0", () => {
    const order = graph.cells.map((c) => c.id);
    expect(order).toEqual(["div-q2", "div-q1", "div-rem0", "div-q0"]);
  });

  it("answer is 213", () => {
    const report = checkAll({ dividend: 852, divisor: 4 }, { "div-q2": 2, "div-q1": 1, "div-rem0": 1, "div-q0": 3 });
    expect(report.allCorrect).toBe(true);
  });
});

describe("shortDiv: 624 / 6 (zero in the quotient)", () => {
  const graph = buildGraph({ dividend: 624, divisor: 6 });

  it("tens digit is a required 0, not skipped - it isn't a leading zero", () => {
    expect(cell(graph.cells, "div-q2").expected).toBe(1);
    expect(cell(graph.cells, "div-q1").expected).toBe(0);
    expect(cell(graph.cells, "div-q1").required).toBe(true);
    expect(cell(graph.cells, "div-rem0").expected).toBe(2); // 2 tens carried as 20 into the ones column
    expect(cell(graph.cells, "div-q0").expected).toBe(4);
  });

  it("answer is 104", () => {
    const report = checkAll({ dividend: 624, divisor: 6 }, { "div-q2": 1, "div-q1": 0, "div-rem0": 2, "div-q0": 4 });
    expect(report.allCorrect).toBe(true);
  });
});

describe("shortDiv: 157 / 5 (leading zero skipped, final remainder)", () => {
  const graph = buildGraph({ dividend: 157, divisor: 5 });

  it("the hundreds column's quotient digit (0) is never written - it's a leading zero", () => {
    expect(hasCell(graph.cells, "div-q2")).toBe(false);
    expect(cell(graph.cells, "div-rem1").expected).toBe(1); // the hundreds' 1, carried into the tens column
    expect(cell(graph.cells, "div-q1").expected).toBe(3);
    expect(cell(graph.cells, "div-q0").expected).toBe(1);
    expect(cell(graph.cells, "div-remFinal").expected).toBe(2);
  });

  it("solves as: rem1 (the leading 1, carried silently), q1, q0, remFinal", () => {
    const order = graph.cells.map((c) => c.id);
    expect(order).toEqual(["div-rem1", "div-q1", "div-q0", "div-remFinal"]);
  });

  it("answer is 31 remainder 2", () => {
    const report = checkAll({ dividend: 157, divisor: 5 }, { "div-rem1": 1, "div-q1": 3, "div-q0": 1, "div-remFinal": 2 });
    expect(report.allCorrect).toBe(true);
  });
});

describe("shortDiv followdfel", () => {
  it("a wrong carried remainder propagates into the next quotient digit as a följdfel", () => {
    // 852 / 4: true remainder carried into ones is 1, true ones quotient is 3.
    // The child writes the carried remainder as 2 (wrong), then correctly
    // computes floor((2*10+2)/4) = 5 using their own wrong carry.
    const report = checkAll({ dividend: 852, divisor: 4 }, { "div-q2": 2, "div-q1": 1, "div-rem0": 2, "div-q0": 5 });
    const rem = report.results.find((r) => r.cellId === "div-rem0")!;
    const q0 = report.results.find((r) => r.cellId === "div-q0")!;
    expect(rem.status).toBe("wrong");
    expect(q0.status).toBe("followOnError");
    expect(report.errorCount).toBe(1);
    expect(report.followOnErrorCount).toBe(1);
  });
});
