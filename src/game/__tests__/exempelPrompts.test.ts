import { describe, expect, it } from "vitest";
import { buildGraph } from "../../engine/methods/columnAdd";
import { exempelPrompt } from "../exempelPrompts";

describe("exempelPrompt", () => {
  it("asks about just the two digits when the column has no incoming carry", () => {
    // 31 + 19: ones column (7+... actually 1+9=10, has its own carry, but no incoming carry).
    const graph = buildGraph({ top: 31, bottom: 19 });
    const ones = graph.cells.find((c) => c.id === "add-r0")!;
    expect(exempelPrompt("columnAdd", ones, 31, 19)).toBe("Hur mycket är 1 + 9?");
  });

  it("includes the incoming carry so the question matches the expected answer: 31 + 19, tens column", () => {
    // Tens column is 3 + 1, but the true expected result also adds the carry from the ones column (1), giving 5.
    const graph = buildGraph({ top: 31, bottom: 19 });
    const tens = graph.cells.find((c) => c.id === "add-r1")!;
    const prompt = exempelPrompt("columnAdd", tens, 31, 19);
    expect(prompt).toContain("1");
    expect(prompt).toBe("Hur mycket är 1 (minnessiffran) + 3 + 1?");
    // And that answer must match the cell's actual expected value.
    expect(tens.expected).toBe(1 + 3 + 1);
  });
});
