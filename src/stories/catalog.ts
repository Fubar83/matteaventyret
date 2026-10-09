/**
 * Which story file shows which questions: the stage methods it covers (every
 * level of those methods is in its "Nivå" setting) and the kinds of question
 * they make. storyCoverage.test.ts fails when a stage method or a kind of
 * question has no story - so a new question type has to get one.
 */
import type { GeneratedProblem, StageId } from "../engine/generator";
import { STAGES, type StageMeta } from "../game/stages";

export interface StoryFile {
  /** The file in src/stories/. */
  file: string;
  /** The stage methods whose levels it shows. */
  methods: readonly StageMeta["method"][];
  /** The kinds of question those levels make. */
  kinds: readonly GeneratedProblem["kind"][];
}

export const STORY_FILES: readonly StoryFile[] = [
  { file: "ColumnQuestions.stories.tsx", methods: ["columnAdd", "columnSub", "columnMul", "mixed"], kinds: ["columnAdd", "columnSub", "columnMul"] },
  { file: "PlaceValue.stories.tsx", methods: ["placeValue"], kinds: ["placeValue"] },
  { file: "Statistics.stories.tsx", methods: ["statistics"], kinds: ["statistics"] },
  { file: "Charts.stories.tsx", methods: ["chart"], kinds: ["chart"] },
  { file: "WrittenQuestions.stories.tsx", methods: ["expression"], kinds: ["expression"] },
  { file: "Clock.stories.tsx", methods: ["clock"], kinds: ["clock"] },
  { file: "Shop.stories.tsx", methods: ["shop"], kinds: ["shop"] },
  { file: "Trappan.stories.tsx", methods: ["trappan"], kinds: ["trappan"] },
  { file: "Multiplication.stories.tsx", methods: ["mulGuided"], kinds: ["mulGuided"] },
];

/** The levels a story file shows, in the game's order. */
export function stagesOf(file: string): StageMeta[] {
  const entry = STORY_FILES.find((f) => f.file === file);
  if (!entry) throw new Error(`No catalog entry for ${file}`);
  return STAGES.filter((s) => entry.methods.includes(s.method));
}

/** The levels' ids. */
export function stageIds(file: string): StageId[] {
  return stagesOf(file).map((s) => s.id);
}
