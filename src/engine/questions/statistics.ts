/**
 * Lägesmått (Lgr22 åk 4-6 "Sannolikhet och statistik"): medelvärde, median
 * and typvärde of a few small numbers (1-20) - each always a whole number.
 *
 * How it works, and what must stay true: docs/question-types/statistics.md.
 */
import { randInt, shuffle, type Rng } from "../rng";
import { questionType, retry } from "./questionType";

export type StatisticsStageId = "2.7.1" | "2.7.2" | "2.7.3";
export type StatMeasure = "mean" | "median" | "mode";

export interface StatisticsProblem {
  stageId: StatisticsStageId;
  kind: "statistics";
  measure: StatMeasure;
  values: number[];
  answer: number;
}

/** 2.7.1: the mean of 4 numbers whose sum divides evenly (and that aren't all the same). */
const mean = (rng: Rng) =>
  retry("2.7.1", (): StatisticsProblem | null => {
    const count = 4;
    const values = Array.from({ length: count }, () => randInt(rng, 1, 20));
    const sum = values.reduce((a, b) => a + b, 0);
    if (sum % count !== 0) return null;
    const answer = sum / count;
    return values.every((v) => v === answer) ? null : { stageId: "2.7.1", kind: "statistics", measure: "mean", values, answer };
  });

/** 2.7.2: the median of 5 numbers - an odd count, so always one of them, never the average of two. */
function median(rng: Rng): StatisticsProblem {
  const count = 5;
  const values = Array.from({ length: count }, () => randInt(rng, 1, 20));
  const sorted = [...values].sort((a, b) => a - b);
  return { stageId: "2.7.2", kind: "statistics", measure: "median", values, answer: sorted[Math.floor(count / 2)] };
}

/** 2.7.3: the mode - one number three times among 4 others, all different. */
function mode(rng: Rng): StatisticsProblem {
  const often = randInt(rng, 1, 20);
  const others = new Set<number>();
  while (others.size < 4) {
    const v = randInt(rng, 1, 20);
    if (v !== often) others.add(v);
  }
  return { stageId: "2.7.3", kind: "statistics", measure: "mode", values: shuffle(rng, [often, often, often, ...others]), answer: often };
}

export const STATISTICS_QUESTIONS = questionType({
  id: "statistics",
  kinds: ["statistics"],
  levels: { "2.7.1": mean, "2.7.2": median, "2.7.3": mode },
  key: (p) => `${p.kind}:${p.measure}:${p.values.join(",")}`,
});
