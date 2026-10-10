import { describe, expect, it } from "vitest";
import { checkWrittenAnswer, withoutUnits } from "../../mathinput/workCheck";
import type { WrittenProblem } from "../questions/written/problem";
import { GEOMETRY_GENERATORS } from "../questions/written/geometry";
import { generateRound } from "../generator";
import { makeRng } from "../rng";

function verdict(p: WrittenProblem, work: string) {
  if (p.answer.kind !== "value") throw new Error("geometry answers are values");
  return checkWrittenAnswer(withoutUnits(work), p.answer);
}

describe("geometry questions", () => {
  it("every question's own worked solution checks out as right - answer, units, rounding and all", () => {
    const rng = makeRng(7);
    for (const [stage, gen] of Object.entries(GEOMETRY_GENERATORS)) {
      for (let i = 0; i < 300; i++) {
        const p = gen(rng);
        expect(p.figure, stage).toBeDefined();
        expect(p.unit, stage).toBeTruthy();
        const v = verdict(p, p.solution.join(" \\\\ "));
        expect(v.correct, `${stage}: ${p.solution.join(" | ")} should give ${JSON.stringify(p.answer)}`).toBe(true);
        expect(v.badLines, `${stage}: ${p.solution.join(" | ")}`).toEqual([]);
      }
    }
  });

  it("answers are whole or one decimal, and positive", () => {
    const rng = makeRng(3);
    for (const gen of Object.values(GEOMETRY_GENERATORS)) {
      for (let i = 0; i < 200; i++) {
        const p = gen(rng);
        if (p.answer.kind !== "value") throw new Error("value expected");
        expect(p.answer.value).toBeGreaterThan(0);
        // Exact answers can be quarters (areasatsen with sin 30°: a · b / 4); rounded ones have one decimal.
        const decimals = p.answer.approx ? 1 : 2;
        expect(Math.abs(p.answer.value * 10 ** decimals - Math.round(p.answer.value * 10 ** decimals))).toBeLessThan(1e-9);
      }
    }
  });

  it("a whole round of different questions can be made for every stage", () => {
    for (const stage of Object.keys(GEOMETRY_GENERATORS)) {
      const { problems } = generateRound(stage as keyof typeof GEOMETRY_GENERATORS, 6, makeRng(1));
      expect(problems).toHaveLength(6);
    }
  });

  it("a circle's area written with π ≈ 3,14 and '=' is right, and so is the step", () => {
    const p = GEOMETRY_GENERATORS["3.4.3"](makeRng(5));
    // Find a circle-area question.
    const rng = makeRng(9);
    let q = p;
    while (q.promptKey !== "geo.prompt.circleArea") q = GEOMETRY_GENERATORS["3.4.3"](rng);
    const r = Number(/\\pi \\cdot (\d+)\^\{2\}/.exec(q.solution.join(" "))![1]);
    const child = `3{,}14 \\cdot ${r}^{2} = ${String(Math.round(3.14 * r * r * 100) / 100).replace(".", "{,}")} \\ \\text{cm}^{2}`;
    const v = verdict(q, child);
    expect(v.correct, child).toBe(true);
    expect(v.fullSetup, child).toBe(true);
  });

  it("a wrong area is wrong - even with a unit", () => {
    const rng = makeRng(2);
    const p = GEOMETRY_GENERATORS["2.4.2"](rng);
    if (p.answer.kind !== "value") throw new Error("value expected");
    expect(verdict(p, `${p.answer.value * 2} cm^{2}`).correct).toBe(false);
    expect(verdict(p, `${p.answer.value} cm^{2}`).correct).toBe(true);
  });
});

describe("units after the answer", () => {
  it.each([
    ["24 cm", "24"],
    ["24cm", "24"],
    ["78{,}5 cm^{2}", "78{,}5"],
    ["12 m^{2}", "12"],
    ["12 m²", "12"],
    ["5 \\cdot 3 = 15\\ \\text{cm}^{2}", "5 \\cdot 3 = 15"],
    ["O = 2 \\cdot 5 = 10 cm \\\\ = 10", "O = 2 \\cdot 5 = 10 \\\\ = 10"],
    ["6 cm = 60 mm", "6 = 60"],
  ])("%s", (written, expected) => {
    // Spacing doesn't matter to the reader - only what's left.
    expect(withoutUnits(written).replace(/\s+/g, "")).toBe(expected.replace(/\s+/g, ""));
  });

  it("leaves letters that aren't units after a number alone", () => {
    expect(withoutUnits("y = 2x + m")).toBe("y = 2x + m");
    expect(withoutUnits("A = \\pi r^{2}")).toBe("A = \\pi r^{2}");
  });
});
