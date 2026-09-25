import { describe, expect, it } from "vitest";
import { diagnoseHint } from "../hints";

describe("hint diagnosis", () => {
  it("flags forgetting the minnessiffra: 47 + 38, tens result written as 7 (4+3, no carry), and includes the numbers", () => {
    const hint = diagnoseHint({ method: "columnAdd", cellType: "result", col: 1, top: 47, bottom: 38, writtenValue: 7 });
    expect(hint?.key).toBe("forgot_carry");
    expect(hint?.vars).toEqual({ a: 4, b: 3, carry: 1, sum: 8, withoutCarry: 7 });
  });

  it("explains an ones-column carry the first time it appears: 47 + 38, ones result", () => {
    const hint = diagnoseHint({ method: "columnAdd", cellType: "result", col: 0, top: 47, bottom: 38, writtenValue: undefined });
    expect(hint?.key).toBe("ones_over_ten");
    expect(hint?.vars).toEqual({ a: 7, b: 8, carry: 0, sum: 15, tens: 1, ones: 5 });
  });

  it("uses the carry-aware key and includes the incoming carry when a later column also overflows", () => {
    // 468 + 357: tens column (col 1) is 6+5=11, plus a carry of 1 from the ones column (8+7=15).
    const hint = diagnoseHint({ method: "columnAdd", cellType: "result", col: 1, top: 468, bottom: 357, writtenValue: undefined });
    expect(hint?.key).toBe("ones_over_ten_carry");
    expect(hint?.vars).toEqual({ a: 6, b: 5, carry: 1, sum: 12, tens: 1, ones: 2 });
  });

  it("prompts to write the minnessiffra when the carry cell is due, with the sum spelled out", () => {
    const hint = diagnoseHint({ method: "columnAdd", cellType: "carry", col: 0, top: 47, bottom: 38, writtenValue: undefined });
    expect(hint?.key).toBe("carry_write");
    expect(hint?.vars).toEqual({ a: 7, b: 8, carry: 0, sum: 15, tens: 1, ones: 5 });
  });

  it("prompts växling when a subtraction column can't subtract directly, with both digits", () => {
    const hint = diagnoseHint({ method: "columnSub", cellType: "strike", col: 1, top: 52, bottom: 27, writtenValue: undefined });
    expect(hint?.key).toBe("need_vaxling");
    expect(hint?.vars).toEqual({ a: 2, b: 7 });
  });

  it("flags borrowing from zero when the lender column is itself 0", () => {
    const hint = diagnoseHint({ method: "columnSub", cellType: "strike", col: 1, top: 103, bottom: 57, writtenValue: undefined });
    expect(hint?.key).toBe("borrow_from_zero");
  });

  it("references the actually-deficient column, not the strike cell's own column: 1003 - 457", () => {
    // Striking the thousands digit (col 3) ultimately serves the ones column (3 vs 7), not "1 vs 0".
    const hint = diagnoseHint({ method: "columnSub", cellType: "strike", col: 3, top: 1003, bottom: 457, writtenValue: undefined });
    expect(hint?.key).toBe("need_vaxling");
    expect(hint?.vars).toEqual({ a: 3, b: 7 });
  });

  it("references the right receiver when a column both lends and separately borrows: 713 - 286", () => {
    // Column 1 (tens) lends to column 0, then separately borrows from column 2.
    // Its own strike (lending to column 0) should reference column 0's digits (3 vs 6), not its own (1 vs 8).
    const lendHint = diagnoseHint({ method: "columnSub", cellType: "strike", col: 1, top: 713, bottom: 286, writtenValue: undefined });
    expect(lendHint?.key).toBe("need_vaxling");
    expect(lendHint?.vars).toEqual({ a: 3, b: 6 });

    // Column 1's own borrowTen (receiving from column 2) should reference its own digits (0 vs 8, its adjusted top after lending is 0).
    const receiveHint = diagnoseHint({ method: "columnSub", cellType: "borrowTen", col: 1, top: 713, bottom: 286, writtenValue: undefined });
    expect(receiveHint?.key).toBe("need_vaxling");
    expect(receiveHint?.vars).toEqual({ a: 1, b: 8 });
  });

  it("diagnoses subtracting smaller-from-larger: top 2, bottom 8 (true 4, wrong-way 6)", () => {
    const hint = diagnoseHint({ method: "columnSub", cellType: "result", col: 0, top: 42, bottom: 38, writtenValue: 6 });
    expect(hint?.key).toBe("subtracted_smaller_from_larger");
    expect(hint?.vars).toEqual({ a: 2, b: 8, wrongWay: 6, correct: 4 });
  });

  it("returns null when the written value matches no known misconception", () => {
    const hint = diagnoseHint({ method: "columnSub", cellType: "result", col: 0, top: 42, bottom: 38, writtenValue: 9 });
    expect(hint).toBeNull();
  });
});
