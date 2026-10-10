import type { GuidedResult } from "../../mathinput/GuidedColumn";

/**
 * What a player reports when its question is solved: whether help was used
 * and whether the full setup was there (the question's stars - see
 * engine/scoring.ts), plus the counts the method phases learn from.
 *
 * Players build it with triedOutcome or guidedOutcome below, so every type
 * of question scores by the same rules:
 *   ★   help - the help ladder, the hint that comes after a second wrong
 *       try, the answer shown, a digit traced
 *   ★★  right without help
 *   ★★★ right without help, with the full setup - the written work where the
 *       question has some, and otherwise right the first time
 */
export interface QuestionOutcome {
  helped: boolean;
  fullSetup: boolean;
  /** 1 if the first answer was wrong (0 otherwise) - per question. */
  wrongFirstAttempts: number;
  /** The automatic hint after a second wrong answer. */
  hintUsed: boolean;
  /** The answer (or a step) shown after a third. */
  miniTutorialUsed: boolean;
}

export interface Tries {
  /** Wrong answers given before the right one. */
  wrong: number;
  /** How far up the help ladder the child went (0: not at all). */
  helpUsed?: number;
  /** The answer was shown in the end. */
  shown?: boolean;
  /**
   * The written setup, for a question that has one ("Visa hur du tänkte"):
   * whether it was there and right. Leave it out when there's nothing to set
   * up - then the full setup is being right the first time.
   */
  setup?: boolean;
}

/** A question answered in tries: a wrong one, then the hint after the second, the answer shown after the third. */
export function triedOutcome({ wrong, helpUsed = 0, shown = false, setup }: Tries): QuestionOutcome {
  return {
    helped: helpUsed > 0 || wrong >= 2 || shown,
    fullSetup: setup ?? wrong === 0,
    wrongFirstAttempts: wrong >= 1 ? 1 : 0,
    hintUsed: wrong >= 2,
    miniTutorialUsed: wrong >= 3 || shown,
  };
}

/**
 * A guided board (trappan, multiplication) walked box by box. A digit shown
 * or traced is help; the board is the setup, so ★★★ is every box right the
 * first time - as for a column question's cells.
 */
export function guidedOutcome({ wrong, shown, traced }: GuidedResult): QuestionOutcome {
  const helped = shown > 0 || traced > 0;
  return { helped, fullSetup: !helped && wrong === 0, wrongFirstAttempts: wrong > 0 ? 1 : 0, hintUsed: helped, miniTutorialUsed: false };
}
