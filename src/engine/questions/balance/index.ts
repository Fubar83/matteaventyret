/**
 * Solving an equation on a balance, step by step: whatever is done to one pan
 * is done to the other, so it stays level - take the same weight off both,
 * the same number of x-boxes off both, or share both into equal parts. When
 * one pan has a single x and the other only weights, that's x.
 *
 *   åk 4-6  2.14.2 x + 5 = 12 - take 5 off both
 *   åk 7-9  3.3.10 3x + 4 = 19 - take 4 off, then share in 3
 *           3.3.11 5x + 2 = 2x + 14 - take 2x off both first
 *
 * Each step is written as the equation it leaves, so the balance and the
 * algebra are seen to be the same thing.
 *
 * How it works, and what must stay true: docs/question-types/balance.md.
 */
import { randInt, type Rng } from "../../rng";
import { text, type ChoiceText } from "../choice/problem";
import { questionType } from "../questionType";

export type BalanceStageId = "2.14.2" | "3.3.10" | "3.3.11";

/** A pan: x-boxes and weights (in all). */
export interface Pan {
  x: number;
  n: number;
}

export interface BalanceProblem {
  stageId: BalanceStageId;
  kind: "balanceSolve";
  prompt: ChoiceText;
  left: Pan;
  right: Pan;
  /** What x is. */
  answer: number;
  /** The fewest steps it takes (a step is taking 1, 5 or 10 off, an x off, or sharing). */
  steps: number;
  tip: ChoiceText;
  explanation: ChoiceText;
}

/** Something done to both pans. */
export type BalanceStep = { op: "take"; n: number } | { op: "takeX" } | { op: "share"; by: number };

/** Both pans after a step - or why it can't be done. */
export function applyStep([l, r]: [Pan, Pan], step: BalanceStep): { pans: [Pan, Pan] } | { why: ChoiceText } {
  if (step.op === "take") {
    if (l.n < step.n || r.n < step.n) return { why: text("balance.why.notEnough", { n: step.n }) };
    return { pans: [{ ...l, n: l.n - step.n }, { ...r, n: r.n - step.n }] };
  }
  if (step.op === "takeX") {
    if (l.x < 1 || r.x < 1) return { why: text("balance.why.noX") };
    return { pans: [{ ...l, x: l.x - 1 }, { ...r, x: r.x - 1 }] };
  }
  const by = step.by;
  if ([l.x, l.n, r.x, r.n].some((v) => v % by !== 0)) return { why: text("balance.why.notShare", { by }) };
  return { pans: [{ x: l.x / by, n: l.n / by }, { x: r.x / by, n: r.n / by }] };
}

/** x, when the pans say it: one x alone on one side, only weights on the other. */
export function solvedValue([l, r]: [Pan, Pan]): number | null {
  if (l.x === 1 && l.n === 0 && r.x === 0) return r.n;
  if (r.x === 1 && r.n === 0 && l.x === 0) return l.n;
  return null;
}

/** A pan as LaTeX: 3x + 4, x, 12, 0. */
export function panLatex({ x, n }: Pan): string {
  const xs = x === 0 ? "" : x === 1 ? "x" : `${x}x`;
  if (xs && n) return `${xs} + ${n}`;
  return xs || String(n);
}

/** The fewest steps to take n weights off with 10s, 5s and 1s. */
const takeSteps = (n: number) => Math.floor(n / 10) + Math.floor((n % 10) / 5) + (n % 5);

function make(stageId: BalanceStageId, rng: Rng, a: number, c: number, b: number, v: number): BalanceProblem {
  // a x + b = c x + d, with x = v; the side with more x on the left (or right, at random).
  const d = (a - c) * v + b;
  const [left, right]: [Pan, Pan] = rng() < 0.7 ? [{ x: a, n: b }, { x: c, n: d }] : [{ x: c, n: d }, { x: a, n: b }];
  const steps = c + takeSteps(b) + (a - c > 1 ? 1 : 0);
  return {
    stageId,
    kind: "balanceSolve",
    prompt: text("balance.prompt"),
    left,
    right,
    answer: v,
    steps,
    tip: text(c > 0 ? "balance.tipBoth" : a > 1 ? "balance.tipShare" : "balance.tipTake"),
    explanation: text(c > 0 ? "balance.explainBoth" : a > 1 ? "balance.explainShare" : "balance.explainTake", { a, b, c, d, v, k: a - c, e: d - b }),
  };
}

export const BALANCE_QUESTIONS = questionType<"balance", BalanceProblem, BalanceStageId>({
  id: "balance",
  kinds: ["balanceSolve"],
  levels: {
    // x + b = d
    "2.14.2": (rng) => make("2.14.2", rng, 1, 0, randInt(rng, 2, 9), randInt(rng, 1, 12)),
    // a x + b = d
    "3.3.10": (rng) => make("3.3.10", rng, randInt(rng, 2, 5), 0, randInt(rng, 1, 9), randInt(rng, 1, 9)),
    // a x + b = c x + d
    "3.3.11": (rng) => {
      const c = randInt(rng, 1, 3);
      return make("3.3.11", rng, c + randInt(rng, 1, 3), c, randInt(rng, 1, 8), randInt(rng, 1, 8));
    },
  },
  key: (p) => `balance:${p.stageId}:${panLatex(p.left)}=${panLatex(p.right)}`,
});
