import { describe, expect, it } from "vitest";
import { cardCount, checkProgram, flatten, PROGRAM_QUESTIONS, runRobot, shortestWay, type ProgramStageId } from "../questions/program";
import { makeRng } from "../rng";

const many = (stage: ProgramStageId, n = 300) => {
  const rng = makeRng(1);
  return Array.from({ length: n }, () => PROGRAM_QUESTIONS.levels[stage](rng));
};

describe("programming the robot", () => {
  it("every question's own program does it, within the card limit", () => {
    for (const stage of Object.keys(PROGRAM_QUESTIONS.levels) as ProgramStageId[]) {
      for (const p of many(stage)) {
        expect(checkProgram(p, p.solution), `${stage} ${JSON.stringify(p.solution)}`).toEqual({ ok: true });
        if (p.maxCards !== null) expect(cardCount(p.solution)).toBeLessThanOrEqual(p.maxCards);
        // Nothing stands on anything else.
        const squares = [p.start, p.star, ...p.rocks, ...p.gems].map((s) => s.join());
        expect(new Set(squares).size, stage).toBe(squares.length);
      }
    }
  });

  it("1.12.2: a rock is in the way, and the way is 3-7 steps", () => {
    for (const p of many("1.12.2")) {
      const way = shortestWay(p, p.start, p.star)!;
      expect(way.length).toBeGreaterThanOrEqual(3);
      expect(way.length).toBeLessThanOrEqual(7);
      expect(p.loops).toBe(false);
    }
  });

  it("2.19.4 and 3.9.4: written out without a loop, no way fits under the limit", () => {
    for (const p of many("2.19.4")) {
      expect(shortestWay(p, p.start, p.star)!.length, JSON.stringify(p.solution)).toBeGreaterThan(p.maxCards!);
      expect(p.solution.some((s) => typeof s !== "string")).toBe(true);
    }
    for (const p of many("3.9.4")) {
      expect(p.gems).toHaveLength(3);
      expect(flatten(p.solution).length).toBeGreaterThanOrEqual(p.maxCards! + 3);
    }
  });

  it("says why a program doesn't do it", () => {
    const p = { ...PROGRAM_QUESTIONS.levels["1.12.2"](makeRng(3)), start: [0, 0] as [number, number], star: [2, 0] as [number, number], rocks: [[1, 1] as [number, number]] };
    expect(checkProgram(p, [])).toEqual({ ok: false, why: { key: "program.why.empty" } });
    expect(checkProgram(p, ["up"])).toMatchObject({ why: { key: "program.why.edge" } });
    expect(checkProgram(p, ["down", "right"])).toMatchObject({ why: { key: "program.why.rock" } });
    expect(checkProgram(p, ["right", "right", "right"])).toMatchObject({ why: { key: "program.why.passed" } });
    expect(checkProgram(p, ["right"])).toMatchObject({ why: { key: "program.why.notThere" } });
    expect(checkProgram(p, [{ repeat: 2, moves: ["right"] }])).toEqual({ ok: true });
    // The robot stops where it crashes.
    expect(runRobot(p, ["right", "down", "down"]).path).toEqual([[0, 0], [1, 0]]);
  });

  it("keeps questions apart", () => {
    for (const stage of Object.keys(PROGRAM_QUESTIONS.levels) as ProgramStageId[]) {
      const keys = new Set(many(stage, 60).map(PROGRAM_QUESTIONS.key));
      expect(keys.size, stage).toBeGreaterThan(40);
    }
  });
});
