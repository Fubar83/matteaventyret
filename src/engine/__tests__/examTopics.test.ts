import { describe, expect, it } from "vitest";
import { answerOf } from "../../mathinput/stepCheck";
import { checkWrittenAnswer, withoutUnits } from "../../mathinput/workCheck";
import { EXAM_GENERATORS } from "../examTopics";
import { generateRound } from "../generator";
import { makeRng } from "../rng";

describe("national-test topics", () => {
  for (const [stage, gen] of Object.entries(EXAM_GENERATORS)) {
    it(`${stage}: the whole worked solution, written freely, is right`, () => {
      const rng = makeRng(stage.split(".").reduce((a, b) => a * 31 + Number(b), 3));
      for (let i = 0; i < 200; i++) {
        const p = gen(rng);
        const work = p.solution.join(" \\\\ ");
        const v = checkWrittenAnswer(p.unit ? withoutUnits(work) : work, answerOf(p));
        expect(v.correct, `${stage}: ${p.display} | ${p.solution.join(" / ")}`).toBe(true);
        expect(v.badLines, `${stage}: ${p.solution.join(" / ")}`).toEqual([]);
      }
    });
  }

  it("asks with nice numbers: answers positive (or a system's), at most a few decimals", () => {
    const rng = makeRng(8);
    for (const [stage, gen] of Object.entries(EXAM_GENERATORS)) {
      for (let i = 0; i < 100; i++) {
        const a = gen(rng).answer;
        if (a.kind !== "value" || a.fraction || a.approx) continue;
        expect(a.value, stage).toBeGreaterThan(0);
        // A probability can be a long decimal (3/11) - it's written as a fraction.
        if (!stage.startsWith("3.7")) expect(Math.round(a.value * 1e4) / 1e4, stage).toBeCloseTo(a.value, 9);
      }
    }
  });

  it("fills a round without repeats", () => {
    for (const stage of Object.keys(EXAM_GENERATORS)) {
      const { problems } = generateRound(stage as keyof typeof EXAM_GENERATORS, 6, makeRng(1));
      expect(problems, stage).toHaveLength(6);
    }
  });

  it("wants a fraction in its lowest terms where it asks for one", () => {
    const answer = { kind: "value" as const, value: 2 / 3, fraction: true };
    expect(checkWrittenAnswer("\\frac{2}{3}", answer).correct).toBe(true);
    const half = checkWrittenAnswer("\\frac{4}{6}", answer);
    expect(half.correct).toBe(false);
    expect(half.wrongForm).toBe("simplest");
  });

  it("checks a system: both values stated, every step holding", () => {
    const answer = { kind: "system" as const, variables: ["x", "y"], values: [2, 5] };
    expect(checkWrittenAnswer("2x + 1 = -x + 7 \\\\ x = 2 \\\\ y = 5", answer).correct).toBe(true);
    expect(checkWrittenAnswer("x = 2", answer).correct).toBe(false);
    expect(checkWrittenAnswer("2x + 1 = -x + 8 \\\\ x = 2 \\\\ y = 5", answer).badLines).toEqual([0]);
  });
});
