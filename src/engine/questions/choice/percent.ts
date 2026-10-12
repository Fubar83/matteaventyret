/**
 * Percent in åk 7-9, as single-choice questions:
 *
 *   3.2.3 procentenheter: from 4 % to 5 % is 1 procentenhet - and 25 percent
 *   3.2.4 ränta: a year's interest, and ränta på ränta over two years
 *
 * The slips: procentenheter taken for procent, 3 % as 1,3 instead of 1,03,
 * the second year's interest without the first year's on top.
 */
import { pick, type Rng } from "../../rng";
import { plainOption, shuffledOptions, text, textOption, type ChoiceProblem, type Slip } from "./problem";

export type PercentChoiceStageId = "3.2.3" | "3.2.4";

/** A Swedish number in words' company: 2 121,80 - spaces in the thousands, a comma for the öre. */
export function swedish(n: number, decimals = 0): string {
  const [whole, frac] = n.toFixed(decimals).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return frac ? `${grouped},${frac}` : grouped;
}
const kronor = (n: number) => plainOption(`${swedish(n, Number.isInteger(Math.round(n * 100) / 100) ? 0 : 2)} kr`);

/** Rates where the change in percent comes out whole: from 4 % to 5 % is 25 % more. */
const RATE_PAIRS: [number, number][] = [
  [2, 3], [4, 5], [4, 6], [5, 6], [5, 7], [10, 12], [10, 15], [20, 25], [20, 30], [25, 30], [8, 6], [5, 4], [10, 8], [20, 15], [4, 3],
];
const CONTEXTS = ["interest", "party", "unemployment", "cycling"];

/** 3.2.3: procentenheter or procent - the difference, and how much that is of where it started. */
function percentagePoints(rng: Rng): ChoiceProblem {
  const [a, b] = pick(rng, RATE_PAIRS);
  const context = pick(rng, CONTEXTS);
  const diff = Math.abs(b - a);
  const rel = (100 * diff) / a;
  const up = b > a;
  const pp = (n: number) => textOption(n === 1 ? "choice.points.onePoint" : "choice.points.points", { n });
  const pct = (n: number) => plainOption(`${n}\u00a0%`);
  const vars = { a, b, context: `@choice.points.context.${context}` };
  if (rng() < 0.5) {
    return {
      stageId: "3.2.3",
      kind: "choice",
      prompt: text(up ? "choice.points.howManyUp" : "choice.points.howManyDown", vars),
      ...shuffledOptions(rng, pp(diff), [
        { option: pct(diff), why: text("choice.points.whyPercent") },
        { option: pp(rel), why: text("choice.points.whyRelative") },
        { option: pct(rel), why: text("choice.points.whyAsked") },
      ]),
      tip: text("choice.points.tip"),
      explanation: text("choice.points.explain", { a, b, d: diff }),
    };
  }
  const slips: Slip[] = [
    { option: pct(diff), why: text("choice.points.whyPoints", { d: diff }) },
    { option: pct(Math.round((100 * diff) / b)), why: text("choice.points.whyBase", { a }) },
    { option: pp(rel), why: text("choice.points.whyAsked") },
  ];
  return {
    stageId: "3.2.3",
    kind: "choice",
    prompt: text(up ? "choice.points.percentUp" : "choice.points.percentDown", vars),
    ...shuffledOptions(rng, pct(rel), slips),
    tip: text("choice.points.tipPercent"),
    explanation: text("choice.points.explainPercent", { a, b, d: diff, r: rel }),
  };
}

/** 3.2.4: interest - a year's, and two years' with ränta på ränta. */
function interest(rng: Rng): ChoiceProblem {
  const k = pick(rng, [1000, 2000, 5000, 10000, 20000]);
  const r = pick(rng, [2, 3, 4, 5, 10]);
  const factor = 1 + r / 100;
  const yearly = (k * r) / 100;
  const vars = { k: swedish(k), r };
  if (rng() < 0.5) {
    return {
      stageId: "3.2.4",
      kind: "choice",
      prompt: text("choice.interest.oneYear", vars),
      ...shuffledOptions(rng, kronor(k * factor), [
        { option: kronor(yearly), why: text("choice.interest.whyOnlyInterest") },
        { option: kronor(k * (1 + r / 10)), why: text("choice.interest.whyFactor", { r, f: swedish(factor, 2) }) },
        { option: kronor(k + r), why: text("choice.interest.whyKronor", { r }) },
      ]),
      tip: text("choice.interest.tip", { r, f: swedish(factor, 2) }),
      explanation: text("choice.interest.explainOne", { k: swedish(k), r, i: swedish(yearly), s: swedish(k * factor) }),
    };
  }
  const two = Math.round(k * factor * factor * 100) / 100;
  return {
    stageId: "3.2.4",
    kind: "choice",
    prompt: text("choice.interest.twoYears", vars),
    ...shuffledOptions(rng, kronor(two), [
      { option: kronor(k + 2 * yearly), why: text("choice.interest.whyCompound") },
      { option: kronor(k * factor), why: text("choice.interest.whyOneYear") },
      { option: kronor(k * (1 + (2 * r) / 10)), why: text("choice.interest.whyFactor", { r, f: swedish(factor, 2) }) },
    ]),
    tip: text("choice.interest.tipTwo", { f: swedish(factor, 2) }),
    explanation: text("choice.interest.explainTwo", { k: swedish(k), f: swedish(factor, 2), a: swedish(k * factor, 2), s: swedish(two, 2) }),
  };
}

export const PERCENT_CHOICES: Record<PercentChoiceStageId, (rng: Rng) => ChoiceProblem> = {
  "3.2.3": percentagePoints,
  "3.2.4": interest,
};
