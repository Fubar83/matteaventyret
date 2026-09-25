/**
 * Blixtrunda: plus/minus 0-20 speed test (level 1.0). Pure fact generation
 * and medal thresholds; timing itself is a UI/clock concern.
 */
import type { Rng } from "./rng";
import { randInt } from "./rng";

export interface FactProblem {
  op: "add" | "sub";
  a: number;
  b: number;
  answer: number;
}

/** A random plus/minus fact with both operands and the answer within 0-20. */
export function generateFact(rng: Rng): FactProblem {
  const isAdd = rng() < 0.5;
  if (isAdd) {
    const a = randInt(rng, 0, 20);
    const b = randInt(rng, 0, 20 - a);
    return { op: "add", a, b, answer: a + b };
  }
  const a = randInt(rng, 0, 20);
  const b = randInt(rng, 0, a);
  return { op: "sub", a, b, answer: a - b };
}

export type Medal = "none" | "bronze" | "silver" | "gold";

const THRESHOLDS: Record<Exclude<Medal, "none">, number> = { bronze: 15, silver: 25, gold: 35 };

/** Medal for a given correct-answers count in a 60-second round. */
export function medalFor(correctCount: number): Medal {
  if (correctCount >= THRESHOLDS.gold) return "gold";
  if (correctCount >= THRESHOLDS.silver) return "silver";
  if (correctCount >= THRESHOLDS.bronze) return "bronze";
  return "none";
}
