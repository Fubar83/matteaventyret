/**
 * Stars, XP and daily-streak rules (see build brief "Gamification"). No
 * reward can ever be taken away by a mistake — these functions only ever
 * compute a reward from what the child *did* accomplish.
 */

export type Stars = 1 | 2 | 3;

/** How one question went - every question is solved in the end, help is always there. */
export interface QuestionResult {
  /**
   * Any help at all: the help button (tip, next step, worked example), the
   * automatic hint after wrong tries, a guided mode that shows the order,
   * or the answer shown. "Menade du?" (unclear handwriting) is not help.
   */
  helped: boolean;
  /**
   * The whole setup, right: the column calculation with its carries and
   * borrowing without an original error, or a correct written calculation
   * ("Visa hur du tänkte") leading to the answer. A question with nothing to
   * set up (reading a digit's value off a number) counts as set up when
   * answered right the first time.
   */
  fullSetup: boolean;
}

/**
 * ★ solved with help, ★★ solved without help, ★★★ solved without help with
 * the full setup. Help is never refused - it just caps the question at ★.
 */
export function questionStars(result: QuestionResult): Stars {
  if (result.helped) return 1;
  return result.fullSetup ? 3 : 2;
}

/**
 * A round's stars: the level at least half its questions reached - one slip
 * doesn't cost the round, and one lucky question doesn't win it. A stage
 * keeps its best round, so this is never applied downward by the caller.
 */
export function roundStars(questions: readonly Stars[]): Stars {
  if (questions.length === 0) return 1;
  for (const level of [3, 2] as const) {
    if (questions.filter((s) => s >= level).length * 2 >= questions.length) return level;
  }
  return 1;
}

/** XP for a solved question: 10, +5 without help, +5 more for the full setup. */
export function questionXp(stars: Stars): number {
  return stars === 3 ? 20 : stars === 2 ? 15 : 10;
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
