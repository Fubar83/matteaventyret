/**
 * Percent in åk 7-9, as single-choice questions:
 *
 *   3.2.3 procentenheter: from 4 % to 5 % is 1 procentenhet - and 25 percent
 *   3.2.4 ränta: a year's interest, and ränta på ränta over two years
 *   3.2.5 rea och moms: 25 % off, 25 % VAT on - and the price without VAT (not 75 %)
 *   3.2.6 lån och amortering: paying back each month, the month's interest
 *
 * The slips: procentenheter taken for procent, 3 % as 1,3 instead of 1,03,
 * the second year's interest without the first year's on top.
 */
import { pick, randInt, type Rng } from "../../rng";
import { plainOption, shuffledOptions, text, textOption, type ChoiceProblem, type Slip } from "./problem";

export type PercentChoiceStageId = "3.2.3" | "3.2.4" | "3.2.5" | "3.2.6";

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

/** 3.2.5: sales and VAT - 25 % off; 25 % VAT on; and back from the price with VAT (dividing by 1,25, not taking 25 % off). */
function salesAndVat(rng: Rng): ChoiceProblem {
  const kind = rng();
  if (kind < 0.4) {
    const price = pick(rng, [200, 400, 600, 800, 1200]);
    const p = pick(rng, [10, 20, 25, 30, 40, 50]);
    const off = (price * p) / 100;
    return {
      stageId: "3.2.5",
      kind: "choice",
      prompt: text("choice.sale.prompt", { k: price, p }),
      ...shuffledOptions(rng, kronor(price - off), [
        { option: kronor(off), why: text("choice.sale.whyOff") },
        { option: kronor(price - p), why: text("choice.sale.whyKronor", { p }) },
        { option: kronor(price + off), why: text("choice.sale.whyUp") },
      ]),
      tip: text("choice.sale.tip", { p, f: swedish(1 - p / 100, 2) }),
      explanation: text("choice.sale.explain", { k: price, p, o: off, r: price - off }),
    };
  }
  const without = 4 * randInt(rng, 25, 300);
  const vat = without / 4;
  if (kind < 0.7) {
    return {
      stageId: "3.2.5",
      kind: "choice",
      prompt: text("choice.vat.add", { k: without }),
      ...shuffledOptions(rng, kronor(without + vat), [
        { option: kronor(vat), why: text("choice.vat.whyOnly") },
        { option: kronor(without + 25), why: text("choice.vat.whyKronor") },
        { option: kronor(without * 0.75), why: text("choice.vat.whyDown") },
      ]),
      tip: text("choice.vat.tipAdd"),
      explanation: text("choice.vat.explainAdd", { k: without, m: vat, r: without + vat }),
    };
  }
  const withVat = without + vat;
  return {
    stageId: "3.2.5",
    kind: "choice",
    prompt: text("choice.vat.remove", { k: withVat }),
    ...shuffledOptions(rng, kronor(without), [
      { option: kronor(withVat * 0.75), why: text("choice.vat.whyQuarter", { k: withVat }) },
      { option: kronor(vat), why: text("choice.vat.whyOnly") },
      { option: kronor(withVat - 25), why: text("choice.vat.whyKronor") },
    ]),
    tip: text("choice.vat.tipRemove"),
    explanation: text("choice.vat.explainRemove", { k: withVat, r: without }),
  };
}

/** 3.2.6: a loan - paying back the same each month, and the interest on what's left. */
function loans(rng: Rng): ChoiceProblem {
  const years = pick(rng, [1, 2, 3, 5]);
  const loan = 12 * years * pick(rng, [100, 200, 250, 500, 1000]);
  if (rng() < 0.5) {
    const monthly = loan / (12 * years);
    return {
      stageId: "3.2.6",
      kind: "choice",
      prompt: text("choice.loan.amortise", { k: swedish(loan), y: years }),
      ...shuffledOptions(rng, kronor(monthly), [
        ...(years > 1 ? [{ option: kronor(loan / years), why: text("choice.loan.whyYear") }, { option: kronor(loan / 12), why: text("choice.loan.whyOneYear", { y: years }) }] : [{ option: kronor(loan), why: text("choice.loan.whyAll") }]),
        { option: kronor(monthly * 2), why: text("choice.loan.whyMonths", { m: 12 * years }) },
      ]),
      tip: text("choice.loan.tipAmortise", { m: 12 * years }),
      explanation: text("choice.loan.explainAmortise", { k: swedish(loan), m: 12 * years, r: swedish(monthly) }),
    };
  }
  const r = pick(rng, [3, 4, 5, 6]);
  const yearly = (loan * r) / 100;
  return {
    stageId: "3.2.6",
    kind: "choice",
    prompt: text("choice.loan.interest", { k: swedish(loan), r }),
    ...shuffledOptions(rng, kronor(yearly / 12), [
      { option: kronor(yearly), why: text("choice.loan.whyYearly") },
      { option: kronor(r), why: text("choice.interest.whyKronor", { r }) },
      { option: kronor(yearly / 6), why: text("choice.loan.whyMonths", { m: 12 }) },
    ]),
    tip: text("choice.loan.tipInterest"),
    explanation: text("choice.loan.explainInterest", { k: swedish(loan), r, y: swedish(yearly, Number.isInteger(yearly) ? 0 : 2), m: swedish(yearly / 12, Number.isInteger(yearly / 12) ? 0 : 2) }),
  };
}

export const PERCENT_CHOICES: Record<PercentChoiceStageId, (rng: Rng) => ChoiceProblem> = {
  "3.2.3": percentagePoints,
  "3.2.4": interest,
  "3.2.5": salesAndVat,
  "3.2.6": loans,
};
