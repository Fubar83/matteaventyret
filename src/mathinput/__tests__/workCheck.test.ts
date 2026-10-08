import { describe, expect, it } from "vitest";
import { parseExpression } from "../evaluate";
import { checkWrittenAnswer, numbersIn } from "../workCheck";

const lines = (...rows: string[]) => (rows.length === 1 ? rows[0] : `\\begin{gathered} ${rows.join(" \\\\ ")} \\end{gathered}`);
const expr = (latex: string) => parseExpression(latex)!;

describe("a number as the answer", () => {
  const mean = { kind: "value" as const, value: 12 };

  it("just the answer: right, but no setup (★★)", () => {
    expect(checkWrittenAnswer("1 2", mean)).toEqual({ correct: true, fullSetup: false, badLines: [] });
  });

  it("the calculation, then the answer (★★★)", () => {
    const work = lines("1 2 + 1 5 + 9 = 3 6", "3 6 / 3 = 1 2");
    expect(checkWrittenAnswer(work, mean)).toEqual({ correct: true, fullSetup: true, badLines: [] });
  });

  it("one line, as a fraction", () => {
    expect(checkWrittenAnswer("\\frac{1 2 + 1 5 + 9}{3} = 1 2", mean).fullSetup).toBe(true);
  });

  it("a line continued with '='", () => {
    // "= 1 2" continues the 36 above: the answer is right, the step "36 = 12" isn't.
    expect(checkWrittenAnswer(lines("1 2 + 1 5 + 9", "= 3 6", "= 1 2"), mean)).toEqual({ correct: true, fullSetup: false, badLines: [2] });
    expect(checkWrittenAnswer(lines("( 1 2 + 1 5 + 9 ) / 3", "= 1 2"), mean)).toEqual({ correct: true, fullSetup: true, badLines: [] });
  });

  it("a wrong step costs the setup, not a right answer", () => {
    const work = lines("1 2 + 1 5 + 9 = 3 5", "3 6 / 3 = 1 2");
    expect(checkWrittenAnswer(work, mean)).toEqual({ correct: true, fullSetup: false, badLines: [0] });
  });

  it("a wrong answer is wrong, however it got there", () => {
    expect(checkWrittenAnswer("3 6 / 3 = 1 1", mean).correct).toBe(false);
  });

  it("≈ with a rounded answer", () => {
    expect(checkWrittenAnswer("1 0 / 3 \\approx 3 {,} 3 3", { kind: "value", value: 10 / 3 }).correct).toBe(true);
  });

  it("gymnasiet: sin 30° = 0,5 and an integral", () => {
    expect(checkWrittenAnswer("\\sin 3 0^{\\circ} = 0 {,} 5", { kind: "value", value: 0.5 })).toEqual({ correct: true, fullSetup: true, badLines: [] });
    expect(checkWrittenAnswer("\\int_{0}^{2} 3 x^{2} d x = 8", { kind: "value", value: 8 }).fullSetup).toBe(true);
  });
});

describe("an equation's solutions", () => {
  const eq = { kind: "solutions" as const, variable: "x", values: [5], given: [expr("3 x + 5"), expr("2 0")] };

  it("x = 5 alone: right, no setup", () => {
    expect(checkWrittenAnswer("x = 5", eq)).toEqual({ correct: true, fullSetup: false, badLines: [] });
  });

  it("step by step: each line still true for x = 5", () => {
    expect(checkWrittenAnswer(lines("3 x + 5 = 2 0", "3 x = 1 5", "x = 5"), eq)).toEqual({ correct: true, fullSetup: true, badLines: [] });
  });

  it("a step that breaks the equation is found", () => {
    expect(checkWrittenAnswer(lines("3 x = 2 5", "x = 5"), eq)).toEqual({ correct: true, fullSetup: false, badLines: [0] });
  });

  it("two solutions, x₁ and x₂, in any order", () => {
    const pq = { kind: "solutions" as const, variable: "x", values: [2, -5], given: [] };
    expect(checkWrittenAnswer(lines("x_{1} = - 5", "x_{2} = 2"), pq).correct).toBe(true);
    expect(checkWrittenAnswer("x = 2", pq).correct).toBe(false);
  });
});

describe("an expression as the answer", () => {
  it("simplify: 3x + 2x − x = 4x", () => {
    const simplify = { kind: "expression" as const, variable: "x", expected: expr("4 x") };
    expect(checkWrittenAnswer("4 x", simplify)).toEqual({ correct: true, fullSetup: false, badLines: [] });
    expect(checkWrittenAnswer("3 x + 2 x - x = 4 x", simplify)).toEqual({ correct: true, fullSetup: true, badLines: [] });
    expect(checkWrittenAnswer("3 x + 2 x - x = 5 x", simplify).correct).toBe(false);
  });

  it("a derivative: f′(x) = 3·2x + 2 = 6x + 2", () => {
    const derivative = { kind: "expression" as const, variable: "x", expected: expr("6 x + 2") };
    expect(checkWrittenAnswer("f' ( x ) = 3 \\cdot 2 x + 2 = 6 x + 2", derivative)).toEqual({ correct: true, fullSetup: true, badLines: [] });
    expect(checkWrittenAnswer("f' ( x ) = 6 x + 2", derivative)).toEqual({ correct: true, fullSetup: false, badLines: [] });
  });
});

describe("numbersIn", () => {
  it("reads a written list, decimals too", () => {
    expect(numbersIn("3 , 5 , 1 2 , 2 {,} 5")).toEqual([3, 5, 12, 2.5]);
  });
});

describe("several right answers", () => {
  const quadratic = { kind: "solutions" as const, variable: "x", values: [2, 3], given: [] };

  it("both solutions on one line - separated by a comma, a semicolon or ∨ - in any order", () => {
    expect(checkWrittenAnswer("x_{1} = 2 , x_{2} = 3", quadratic).correct).toBe(true);
    expect(checkWrittenAnswer("x = 3 ; x = 2", quadratic).correct).toBe(true);
    expect(checkWrittenAnswer("x = 2 \\lor x = 3", quadratic).correct).toBe(true);
  });

  it("x = a ± b is both solutions", () => {
    expect(checkWrittenAnswer("x = 2 {,} 5 \\pm 0 {,} 5", quadratic).correct).toBe(true);
  });

  it("one of two: not done, but everything written is right - and it says how many are missing", () => {
    expect(checkWrittenAnswer("x = 2", quadratic)).toEqual({ correct: false, fullSetup: false, badLines: [], missing: 1 });
    // A wrong one isn't "missing", it's wrong.
    expect(checkWrittenAnswer("x = 2 , x = 4", quadratic).missing).toBeUndefined();
  });

  it("the full setup: the factored equation, then both solutions", () => {
    const work = "\\begin{gathered} x^{2} - 5 x + 6 = 0 \\\\ ( x - 2 ) ( x - 3 ) = 0 \\\\ x_{1} = 2 , x_{2} = 3 \\end{gathered}";
    expect(checkWrittenAnswer(work, quadratic)).toEqual({ correct: true, fullSetup: true, badLines: [] });
  });

  it("the same value in any form: 1/2, 0,5 and 50 % are all a half", () => {
    const half = { kind: "value" as const, value: 0.5 };
    for (const w of ["\\frac{1}{2}", "0 {,} 5", "5 0 \\%"]) expect(checkWrittenAnswer(w, half).correct).toBe(true);
  });

  it("a decimal comma is never read as two answers", () => {
    expect(checkWrittenAnswer("x = 2 {,} 5", { kind: "solutions", variable: "x", values: [2.5], given: [] }).correct).toBe(true);
  });
});
