import { describe, expect, it } from "vitest";
import { parseExpression } from "../../mathinput/evaluate";
import { checkWrittenAnswer, type Answer } from "../../mathinput/workCheck";
import { ADVANCED_GENERATORS, type AdvancedProblem } from "../advanced";
import { makeRng } from "../rng";

/** The problem's answer in the checker's form - as ExpressionPlayer builds it. */
function answerOf(p: AdvancedProblem): Answer {
  const a = p.answer;
  if (a.kind === "value") return a;
  if (a.kind === "solutions") return { kind: "solutions", variable: a.variable, values: a.values, given: [] };
  if (a.kind === "system") return a;
  return { kind: "expression", variable: a.variable, expected: parseExpression(a.latex)!, form: a.form };
}

const STAGES = ["3.3.4", "3.3.5", "3.3.6", "4.1.1"] as const;

describe("kvadreringsreglerna, konjugatregeln, andragradsekvationer, pq", () => {
  it("every question's own worked solution checks out as right, with no wrong line", () => {
    const rng = makeRng(17);
    for (const stage of STAGES) {
      for (let i = 0; i < 300; i++) {
        const p = ADVANCED_GENERATORS[stage](rng);
        const work = p.solution.join(" \\\\ ");
        const v = checkWrittenAnswer(work, answerOf(p));
        expect(v.correct, `${stage}: ${p.display} → ${p.solution.join(" | ")}`).toBe(true);
        expect(v.badLines, `${stage}: ${p.solution.join(" | ")}`).toEqual([]);
      }
    }
  });

  it("writing the task itself back isn't expanding or factoring it - it asks for one more step instead", () => {
    const rng = makeRng(4);
    let expand = 0;
    let factor = 0;
    for (const stage of ["3.3.4", "3.3.5"] as const) {
      for (let i = 0; i < 200; i++) {
        const p = ADVANCED_GENERATORS[stage](rng);
        if (p.answer.kind !== "expression") continue;
        const v = checkWrittenAnswer(p.display, answerOf(p));
        expect(v.correct, p.display).toBe(false);
        expect(v.wrongForm, p.display).toBe(p.answer.form);
        if (p.answer.form === "expanded") expand++;
        else factor++;
      }
    }
    expect(expand).toBeGreaterThan(20);
    expect(factor).toBeGreaterThan(20);
  });

  it("(x + 3)² expanded: the double product is needed", () => {
    const answer: Answer = { kind: "expression", variable: "x", expected: parseExpression("x^{2} + 6x + 9")!, form: "expanded" };
    expect(checkWrittenAnswer("(x + 3)^{2} = x^{2} + 6x + 9", answer).correct).toBe(true);
    expect(checkWrittenAnswer("(x + 3)^{2} = x^{2} + 9", answer).correct).toBe(false);
    // Half-way isn't done: a bracket is still there.
    expect(checkWrittenAnswer("(x + 3)(x + 3)", answer).wrongForm).toBe("expanded");
  });

  it("x² − 25 factored: either order of the brackets, and not x² − 5²", () => {
    const answer: Answer = { kind: "expression", variable: "x", expected: parseExpression("(x + 5)(x - 5)")!, form: "factored" };
    expect(checkWrittenAnswer("x^{2} - 25 = (x - 5)(x + 5)", answer).correct).toBe(true);
    expect(checkWrittenAnswer("x^{2} - 5^{2}", answer).wrongForm).toBe("factored");
  });

  it("a step true for one of the solutions is fine - the zero product rule splits the equation", () => {
    const answer: Answer = { kind: "solutions", variable: "x", values: [0, -3], given: [] };
    const v = checkWrittenAnswer("x^{2} + 3x = 0 \\\\ x(x + 3) = 0 \\\\ x + 3 = 0 \\\\ x_{1} = 0, x_{2} = -3", answer);
    expect(v.correct).toBe(true);
    expect(v.badLines).toEqual([]);
    expect(v.fullSetup).toBe(true);
    // A step true for neither is still wrong.
    expect(checkWrittenAnswer("x + 5 = 0 \\\\ x_{1} = 0, x_{2} = -3", answer).badLines).toEqual([0]);
  });

  it("pq comes in every form: standard, to be rearranged, to be divided first, and a double root", () => {
    const rng = makeRng(8);
    const shapes = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const p = ADVANCED_GENERATORS["4.1.1"](rng);
      if (p.answer.kind !== "solutions") throw new Error("solutions expected");
      if (p.answer.values.length === 1) shapes.add("double");
      else if (/^\d+x\^\{2\}/.test(p.display)) shapes.add("divide");
      else if (!p.display.endsWith("= 0")) shapes.add("rearrange");
      else shapes.add("standard");
    }
    expect([...shapes].sort()).toEqual(["divide", "double", "rearrange", "standard"]);
  });
});
