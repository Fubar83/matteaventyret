/**
 * Drawing a chart: the numbers are in tally marks or a table, and the child
 * drags each bar - or each point of a line - to its height. Lgr22 has
 * charts made, not only read, from åk 1-3. The chart type (2.8.x) reads them.
 *
 *   åk 1-3  1.13.2 rita stapeldiagram: fruit counted in tally marks, a scale of 0-10 numbered every 2
 *   åk 4-6  2.8.7  stapeldiagram från en tabell: votes in a table, 0-50 in fives, numbered every 10
 *   åk 4-6  2.8.8  rita linjediagram: the temperature through a day, below 0 too
 *
 * The values aren't written on the chart: the scale is read, as in a real one.
 *
 * How it works, and what must stay true: docs/question-types/drawChart.md.
 */
import { pick, randInt, shuffle, type Rng } from "../../rng";
import { CHART_CATEGORY_KEYS, CHART_TIME_KEYS } from "../chart";
import { text, type ChoiceText } from "../choice/problem";
import { questionType, retry } from "../questionType";

export type DrawChartStageId = "1.13.2" | "2.8.7" | "2.8.8";

export interface DrawChartProblem {
  stageId: DrawChartStageId;
  kind: "drawChart";
  style: "bar" | "line";
  /** Where the numbers are: tally marks, or a table. */
  source: "tally" | "table";
  /** The bars' or the points' names (i18n keys). */
  labelKeys: readonly string[];
  /** What the table's numbers are (i18n key) - the column's heading. */
  what: string;
  values: number[];
  /** The scale: `min` to `max`, a line every `step` (what a value snaps to), a number every `labelEvery`. */
  min: number;
  max: number;
  step: number;
  labelEvery: number;
  /** Where the bars or points stand before they're moved. */
  start: number;
  prompt: ChoiceText;
  tip: ChoiceText;
  explanation: ChoiceText;
}

/** Which bars or points are at the right height. */
export const rightOnes = (p: DrawChartProblem, values: number[]) => p.values.map((v, i) => values[i] === v);

const SPORT_KEYS = ["sport.football", "sport.swimming", "sport.hockey", "sport.dance", "sport.riding"];

/** 1.13.2: four fruit counted in tally marks, 1-10 each, no two the same - bars on a 0-10 scale numbered every 2. */
function fromTally(rng: Rng): DrawChartProblem {
  const values = shuffle(rng, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).slice(0, 4);
  return {
    stageId: "1.13.2",
    kind: "drawChart",
    style: "bar",
    source: "tally",
    labelKeys: CHART_CATEGORY_KEYS,
    what: "drawChart.what.fruit",
    values,
    min: 0,
    max: 10,
    step: 1,
    labelEvery: 2,
    start: 0,
    prompt: text("drawChart.prompt.tally"),
    tip: text("drawChart.tip.tally"),
    explanation: text("drawChart.explain.bars"),
  };
}

/** 2.8.7: votes for a sport in a table, multiples of 5 up to 50 - at least two between the numbered lines. */
function fromTable(rng: Rng): DrawChartProblem {
  return retry("drawChart 2.8.7", () => {
    const values = Array.from({ length: 4 }, () => 5 * randInt(rng, 1, 10));
    if (new Set(values).size < 4 || values.filter((v) => v % 10 !== 0).length < 2) return null;
    return {
      stageId: "2.8.7",
      kind: "drawChart",
      style: "bar",
      source: "table",
      labelKeys: shuffle(rng, SPORT_KEYS).slice(0, 4),
      what: "drawChart.what.votes",
      values,
      min: 0,
      max: 50,
      step: 5,
      labelEvery: 10,
      start: 0,
      prompt: text("drawChart.prompt.table"),
      tip: text("drawChart.tip.table"),
      explanation: text("drawChart.explain.bars"),
    };
  });
}

/** 2.8.8: the temperature at kl 8, 10, 12, 14 and 16 - warming to the early afternoon, starting below 0 sometimes. */
function lineChart(rng: Rng): DrawChartProblem {
  return retry("drawChart 2.8.8", () => {
    const first = randInt(rng, -5, 6);
    const rises = [randInt(rng, 1, 4), randInt(rng, 1, 4), randInt(rng, 0, 3)];
    const fall = -randInt(rng, 1, 3);
    const values = [first];
    for (const d of [...rises, fall]) values.push(values[values.length - 1] + d);
    // The points start at 0: none is right before it's moved.
    if (Math.max(...values) > 15 || Math.min(...values) < -5 || values.includes(0)) return null;
    // Some of it between the numbered lines, or there's nothing to read.
    if (values.filter((v) => v % 5 !== 0).length < 3) return null;
    return {
      stageId: "2.8.8",
      kind: "drawChart",
      style: "line",
      source: "table",
      labelKeys: CHART_TIME_KEYS,
      what: "drawChart.what.temp",
      values,
      min: -5,
      max: 15,
      step: 1,
      labelEvery: 5,
      start: 0,
      prompt: text(pick(rng, ["drawChart.prompt.line", "drawChart.prompt.lineDay"])),
      tip: text(first < 0 ? "drawChart.tip.lineMinus" : "drawChart.tip.line"),
      explanation: text("drawChart.explain.line"),
    };
  });
}

export const DRAW_CHART_QUESTIONS = questionType<"drawChart", DrawChartProblem, DrawChartStageId>({
  id: "drawChart",
  kinds: ["drawChart"],
  levels: {
    "1.13.2": fromTally,
    "2.8.7": fromTable,
    "2.8.8": lineChart,
  },
  key: (p) => `drawChart:${p.stageId}:${p.labelKeys.join()}:${p.values.join()}`,
});
