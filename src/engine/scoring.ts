/**
 * Stars, XP and daily-streak rules (see build brief "Gamification"). No
 * reward can ever be taken away by a mistake — these functions only ever
 * compute a reward from what the child *did* accomplish.
 */

export interface RoundStats {
  /** Steps wrong on the first attempt, across the whole round. */
  wrongFirstAttempts: number;
  /** Number of distinct problems in the round that needed a hint (2nd wrong attempt) or worse. */
  problemsWithHint: number;
  /** Number of steps solved via the mini-tutorial (3rd wrong attempt). */
  miniTutorialsUsed: number;
}

export type Stars = 1 | 2 | 3;

/** A stage keeps its best star score, so this is never applied retroactively downward by the caller. */
export function computeStars(stats: RoundStats): Stars {
  if (stats.miniTutorialsUsed === 0 && stats.problemsWithHint === 0 && stats.wrongFirstAttempts <= 2) {
    return 3;
  }
  if (stats.problemsWithHint <= 2 && stats.miniTutorialsUsed <= 1) {
    return 2;
  }
  return 1;
}

/** 10 XP for a completed problem, +5 more if it needed no hint. */
export function computeProblemXp(neededHint: boolean): number {
  return neededHint ? 10 : 15;
}

export function playerLevel(totalXp: number): number {
  return Math.floor(totalXp / 200) + 1;
}

export interface StreakState {
  current: number;
  lastActiveDateISO: string | null;
  /** Free "vilodagar" already spent in the current 7-day window. */
  restDaysUsedThisWeek: number;
  weekStartISO: string | null;
}

export const INITIAL_STREAK_STATE: StreakState = {
  current: 0,
  lastActiveDateISO: null,
  restDaysUsedThisWeek: 0,
  weekStartISO: null,
};

function daysBetween(aISO: string, bISO: string): number {
  const a = new Date(`${aISO}T00:00:00`);
  const b = new Date(`${bISO}T00:00:00`);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/**
 * Records a completed round for `todayISO` (device local date, "YYYY-MM-DD").
 * One free rest day per rolling 7-day window keeps the streak alive across a
 * single missed day; a longer gap resets it. A reset is never shown to the
 * child as a warning - that is a UI concern, not this function's.
 */
export function recordRoundCompleted(state: StreakState, todayISO: string): StreakState {
  if (state.lastActiveDateISO === todayISO) return state;

  if (state.lastActiveDateISO === null) {
    return { current: 1, lastActiveDateISO: todayISO, restDaysUsedThisWeek: 0, weekStartISO: todayISO };
  }

  const gap = daysBetween(state.lastActiveDateISO, todayISO);
  let { restDaysUsedThisWeek, weekStartISO } = state;
  if (weekStartISO === null || daysBetween(weekStartISO, todayISO) >= 7) {
    restDaysUsedThisWeek = 0;
    weekStartISO = todayISO;
  }

  if (gap === 1) {
    return { current: state.current + 1, lastActiveDateISO: todayISO, restDaysUsedThisWeek, weekStartISO };
  }
  if (gap === 2 && restDaysUsedThisWeek < 1) {
    return { current: state.current + 1, lastActiveDateISO: todayISO, restDaysUsedThisWeek: restDaysUsedThisWeek + 1, weekStartISO };
  }
  return { current: 1, lastActiveDateISO: todayISO, restDaysUsedThisWeek, weekStartISO: todayISO };
}
