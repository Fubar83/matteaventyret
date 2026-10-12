/**
 * Sorting questions: things to put where they belong - into groups (udda and
 * jämna, primtal or not, a half or more) or in order (smallest first). The
 * child taps a thing, then where it goes; a check marks what's wrong and
 * sends it back to try again.
 *
 * The things are the single-choice options' kinds (choice/problem.ts): words,
 * numbers in LaTeX, characters, small pictures.
 */
import type { ChoiceOption, ChoiceText } from "../choice/problem";
import type { SortStageId } from ".";

export type { ChoiceOption as SortItem } from "../choice/problem";

/** Into groups: each thing into the group it belongs to. */
export interface SortGroupsProblem {
  stageId: SortStageId;
  kind: "sortGroups";
  prompt: ChoiceText;
  items: ChoiceOption[];
  /** The groups' names, or pictures. */
  groups: ChoiceOption[];
  /** Each thing's group, by index. */
  answer: number[];
  /** Why a thing doesn't go where it was put - said when a check finds it there (null: nothing better than "look again"). */
  why: (ChoiceText | null)[];
  tip: ChoiceText;
  explanation: ChoiceText;
}

/** In order: the things from one end to the other. */
export interface SortOrderProblem {
  stageId: SortStageId;
  kind: "sortOrder";
  prompt: ChoiceText;
  items: ChoiceOption[];
  /** The things' indexes, in the right order. */
  answer: number[];
  /** What the two ends are: "minst" … "störst". */
  ends: [ChoiceText, ChoiceText];
  tip: ChoiceText;
  explanation: ChoiceText;
}

export type SortProblem = SortGroupsProblem | SortOrderProblem;
