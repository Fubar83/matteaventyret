/**
 * Tabeller och diagram (Lgr22 "Sannolikhet och statistik"): read a chart -
 * one value, the difference between two, or the total. Every answer is a
 * whole number read off the chart.
 *
 *   2.8.1-2.8.3  a bar chart over 4 kinds of fruit: read, compare, sum
 *   2.8.4        a pictogram (åk 1-3): each picture is 2 fruit
 *   2.8.5        a line chart (åk 4-6): the temperature through a day
 *
 * How it works, and what must stay true: docs/question-types/chart.md.
 */
import { pick, randInt, type Rng } from "../rng";
import { questionType, retry } from "./questionType";

export type ChartStageId = "2.8.1" | "2.8.2" | "2.8.3" | "2.8.4" | "2.8.5";
export type ChartQuestionType = "lookup" | "difference" | "sum";
/** How the data is drawn: bars, rows of pictures (each worth `PICTOGRAM_UNIT`), or a line through points. */
export type ChartStyle = "bar" | "pictogram" | "line";

/** i18n keys (see i18n/sv.json, en.json's "chart.cat.*") - always 4 fixed fruit categories, kept short across screens. */
export const CHART_CATEGORY_KEYS = ["chart.cat.apple", "chart.cat.banana", "chart.cat.pear", "chart.cat.orange"] as const;
/** The line chart's times of day ("chart.time.*"): kl 8 to kl 16. */
export const CHART_TIME_KEYS = ["chart.time.8", "chart.time.10", "chart.time.12", "chart.time.14", "chart.time.16"] as const;
/** What one picture in a pictogram stands for. */
export const PICTOGRAM_UNIT = 2;

export interface ChartProblem {
  stageId: ChartStageId;
  kind: "chart";
  style: ChartStyle;
  categoryKeys: readonly string[];
  values: number[];
  questionType: ChartQuestionType;
  /** Lookup: the bar asked about. */
  askIndex?: number;
  /** Difference: the two bars compared - for a line chart, the warmer one first. */
  compareIndices?: [number, number];
  answer: number;
}

const barValues = (rng: Rng) => CHART_CATEGORY_KEYS.map(() => randInt(rng, 1, 15));

/** 2.8.1: read one bar. */
function lookup(rng: Rng): ChartProblem {
  const values = barValues(rng);
  const askIndex = randInt(rng, 0, values.length - 1);
  return { stageId: "2.8.1", kind: "chart", style: "bar", categoryKeys: CHART_CATEGORY_KEYS, values, questionType: "lookup", askIndex, answer: values[askIndex] };
}

/** 2.8.2: the difference between two bars of different heights. */
const difference = (rng: Rng) =>
  retry("2.8.2", (): ChartProblem | null => {
    const values = barValues(rng);
    const a = randInt(rng, 0, values.length - 1);
    let b = randInt(rng, 0, values.length - 1);
    while (b === a) b = randInt(rng, 0, values.length - 1);
    if (values[a] === values[b]) return null;
    return { stageId: "2.8.2", kind: "chart", style: "bar", categoryKeys: CHART_CATEGORY_KEYS, values, questionType: "difference", compareIndices: [a, b], answer: Math.abs(values[a] - values[b]) };
  });

/** 2.8.3: all the bars together. */
function sum(rng: Rng): ChartProblem {
  const values = barValues(rng);
  return { stageId: "2.8.3", kind: "chart", style: "bar", categoryKeys: CHART_CATEGORY_KEYS, values, questionType: "sum", answer: values.reduce((total, v) => total + v, 0) };
}

/** Two different places to compare, the bigger first. */
function comparePair(rng: Rng, values: number[]): [number, number] | null {
  const a = randInt(rng, 0, values.length - 1);
  let b = randInt(rng, 0, values.length - 1);
  while (b === a) b = randInt(rng, 0, values.length - 1);
  if (values[a] === values[b]) return null;
  return values[a] > values[b] ? [a, b] : [b, a];
}

/** 2.8.4: a pictogram - every picture is 2 fruit: read a row (count the pictures twice), or the difference between two. */
const pictogram = (rng: Rng) =>
  retry("2.8.4", (): ChartProblem | null => {
    const values = CHART_CATEGORY_KEYS.map(() => PICTOGRAM_UNIT * randInt(rng, 1, 7));
    if (rng() < 0.7) {
      const askIndex = randInt(rng, 0, values.length - 1);
      return { stageId: "2.8.4", kind: "chart", style: "pictogram", categoryKeys: CHART_CATEGORY_KEYS, values, questionType: "lookup", askIndex, answer: values[askIndex] };
    }
    const pair = comparePair(rng, values);
    return pair && { stageId: "2.8.4", kind: "chart", style: "pictogram", categoryKeys: CHART_CATEGORY_KEYS, values, questionType: "difference", compareIndices: pair, answer: values[pair[0]] - values[pair[1]] };
  });

/** 2.8.5: a line chart of the temperature through a day (0-15 degrees): read it at a time, or how much warmer one time was than another. */
const lineChart = (rng: Rng) =>
  retry("2.8.5", (): ChartProblem | null => {
    // A day warming up to the afternoon, then cooling a little.
    const peak = randInt(rng, 2, 3);
    const values: number[] = [];
    let t = randInt(rng, 0, 6);
    for (let i = 0; i < CHART_TIME_KEYS.length; i++) {
      values.push(Math.max(0, Math.min(15, t)));
      t += i < peak ? randInt(rng, 1, 4) : -randInt(rng, 0, 3);
    }
    const kind = pick(rng, ["lookup", "lookup", "difference"] as const);
    if (kind === "lookup") {
      const askIndex = randInt(rng, 0, values.length - 1);
      return { stageId: "2.8.5", kind: "chart", style: "line", categoryKeys: CHART_TIME_KEYS, values, questionType: "lookup", askIndex, answer: values[askIndex] };
    }
    const pair = comparePair(rng, values);
    return pair && { stageId: "2.8.5", kind: "chart", style: "line", categoryKeys: CHART_TIME_KEYS, values, questionType: "difference", compareIndices: pair, answer: values[pair[0]] - values[pair[1]] };
  });

export const CHART_QUESTIONS = questionType({
  id: "chart",
  kinds: ["chart"],
  levels: { "2.8.1": lookup, "2.8.2": difference, "2.8.3": sum, "2.8.4": pictogram, "2.8.5": lineChart },
  key: (p) => `${p.kind}:${p.style}:${p.questionType}:${p.values.join(",")}:${p.askIndex ?? ""}:${p.compareIndices?.join("-") ?? ""}`,
});
