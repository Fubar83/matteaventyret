/**
 * Locks in the exact worked examples from the build brief, cell by cell,
 * so a future refactor cannot silently drift from Swedish textbook
 * convention.
 */
import { describe, expect, it } from "vitest";
import { buildGraph as buildAdd } from "../methods/columnAdd";
import { buildGraph as buildSub } from "../methods/columnSub";
import type { Cell } from "../types";

function cell(cells: Cell[], id: string) {
  const c = cells.find((x) => x.id === id);
  if (!c) throw new Error(`no such cell: ${id}`);
  return c;
}

function hasCell(cells: Cell[], id: string): boolean {
  return cells.some((x) => x.id === id);
}

describe("addition: 47 + 38 (one minnessiffra)", () => {
  const graph = buildAdd({ top: 47, bottom: 38 });

  it("ones result is 5, tens minnessiffra is 1, tens result is 8", () => {
    expect(cell(graph.cells, "add-r0").expected).toBe(5);
    expect(cell(graph.cells, "add-c0").expected).toBe(1);
    expect(cell(graph.cells, "add-c0").required).toBe(true);
    expect(cell(graph.cells, "add-r1").expected).toBe(8);
  });

  it("result and carry within a column can be written in either order", () => {
    const r0 = cell(graph.cells, "add-r0");
    const c0 = cell(graph.cells, "add-c0");
    expect(r0.dependsOn).toEqual(c0.dependsOn);
  });
});

describe("subtraction: 52 - 27 (one växling)", () => {
  const graph = buildSub({ top: 52, bottom: 27 });

  it("strikes the tens digit (no reduced value written), borrows 10, and gives 25", () => {
    expect(cell(graph.cells, "sub-strike1").expected).toBe("struck");
    expect(hasCell(graph.cells, "sub-nv1")).toBe(false); // no cell for the reduced value 4 - never written, see columnSub.ts
    expect(cell(graph.cells, "sub-bt0-tens").expected).toBe(1);
    expect(cell(graph.cells, "sub-bt0-ones").expected).toBe(0);
    expect(cell(graph.cells, "sub-r0").expected).toBe(5);
    expect(cell(graph.cells, "sub-r1").expected).toBe(2);
  });
});

describe("subtraction: 1003 - 457 (växling across zeros)", () => {
  const graph = buildSub({ top: 1003, bottom: 457 });

  it("cascades through both zero columns exactly as in the brief", () => {
    expect(cell(graph.cells, "sub-strike3").expected).toBe("struck");
    expect(hasCell(graph.cells, "sub-nv3")).toBe(false); // reduced value 0 - never written

    expect(cell(graph.cells, "sub-strike2").expected).toBe("struck");
    expect(cell(graph.cells, "sub-bt2-tens").expected).toBe(1);
    expect(cell(graph.cells, "sub-bt2-ones").expected).toBe(0);
    expect(cell(graph.cells, "sub-strikebt2").expected).toBe("struck");
    expect(hasCell(graph.cells, "sub-nv2")).toBe(false); // reduced value 9 - never written

    expect(cell(graph.cells, "sub-strike1").expected).toBe("struck");
    expect(cell(graph.cells, "sub-bt1-tens").expected).toBe(1);
    expect(cell(graph.cells, "sub-bt1-ones").expected).toBe(0);
    expect(cell(graph.cells, "sub-strikebt1").expected).toBe("struck");
    expect(hasCell(graph.cells, "sub-nv1")).toBe(false); // reduced value 9 - never written

    expect(cell(graph.cells, "sub-bt0-tens").expected).toBe(1);
    expect(cell(graph.cells, "sub-bt0-ones").expected).toBe(0);
  });

  it("results are 6, 4, 5, and the leading zero is optional", () => {
    expect(cell(graph.cells, "sub-r0").expected).toBe(6);
    expect(cell(graph.cells, "sub-r1").expected).toBe(4);
    expect(cell(graph.cells, "sub-r2").expected).toBe(5);
    expect(cell(graph.cells, "sub-r3").expected).toBe(0);
    expect(cell(graph.cells, "sub-r3").required).toBe(false);
  });
});

describe("subtraction: 713 - 286 (a column both lends and borrows)", () => {
  const graph = buildSub({ top: 713, bottom: 286 });

  it("the tens column lends to the ones column, then itself borrows from the hundreds column", () => {
    // Tens column (col 1) lent to the ones column: 1 -> 0 (never written).
    expect(cell(graph.cells, "sub-strike1").expected).toBe("struck");
    expect(hasCell(graph.cells, "sub-nv1")).toBe(false);
    // Hundreds column (col 2) lent to the tens column: 7 -> 6 (never written).
    expect(cell(graph.cells, "sub-strike2").expected).toBe("struck");
    expect(hasCell(graph.cells, "sub-nv2")).toBe(false);
    // Tens column also receives a borrowed ten for its own subtraction.
    expect(cell(graph.cells, "sub-bt1-tens").expected).toBe(1);
    expect(cell(graph.cells, "sub-bt1-ones").expected).toBe(0);
  });

  it("results are 427", () => {
    expect(cell(graph.cells, "sub-r0").expected).toBe(7);
    expect(cell(graph.cells, "sub-r1").expected).toBe(2);
    expect(cell(graph.cells, "sub-r2").expected).toBe(4);
  });

  it("solves ones-first: borrows from tens before ones' result, then from hundreds before tens' result", () => {
    // Regression test: a column further left must only ever be touched
    // because a column to its right needed to borrow from it - never on its
    // own "turn" before that, which would mean solving high-to-low.
    const order = graph.cells.map((c) => c.id);
    const at = (id: string) => order.indexOf(id);
    expect(at("sub-strike1")).toBeLessThan(at("sub-bt0-tens"));
    expect(at("sub-bt0-ones")).toBeLessThan(at("sub-r0"));
    expect(at("sub-r0")).toBeLessThan(at("sub-strike2"));
    expect(at("sub-strike2")).toBeLessThan(at("sub-bt1-tens"));
    expect(at("sub-bt1-ones")).toBeLessThan(at("sub-r1"));
    expect(at("sub-r1")).toBeLessThan(at("sub-r2"));
  });
});

describe("subtraction: 422 - 298 (double cascading borrow, right to left)", () => {
  const graph = buildSub({ top: 422, bottom: 298 });

  it("borrows from tens for the ones column, then from hundreds for the tens column", () => {
    expect(cell(graph.cells, "sub-strike1").expected).toBe("struck");
    expect(hasCell(graph.cells, "sub-nv1")).toBe(false); // reduced value 1 - never written
    expect(cell(graph.cells, "sub-bt0-tens").expected).toBe(1);
    expect(cell(graph.cells, "sub-bt0-ones").expected).toBe(0);

    expect(cell(graph.cells, "sub-strike2").expected).toBe("struck");
    expect(hasCell(graph.cells, "sub-nv2")).toBe(false); // reduced value 3 - never written
    expect(cell(graph.cells, "sub-bt1-tens").expected).toBe(1);
    expect(cell(graph.cells, "sub-bt1-ones").expected).toBe(0);
  });

  it("results are 124", () => {
    expect(cell(graph.cells, "sub-r0").expected).toBe(4);
    expect(cell(graph.cells, "sub-r1").expected).toBe(2);
    expect(cell(graph.cells, "sub-r2").expected).toBe(1);
  });

  it("solves right to left: ones' whole borrow-and-result happens before hundreds is ever struck", () => {
    const order = graph.cells.map((c) => c.id);
    const at = (id: string) => order.indexOf(id);
    expect(at("sub-strike1")).toBe(0); // the very first thing solved is tens lending to ones, not hundreds
    expect(at("sub-r0")).toBeLessThan(at("sub-strike2"));
    expect(at("sub-strike2")).toBeLessThan(at("sub-r1"));
    expect(at("sub-r1")).toBeLessThan(at("sub-r2"));
  });
});
