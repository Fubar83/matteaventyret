import type { StageId } from "../engine/generator";
import type { Rng } from "../engine/rng";

export const BOSS_STAGES: StageId[] = ["1.1.2", "1.1.3", "1.1.4", "1.1.5", "1.1.6", "1.1.7"];
export const BOSS_MAX_HP = 8;

/** Mixed problems from stages 2-7, weighted toward the stages with the fewest stars (simple spaced repetition). */
export function pickBossStage(rng: Rng, stageStars: Partial<Record<StageId, 1 | 2 | 3>>): StageId {
  const weights = BOSS_STAGES.map((id) => 4 - (stageStars[id] ?? 0));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < BOSS_STAGES.length; i++) {
    r -= weights[i];
    if (r <= 0) return BOSS_STAGES[i];
  }
  return BOSS_STAGES[BOSS_STAGES.length - 1];
}
