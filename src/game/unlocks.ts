import type { StageId } from "../engine/generator";
import { STAGES } from "./stages";

type StageStars = Partial<Record<StageId, 1 | 2 | 3>>;

/** The first stage is always open; each later stage needs >=1 star on the one before it. */
export function isStageUnlocked(stageId: StageId, stageStars: StageStars): boolean {
  const index = STAGES.findIndex((s) => s.id === stageId);
  if (index <= 0) return true;
  const previous = STAGES[index - 1];
  return (stageStars[previous.id] ?? 0) >= 1;
}

/** Version 1's only speed test: plus/minus 0-20, unlocked once stage 2 has 2 stars (build brief "Gamification"). */
export function isBlixtrundaUnlocked(stageStars: StageStars): boolean {
  return (stageStars["1.1.2"] ?? 0) >= 2;
}

/** Siffer-Slukaren unlocks once every level 1.1 stage has at least 1 star (it is level 1.1's mini-boss, not gated on later levels like 2.1). */
export function isBossUnlocked(stageStars: StageStars): boolean {
  return STAGES.filter((s) => s.id.startsWith("1.1.")).every((s) => (stageStars[s.id] ?? 0) >= 1);
}
