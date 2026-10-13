import { describe, expect, it } from "vitest";
import { optionValue } from "../questions/choice/problem";
import { formula, GRAPH_SHAPE_QUESTIONS, PARAMS, type GraphShapeStageId } from "../questions/graphShape";
import { build, PYRAMID_QUESTIONS, solveOrder, type PyramidStageId } from "../questions/pyramid";
import { checkShare, SHARE_OUT_QUESTIONS, type ShareOutStageId } from "../questions/shareOut";
import { sumChoices, TEN_FRAME_QUESTIONS } from "../questions/tenFrame";
import { branches, TREE_QUESTIONS, value, type TreeStageId } from "../questions/tree";
import { makeRng } from "../rng";

const many = <T>(make: (rng: ReturnType<typeof makeRng>) => T, n = 300) => {
  const rng = makeRng(11);
  return Array.from({ length: n }, () => make(rng));
};

describe("the ten frame", () => {
  it("fits in its frames, and over ten passes ten", () => {
    for (const p of many(TEN_FRAME_QUESTIONS.levels["0.1.9"])) expect(p.target).toBeGreaterThanOrEqual(1), expect(p.target).toBeLessThanOrEqual(10);
    for (const p of many(TEN_FRAME_QUESTIONS.levels["1.7.6"])) expect(p.given[0]).toBeLessThan(10);
    for (const p of many(TEN_FRAME_QUESTIONS.levels["1.7.7"])) {
      expect(p.given[0] + p.given[1]).toBeGreaterThan(10);
      expect(p.given[1]).toBeLessThanOrEqual(9);
      const choices = sumChoices(p);
      expect(new Set(choices).size).toBe(4);
      expect(choices).toContain(p.target);
    }
  });
});

describe("sharing out", () => {
  it("the fair sharing is accepted; unequal plates, or enough left for another round, aren't", () => {
    for (const stage of Object.keys(SHARE_OUT_QUESTIONS.levels) as ShareOutStageId[]) {
      for (const p of many(SHARE_OUT_QUESTIONS.levels[stage])) {
        const n = p.animals.length;
        expect(p.total).toBe(n * p.each + p.rest);
        expect(p.rest).toBeLessThan(n);
        expect(checkShare(p, Array(n).fill(p.each))).toEqual({ ok: true });
        expect(checkShare(p, Array(n).fill(p.each - 1))).toMatchObject({ ok: false });
        const uneven = Array(n).fill(p.each);
        uneven[0] -= 1;
        expect(checkShare(p, uneven)).toMatchObject({ ok: false });
      }
    }
  });
});

describe("number pyramids", () => {
  it("every brick is the sum of the two under it, all can be found, and none is 0 or less", () => {
    for (const stage of Object.keys(PYRAMID_QUESTIONS.levels) as PyramidStageId[]) {
      for (const p of many(PYRAMID_QUESTIONS.levels[stage])) {
        expect(p.values).toEqual(build(p.values[0]));
        expect(solveOrder(p.shown), JSON.stringify(p.shown)).not.toBeNull();
        expect(p.values.flat().every((v) => v > 0)).toBe(true);
        expect(p.shown.flat().some((s) => !s)).toBe(true);
      }
    }
    for (const p of many(PYRAMID_QUESTIONS.levels["1.7.8"])) expect(p.values[2][0]).toBeLessThanOrEqual(20);
    for (const p of many(PYRAMID_QUESTIONS.levels["2.1.7"])) expect(p.values[p.values.length - 1][0]).toBeLessThanOrEqual(100);
  });

  it("a pyramid with too little given can't be solved", () => {
    expect(solveOrder([[true, false, false], [false, false], [true]])).toBeNull();
  });
});

describe("tree diagrams", () => {
  it("each node's branches add up to 1, and the answer is the paths multiplied and added", () => {
    for (const stage of Object.keys(TREE_QUESTIONS.levels) as TreeStageId[]) {
      for (const p of many(TREE_QUESTIONS.levels[stage])) {
        const { first, second } = branches(p);
        expect(value(first[0]) + value(first[1])).toBeCloseTo(1, 12);
        for (const s of second) expect(value(s[0]) + value(s[1])).toBeCloseTo(1, 12);
        const path = (i: number, j: number) => value(first[i]) * value(second[i][j]);
        const want = p.ask === "first" ? path(0, 0) : p.ask === "second" ? path(1, 1) : path(0, 1) + path(1, 0);
        expect(optionValue(p.after.options[p.after.correct])).toBeCloseTo(want, 12);
        // Every branch has its card, and no two cards are worth the same.
        const cards = p.cards.map(value);
        for (const f of [...first, ...second.flat()]) expect(cards.some((c) => Math.abs(c - value(f)) < 1e-12)).toBe(true);
        expect(new Set(cards.map((c) => c.toFixed(12))).size).toBe(cards.length);
      }
    }
  });
});

describe("shaping graphs", () => {
  it("the target is one the handles can reach, and isn't the start", () => {
    for (const stage of Object.keys(GRAPH_SHAPE_QUESTIONS.levels) as GraphShapeStageId[]) {
      for (const p of many(GRAPH_SHAPE_QUESTIONS.levels[stage])) {
        p.target.forEach((v, i) => expect(PARAMS[p.family].values[i]).toContain(v));
        expect(p.target).not.toEqual(p.start);
      }
    }
  });

  it("writes formulas the way school does", () => {
    expect(formula("line", [2, -1])).toBe("y = 2x - 1");
    expect(formula("line", [-1, 3])).toBe("y = -x + 3");
    expect(formula("line", [0.5, 0])).toBe("y = 0{,}5x");
    expect(formula("parabola", [-1, 2, 3])).toBe("y = -(x - 2)^{2} + 3");
    expect(formula("parabola", [2, -1, 0])).toBe("y = 2(x + 1)^{2}");
    expect(formula("parabola", [1, 0, -4])).toBe("y = x^{2} - 4");
    expect(formula("exponential", [3, 2])).toBe("y = 3 \\cdot 2^{x}");
    expect(formula("exponential", [1, 0.5])).toBe("y = 0{,}5^{x}");
  });
});
