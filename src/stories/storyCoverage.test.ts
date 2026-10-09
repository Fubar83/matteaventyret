import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { generateProblem } from "../engine/generator";
import { makeRng } from "../engine/rng";
import { QUESTION_KINDS } from "../game/QuestionPlayer";
import { STAGES } from "../game/stages";
import { STORY_FILES, stagesOf } from "./catalog";
import { firstMatching } from "./QuestionStory";
import { ALL_VARIANTS } from "./variants";

// Every kind of question has a story - a new level, method or kind has to get one (see catalog.ts).
describe("Storybook covers every question", () => {
  it("has a story file for every stage method", () => {
    const covered = new Set(STORY_FILES.flatMap((f) => f.methods));
    expect([...new Set(STAGES.map((s) => s.method))].filter((m) => !covered.has(m))).toEqual([]);
  });

  it("lists every kind a level makes under its story file", () => {
    const missing: string[] = [];
    for (const file of STORY_FILES) {
      for (const stage of stagesOf(file.file)) {
        for (let seed = 1; seed <= 30; seed++) {
          const { kind } = generateProblem(stage.id, makeRng(seed));
          if (!file.kinds.includes(kind)) missing.push(`${stage.id} (${kind}) in ${file.file}`);
        }
      }
    }
    expect([...new Set(missing)]).toEqual([]);
  });

  it("only lists kinds a round can play", () => {
    for (const file of STORY_FILES) for (const kind of file.kinds) expect(QUESTION_KINDS).toContain(kind);
  });

  it("has every story file it lists", () => {
    for (const file of STORY_FILES) expect(existsSync(join(__dirname, file.file)), file.file).toBe(true);
  });

  it("finds a level for every variant", () => {
    const stages = STAGES.map((s) => s.id);
    for (const [group, variants] of Object.entries(ALL_VARIANTS))
      for (const [name, match] of Object.entries(variants)) expect(() => firstMatching(stages, match), `${group}.${name}`).not.toThrow();
  });
});
