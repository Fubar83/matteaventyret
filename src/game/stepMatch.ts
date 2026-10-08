/**
 * Which planned step a written step is (StepSolver.tsx): told apart by how
 * it's written, since every right step of a solution is equal in value to
 * the next.
 */
import type { SolutionStep } from "../engine/advanced";

/** LaTeX without spaces or grouping, for comparing how alike two lines are written. */
const bare = (latex: string) => latex.replace(/\\left|\\right|[\s{}]/g, "");

/** How alike two strings are: 1 − edit distance / the longer length. */
function likeness(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return 1 - prev[b.length] / Math.max(a.length, b.length, 1);
}

/**
 * Which planned step comes next, after a step written right: the one after
 * the planned step it's most like - so a child who does two steps at once
 * gets the guide for the step after both, not the one they've done.
 */
export function nextPlanned(written: string, plan: readonly SolutionStep[], from: number): number {
  let best = from;
  let bestLikeness = 0.55;
  for (let j = from; j < plan.length; j++) {
    const l = likeness(bare(written), bare(plan[j].line));
    if (l > bestLikeness) {
      bestLikeness = l;
      best = j;
    }
  }
  return best + 1;
}

/**
 * Strict: is a right step the planned step `at`? It must be written like it
 * (the same numbers in the same form - "x = 64/8" is the right value, but not
 * "dividera båda leden med 8" written out) and not look more like a later
 * planned step (two steps done at once).
 */
export function isPlannedStep(written: string, plan: readonly SolutionStep[], at: number): boolean {
  const here = likeness(bare(written), bare(plan[at].line));
  if (here < 0.5) return false;
  return plan.slice(at + 1).every((later) => likeness(bare(written), bare(later.line)) <= here + 0.05);
}
