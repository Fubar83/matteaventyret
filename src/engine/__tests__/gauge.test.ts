import { describe, expect, it } from "vitest";
import { GAUGE_QUESTIONS, gaugeText, gaugeWhy, type GaugeProblem, type GaugeStageId } from "../questions/gauge";
import { makeRng } from "../rng";

const many = (stage: GaugeStageId, n = 300) => {
  const rng = makeRng(1);
  return Array.from({ length: n }, () => GAUGE_QUESTIONS.levels[stage](rng));
};

describe("setting an instrument", () => {
  it("the target is on the scale, somewhere to move to, and not on a number for a plain reading", () => {
    for (const stage of Object.keys(GAUGE_QUESTIONS.levels) as GaugeStageId[]) {
      for (const p of many(stage)) {
        expect(p.target).toBeGreaterThanOrEqual(p.min);
        expect(p.target).toBeLessThanOrEqual(p.max);
        expect(p.start, stage).not.toBe(p.target);
        if (p.change !== null) expect(p.start + p.change).toBe(p.target);
      }
    }
    // Reading between the numbers is what 2.9.12 and 2.17.4 practise.
    for (const p of [...many("2.9.12"), ...many("2.17.4")].filter((p) => p.change === null && p.prompt.key !== "gauge.jug.recipe")) expect(p.target % p.labelEvery).not.toBe(0);
  });

  it("2.17.4: most changes cross 0, and none stops on it", () => {
    const changes = many("2.17.4").filter((p) => p.change !== null);
    const across = changes.filter((p) => Math.sign(p.start) !== Math.sign(p.target));
    expect(across.length / changes.length).toBeGreaterThan(0.6);
    expect(changes.every((p) => p.target !== 0)).toBe(true);
  });

  it("2.9.12: a recipe for 4 scaled to the people, in whole decilitres", () => {
    for (const p of many("2.9.12").filter((p) => p.prompt.key === "gauge.jug.recipe")) {
      const { a, n } = p.prompt.vars as { a: number; n: number };
      expect(p.target * 4).toBe(a * n);
    }
  });

  it("says which way, and names the slips", () => {
    const p: GaugeProblem = { ...GAUGE_QUESTIONS.levels["2.17.4"](makeRng(1)), start: 4, target: -3, change: -7 };
    expect(gaugeWhy(p, 11).key).toBe("gauge.why.colderIsDown");
    expect(gaugeWhy(p, -2).key).toBe("gauge.why.zero");
    expect(gaugeWhy(p, 4).key).toBe("gauge.why.notMoved");
    expect(gaugeWhy(p, -10).key).toBe("gauge.why.tooLow");
    expect(gaugeWhy(p, 2).key).toBe("gauge.why.tooHigh");
    // A no-break space: the number and its unit stay on one line.
    const nb = String.fromCharCode(160);
    expect(gaugeText("l", 13)).toBe(`1,3${nb}l`);
    expect(gaugeText("deg", -4)).toBe(`−4${nb}°C`);
  });
});
