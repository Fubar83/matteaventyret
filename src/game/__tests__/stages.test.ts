import { describe, expect, it } from "vitest";
import { questionTypeOf, STAGE_IDS, type QuestionTypeId } from "../../engine/generator";
import { STAGES } from "../stages";

/** Question types the engine makes but no player plays yet - their levels aren't in the game. */
const NOT_PLAYED: readonly QuestionTypeId[] = ["shortDivision"];

describe("the levels", () => {
  it("are each in the game once", () => {
    const ids = STAGES.map((s) => s.id);
    expect(ids.filter((id, i) => ids.indexOf(id) !== i)).toEqual([]);
  });

  it("every level the engine has is in the game - a new level needs its place in stages.ts", () => {
    const inGame = new Set(STAGES.map((s) => s.id));
    const missing = STAGE_IDS.filter((id) => !inGame.has(id) && !NOT_PLAYED.includes(questionTypeOf(id).id));
    expect(missing).toEqual([]);
  });

  it("only opens from levels that are in the game", () => {
    const inGame = new Set(STAGES.map((s) => s.id));
    for (const stage of STAGES) for (const req of stage.requires) expect(inGame.has(req), `${stage.id} requires ${req}`).toBe(true);
  });
});
