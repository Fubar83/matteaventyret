/**
 * Which story file shows which type of question (engine/questions/) - every
 * level of the type is in its "Nivå" setting. storyCoverage.test.ts fails
 * when a type the game plays has no story, so a new type has to get one.
 */
import { questionTypeOf, type QuestionTypeId, type StageId } from "../engine/generator";
import { STAGES, type StageMeta } from "../game/stages";

export interface StoryFile {
  /** The file in src/stories/. */
  file: string;
  /** The types of question it shows. */
  types: readonly QuestionTypeId[];
}

export const STORY_FILES: readonly StoryFile[] = [
  { file: "ColumnQuestions.stories.tsx", types: ["column"] },
  { file: "PlaceValue.stories.tsx", types: ["placeValue"] },
  { file: "Statistics.stories.tsx", types: ["statistics"] },
  { file: "Charts.stories.tsx", types: ["chart"] },
  { file: "WrittenQuestions.stories.tsx", types: ["written"] },
  { file: "Clock.stories.tsx", types: ["clock"] },
  { file: "Shop.stories.tsx", types: ["shop"] },
  { file: "Trappan.stories.tsx", types: ["trappan"] },
  { file: "Multiplication.stories.tsx", types: ["mulGuided"] },
];

/** The levels a story file shows: those of its types the game has, in the game's order. */
export function stagesOf(file: string): StageMeta[] {
  const entry = STORY_FILES.find((f) => f.file === file);
  if (!entry) throw new Error(`No catalog entry for ${file}`);
  return STAGES.filter((s) => entry.types.includes(questionTypeOf(s.id).id));
}

/** The levels' ids. */
export function stageIds(file: string): StageId[] {
  return stagesOf(file).map((s) => s.id);
}
