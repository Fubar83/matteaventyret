import type { StageId } from "../engine/generator";
import { STAGES, stageById } from "./stages";

type StageStars = Partial<Record<StageId, 1 | 2 | 3>>;
/** When each stage was last played ("YYYY-MM-DD", device date). */
type LastPlayed = Partial<Record<StageId, string>>;

/**
 * Open: every stage it builds on has at least one star. A stage that isn't
 * open can still be taken on as a challenge - winning it earns its stars like
 * any round, which opens what builds on it. So a student who already knows
 * the basics jumps ahead by showing it, instead of walking every path from
 * the start.
 */
export function isStageUnlocked(stageId: StageId, stageStars: StageStars): boolean {
  const stage = stageById(stageId);
  if (!stage) return false;
  return stage.requires.every((r) => (stageStars[r] ?? 0) >= 1);
}

/** The stages this one still needs a star on - what the map says to do first. */
export function missingRequirements(stageId: StageId, stageStars: StageStars): StageId[] {
  return (stageById(stageId)?.requires ?? []).filter((r) => (stageStars[r] ?? 0) < 1);
}

/** Version 1's only speed test: plus/minus 0-20, unlocked once stage 2 has 2 stars (build brief "Gamification"). */
export function isBlixtrundaUnlocked(stageStars: StageStars): boolean {
  return (stageStars["1.1.2"] ?? 0) >= 2;
}

/** Siffer-Slukaren unlocks once every level 1.1 stage has at least 1 star (it is level 1.1's mini-boss, not gated on later levels like 2.1). */
export function isBossUnlocked(stageStars: StageStars): boolean {
  return STAGES.filter((s) => s.id.startsWith("1.1.")).every((s) => (stageStars[s.id] ?? 0) >= 1);
}

function daysBetween(fromISO: string, toISO: string): number {
  return Math.round((new Date(`${toISO}T00:00:00`).getTime() - new Date(`${fromISO}T00:00:00`).getTime()) / 86_400_000);
}

/** Played this long ago without all three stars, a stage is due for another go. */
const REVIEW_AFTER_DAYS = 3;

/**
 * The stage the map suggests next - the child can always pick another.
 *  1. Something new: an open stage not yet played, on the path the child was
 *     last on if there is one (keep going where you are), else the earliest.
 *  2. Repetition: an open stage without all three stars, not played for a few
 *     days - fewest stars first, then the longest ago.
 *  3. Improving: the open stage with the fewest stars.
 *  4. Everything's at three stars: the one played longest ago.
 */
export function recommendNext(stageStars: StageStars, lastPlayed: LastPlayed, todayISO: string): StageId | null {
  const open = STAGES.filter((s) => isStageUnlocked(s.id, stageStars));
  if (open.length === 0) return null;
  const stars = (id: StageId) => stageStars[id] ?? 0;

  const fresh = open.filter((s) => stars(s.id) === 0);
  if (fresh.length > 0) {
    const played = STAGES.filter((s) => lastPlayed[s.id]).sort((a, b) => (lastPlayed[b.id]! < lastPlayed[a.id]! ? -1 : 1));
    const last = played[0];
    const next = last && (fresh.find((s) => s.requires.includes(last.id)) ?? fresh.find((s) => s.path === last.path));
    return (next ?? fresh[0]).id;
  }

  const since = (id: StageId) => (lastPlayed[id] ? daysBetween(lastPlayed[id]!, todayISO) : Infinity);
  const unfinished = open.filter((s) => stars(s.id) < 3);
  const due = unfinished.filter((s) => since(s.id) >= REVIEW_AFTER_DAYS).sort((a, b) => stars(a.id) - stars(b.id) || since(b.id) - since(a.id));
  if (due.length > 0) return due[0].id;
  if (unfinished.length > 0) return [...unfinished].sort((a, b) => stars(a.id) - stars(b.id))[0].id;
  return [...open].sort((a, b) => since(b.id) - since(a.id))[0].id;
}
