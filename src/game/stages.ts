import type { StageId } from "../engine/generator";
import type { MethodId } from "../engine/types";

export interface StageMeta {
  id: StageId;
  /** i18n key, resolved with t() at render time (see i18n/sv.json, en.json). */
  titleKey: string;
  /** "mixed" stages generate both columnAdd and columnSub problems within one round. */
  method: "placeValue" | "mixed" | Extract<MethodId, "columnAdd" | "columnSub">;
  problemsPerRound: number;
}

/** All 7 stages of level 1.1. */
export const STAGES: StageMeta[] = [
  { id: "1.1.1", titleKey: "stage.1.1.1", method: "placeValue", problemsPerRound: 6 },
  { id: "1.1.2", titleKey: "stage.1.1.2", method: "columnAdd", problemsPerRound: 6 },
  { id: "1.1.3", titleKey: "stage.1.1.3", method: "columnSub", problemsPerRound: 6 },
  { id: "1.1.4", titleKey: "stage.1.1.4", method: "columnAdd", problemsPerRound: 8 },
  { id: "1.1.5", titleKey: "stage.1.1.5", method: "columnSub", problemsPerRound: 8 },
  { id: "1.1.6", titleKey: "stage.1.1.6", method: "mixed", problemsPerRound: 8 },
  { id: "1.1.7", titleKey: "stage.1.1.7", method: "mixed", problemsPerRound: 8 },
];
