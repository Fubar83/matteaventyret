/**
 * What a player reports when its question is solved: whether help was used
 * and whether the full setup was there (the question's stars - see
 * engine/scoring.ts), plus the counts the method phases learn from.
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
