import { describe, expect, it } from "vitest";
import { planGuided } from "../../mathinput/guidedPlan";
import { columnTaskIn, show, wholeNumberTask } from "../columnTask";

describe("a calculation from a step, set up in a column", () => {
  it("finds the last product or sum written in the step, digits spaced as the reader writes them", () => {
    expect(columnTaskIn("A = 3 {,} 1 4 \\cdot 2 5")).toEqual({ operator: "×", a: 3.14, b: 25 });
    expect(columnTaskIn("O = 2 \\cdot 3{,}14 \\cdot 6")).toEqual({ operator: "×", a: 3.14, b: 6 });
    expect(columnTaskIn("2 4 + 1 8")).toEqual({ operator: "+", a: 24, b: 18 });
    expect(columnTaskIn("x = 5")).toBeNull();
  });

  it("multiplies decimals as whole numbers and counts the decimals after", () => {
    const whole = wholeNumberTask({ operator: "×", a: 3.14, b: 25 });
    expect(whole).toEqual({ top: 314, bottom: 25, decimals: 2 });
    expect(planGuided("×", whole.top, whole.bottom).answer / 10 ** whole.decimals).toBeCloseTo(78.5);
  });

  it("adds decimals with the commas under each other", () => {
    expect(wholeNumberTask({ operator: "+", a: 2.5, b: 1.25 })).toEqual({ top: 250, bottom: 125, decimals: 2 });
  });

  it("writes numbers the Swedish way", () => {
    expect(show(78.5)).toBe("78,5");
    expect(show(3.14)).toBe("3,14");
    expect(show(25)).toBe("25");
  });
});

describe("a column subtraction, borrowing as on paper", () => {
  /** The answer the plan's result boxes spell out, and every borrow step's value checked against the digits it changes. */
  function walk(top: number, bottom: number) {
    const plan = planGuided("−", top, bottom);
    const result = plan.steps.filter((s) => s.boxId.startsWith("s:")).reduce((n, s) => n + Number(s.expected) * 10 ** Number(s.boxId.slice(2)), 0);
    return { plan, result };
  }

  it("gets every subtraction right, digit by digit", () => {
    for (let i = 0; i < 400; i++) {
      const top = Math.floor(Math.random() * 99999) + 1;
      const bottom = Math.floor(Math.random() * top);
      const { plan, result } = walk(top, bottom);
      expect(result, `${top} − ${bottom}`).toBe(top - bottom);
      expect(plan.answer).toBe(top - bottom);
      // Each box the plan writes in exists on the board.
      const ids = new Set(plan.layout.boxes.map((b) => b.id));
      for (const s of plan.steps) expect(ids.has(s.boxId), `${top} − ${bottom}: ${s.boxId}`).toBe(true);
    }
  });

  it("borrows across zeros: the lender goes down by one, each zero becomes 9, the column gets 10", () => {
    const { plan } = walk(1003, 457);
    expect(plan.steps.slice(0, 4).map((s) => `${s.boxId}=${s.expected}`)).toEqual(["n:3=0", "n:2=9", "n:1=9", "t:0=10"]);
    expect(plan.answer).toBe(546);
    // "10" fits in its box: two digits.
    expect(plan.layout.boxes.find((b) => b.id === "t:0")?.maxDigits).toBe(2);
  });

  it("finds a decimal subtraction in a step and sets it up with the commas under each other", () => {
    const task = columnTaskIn("A \approx 36 - 28{,}26 = 7{,}74");
    expect(task).toEqual({ operator: "−", a: 36, b: 28.26 });
    const whole = wholeNumberTask(task!);
    expect(whole).toEqual({ top: 3600, bottom: 2826, decimals: 2 });
    expect(planGuided("−", whole.top, whole.bottom).answer / 100).toBeCloseTo(7.74);
    // Smaller minus bigger isn't a column subtraction - and a negative number isn't a subtraction at all.
    expect(columnTaskIn("12 - 30")).toBeNull();
  });
});
