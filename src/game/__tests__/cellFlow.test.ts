import { describe, expect, it } from "vitest";
import { buildGraph } from "../../engine/methods/columnAdd";
import { readyCells } from "../../engine/arithmetic";
import type { WrittenMap } from "../../engine/types";
import { buildGraph as buildMulGraph } from "../../engine/methods/columnMul";
import { buildGraph as buildSubGraph } from "../../engine/methods/columnSub";
import { resolveImplicitlyReady, tensCellFor } from "../cellFlow";

describe("resolveImplicitlyReady", () => {
  it("lets a later required column become ready even though the previous column's un-needed carry is never written", () => {
    // 12 + 34: no carry anywhere, so every carry cell is not-required.
    const graph = buildGraph({ top: 12, bottom: 34 });
    const written: WrittenMap = { "add-r0": 6 }; // only the ones result has been written

    const readyPlain = readyCells(graph, written).filter((c) => c.required);
    expect(readyPlain.some((c) => c.id === "add-r1")).toBe(false); // the bug: blocked without the fix

    const implicit = resolveImplicitlyReady(graph, written);
    expect(implicit["add-c0"]).toBe(0); // carry silently resolved...
    expect(written["add-c0"]).toBeUndefined(); // ...but never actually shown as written

    const readyFixed = readyCells(graph, implicit).filter((c) => c.required);
    expect(readyFixed.some((c) => c.id === "add-r1")).toBe(true);
  });

  it("does not touch required cells or cells with unmet dependencies", () => {
    const graph = buildGraph({ top: 47, bottom: 38 }); // has a real carry at column 0
    const implicit = resolveImplicitlyReady(graph, {});
    expect(implicit["add-c0"]).toBeUndefined(); // required cells are the child's job, never auto-filled
    expect(implicit["add-r1"]).toBeUndefined(); // depends on add-c0, which is still unwritten
  });
});

describe("tensCellFor (writing a whole column sum, e.g. '15', into a result box)", () => {
  const cell = (graph: ReturnType<typeof buildGraph>, id: string) => graph.cells.find((c) => c.id === id)!;

  it("sends the tens digit to that column's minnessiffra (576 + 25: ones 6 + 5 = 11)", () => {
    const g = buildGraph({ top: 576, bottom: 25 });
    expect(tensCellFor(g, cell(g, "add-r0"))?.id).toBe("add-c0");
  });

  it("sends it to the overflow result digit in the last column (57 + 68: tens 5 + 6 + 1 = 12)", () => {
    const g = buildGraph({ top: 57, bottom: 68 });
    expect(tensCellFor(g, cell(g, "add-r1"))?.id).toBe("add-r2");
  });

  it("works the same for multiplication by one digit (47 · 6: ones 7 · 6 = 42)", () => {
    const g = buildMulGraph({ top: 47, bottom: 6 });
    expect(tensCellFor(g, cell(g, "mul-r0"))?.id).toBe("mul-c0");
  });

  it("has no tens cell in subtraction, nor for a carry cell itself", () => {
    const sub = buildSubGraph({ top: 52, bottom: 17 });
    expect(tensCellFor(sub, cell(sub, "sub-r0"))).toBeNull();
    const add = buildGraph({ top: 57, bottom: 68 });
    expect(tensCellFor(add, cell(add, "add-c0"))).toBeNull();
  });
});
