/**
 * Every type of question (engine/questions/), and making questions and
 * rounds from them. This file knows no type in particular: each one's levels,
 * kinds and when two of its questions are the same live in its own module
 * (see questions/questionType.ts) - adding a type is adding it to the list.
 */
import { CHART_QUESTIONS } from "./questions/chart";
import { CLOCK_QUESTIONS } from "./questions/clock";
import { COLUMN_QUESTIONS } from "./questions/column";
import { MUL_GUIDED_QUESTIONS } from "./questions/multiply";
import { PLACE_VALUE_QUESTIONS } from "./questions/placeValue";
import { MAX_ATTEMPTS } from "./questions/questionType";
import { SHOP_QUESTIONS } from "./questions/shop";
import { SHORT_DIVISION_QUESTIONS } from "./questions/shortDivision";
import { STATISTICS_QUESTIONS } from "./questions/statistics";
import { TRAPPAN_QUESTIONS } from "./questions/trappan";
import { WRITTEN_QUESTIONS } from "./questions/written";
import type { Rng } from "./rng";

/** Every type of question there is. */
export const QUESTION_TYPES = [
  PLACE_VALUE_QUESTIONS,
  COLUMN_QUESTIONS,
  SHORT_DIVISION_QUESTIONS,
  STATISTICS_QUESTIONS,
  CHART_QUESTIONS,
  TRAPPAN_QUESTIONS,
  MUL_GUIDED_QUESTIONS,
  CLOCK_QUESTIONS,
  SHOP_QUESTIONS,
  WRITTEN_QUESTIONS,
] as const;

type AnyType = (typeof QUESTION_TYPES)[number];
/** A question, of any type. */
export type GeneratedProblem = AnyType extends infer T ? (T extends { key: (problem: infer P) => string } ? P : never) : never;
/** A level, of any type. */
export type StageId = AnyType extends infer T ? (T extends { levels: infer L } ? keyof L & string : never) : never;
/** What a type of question is called (questions/questionType.ts's `id`). */
export type QuestionTypeId = AnyType["id"];
/** The kinds of question there are - what a player is picked by. */
export type QuestionKind = GeneratedProblem["kind"];

/** The type a level belongs to, by its id. */
const TYPE_OF_LEVEL = new Map<string, AnyType>(QUESTION_TYPES.flatMap((type) => Object.keys(type.levels).map((id) => [id, type] as const)));
/** The type a kind of question belongs to. */
const TYPE_OF_KIND = new Map<string, AnyType>(QUESTION_TYPES.flatMap((type) => type.kinds.map((kind) => [kind, type] as const)));

/** Every level there is, playable or not (game/stages.ts says which are, and where). */
export const STAGE_IDS = [...TYPE_OF_LEVEL.keys()] as StageId[];

/** The type of question a level asks. */
export function questionTypeOf(stageId: StageId): AnyType {
  const type = TYPE_OF_LEVEL.get(stageId);
  if (!type) throw new Error(`No question type has level ${stageId}`);
  return type;
}

export function generateProblem(stageId: StageId, rng: Rng): GeneratedProblem {
  const make = (questionTypeOf(stageId).levels as Record<string, (rng: Rng) => GeneratedProblem>)[stageId];
  return make(rng);
}

/** What a question is, for telling it from others: two questions with the same key are the same one. */
export function problemKey(problem: GeneratedProblem): string {
  const type = TYPE_OF_KIND.get(problem.kind);
  if (!type) throw new Error(`No question type makes ${problem.kind}`);
  return (type.key as (p: GeneratedProblem) => string)(problem);
}

/**
 * Generates a full round: no duplicate within the round, and none repeated
 * from `recentKeys` (problems from the last two rounds, caller-maintained).
 */
export function generateRound(
  stageId: StageId,
  count: number,
  rng: Rng,
  recentKeys: ReadonlySet<string> = new Set()
): { problems: GeneratedProblem[]; keys: string[] } {
  const problems: GeneratedProblem[] = [];
  const keys: string[] = [];
  const seenThisRound = new Set<string>();

  for (let i = 0; i < count; i++) {
    let problem: GeneratedProblem | null = null;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      const candidate = generateProblem(stageId, rng);
      const key = problemKey(candidate);
      if (seenThisRound.has(key) || recentKeys.has(key)) continue;
      problem = candidate;
      seenThisRound.add(key);
      keys.push(key);
      break;
    }
    if (!problem) throw new Error(`generateRound: could not find a fresh problem for ${stageId} after ${MAX_ATTEMPTS} attempts`);
    problems.push(problem);
  }

  // Questions that know how hard they are (the clock, the shop) come easiest first: a round warms up, then stretches.
  const difficulty = (p: GeneratedProblem) => ("difficulty" in p ? p.difficulty : undefined);
  if (problems.every((p) => difficulty(p) !== undefined)) {
    const order = problems.map((_, i) => i).sort((a, b) => difficulty(problems[a])! - difficulty(problems[b])!);
    return { problems: order.map((i) => problems[i]), keys: order.map((i) => keys[i]) };
  }
  return { problems, keys };
}
