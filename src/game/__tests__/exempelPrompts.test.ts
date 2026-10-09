import { describe, expect, it } from "vitest";
import { buildGraph } from "../../engine/methods/columnAdd";
import { buildGraph as buildSubGraph } from "../../engine/methods/columnSub";
import { exempelPrompt } from "../questions/column/exempelPrompts";

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

describe("exempelPrompt for crossing out (subtraction)", () => {
  const strikePrompt = (top: number, bottom: number, strikeId: string) => {
    const cell = buildSubGraph({ top, bottom }).cells.find((c) => c.id === strikeId)!;
    return exempelPrompt("columnSub", cell, top, bottom);
  };

  it("names the column that has to borrow, not the one being crossed out (regression: 36 - 17 said '3 minus 1 går inte')", () => {
    expect(strikePrompt(36, 17, "sub-strike1")).toBe("6 minus 7 går inte. Växla en tia från grannen till vänster.");
  });

  it("across zeros, every crossing-out is about the column that started the borrowing (1003 - 457: the ones)", () => {
    for (const id of ["sub-strike1", "sub-strike2", "sub-strike3"]) {
      expect(strikePrompt(1003, 457, id)).toBe("3 minus 7 går inte. Växla en tia från grannen till vänster.");
    }
  });

  it("a column that lends and later borrows itself (713 - 286): the hundreds are crossed out for the tens", () => {
    expect(strikePrompt(713, 286, "sub-strike2")).toBe("0 minus 8 går inte. Växla en tia från grannen till vänster.");
  });
});
