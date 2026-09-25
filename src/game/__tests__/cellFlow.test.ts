import { describe, expect, it } from "vitest";
import { buildGraph } from "../../engine/methods/columnAdd";
import { readyCells } from "../../engine/arithmetic";
import type { WrittenMap } from "../../engine/types";
import { resolveImplicitlyReady } from "../cellFlow";

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
