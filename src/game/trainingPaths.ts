import type { StageId } from "../engine/generator";
import { PATHS, STAGES, type GradeBand, type StageMeta } from "./stages";
import { isStageUnlocked } from "./unlocks";

type StageStars = Partial<Record<StageId, 1 | 2 | 3>>;

/**
 * A training path: an ordered list of levels to work through. A level can be
 * on several paths - "Trappan, decimaler" is on both Gånger & delat and Inför
 * provet åk 6 - and its stars count on all of them.
 */
export interface TrainingPath {
  id: string;
  group: "exam" | "topic";
  nameKey: string;
  color: string;
  stages: StageId[];
}

const GRADES: GradeBand[] = ["ak1-3", "ak4-6", "ak7-9", "gy"];
const EXAMS: { id: string; grade: GradeBand; color: string }[] = [
  { id: "ak3", grade: "ak1-3", color: "#fbbf24" },
  { id: "ak6", grade: "ak4-6", color: "#38bdf8" },
  { id: "ak9", grade: "ak7-9", color: "#a78bfa" },
  { id: "gy", grade: "gy", color: "#f87171" },
];

/**
 * The levels in an order to take them: everything a level builds on (within
 * the path) before it, otherwise younger years first, then curriculum order.
 */
export function inTrainingOrder(stages: StageMeta[]): StageId[] {
  const rank = (s: StageMeta) => GRADES.indexOf(s.grade) * 1000 + STAGES.indexOf(s);
  const ids = new Set(stages.map((s) => s.id));
  const left = [...stages];
  const done = new Set<StageId>();
  const order: StageId[] = [];
  while (left.length > 0) {
    const ready = left.filter((s) => s.requires.every((r) => !ids.has(r) || done.has(r)));
    const pick = (ready.length > 0 ? ready : left).reduce((a, b) => (rank(b) < rank(a) ? b : a));
    left.splice(left.indexOf(pick), 1);
    done.add(pick.id);
    order.push(pick.id);
  }
  return order;
}

export const TRAINING_PATHS: TrainingPath[] = [
  // Inför nationella provet: everything that year's test covers.
  ...EXAMS.map((e) => ({
    id: `exam-${e.id}`,
    group: "exam" as const,
    nameKey: `trainingPath.exam.${e.id}`,
    color: e.color,
    stages: inTrainingOrder(STAGES.filter((s) => s.grade === e.grade)),
  })),
  // One area from the first year to gymnasiet.
  ...PATHS.map((p) => ({
    id: `topic-${p.id}`,
    group: "topic" as const,
    nameKey: p.nameKey,
    color: p.color,
    stages: inTrainingOrder(STAGES.filter((s) => s.path === p.id)),
  })),
];

export function trainingPathById(id: string): TrainingPath | undefined {
  return TRAINING_PATHS.find((p) => p.id === id);
}

/** Two stars - solved without help - is "can do it"; that's what a path asks of each level. */
export const READY_STARS = 2;

/** How many of the path's levels are done (at READY_STARS), of how many. */
export function pathProgress(path: TrainingPath, stars: StageStars): { ready: number; total: number } {
  return { ready: path.stages.filter((id) => (stars[id] ?? 0) >= READY_STARS).length, total: path.stages.length };
}

/**
 * What to train next on the path: the first open level not yet done; when
 * everything open is done but some level isn't, that level's missing
 * groundwork (which may be on another path); when all is done, the level
 * with fewest stars, to polish; null when every level has three stars.
 */
export function nextOnPath(path: TrainingPath, stars: StageStars): StageId | null {
  const got = (id: StageId) => stars[id] ?? 0;
  const open = path.stages.find((id) => got(id) < READY_STARS && isStageUnlocked(id, stars));
  if (open) return open;
  const blocked = path.stages.find((id) => got(id) < READY_STARS);
  if (blocked) return groundworkFor(blocked, stars);
  const polish = path.stages.filter((id) => got(id) < 3).sort((a, b) => got(a) - got(b))[0];
  return polish ?? null;
}

/** The earliest open level on the way to `id` that still needs a star. */
function groundworkFor(id: StageId, stars: StageStars): StageId {
  const stage = STAGES.find((s) => s.id === id);
  if (!stage || isStageUnlocked(id, stars)) return id;
  const missing = stage.requires.find((r) => (stars[r] ?? 0) < 1);
  return missing ? groundworkFor(missing, stars) : id;
}

/** The paths a level is on. */
export function pathsWith(id: StageId): TrainingPath[] {
  return TRAINING_PATHS.filter((p) => p.stages.includes(id));
}
