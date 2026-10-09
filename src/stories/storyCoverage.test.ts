import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { questionTypeOf } from "../engine/generator";
import { STAGES } from "../game/stages";
import { STORY_FILES } from "./catalog";
import { firstMatching } from "./QuestionStory";
import { ALL_VARIANTS } from "./variants";

// Every type of question the game plays has a story - a new type has to get one (see catalog.ts).
describe("Storybook covers every question", () => {
  const played = new Set(STAGES.map((s) => questionTypeOf(s.id).id));

  it("has a story file for every type of question the game plays", () => {
    const covered = new Set(STORY_FILES.flatMap((f) => f.types));
    expect([...played].filter((type) => !covered.has(type))).toEqual([]);
  });

  it("only lists types the game plays", () => {
    for (const file of STORY_FILES) for (const type of file.types) expect(played.has(type), `${type} in ${file.file}`).toBe(true);
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
