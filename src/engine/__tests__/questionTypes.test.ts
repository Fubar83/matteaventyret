import { describe, expect, it } from "vitest";
import { generateProblem, problemKey, QUESTION_TYPES, questionTypeOf, STAGE_IDS } from "../generator";
import { makeRng } from "../rng";

// The contract every type of question keeps (questions/questionType.ts).
describe("question types", () => {
  it("have their own names, levels and kinds - none shared", () => {
    const ids = QUESTION_TYPES.map((t) => t.id);
    const levels = QUESTION_TYPES.flatMap((t) => Object.keys(t.levels));
    const kinds = QUESTION_TYPES.flatMap((t) => t.kinds);
    for (const list of [ids, levels, kinds]) expect(list.filter((x, i) => list.indexOf(x) !== i)).toEqual([]);
    expect(STAGE_IDS).toHaveLength(levels.length);
  });

  it("each level makes only the kinds its type says, for its own level", () => {
    for (const id of STAGE_IDS) {
      const type = questionTypeOf(id);
      for (let seed = 1; seed <= 25; seed++) {
        const p = generateProblem(id, makeRng(seed));
        expect(type.kinds as readonly string[], `${id} seed ${seed}`).toContain(p.kind);
        expect(p.stageId, `${id} seed ${seed}`).toBe(id);
      }
    }
  });

  it("each level makes the same question from the same seed", () => {
    for (const id of STAGE_IDS) expect(problemKey(generateProblem(id, makeRng(3)))).toBe(problemKey(generateProblem(id, makeRng(3))));
  });

  it("each level makes different questions - enough for a round", () => {
    for (const id of STAGE_IDS) {
      const rng = makeRng(5);
      const keys = new Set(Array.from({ length: 40 }, () => problemKey(generateProblem(id, rng))));
      expect(keys.size, id).toBeGreaterThanOrEqual(4);
    }
  });
});
