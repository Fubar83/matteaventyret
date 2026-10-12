import { describe, expect, it } from "vitest";
import { DRAW_CHART_QUESTIONS, rightOnes, type DrawChartStageId } from "../questions/drawChart";
import { makeRng } from "../rng";

const many = (stage: DrawChartStageId, n = 300) => {
  const rng = makeRng(1);
  return Array.from({ length: n }, () => DRAW_CHART_QUESTIONS.levels[stage](rng));
};

describe("drawing a chart", () => {
  it("every value is on the scale's lines, and none is right before it's moved", () => {
    for (const stage of Object.keys(DRAW_CHART_QUESTIONS.levels) as DrawChartStageId[]) {
      for (const p of many(stage)) {
        expect(p.values).toHaveLength(p.labelKeys.length);
        for (const v of p.values) {
          expect(v).toBeGreaterThanOrEqual(p.min);
          expect(v).toBeLessThanOrEqual(p.max);
          expect(Math.abs(v % p.step)).toBe(0);
          expect(v, stage).not.toBe(p.start);
        }
        expect(rightOnes(p, p.values).every(Boolean)).toBe(true);
      }
    }
  });

  it("some values are between the numbered lines, so the scale is read", () => {
    for (const stage of ["2.8.7", "2.8.8"] as const) for (const p of many(stage)) expect(p.values.filter((v) => v % p.labelEvery !== 0).length).toBeGreaterThanOrEqual(2);
  });

  it("1.13.2: four different counts; 2.8.8: a day that warms and cools a little, below 0 sometimes", () => {
    for (const p of many("1.13.2")) expect(new Set(p.values).size).toBe(4);
    const lines = many("2.8.8");
    for (const p of lines) {
      expect(p.values[4]).toBeLessThan(p.values[3]);
      expect(p.values[1]).toBeGreaterThan(p.values[0]);
    }
    expect(lines.some((p) => p.values[0] < 0)).toBe(true);
  });
});
