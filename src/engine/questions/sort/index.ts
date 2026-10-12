/**
 * Sorting: into groups, or in order - one question type with two kinds,
 * its levels in groups.ts and order.ts; the model is problem.ts.
 *
 * How it works, and what must stay true: docs/question-types/sort.md.
 */
import { optionKey } from "../choice/problem";
import { questionType } from "../questionType";
import { SORT_GROUPS, type SortGroupsStageId } from "./groups";
import { SORT_ORDER, type SortOrderStageId } from "./order";
import type { SortProblem } from "./problem";

/** Every sorting level. */
export type SortStageId = SortGroupsStageId | SortOrderStageId;

export const SORT_QUESTIONS = questionType<"sort", SortProblem, SortStageId>({
  id: "sort",
  kinds: ["sortGroups", "sortOrder"],
  levels: { ...SORT_GROUPS, ...SORT_ORDER },
  // The same things, whatever order the tray shows them in.
  key: (p) => `sort:${p.stageId}:${JSON.stringify(p.prompt)}:${p.items.map(optionKey).sort().join("|")}`,
});
