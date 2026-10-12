/**
 * Percent in åk 7-9, as single-choice questions:
 *
 *   3.2.3 procentenheter: from 4 % to 5 % is 1 procentenhet - and 25 percent
 *   3.2.4 ränta: a year's interest, and ränta på ränta over two years
 *   3.2.5 rea och moms: 25 % off, 25 % VAT on - and the price without VAT (not 75 %)
 *   3.2.6 lån och amortering: paying back each month, the month's interest
 *   3.2.7 budget: what's left of the salary, months of saving (rounded up), the rent's share
 *
 * The slips: procentenheter taken for procent, 3 % as 1,3 instead of 1,03,
 * the second year's interest without the first year's on top.
 */
import { pick, randInt, type Rng } from "../../rng";
import { retry } from "../questionType";
import { plainOption, shuffledOptions, text, textOption, type ChoiceProblem, type Slip } from "./problem";

export type PercentChoiceStageId = "3.2.3" | "3.2.4" | "3.2.5" | "3.2.6" | "3.2.7";

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

/** A salary, and the share of it the rent takes - a whole number of percent, in whole hundreds of kronor. */
const SALARY_RENT: [number, number][] = [
  [18000, 35], [20000, 30], [20000, 35], [22000, 30], [24000, 25], [24000, 30], [25000, 28], [25000, 32], [26000, 25],
];

/**
 * 3.2.7: a month's budget - salary in, rent, food, phone, travel and fun out.
 * What's left over; how many months of saving that to buy something (whole
 * months, so rounded up); what share of the salary the rent is.
 */
function budget(rng: Rng): ChoiceProblem {
  return retry("budget 3.2.7", () => {
    const [salary, rentPct] = pick(rng, SALARY_RENT);
    const costs = [
      { label: "choice.budget.rent", kr: (salary * rentPct) / 100 },
      { label: "choice.budget.food", kr: 100 * randInt(rng, 30, 45) },
      { label: "choice.budget.phone", kr: 100 * randInt(rng, 2, 4) },
      { label: "choice.budget.travel", kr: 100 * randInt(rng, 5, 9) },
      { label: "choice.budget.fun", kr: 100 * randInt(rng, 10, 20) },
    ];
    const out = costs.reduce((s, c) => s + c.kr, 0);
    const left = salary - out;
    if (left < 1500 || left > 6000) return null;
    const scene = { kind: "budget" as const, income: [{ label: "choice.budget.salary", kr: salary }], costs };
    const ask = pick(rng, ["left", "months", "rent"] as const);
    if (ask === "left") {
      const smallest = Math.min(...costs.map((c) => c.kr));
      return {
        stageId: "3.2.7",
        kind: "choice",
        prompt: text("choice.budget.left"),
        scene,
        ...shuffledOptions(rng, kronor(left), [
          { option: kronor(left + smallest), why: text("choice.budget.whyForgot") },
          { option: kronor(out), why: text("choice.budget.whyOut") },
          { option: kronor(left - 1000), why: text("choice.budget.whyCount") },
        ]),
        tip: text("choice.budget.tipLeft"),
        explanation: text("choice.budget.explainLeft", { s: swedish(salary), o: swedish(out), l: swedish(left) }),
      };
    }
    if (ask === "months") {
      const months = randInt(rng, 2, 5);
      // A price that isn't saved in a whole number of months: the last month is needed too.
      const price = 500 * Math.round((left * (months - 0.5)) / 500);
      if (Math.ceil(price / left) !== months || price % left === 0) return null;
      // Something that costs about that: a phone, a bike, a trip.
      const goal = price <= 6000 ? "phone" : price <= 12000 ? "bike" : "trip";
      const monthsOption = (n: number) => textOption(n === 1 ? "choice.budget.oneMonth" : "choice.budget.nMonths", { n });
      return {
        stageId: "3.2.7",
        kind: "choice",
        prompt: text("choice.budget.months", { p: swedish(price), goal: `@choice.budget.goal.${goal}` }),
        scene,
        ...shuffledOptions(rng, monthsOption(months), [
          { option: monthsOption(months - 1), why: text("choice.budget.whyDown", { n: months - 1, s: swedish((months - 1) * left) }) },
          { option: monthsOption(months + 1), why: text("choice.budget.whyCount") },
          { option: monthsOption(Math.max(1, Math.round(price / salary))), why: text("choice.budget.whySalary") },
        ]),
        tip: text("choice.budget.tipMonths"),
        explanation: text("choice.budget.explainMonths", { l: swedish(left), p: swedish(price), n: months, s: swedish(months * left) }),
      };
    }
    const ofOut = Math.round((100 * costs[0].kr) / out);
    const pct = (n: number) => plainOption(`${n}\u00a0%`);
    if (ofOut === rentPct) return null;
    return {
      stageId: "3.2.7",
      kind: "choice",
      prompt: text("choice.budget.rentShare"),
      scene,
      ...shuffledOptions(rng, pct(rentPct), [
        { option: pct(ofOut), why: text("choice.budget.whyOfOut") },
        { option: pct(100 - rentPct), why: text("choice.budget.whyRest") },
        { option: plainOption(`0,${rentPct}\u00a0%`), why: text("choice.budget.whyHundred") },
      ]),
      tip: text("choice.budget.tipShare"),
      explanation: text("choice.budget.explainShare", { r: swedish(costs[0].kr), s: swedish(salary), p: rentPct }),
    };
  });
}

export const PERCENT_CHOICES: Record<PercentChoiceStageId, (rng: Rng) => ChoiceProblem> = {
  "3.2.7": budget,
  "3.2.3": percentagePoints,
  "3.2.4": interest,
  "3.2.5": salesAndVat,
  "3.2.6": loans,
};
