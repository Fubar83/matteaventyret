import { describe, expect, it } from "vitest";
import { evaluate, freeVariables, parseExpression, parseLatex } from "../../mathinput/evaluate";
import { answerOf } from "../../mathinput/stepCheck";
import { checkWrittenAnswer } from "../../mathinput/workCheck";
import { CHOICE_QUESTIONS } from "../questions/choice";
import type { ChoiceProblem } from "../questions/choice/problem";
import { MATCH_QUESTIONS } from "../questions/match";
import { SORT_QUESTIONS } from "../questions/sort";
import type { SortGroupsProblem } from "../questions/sort/problem";
import { ADVANCED_GENERATORS } from "../questions/written/advanced";
import { makeRng } from "../rng";

const many = <T>(make: (rng: ReturnType<typeof makeRng>) => T, n = 300) => {
  const rng = makeRng(7);
  return Array.from({ length: n }, () => make(rng));
};
/** A LaTeX expression's value with the letters given. */
/** Options use \dfrac for size; the reader knows \frac. */
const plain = (latex: string) => latex.replace(/\\dfrac/g, "\\frac");
const value = (latex: string, vars: Record<string, number>) => {
  const e = parseExpression(plain(latex));
  expect(e, latex).not.toBeNull();
  return evaluate(e!, vars);
};
const close = (a: number, b: number) => Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(a));
// x off the whole numbers: (x² − 9)/(x − 3) has nothing to say at x = 3.
const AT = [{ x: 2.5, a: 2, b: 3 }, { x: 4.25, a: 5, b: 7 }];

describe("the rules as choices", () => {
  it("the right option is what's shown, and no slip is", () => {
    for (const stage of ["3.1.8", "3.1.10", "3.3.13", "3.3.15", "4.1.4", "4.1.5"] as const) {
      for (const p of many(CHOICE_QUESTIONS.levels[stage]) as ChoiceProblem[]) {
        const latexOf = (i: number) => (p.options[i] as { latex: string }).latex;
        for (const vars of AT) expect(close(value(latexOf(p.correct), vars), value(p.display!, vars)), `${stage}: ${p.display} = ${latexOf(p.correct)}`).toBe(true);
        p.options.forEach((_, i) => {
          if (i === p.correct) return;
          const differs = AT.some((vars) => !close(value(latexOf(i), vars), value(p.display!, vars)));
          expect(differs, `${stage}: ${p.display} ≠ ${latexOf(i)}`).toBe(true);
        });
      }
    }
  });

  it("3.3.16: the right formula, worked back, gives the one shown; the slips don't", () => {
    const vals = [2, 3, 5, 7, 11, 13];
    for (const p of many(CHOICE_QUESTIONS.levels["3.3.16"], 100) as ChoiceProblem[]) {
      const [given] = parseLatex(p.display!)!;
      const holds = (option: string) => {
        const [line] = parseLatex(plain(option))!;
        const target = (line.sides[0] as { name: string }).name;
        // Every other letter a number; the target from the option; then the formula shown must hold.
        const letters = new Set([...freeVariables(given.sides[0]), ...freeVariables(given.sides[1])]);
        const vars: Record<string, number> = {};
        [...letters].filter((l) => l !== target).forEach((l, i) => (vars[l] = vals[i % vals.length]));
        vars[target] = evaluate(line.sides[1], vars);
        return close(evaluate(given.sides[0], vars), evaluate(given.sides[1], vars));
      };
      p.options.forEach((o, i) => expect(holds((o as { latex: string }).latex), `${p.display}: ${(o as { latex: string }).latex}`).toBe(i === p.correct));
    }
  });
});

describe("always true?", () => {
  it("3.3.17: the rules hold for any numbers, the look-alikes fail for these", () => {
    const vars = { a: 2, b: 3, c: 5, d: 7, x: 2 };
    for (const p of many(SORT_QUESTIONS.levels["3.3.17"], 100) as SortGroupsProblem[]) {
      p.items.forEach((item, i) => {
        const [line] = parseLatex(plain((item as { latex: string }).latex))!;
        const equal = close(evaluate(line.sides[0], vars), evaluate(line.sides[1], vars));
        expect(equal, (item as { latex: string }).latex).toBe(p.answer[i] === 0);
      });
    }
  });
});

describe("matching powers", () => {
  it("3.1.11: each card is worth what its partner is, and no other", () => {
    for (const p of many(MATCH_QUESTIONS.levels["3.1.11"], 100)) {
      const worth = p.cards.map((c) => value((c.option as { latex: string }).latex, { x: 3 }));
      p.cards.forEach((c, i) =>
        p.cards.forEach((d, j) => {
          if (i !== j) expect(close(worth[i], worth[j]), `${(c.option as { latex: string }).latex} / ${(d.option as { latex: string }).latex}`).toBe(c.pair === d.pair);
        })
      );
    }
  });
});

describe("the rules written", () => {
  it("the worked solutions check out on the board", () => {
    for (const stage of ["3.1.9", "3.3.14", "3.3.18", "4.1.6"] as const) {
      for (const p of many(ADVANCED_GENERATORS[stage], 100)) {
        const work = p.solution.join(" \\\\ ");
        expect(checkWrittenAnswer(work, answerOf(p)).correct, `${stage}: ${work}`).toBe(true);
      }
    }
  });

  it("factoring out means all of the common factor", () => {
    const answer = { kind: "expression" as const, variable: "x", expected: parseExpression("3(2x+5)")!, form: "factored" as const };
    expect(checkWrittenAnswer("3(2x+5)", answer).correct).toBe(true);
    expect(checkWrittenAnswer("6x+15", answer).wrongForm).toBe("factored");
    const partly = checkWrittenAnswer("2(3x+7{,}5)", answer);
    expect(partly.correct).toBe(false);
    // x out of x² − 7x: x(x − 7) is it; nothing common is left in (x + 3)².
    const xOut = { kind: "expression" as const, variable: "x", expected: parseExpression("x(x-7)")!, form: "factored" as const };
    expect(checkWrittenAnswer("x(x-7)", xOut).correct).toBe(true);
    const square = { kind: "expression" as const, variable: "x", expected: parseExpression("(x+3)^{2}")!, form: "factored" as const };
    expect(checkWrittenAnswer("(x+3)^{2}", square).correct).toBe(true);
  });
});
