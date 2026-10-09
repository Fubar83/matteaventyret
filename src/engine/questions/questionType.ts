/**
 * A type of question - the clock, the shop, trappan, the written questions...
 * Each lives in a module of its own here in engine/questions/ and says:
 *
 * - its levels: one generator per level id, pure given the rng,
 * - the kinds of question they make (`problem.kind` - what the game picks a
 *   player by, see game/questions/QuestionPlayer.tsx),
 * - when two of its questions are the same one (a round never asks one twice).
 *
 * generator.ts lists them all. A new type of question is a module here, a
 * player in game/questions/, its levels in game/stages.ts, and a story in
 * src/stories/ (the tests say what's missing).
 */
import type { Rng } from "../rng";

export interface QuestionType<Id extends string, P extends { kind: string; stageId: S }, S extends string> {
  /** What the stories and tests call it. */
  id: Id;
  /** The kinds of question its levels make. */
  kinds: readonly P["kind"][];
  /** One generator per level. */
  levels: Record<S, (rng: Rng) => P>;
  /** Two questions with the same key are the same question. */
  key: (problem: P) => string;
}

/** A question type, with its types inferred from what it's given. */
export const questionType = <Id extends string, P extends { kind: string; stageId: S }, S extends string>(type: QuestionType<Id, P, S>) => type;

/** How many times a generator tries for a question that fits before giving up (a generator bug, never a child's problem). */
export const MAX_ATTEMPTS = 200;

/** Tries `make` until it gives a question (null: that one didn't fit) - and throws, naming `what`, if it never does. */
export function retry<T>(what: string, make: () => T | null): T {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const made = make();
    if (made !== null) return made;
  }
  throw new Error(`${what}: no question after ${MAX_ATTEMPTS} attempts`);
}
