/**
 * Phase promotion/demotion rules (see build brief "Input phases - Moving
 * up/Moving down"), kept as pure functions so they're testable without
 * rendering anything. Phase is tracked per METHOD (columnAdd/columnSub),
 * not per stage, since a child moves through phases separately for each
 * written method.
 */
import type { Phase } from "../engine/types";

export interface MethodProgress {
  phase: Phase;
  /** Consecutive qualifying problems toward the next phase up. */
  upStreakCount: number;
  /** Hints (Guidat) or nudges (Egen ordning) already spent within the current up-streak (budget: 1). */
  upStreakSpent: number;
  /** Consecutive Fritt problems that had at least one original error. */
  downStreakCount: number;
}

export const INITIAL_METHOD_PROGRESS: MethodProgress = {
  phase: "guidat",
  upStreakCount: 0,
  upStreakSpent: 0,
  downStreakCount: 0,
};

export interface ProblemOutcome {
  hintUsed: boolean;
  miniTutorialUsed: boolean;
  nudgeUsed: boolean;
  hadOriginalError: boolean;
}

export interface ApplyOutcomeResult {
  progress: MethodProgress;
  /** True when Fritt has just seen 3 error-having problems in a row. */
  suggestDemotion: boolean;
}

const STREAK_TO_PROMOTE = 4;
const STREAK_TO_SUGGEST_DEMOTION = 3;

export function applyOutcome(progress: MethodProgress, outcome: ProblemOutcome): ApplyOutcomeResult {
  let { phase, upStreakCount, upStreakSpent, downStreakCount } = progress;
  let suggestDemotion = false;

  if (phase === "guidat" || phase === "egenOrdning") {
    const spentThisProblem = phase === "guidat" ? outcome.hintUsed : outcome.nudgeUsed;
    if (phase === "guidat" && outcome.miniTutorialUsed) {
      upStreakCount = 0;
      upStreakSpent = 0;
    } else if (spentThisProblem) {
      if (upStreakSpent >= 1) {
        upStreakCount = 0;
        upStreakSpent = 0;
      } else {
        upStreakCount += 1;
        upStreakSpent += 1;
      }
    } else {
      upStreakCount += 1;
    }

    if (upStreakCount >= STREAK_TO_PROMOTE) {
      phase = phase === "guidat" ? "egenOrdning" : "fritt";
      upStreakCount = 0;
      upStreakSpent = 0;
    }
  } else {
    if (outcome.hadOriginalError) {
      downStreakCount += 1;
      if (downStreakCount >= STREAK_TO_SUGGEST_DEMOTION) {
        suggestDemotion = true;
        downStreakCount = 0;
      }
    } else {
      downStreakCount = 0;
    }
  }

  return { progress: { phase, upStreakCount, upStreakSpent, downStreakCount }, suggestDemotion };
}

export function demoteToEgenOrdning(): MethodProgress {
  return { ...INITIAL_METHOD_PROGRESS, phase: "egenOrdning" };
}
