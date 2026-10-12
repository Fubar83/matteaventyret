/**
 * Tables and charts, as single-choice questions:
 *
 *   åk 1-3  1.13.1 streckräkning: tally marks - how many, which most, how many together
 *   åk 4-6  2.8.6  cirkeldiagram: what part of the pie, how many of the class, which most
 *           2.9.7  tidtabeller: when the bus is at the school, how long the trip takes, which bus to take
 *   åk 7-9  3.7.3  medelvärde eller median: which tells the typical value, an outlier
 *           3.7.4  missvisande diagram: an axis that starts above 0; how much bigger it really is
 *
 * Read off a table or a chart: the wrong options are read off the wrong row,
 * the bundles counted as ones, the neighbouring sector, the bus before.
 */
import { pick, randInt, shuffle, type Rng } from "../../rng";
import type { QuestionScene } from "../scene";
import { tex } from "../written/problem";
import { fixedOptions, fractionOption, numberOption, plainOption, shuffledOptions, text, textOption, type ChoiceOption, type ChoiceProblem, type Slip } from "./problem";

export type DataChoiceStageId = "1.13.1" | "2.8.6" | "2.9.7" | "3.7.3" | "3.7.4";

const FRUITS = ["apple", "banana", "pear", "orange", "grapes"];
const SPORTS = ["football", "swimming", "hockey", "dance", "riding"];

/** 1.13.1: tally marks - a bundle of five is four lines and one across. */
function tally(rng: Rng): ChoiceProblem {
  const labels = shuffle(rng, FRUITS).slice(0, randInt(rng, 3, 4));
  const counts = shuffle(rng, [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]).slice(0, labels.length);
  const rows = labels.map((l, i) => ({ label: `fruit.${l}`, count: counts[i] }));
  const scene = { kind: "tally" as const, rows };
  const kind = rng();
  if (kind < 0.5) {
    const i = randInt(rng, 0, rows.length - 1);
    const n = counts[i];
    const bundles = Math.floor(n / 5);
    const slips: Slip[] = [];
    // Each bundle counted as one - or as four, the line across forgotten.
    if (bundles > 0) slips.push({ option: numberOption(bundles + (n % 5)), why: text("choice.tally.whyBundle") });
    if (bundles > 0) slips.push({ option: numberOption(n - bundles), why: text("choice.tally.whyAcross") });
    slips.push({ option: numberOption(n + 1), why: text("choice.tally.whyRecount") }, { option: numberOption(n - 1), why: text("choice.tally.whyRecount") });
    for (const c of counts) if (c !== n) slips.push({ option: numberOption(c), why: text("choice.tally.whyRow") });
    return {
      stageId: "1.13.1",
      kind: "choice",
      prompt: text("choice.tally.howMany", { x: `@fruit.${labels[i]}` }),
      scene,
      ...shuffledOptions(rng, numberOption(n), slips),
      tip: text("choice.tally.tip"),
      explanation: text("choice.tally.explain", { n, b: bundles, r: n % 5, x: `@fruit.${labels[i]}` }),
    };
  }
  if (kind < 0.75) {
    const most = counts.indexOf(Math.max(...counts));
    return {
      stageId: "1.13.1",
      kind: "choice",
      prompt: text("choice.tally.most"),
      scene,
      ...shuffledOptions(
        rng,
        textOption(`fruit.${labels[most]}`),
        labels.filter((_, k) => k !== most).map((l) => ({ option: textOption(`fruit.${l}`), why: text("choice.tally.whyFewer", { x: `@fruit.${l}`, n: counts[labels.indexOf(l)] }) }))
      ),
      tip: text("choice.tally.tipMost"),
      explanation: text("choice.tally.explainMost", { x: `@fruit.${labels[most]}`, n: counts[most] }),
    };
  }
  const [i, j] = shuffle(rng, rows.map((_, k) => k)).slice(0, 2);
  const sum = counts[i] + counts[j];
  return {
    stageId: "1.13.1",
    kind: "choice",
    prompt: text("choice.tally.together", { x: `@fruit.${labels[i]}`, y: `@fruit.${labels[j]}` }),
    scene,
    ...shuffledOptions(rng, numberOption(sum), [
      { option: numberOption(Math.abs(counts[i] - counts[j])), why: text("choice.tally.whyTogether") },
      { option: numberOption(sum + 1), why: text("choice.tally.whyRecount") },
      { option: numberOption(sum - 1), why: text("choice.tally.whyRecount") },
      { option: numberOption(counts.reduce((s, c) => s + c, 0)), why: text("choice.tally.whyAll") },
    ]),
    tip: text("choice.tally.tipTogether"),
    explanation: text("choice.tally.explainTogether", { a: counts[i], b: counts[j], s: sum }),
  };
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
/** A fraction in its simplest form, as an option. */
const simplest = (s: number, p: number): ChoiceOption => {
  const g = gcd(s, p);
  return fractionOption(s / g, p / g);
};
const percent = (n: number) => plainOption(`${tex(n).replace("{,}", ",")}\u00a0%`);

/**
 * Parts of the whole that read well off a pie: halves, quarters and eighths
 * (asked as fractions), or tenths and twentieths (asked as percent).
 */
function pieParts(rng: Rng): { total: number; parts: number[]; asPercent: boolean } {
  const asPercent = rng() < 0.5;
  const total = asPercent ? pick(rng, [10, 20]) : pick(rng, [4, 8]);
  // Parts that all differ: 4 splits only in two (1 + 3), 8 in at most three (1 + 2 + 5).
  const n = total === 4 ? 2 : total === 8 ? 3 : randInt(rng, 3, 4);
  for (;;) {
    const cuts = shuffle(rng, Array.from({ length: total - 1 }, (_, i) => i + 1)).slice(0, n - 1).sort((a, b) => a - b);
    const parts = [...cuts, total].map((c, i, a) => c - (i === 0 ? 0 : a[i - 1]));
    // Different sizes, so "which is biggest" and the slips are clear.
    if (new Set(parts).size === parts.length) return { total, parts, asPercent };
  }
}

/** 2.8.6: a pie chart - what part a sector is, how many that is of the class, which was most chosen. */
function pieChart(rng: Rng): ChoiceProblem {
  const { total, parts, asPercent } = pieParts(rng);
  const labels = shuffle(rng, SPORTS).slice(0, parts.length);
  const scene = { kind: "pie" as const, sectors: labels.map((l, i) => ({ label: `sport.${l}`, parts: parts[i] })), total };
  const i = randInt(rng, 0, parts.length - 1);
  const x = `@sport.${labels[i]}`;
  const kind = rng();
  const neighbour = parts[(i + 1) % parts.length];
  if (kind < 0.45) {
    const value = (p: number) => (asPercent ? percent((100 * p) / total) : simplest(p, total));
    const slips: Slip[] = [
      { option: value(neighbour), why: text("choice.pie.whyNeighbour") },
      { option: value(total - parts[i]), why: text("choice.pie.whyRest") },
      asPercent ? { option: percent(parts[i]), why: text("choice.pie.whyCount", { total }) } : { option: fractionOption(1, parts[i]), why: text("choice.pie.whyOne") },
      ...parts.filter((_, k) => k !== i).map((p) => ({ option: value(p), why: text("choice.pie.whyNeighbour") })),
    ];
    return {
      stageId: "2.8.6",
      kind: "choice",
      prompt: text(asPercent ? "choice.pie.percent" : "choice.pie.fraction", { x }),
      scene,
      ...shuffledOptions(rng, value(parts[i]), slips),
      tip: text(asPercent ? "choice.pie.tipPercent" : "choice.pie.tipFraction", { total, each: 100 / total }),
      explanation: text(asPercent ? "choice.pie.explainPercent" : "choice.pie.explainFraction", { p: parts[i], total, x, v: asPercent ? (100 * parts[i]) / total : `${parts[i]}/${total}` }),
    };
  }
  if (kind < 0.85) {
    const pupils = total * pick(rng, total >= 10 ? [2, 3, 5] : [4, 5, 6, 10]);
    const each = pupils / total;
    const right = parts[i] * each;
    return {
      stageId: "2.8.6",
      kind: "choice",
      prompt: text("choice.pie.howMany", { n: pupils, x }),
      scene,
      ...shuffledOptions(rng, numberOption(right), [
        { option: numberOption(parts[i]), why: text("choice.pie.whyParts", { total, n: pupils }) },
        { option: numberOption(neighbour * each), why: text("choice.pie.whyNeighbour") },
        { option: numberOption(pupils - right), why: text("choice.pie.whyRest") },
        { option: numberOption(asPercent ? (100 * parts[i]) / total : right + each), why: text(asPercent ? "choice.pie.whyPercent" : "choice.pie.whyParts", { total, n: pupils }) },
      ]),
      tip: text("choice.pie.tipHowMany", { total, n: pupils }),
      explanation: text("choice.pie.explainHowMany", { n: pupils, total, each, p: parts[i], r: right }),
    };
  }
  const most = parts.indexOf(Math.max(...parts));
  return {
    stageId: "2.8.6",
    kind: "choice",
    prompt: text("choice.pie.most"),
    scene,
    ...shuffledOptions(
      rng,
      textOption(`sport.${labels[most]}`),
      labels.filter((_, k) => k !== most).map((l) => ({ option: textOption(`sport.${l}`), why: text("choice.pie.whySmaller") }))
    ),
    tip: text("choice.pie.tipMost"),
    explanation: text("choice.pie.explainMost", { x: `@sport.${labels[most]}` }),
  };
}

const STOPS = ["Torget", "Skolan", "Badhuset", "Biblioteket", "Parken", "Stationen", "Kyrkan", "Hamnen"];
const clockText = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/** 2.9.7: a bus timetable - when it's at a stop, how long a trip takes, which bus to take to be there in time. */
function timetable(rng: Rng): ChoiceProblem {
  const stops = shuffle(rng, STOPS).slice(0, 4);
  // Minutes from the first stop: 4-12 minutes between stops.
  const offsets = [0];
  for (let k = 1; k < 4; k++) offsets.push(offsets[k - 1] + randInt(rng, 4, 12));
  const every = pick(rng, [15, 20, 30]);
  // The first bus some time 06:40-08:20, so a trip often goes past a full hour.
  const first = 400 + 5 * randInt(rng, 0, 20);
  const departures = [0, 1, 2].map((d) => first + d * every);
  const times = offsets.map((o) => departures.map((d) => clockText(d + o)));
  const scene = { kind: "timetable" as const, stops, times };
  const kind = rng();
  if (kind < 0.35) {
    const d = randInt(rng, 0, 2);
    const s = randInt(rng, 1, 3);
    const slips: Slip[] = [
      ...(d < 2 ? [{ option: plainOption(times[s][d + 1]), why: text("choice.bus.whyColumn") }] : []),
      ...(d > 0 ? [{ option: plainOption(times[s][d - 1]), why: text("choice.bus.whyColumn") }] : []),
      ...[s - 1, s + 1].filter((r) => r >= 0 && r < 4).map((r) => ({ option: plainOption(times[r][d]), why: text("choice.bus.whyRow", { stop: stops[s] }) })),
    ];
    return {
      stageId: "2.9.7",
      kind: "choice",
      prompt: text("choice.bus.when", { from: stops[0], t: times[0][d], to: stops[s] }),
      scene,
      ...shuffledOptions(rng, plainOption(times[s][d]), slips),
      tip: text("choice.bus.tipWhen"),
      explanation: text("choice.bus.explainWhen", { from: stops[0], t: times[0][d], to: stops[s], r: times[s][d] }),
    };
  }
  if (kind < 0.7) {
    const [a, b] = shuffle(rng, [0, 1, 2, 3]).slice(0, 2).sort((x, y) => x - y);
    const d = randInt(rng, 0, 2);
    const minutes = offsets[b] - offsets[a];
    const [ta, tb] = [departures[d] + offsets[a], departures[d] + offsets[b]];
    // Subtracting the clock times as numbers: 09:05 - 08:50 as 905 - 850.
    const asNumbers = Number(clockText(tb).replace(":", "")) - Number(clockText(ta).replace(":", ""));
    const min = (n: number) => plainOption(`${n} min`);
    const slips: Slip[] = [];
    if (asNumbers !== minutes) slips.push({ option: min(asNumbers), why: text("choice.bus.whyHour") });
    slips.push({ option: min(minutes + 10), why: text("choice.bus.whyCount") }, { option: min(every), why: text("choice.bus.whyEvery", { every }) });
    if (minutes > 10) slips.push({ option: min(minutes - 10), why: text("choice.bus.whyCount") });
    slips.push({ option: min(minutes + 5), why: text("choice.bus.whyCount") });
    if (minutes > 5) slips.push({ option: min(minutes - 5), why: text("choice.bus.whyCount") });
    return {
      stageId: "2.9.7",
      kind: "choice",
      prompt: text("choice.bus.howLong", { from: stops[a], to: stops[b] }),
      scene,
      ...shuffledOptions(rng, min(minutes), slips),
      tip: text("choice.bus.tipHowLong"),
      explanation: text("choice.bus.explainHowLong", { ta: clockText(ta), tb: clockText(tb), m: minutes }),
    };
  }
  // Be there by a time: the latest bus that makes it.
  const s = randInt(rng, 1, 3);
  const d = randInt(rng, 0, 2);
  const by = departures[d] + offsets[s] + randInt(rng, 0, Math.min(every - 1, 9));
  return {
    stageId: "2.9.7",
    kind: "choice",
    prompt: text("choice.bus.which", { to: stops[s], by: clockText(by), from: stops[0] }),
    scene,
    ...fixedOptions(
      departures.map((t) => plainOption(clockText(t))),
      d,
      departures.map((_, k) => text(k > d ? "choice.bus.whyLate" : "choice.bus.whyEarly", { t: times[s][k] }))
    ),
    tip: text("choice.bus.tipWhich", { to: stops[s] }),
    explanation: text("choice.bus.explainWhich", { t: clockText(departures[d]), to: stops[s], at: times[s][d], by: clockText(by) }),
  };
}

/** 3.7.3: mean or median - an outlier pulls the mean, not the median. */
function meanOrMedian(rng: Rng): ChoiceProblem {
  // Most values close together, one far above them.
  const n = pick(rng, [5, 7]);
  // Salaries in thousands of kronor (20-36), or race times in seconds (120-170).
  const base = pick(rng, [20, 25, 30, 120, 150]);
  const spread = base >= 100 ? 20 : 6;
  const values = new Set<number>();
  while (values.size < n - 1) values.add(base + randInt(rng, 0, spread));
  const outlier = base * pick(rng, [3, 4, 5]) + randInt(rng, 0, spread);
  const list = shuffle(rng, [...values, outlier]);
  const display = list.join(" \\quad ");
  const sorted = [...list].sort((a, b) => a - b);
  const median = sorted[(n - 1) / 2];
  const mean = list.reduce((s, v) => s + v, 0) / n;
  const context = base >= 100 ? "choice.typical.context.time" : "choice.typical.context.salary";
  const kind = rng();
  if (kind < 0.4) {
    return {
      stageId: "3.7.3",
      kind: "choice",
      prompt: text("choice.typical.which", { context: `@${context}` }),
      display,
      ...fixedOptions([textOption("choice.typical.mean"), textOption("choice.typical.median"), textOption("choice.typical.mode")], 1, [
        text("choice.typical.whyMean", { x: outlier, m: tex(Math.round(mean * 10) / 10).replace("{,}", ",") }),
        null,
        text("choice.typical.whyMode"),
      ]),
      tip: text("choice.typical.tip"),
      explanation: text("choice.typical.explain", { x: outlier, med: median }),
    };
  }
  if (kind < 0.7) {
    return {
      stageId: "3.7.3",
      kind: "choice",
      prompt: text("choice.typical.outlier", { context: `@${context}` }),
      display,
      ...shuffledOptions(
        rng,
        numberOption(outlier),
        [sorted[0], median, sorted[n - 2]].filter((v, k, a) => a.indexOf(v) === k).map((v) => ({ option: numberOption(v), why: text("choice.typical.whyNotOutlier") }))
      ),
      tip: text("choice.typical.tipOutlier"),
      explanation: text("choice.typical.explainOutlier", { x: outlier }),
    };
  }
  // Take the outlier away: the mean falls a lot, the median hardly moves.
  const measure = rng() < 0.5 ? "mean" : "median";
  const options = [textOption("choice.typical.lower"), textOption("choice.typical.higher"), textOption("choice.typical.little")];
  return {
    stageId: "3.7.3",
    kind: "choice",
    prompt: text(`choice.typical.remove.${measure}`, { context: `@${context}`, x: outlier }),
    display,
    ...fixedOptions(options, measure === "mean" ? 0 : 2, [
      measure === "mean" ? null : text("choice.typical.whyMedianStays"),
      text("choice.typical.whyNotHigher"),
      measure === "mean" ? text("choice.typical.whyMeanFalls", { x: outlier }) : null,
    ]),
    tip: text("choice.typical.tipRemove"),
    explanation: text(`choice.typical.explainRemove.${measure}`, { x: outlier }),
  };
}

/** Sizes where "p % more" comes out whole: 100 and 110, 80 and 100. */
const BASES = [80, 100, 120, 150, 160, 200, 250];

/** 3.7.4: misleading charts - an axis that doesn't start at 0 makes a small difference look big. */
function misleadingCharts(rng: Rng): ChoiceProblem {
  const a = pick(rng, BASES);
  // A whole percent, and a difference of at least 5 to draw.
  const p = pick(rng, [5, 10, 20, 25].filter((q) => (a * q) % 100 === 0 && (a * q) / 100 >= 5));
  const c = a + (a * p) / 100;
  const b = a + Math.round(((c - a) * randInt(rng, 3, 7)) / 10);
  // A the smallest and C the biggest - the third variant asks about them by name.
  const values = [a, b, c];
  const step = pick(rng, [5, 10].filter((s) => (c - a) / s >= 1 && (c - a) / s <= 10));
  const top = Math.ceil((c + step) / step) * step;
  // Cut just below the smallest bar: the smallest is a stub, the biggest towers over it.
  const cut = Math.floor((a - step) / step) * step;
  const bars = (from: number, to: number, by: number): ChoiceOption => ({ scene: { kind: "bars", values, from, to, step: by } satisfies QuestionScene });
  const zeroStep = top > 200 ? 100 : 50;
  const zeroTop = Math.ceil(top / zeroStep) * zeroStep;
  const kind = rng();
  if (kind < 0.35) {
    return {
      stageId: "3.7.4",
      kind: "choice",
      prompt: text("choice.bars.misleading"),
      ...shuffledOptions(rng, bars(cut, top, step), [
        { option: bars(0, zeroTop, zeroStep), why: text("choice.bars.whyFair") },
        { option: bars(0, zeroTop * 2, zeroStep * 2), why: text("choice.bars.whyFair") },
      ]),
      tip: text("choice.bars.tip"),
      explanation: text("choice.bars.explainMisleading", { from: cut }),
    };
  }
  if (kind < 0.65) {
    const cut2 = Math.max(0, cut - 2 * step);
    return {
      stageId: "3.7.4",
      kind: "choice",
      prompt: text("choice.bars.fair"),
      ...shuffledOptions(rng, bars(0, zeroTop, zeroStep), [
        { option: bars(cut, top, step), why: text("choice.bars.whyCut", { from: cut }) },
        ...(cut2 > 0 ? [{ option: bars(cut2, top, step), why: text("choice.bars.whyCut", { from: cut2 }) }] : []),
      ]),
      tip: text("choice.bars.tip"),
      explanation: text("choice.bars.explainFair"),
    };
  }
  // How much bigger it really is - not how much bigger it looks.
  const looks = Math.round((c - cut) / (a - cut));
  const pct = (n: number) => plainOption(`${n} %`);
  const slips: Slip[] = [{ option: pct((looks - 1) * 100), why: text("choice.bars.whyLooks", { from: cut }) }, { option: pct(c - a), why: text("choice.bars.whyDifference") }];
  const wrongBase = Math.round(((c - a) / c) * 100);
  if (wrongBase !== p) slips.push({ option: pct(wrongBase), why: text("choice.bars.whyBase") });
  return {
    stageId: "3.7.4",
    kind: "choice",
    prompt: text("choice.bars.howMuch", { looks, from: cut }),
    scene: { kind: "bars", values, from: cut, to: top, step },
    ...shuffledOptions(rng, pct(p), slips),
    tip: text("choice.bars.tipHowMuch"),
    explanation: text("choice.bars.explainHowMuch", { a, c, d: c - a, p }),
  };
}

export const DATA_CHOICES: Record<DataChoiceStageId, (rng: Rng) => ChoiceProblem> = {
  "3.7.4": misleadingCharts,
  "1.13.1": tally,
  "2.8.6": pieChart,
  "2.9.7": timetable,
  "3.7.3": meanOrMedian,
};
