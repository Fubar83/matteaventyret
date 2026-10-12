import { describe, expect, it } from "vitest";
import { NUMBER_LINE_QUESTIONS, placed, type NumberLineStageId } from "../questions/numberLine";
import { makeRng } from "../rng";

const LEVELS = Object.keys(NUMBER_LINE_QUESTIONS.levels) as NumberLineStageId[];
const all = (stage: NumberLineStageId) => {
  const rng = makeRng(1);
  return Array.from({ length: 300 }, () => NUMBER_LINE_QUESTIONS.levels[stage](rng));
};
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;

describe("placing on the number line", () => {
  it("the number is on the line, the marker can stand on (or near enough to) it, and the labels are on ticks", () => {
    for (const stage of LEVELS) {
      for (const p of all(stage)) {
        expect(p.value >= p.from && p.value <= p.to, `${stage}: ${p.value}`).toBe(true);
        const nearest = p.from + Math.round((p.value - p.from) / p.snap) * p.snap;
        expect(Math.abs(nearest - p.value) <= p.tolerance + 1e-9, `${stage}: ${p.value}`).toBe(true);
        for (const l of p.labels) expect(near(((l.at - p.from) / p.step) % 1, 0) || near(((l.at - p.from) / p.step) % 1, 1), `${stage}: label ${l.at}`).toBe(true);
      }
    }
  });

  it("nothing to place sits on a numbered tick - that would be reading, not placing (0 to 10 aside)", () => {
    for (const stage of LEVELS.filter((s) => s !== "3.1.7")) {
      for (const p of all(stage)) expect(p.labels.some((l) => near(l.at, p.value)), `${stage}: ${p.value}`).toBe(false);
    }
  });

  it("placed at the value it's right; beyond the tolerance it's wrong, on the right side", () => {
    for (const stage of LEVELS) {
      for (const p of all(stage)) {
        expect(placed(p, p.value)).toBe("right");
        const off = p.tolerance + p.snap;
        if (p.value - off >= p.from) expect(placed(p, p.value - off)).toBe("tooLow");
        if (p.value + off <= p.to) expect(placed(p, p.value + off)).toBe("tooHigh");
      }
    }
  });
});
