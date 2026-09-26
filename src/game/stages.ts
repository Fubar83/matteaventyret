import type { StageId } from "../engine/generator";
import type { MethodId } from "../engine/types";

export interface StageMeta {
  id: StageId;
  /** i18n key, resolved with t() at render time (see i18n/sv.json, en.json). */
  titleKey: string;
  /** "mixed" stages generate both columnAdd and columnSub problems within one round. "statistics" and "chart" skip Exempel, like "placeValue" - each is a single free-answer question, not a guided cell-by-cell method. */
  method: "placeValue" | "mixed" | "statistics" | "chart" | Extract<MethodId, "columnAdd" | "columnSub" | "columnMul">;
  problemsPerRound: number;
}

/**
 * All 7 stages of level 1.1, plus 2.1.1-2.1.3 (single-digit-multiplier written
 * multiplication - see columnMul.ts scope note for 2.1.4-2.1.6), 2.3.3-2.3.4
 * (decimal column addition/subtraction - see generator.ts's decimal stages;
 * 2.3.1/2.3.2, conceptual/comparison questions, and 2.2's kort division are
 * engine-complete but need their own non-ColumnBoard player, not yet built),
 * 2.7.1-2.7.3 (lägesmått: medelvärde/median/typvärde - Lgr22 "Sannolikhet
 * och statistik", the biggest åk 6 nationella prov gap the build brief's own
 * roadmap left uncovered at this level; see generator.ts's stat stages), and
 * 2.8.1-2.8.3 (tabeller och diagram: reading, comparing and summing a simple
 * bar chart - the other half of that same Lgr22 "Sannolikhet och statistik"
 * gap; see generator.ts's chart stages).
 */
export const STAGES: StageMeta[] = [
  { id: "1.1.1", titleKey: "stage.1.1.1", method: "placeValue", problemsPerRound: 6 },
  { id: "1.1.2", titleKey: "stage.1.1.2", method: "columnAdd", problemsPerRound: 6 },
  { id: "1.1.3", titleKey: "stage.1.1.3", method: "columnSub", problemsPerRound: 6 },
  { id: "1.1.4", titleKey: "stage.1.1.4", method: "columnAdd", problemsPerRound: 8 },
  { id: "1.1.5", titleKey: "stage.1.1.5", method: "columnSub", problemsPerRound: 8 },
  { id: "1.1.6", titleKey: "stage.1.1.6", method: "mixed", problemsPerRound: 8 },
  { id: "1.1.7", titleKey: "stage.1.1.7", method: "mixed", problemsPerRound: 8 },
  { id: "2.1.1", titleKey: "stage.2.1.1", method: "columnMul", problemsPerRound: 6 },
  { id: "2.1.2", titleKey: "stage.2.1.2", method: "columnMul", problemsPerRound: 8 },
  { id: "2.1.3", titleKey: "stage.2.1.3", method: "columnMul", problemsPerRound: 8 },
  { id: "2.3.3", titleKey: "stage.2.3.3", method: "mixed", problemsPerRound: 8 },
  { id: "2.3.4", titleKey: "stage.2.3.4", method: "mixed", problemsPerRound: 8 },
  { id: "2.7.1", titleKey: "stage.2.7.1", method: "statistics", problemsPerRound: 6 },
  { id: "2.7.2", titleKey: "stage.2.7.2", method: "statistics", problemsPerRound: 6 },
  { id: "2.7.3", titleKey: "stage.2.7.3", method: "statistics", problemsPerRound: 6 },
  { id: "2.8.1", titleKey: "stage.2.8.1", method: "chart", problemsPerRound: 6 },
  { id: "2.8.2", titleKey: "stage.2.8.2", method: "chart", problemsPerRound: 6 },
  { id: "2.8.3", titleKey: "stage.2.8.3", method: "chart", problemsPerRound: 6 },
];
