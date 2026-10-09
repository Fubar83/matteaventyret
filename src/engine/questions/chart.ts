/**
 * Tabeller och diagram (Lgr22 åk 4-6 "Sannolikhet och statistik"): a bar
 * chart over 4 kinds of fruit - read one bar, the difference between two, or
 * the total. Every answer is a whole number read off the chart.
 */
import { randInt, type Rng } from "../rng";
import { questionType, retry } from "./questionType";

export type ChartStageId = "2.8.1" | "2.8.2" | "2.8.3";
export type ChartQuestionType = "lookup" | "difference" | "sum";

/** i18n keys (see i18n/sv.json, en.json's "chart.cat.*") - always 4 fixed fruit categories, kept short across screens. */
export const CHART_CATEGORY_KEYS = ["chart.cat.apple", "chart.cat.banana", "chart.cat.pear", "chart.cat.orange"] as const;

export interface ChartProblem {
  stageId: ChartStageId;
  kind: "chart";
  categoryKeys: readonly string[];
  values: number[];
  questionType: ChartQuestionType;
  /** Lookup: the bar asked about. */
  askIndex?: number;
  /** Difference: the two bars compared. */
  compareIndices?: [number, number];
  answer: number;
}

const barValues = (rng: Rng) => CHART_CATEGORY_KEYS.map(() => randInt(rng, 1, 15));

/** 2.8.1: read one bar. */
function lookup(rng: Rng): ChartProblem {
  const values = barValues(rng);
  const askIndex = randInt(rng, 0, values.length - 1);
  return { stageId: "2.8.1", kind: "chart", categoryKeys: CHART_CATEGORY_KEYS, values, questionType: "lookup", askIndex, answer: values[askIndex] };
}

/** 2.8.2: the difference between two bars of different heights. */
const difference = (rng: Rng) =>
  retry("2.8.2", (): ChartProblem | null => {
    const values = barValues(rng);
    const a = randInt(rng, 0, values.length - 1);
    let b = randInt(rng, 0, values.length - 1);
    while (b === a) b = randInt(rng, 0, values.length - 1);
    if (values[a] === values[b]) return null;
    return { stageId: "2.8.2", kind: "chart", categoryKeys: CHART_CATEGORY_KEYS, values, questionType: "difference", compareIndices: [a, b], answer: Math.abs(values[a] - values[b]) };
  });

/** 2.8.3: all the bars together. */
function sum(rng: Rng): ChartProblem {
  const values = barValues(rng);
  return { stageId: "2.8.3", kind: "chart", categoryKeys: CHART_CATEGORY_KEYS, values, questionType: "sum", answer: values.reduce((total, v) => total + v, 0) };
}

export const CHART_QUESTIONS = questionType({
  id: "chart",
  kinds: ["chart"],
  levels: { "2.8.1": lookup, "2.8.2": difference, "2.8.3": sum },
  key: (p) => `${p.kind}:${p.questionType}:${p.values.join(",")}:${p.askIndex ?? ""}:${p.compareIndices?.join("-") ?? ""}`,
});
