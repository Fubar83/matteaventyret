/**
 * Placing a number on a number line: tap where it goes. The line has its
 * ticks and only some of them numbered - finding the place is the task:
 *
 *   förskoleklass 0.1.6 var på tallinjen? 0-10, numbered at 0, 5 and 10
 *   åk 1-3        1.8.7 tallinjen till 100 och 1000: 37 between the tens, 450 between the hundreds
 *   åk 4-6        2.6.8 bråk på tallinjen: 3/4 on a line in quarters, 5/4 past 1
 *                 2.16.5 decimaltal på tallinjen: 0,7 on tenths, 2,35 between them
 *                 2.17.3 negativa tal på tallinjen: −7 left of zero
 *                 2.16.7 inzoomade tallinjer: 3,47 between 3,4 and 3,5; 347 between 340 and 350
 *                 2.11.4 dubbel tallinje: 0-100 % above, 0-240 kr below - where is 60 kr?
 *                 2.9.10 tidslinjen: 08:00-12:00 in quarters - when the film ends
 *   åk 7-9        3.1.7 uppskatta på tallinjen: √50, π, −√5
 *
 * How it works, and what must stay true: docs/question-types/numberLine.md.
 */
import { pick, randInt, type Rng } from "../../rng";
import { text, type ChoiceText } from "../choice/problem";
import { questionType, retry } from "../questionType";
import { tex } from "../written/problem";

export type NumberLineStageId = "0.1.6" | "1.8.7" | "2.6.8" | "2.16.5" | "2.17.3" | "3.1.7" | "2.16.7" | "2.11.4" | "2.9.10";

export interface NumberLineProblem {
  stageId: NumberLineStageId;
  kind: "placeOnLine";
  prompt: ChoiceText;
  /** What to place, shown big (LaTeX). */
  target: string;
  value: number;
  /** The line: from, to, a tick every `step`. */
  from: number;
  to: number;
  step: number;
  /** The numbered ticks, each with its label (LaTeX). */
  labels: { at: number; latex: string }[];
  /** A second row of labels under the first - the other scale of a double number line (kr under %). */
  second?: { at: number; latex: string }[];
  /** Where the marker can go: multiples of `snap` (from `from`). */
  snap: number;
  /** How close is right: 0 for exactly, more where it's estimated between ticks. */
  tolerance: number;
  tip: ChoiceText;
  explanation: ChoiceText;
}

const numbered = (from: number, to: number, every: number) =>
  Array.from({ length: Math.round((to - from) / every) + 1 }, (_, i) => {
    const at = Math.round((from + i * every) * 1e9) / 1e9;
    return { at, latex: tex(at) };
  });

/** Right where it is, or how far off and to which side. */
export function placed(p: NumberLineProblem, at: number): "right" | "tooLow" | "tooHigh" {
  if (Math.abs(at - p.value) <= p.tolerance + 1e-9) return "right";
  return at < p.value ? "tooLow" : "tooHigh";
}

/** 0.1.6: a whole number 0-10, on a line numbered only at 0, 5 and 10. */
function toTen(rng: Rng): NumberLineProblem {
  const n = pick(rng, [1, 2, 3, 4, 6, 7, 8, 9]);
  return {
    stageId: "0.1.6",
    kind: "placeOnLine",
    prompt: text("line.place", { n }),
    target: String(n),
    value: n,
    from: 0,
    to: 10,
    step: 1,
    labels: numbered(0, 10, 5),
    snap: 1,
    tolerance: 0,
    tip: text("line.tipCount"),
    explanation: text(n < 5 ? "line.explainFromZero" : "line.explainFromFive", { n, k: n < 5 ? n : n - 5 }),
  };
}

/** 1.8.7: 0-100 numbered in tens (place 37 between 30 and 40), or 0-1000 in hundreds. */
function hundredsAndThousands(rng: Rng): NumberLineProblem {
  const big = rng() < 0.4;
  const unit = big ? 10 : 1;
  // Not on a numbered tick: that would be reading, not placing.
  const n = retry("1.8.7", () => {
    // Away from the ends: 1 or 5 on 0-100 is just "by the 0".
    const m = unit * randInt(rng, 11, 89);
    return m % (10 * unit) === 0 ? null : m;
  });
  const to = 100 * unit;
  return {
    stageId: "1.8.7",
    kind: "placeOnLine",
    prompt: text("line.place", { n }),
    target: String(n),
    value: n,
    from: 0,
    to,
    step: 10 * unit,
    labels: numbered(0, to, 10 * unit),
    snap: unit,
    // Between two numbered ticks it's an estimate: a couple of steps either way.
    tolerance: 2 * unit,
    tip: text("line.tipBetween", { a: Math.floor(n / (10 * unit)) * 10 * unit, b: (Math.floor(n / (10 * unit)) + 1) * 10 * unit }),
    explanation: text("line.explainBetween", { n, a: Math.floor(n / (10 * unit)) * 10 * unit, b: (Math.floor(n / (10 * unit)) + 1) * 10 * unit }),
  };
}

/** 2.6.8: a fraction on a line cut in its denominator - past 1 too (5/4). */
function fractions(rng: Rng): NumberLineProblem {
  const p = pick(rng, [2, 3, 4, 5, 6, 8, 10]);
  const to = rng() < 0.4 ? 2 : 1;
  // Not a whole number: 4/4 is just 1.
  const s = retry("2.6.8", () => {
    const t = randInt(rng, 1, to * p - 1);
    return t % p === 0 ? null : t;
  });
  return {
    stageId: "2.6.8",
    kind: "placeOnLine",
    prompt: text("line.placeFraction"),
    target: `\\dfrac{${s}}{${p}}`,
    value: s / p,
    from: 0,
    to,
    step: 1 / p,
    labels: numbered(0, to, 1),
    snap: 1 / p,
    tolerance: 0,
    tip: text("line.tipFraction", { p }),
    explanation: text(s > p ? "line.explainFractionPast" : "line.explainFraction", { s, p, r: s - p }),
  };
}

/** 2.16.5: a decimal - on the tenths exactly, or between them (2,35). */
function decimals(rng: Rng): NumberLineProblem {
  const whole = randInt(rng, 0, 4);
  const hundredths = rng() < 0.45;
  // Hundredths that aren't tenths too: 2,35, not 2,30.
  const value = retry("2.16.5", () => {
    const v = Math.round((hundredths ? whole + randInt(rng, 1, 99) / 100 : whole + randInt(rng, 1, 9) / 10) * 100) / 100;
    // Not on a numbered tick either (x,5 is one).
    return (hundredths && Math.round(v * 100) % 10 === 0) || Math.round(v * 100) % 50 === 0 ? null : v;
  });
  return {
    stageId: "2.16.5",
    kind: "placeOnLine",
    prompt: text("line.placeDecimal"),
    target: tex(value),
    value,
    from: whole,
    to: whole + 1,
    step: 0.1,
    labels: numbered(whole, whole + 1, 0.5),
    snap: hundredths ? 0.01 : 0.1,
    tolerance: hundredths ? 0.02 : 0,
    tip: text(hundredths ? "line.tipHundredths" : "line.tipTenths"),
    explanation: text(hundredths ? "line.explainHundredths" : "line.explainTenths", {
      v: tex(value).replace("{,}", ","),
      a: tex(Math.floor(value * 10) / 10).replace("{,}", ","),
      b: tex(Math.round((Math.floor(value * 10) + 1)) / 10).replace("{,}", ","),
    }),
  };
}

/** 2.17.3: a negative number, on a line from −10 to 10 numbered every five. */
function negatives(rng: Rng): NumberLineProblem {
  const n = -pick(rng, [1, 2, 3, 4, 6, 7, 8, 9]);
  return {
    stageId: "2.17.3",
    kind: "placeOnLine",
    prompt: text("line.placeNegative"),
    target: tex(n),
    value: n,
    from: -10,
    to: 10,
    step: 1,
    labels: numbered(-10, 10, 5),
    snap: 1,
    tolerance: 0,
    tip: text("line.tipNegative"),
    explanation: text("line.explainNegative", { n: -n }),
  };
}

/** Numbers to estimate: their LaTeX and value. */
const ESTIMATES: [string, number][] = [
  ["\\sqrt{50}", Math.sqrt(50)],
  ["\\sqrt{20}", Math.sqrt(20)],
  ["\\sqrt{10}", Math.sqrt(10)],
  ["\\sqrt{30}", Math.sqrt(30)],
  ["\\sqrt{70}", Math.sqrt(70)],
  ["\\pi", Math.PI],
  ["2\\pi", 2 * Math.PI],
  ["\\dfrac{22}{7}", 22 / 7],
];

/** 3.1.7: an irrational number to estimate - between which whole numbers, and nearer which. */
function estimate(rng: Rng): NumberLineProblem {
  const [latex, raw] = pick(rng, ESTIMATES);
  const negative = rng() < 0.25;
  const value = negative ? -raw : raw;
  const [from, to] = negative ? [-10, 0] : [0, 10];
  return {
    stageId: "3.1.7",
    kind: "placeOnLine",
    prompt: text("line.estimate"),
    target: negative ? `-${latex}` : latex,
    value,
    from,
    to,
    step: 1,
    labels: numbered(from, to, 1),
    snap: 0.1,
    tolerance: 0.2,
    tip: text("line.tipEstimate"),
    explanation: text("line.explainEstimate", { v: tex(Math.round(value * 100) / 100).replace("{,}", ",") }),
  };
}

/** 2.16.7: a line zoomed in - 3,4 to 3,5 in hundredths, or 340 to 350 in ones. */
function zoomed(rng: Rng): NumberLineProblem {
  const decimal = rng() < 0.6;
  const scale = decimal ? 0.01 : 1;
  const from = decimal ? randInt(rng, 1, 9) + randInt(rng, 0, 9) / 10 : 10 * randInt(rng, 11, 99);
  const k = pick(rng, [1, 2, 3, 4, 6, 7, 8, 9]);
  const r = (n: number) => Math.round(n * 100) / 100;
  const value = r(from + k * scale);
  return {
    stageId: "2.16.7",
    kind: "placeOnLine",
    prompt: text("line.placeZoomed"),
    target: tex(value),
    value,
    from: r(from),
    to: r(from + 10 * scale),
    step: scale,
    labels: [r(from), r(from + 10 * scale)].map((at) => ({ at, latex: tex(at) })),
    snap: scale,
    tolerance: 0,
    tip: text("line.tipZoomed", { step: tex(scale).replace("{,}", ",") }),
    explanation: text("line.explainZoomed", { v: tex(value).replace("{,}", ","), a: tex(r(from)).replace("{,}", ","), k }),
  };
}

/** 2.11.4: a double number line - percent above, kronor below; where an amount is. */
function doubleLine(rng: Rng): NumberLineProblem {
  const total = pick(rng, [80, 120, 200, 240, 400, 600]);
  const p = pick(rng, [10, 20, 25, 30, 40, 60, 70, 75, 80, 90]);
  const kr = (total * p) / 100;
  return {
    stageId: "2.11.4",
    kind: "placeOnLine",
    prompt: text("line.placeDouble", { kr, total }),
    target: `${kr}\\text{ kr}`,
    value: p,
    from: 0,
    to: 100,
    step: 5,
    labels: [0, 50, 100].map((at) => ({ at, latex: `${at} %` })),
    second: [0, 100].map((at) => ({ at, latex: `${(total * at) / 100} kr` })),
    snap: 5,
    tolerance: 0,
    tip: text("line.tipDouble", { total }),
    explanation: text("line.explainDouble", { kr, total, p }),
  };
}

const clock = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/** 2.9.10: a timeline in quarters - a time, or when something ends that lasts so long. */
function timeline(rng: Rng): NumberLineProblem {
  const from = 60 * randInt(rng, 7, 15);
  const to = from + 240;
  const lasts = rng() < 0.5;
  const start = from + 15 * randInt(rng, 1, 6);
  // Never on a whole hour: those are numbered, and that would be reading, not placing.
  const quarters = [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15];
  const value = lasts ? from + 15 * pick(rng, quarters.filter((q) => from + 15 * q - start >= 45)) : from + 15 * pick(rng, quarters);
  const duration = value - start;
  // 1 h 45 min, 45 min, 2 h - no zeros.
  const [h, m] = [Math.floor(duration / 60), duration % 60];
  const words = [h ? `${h} h` : "", m ? `${m} min` : ""].filter(Boolean).join(" ");
  return {
    stageId: "2.9.10",
    kind: "placeOnLine",
    prompt: lasts ? text("line.placeEnds", { t: clock(start), d: words }) : text("line.placeTime", { t: clock(value) }),
    target: (lasts ? `${clock(start)} + \\text{${words}}` : clock(value)).replace(/:/g, "{:}"),
    value,
    from,
    to,
    step: 15,
    labels: [0, 60, 120, 180, 240].map((d) => ({ at: from + d, latex: clock(from + d) })),
    snap: 15,
    tolerance: 0,
    tip: text(lasts ? "line.tipEnds" : "line.tipTime"),
    explanation: text("line.explainTime", { t: clock(value) }),
  };
}

export const NUMBER_LINE_QUESTIONS = questionType<"numberLine", NumberLineProblem, NumberLineStageId>({
  id: "numberLine",
  kinds: ["placeOnLine"],
  levels: {
    "0.1.6": toTen,
    "1.8.7": hundredsAndThousands,
    "2.6.8": fractions,
    "2.16.5": decimals,
    "2.17.3": negatives,
    "3.1.7": estimate,
    "2.16.7": zoomed,
    "2.11.4": doubleLine,
    "2.9.10": timeline,
  },
  key: (p) => `line:${p.stageId}:${p.target}:${p.from}:${p.to}`,
});
