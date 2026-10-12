import { describe, expect, it } from "vitest";
import { applyStep, BALANCE_QUESTIONS, solvedValue, type BalanceStageId, type Pan } from "../questions/balance";
import { BLOCKS_QUESTIONS, blocksOf, checkBlocks, valueOf, type BlocksStageId } from "../questions/blocks";
import { optionKey } from "../questions/choice/problem";
import { angleMade, checkAngle, checkLine, checkTriangle, CONSTRUCT_QUESTIONS, thirdCorner, type ConstructStageId } from "../questions/construct";
import { afterQuestion, EXPERIMENT_QUESTIONS, runExperiment, tally, type ExperimentStageId } from "../questions/experiment";
import { MATCH_QUESTIONS, type MatchStageId } from "../questions/match";
import { makeRng } from "../rng";

const many = <T>(make: (rng: ReturnType<typeof makeRng>) => T, n = 300) => {
  const rng = makeRng(1);
  return Array.from({ length: n }, () => make(rng));
};

describe("matching pairs", () => {
  it("every card has exactly one partner, and no two cards look the same", () => {
    for (const stage of Object.keys(MATCH_QUESTIONS.levels) as MatchStageId[]) {
      for (const p of many(MATCH_QUESTIONS.levels[stage])) {
        const pairs = new Map<number, number>();
        for (const c of p.cards) pairs.set(c.pair, (pairs.get(c.pair) ?? 0) + 1);
        expect([...pairs.values()].every((n) => n === 2), stage).toBe(true);
        expect(new Set(p.cards.map((c) => optionKey(c.option))).size, stage).toBe(p.cards.length);
      }
    }
  });

  it("1.7.5: each pair makes the number asked; no card could go with two", () => {
    for (const p of many(MATCH_QUESTIONS.levels["1.7.5"])) {
      const n = Number(p.prompt.vars!.n);
      const value = (i: number) => Number((p.cards[i].option as { latex: string }).latex);
      p.cards.forEach((c, i) => {
        const partners = p.cards.map((_, j) => j).filter((j) => j !== i && value(i) + value(j) === n);
        expect(partners).toHaveLength(1);
        expect(p.cards[partners[0]].pair).toBe(c.pair);
      });
    }
  });
});

describe("building with blocks", () => {
  it("the fewest blocks for the target pass; in 'take', the start is the number and taking needs a change", () => {
    for (const stage of Object.keys(BLOCKS_QUESTIONS.levels) as BlocksStageId[]) {
      for (const p of many(BLOCKS_QUESTIONS.levels[stage])) {
        const right = blocksOf(p.places, p.target);
        expect(valueOf(p.places, right), stage).toBeCloseTo(p.target, 9);
        expect(checkBlocks(p, right).ok, stage).toBe(true);
        if (p.mode === "take") {
          const k = Number(p.prompt.vars!.k);
          expect(valueOf(p.places, p.start) - k).toBe(p.target);
          // Not enough ones to take straight away: a ten has to be changed.
          expect(p.start.at(-1)! < k % 10).toBe(true);
        }
      }
    }
  });

  it("the value in ten ones instead of a ten is right in value, but not how a number is written", () => {
    const p = BLOCKS_QUESTIONS.levels["1.14.1"](makeRng(3));
    const counts = blocksOf(p.places, p.target);
    if (counts[1] > 0) {
      const unbundled = [counts[0], counts[1] - 1, counts[2] + 10];
      expect(checkBlocks(p, unbundled).why?.key).toBe("blocks.why.exchange");
    }
  });
});

describe("the equation balance", () => {
  /** The steps a child would take: x off first, then weights, then share. */
  function solve([l, r]: [Pan, Pan]): number | null {
    let pans: [Pan, Pan] = [l, r];
    for (let i = 0; i < 100 && solvedValue(pans) === null; i++) {
      const [a, b] = pans;
      const step = a.x > 0 && b.x > 0 ? { op: "takeX" as const } : Math.min(a.n, b.n) > 0 && (a.x === 0 || b.x === 0) && (a.x > 0 ? a.n : b.n) > 0 ? { op: "take" as const, n: 1 } : { op: "share" as const, by: Math.max(a.x, b.x) };
      const next = applyStep(pans, step);
      if ("why" in next) return null;
      pans = next.pans;
    }
    return solvedValue(pans);
  }

  it("taking off both sides and sharing gives x - and the equation holds for it", () => {
    for (const stage of Object.keys(BALANCE_QUESTIONS.levels) as BalanceStageId[]) {
      for (const p of many(BALANCE_QUESTIONS.levels[stage])) {
        const { left: l, right: r, answer: v } = p;
        expect(l.x * v + l.n, stage).toBe(r.x * v + r.n);
        expect(solve([l, r]), stage).toBe(v);
      }
    }
  });

  it("a step that can't be done says why: too few weights, no x, not shareable", () => {
    const pans: [Pan, Pan] = [{ x: 3, n: 2 }, { x: 0, n: 17 }];
    expect("why" in applyStep(pans, { op: "take", n: 5 })).toBe(true);
    expect("why" in applyStep(pans, { op: "takeX" })).toBe(true);
    expect("why" in applyStep(pans, { op: "share", by: 3 })).toBe(true);
  });
});

describe("experiments", () => {
  it("the same seed gives the same results; the predicted answer is right; the after-question is about what came", () => {
    for (const stage of Object.keys(EXPERIMENT_QUESTIONS.levels) as ExperimentStageId[]) {
      for (const p of many(EXPERIMENT_QUESTIONS.levels[stage], 40)) {
        const results = runExperiment(p);
        expect(runExperiment(p)).toEqual(results);
        expect(results).toHaveLength(p.throws);
        const after = afterQuestion(p, results);
        expect(after.correct >= 0 && after.correct < after.options.length).toBe(true);
        const counts = tally(p.device, results);
        if (p.after === "most") expect(counts[after.correct]).toBe(Math.max(...counts));
        if (p.after === "share") expect((after.options[after.correct] as { latex: string }).latex).toBe(`\\dfrac{${counts[5]}}{${p.throws}}`);
        if (p.after === "sum") expect(counts[5]).toBe(Math.max(...counts));
      }
    }
  });
});

describe("constructions", () => {
  it("the construction is right where it should be; the known slips are caught as what they are", () => {
    for (const stage of Object.keys(CONSTRUCT_QUESTIONS.levels) as ConstructStageId[]) {
      for (const p of many(CONSTRUCT_QUESTIONS.levels[stage])) {
        if (p.task === "line") {
          expect(checkLine(p, p.start + p.length).ok).toBe(true);
          if (p.start > 0) expect(checkLine(p, p.length).why?.key).toBe("construct.why.fromZero");
          expect(checkLine(p, p.start + p.length + 1).ok).toBe(false);
        } else if (p.task === "angle") {
          const theta = p.base === "right" ? p.degrees : 180 - p.degrees;
          expect(angleMade(p, theta)).toBe(p.degrees);
          expect(checkAngle(p, theta).ok).toBe(true);
          expect(checkAngle(p, 180 - theta).why?.key).toBe("construct.why.scale");
        } else {
          const c = thirdCorner(p);
          expect(checkTriangle(p, c).ok).toBe(true);
          expect(checkTriangle(p, [c[0] + 1, c[1]]).ok).toBe(false);
          expect(c[1]).toBeGreaterThan(0.5);
        }
      }
    }
  });
});
