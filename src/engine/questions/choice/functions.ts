/**
 * Graphs, formulas and inequalities, as single-choice questions:
 *
 *   åk 4-6  2.11.3 proportionalitet i grafer: price per kilo off a straight line; which graph is proportional
 *   åk 7-9  3.10.1 grafer och formler: y = kx + m from the line - its formula, k, m, a y
 *           3.10.2 tabeller och mönster: the formula for a table; matchsticks in figure n
 *           3.3.8  olikheter: which x makes 3x - 2 > 10 true; x < 4 - and the sign turns when dividing by a negative
 *
 * The slips: k and m swapped, the sign of k wrong, m read where the line
 * crosses the x-axis, the figure 1 count taken as the constant, the
 * inequality not turned.
 */
import { pick, randInt, type Rng } from "../../rng";
import type { GraphAxis, QuestionScene } from "../scene";
import { tex } from "../written/problem";
import { numberOption, plainOption, shuffledOptions, text, type ChoiceOption, type ChoiceProblem, type Slip } from "./problem";

export type FunctionChoiceStageId = "2.11.3" | "3.10.1" | "3.10.2" | "3.3.8";

const latex = (s: string): ChoiceOption => ({ latex: s });
const kr = (n: number) => plainOption(`${n} kr`);
const kg = (n: number) => plainOption(`${tex(n).replace("{,}", ",")} kg`);

/** 2.11.3: a price graph through the origin - the price of some kilos, what a sum buys, the price per kilo; and which graph is proportional. */
function proportionalGraph(rng: Rng): ChoiceProblem {
  if (rng() < 0.25) {
    const axis: GraphAxis = { min: 0, max: 6, step: 1 };
    const graph = (points: [number, number][]): ChoiceOption => ({ scene: { kind: "graph", x: axis, y: axis, lines: [{ points }] } satisfies QuestionScene });
    const curve = Array.from({ length: 13 }, (_, i): [number, number] => [i / 2, (i / 2) ** 2 / 6]);
    const slips: Slip[] = [
      { option: graph([[0, 2], [6, 6]]), why: text("choice.prop.whyOrigin") },
      { option: graph(curve), why: text("choice.prop.whyStraight") },
      { option: graph([[0, 6], [6, 0]]), why: text("choice.prop.whyDown") },
    ];
    return {
      stageId: "2.11.3",
      kind: "choice",
      prompt: text("choice.prop.which"),
      ...shuffledOptions(rng, graph([[0, 0], [6, pick(rng, [3, 4, 6])]]), slips),
      tip: text("choice.prop.tipWhich"),
      explanation: text("choice.prop.explainWhich"),
    };
  }
  const k = pick(rng, [10, 15, 20, 25, 30, 40]);
  const thing = pick(rng, ["apples", "cheese", "sweets", "carrots"]);
  const scene: QuestionScene = {
    kind: "graph",
    x: { min: 0, max: 6, step: 1, label: "graph.kg" },
    y: { min: 0, max: 6 * k, step: k, label: "graph.kr" },
    lines: [{ points: [[0, 0], [6, 6 * k]] }],
  };
  const kind = rng();
  if (kind < 0.45) {
    const x = randInt(rng, 2, 5);
    return {
      stageId: "2.11.3",
      kind: "choice",
      prompt: text("choice.prop.cost", { x, thing: `@choice.prop.thing.${thing}` }),
      scene,
      ...shuffledOptions(rng, kr(k * x), [
        { option: kr(k * (x + 1)), why: text("choice.prop.whyLine") },
        { option: kr(k * (x - 1)), why: text("choice.prop.whyLine") },
        { option: kr(k + x), why: text("choice.prop.whyAdd", { k }) },
        { option: kr(x), why: text("choice.prop.whyAxis") },
      ]),
      tip: text("choice.prop.tipCost"),
      explanation: text("choice.prop.explainCost", { x, k, r: k * x }),
    };
  }
  if (kind < 0.75) {
    const x = randInt(rng, 2, 5);
    const y = k * x;
    return {
      stageId: "2.11.3",
      kind: "choice",
      prompt: text("choice.prop.buys", { y, thing: `@choice.prop.thing.${thing}` }),
      scene,
      ...shuffledOptions(rng, kg(x), [
        { option: kg(x + 1), why: text("choice.prop.whyLine") },
        { option: kg(x - 1), why: text("choice.prop.whyLine") },
        { option: kg(y / 10), why: text("choice.prop.whyAxis") },
        { option: kg(x / 2), why: text("choice.prop.whyLine") },
      ]),
      tip: text("choice.prop.tipBuys"),
      explanation: text("choice.prop.explainBuys", { x, y }),
    };
  }
  return {
    stageId: "2.11.3",
    kind: "choice",
    prompt: text("choice.prop.perKg", { thing: `@choice.prop.thing.${thing}` }),
    scene,
    ...shuffledOptions(rng, kr(k), [
      { option: kr(6 * k), why: text("choice.prop.whyEnd") },
      { option: kr(2 * k), why: text("choice.prop.whyLine") },
      { option: kr(k / 5), why: text("choice.prop.whyAxis") },
    ]),
    tip: text("choice.prop.tipPerKg"),
    explanation: text("choice.prop.explainPerKg", { k }),
  };
}

/** k as LaTeX in front of x: x, -x, 2x, \frac{1}{2}x. */
function kx(k: number, v = "x"): string {
  if (k === 1) return v;
  if (k === -1) return `-${v}`;
  if (Number.isInteger(k)) return `${k}${v}`;
  const q = [2, 3, 4].find((d) => Number.isInteger(Math.round(k * d * 1e9) / 1e9))!;
  const p = Math.round(k * q);
  return `${p < 0 ? "-" : ""}\\frac{${Math.abs(p)}}{${q}}${v}`;
}
/** y = kx + m, as written: y = 2x - 3, y = -x, y = \frac{1}{2}x + 1. */
export function lineFormula(k: number, m: number, v = "x", y = "y"): string {
  const start = k === 0 ? "" : kx(k, v);
  const end = m === 0 ? (k === 0 ? "0" : "") : start === "" ? tex(m) : m > 0 ? ` + ${m}` : ` - ${-m}`;
  return `${y} = ${start}${end}`;
}
const KS = [-3, -2, -1, -0.5, 0.5, 1, 2, 3];
/** A slope as an option: 2, -1, or a fraction (1/2, -1/3) rather than 0,333. */
const slope = (k: number): ChoiceOption => {
  if (Number.isInteger(k)) return numberOption(k);
  const q = [2, 3, 4].find((d) => Number.isInteger(Math.round(k * d * 1e9) / 1e9))!;
  const p = Math.round(k * q);
  return latex(`${p < 0 ? "-" : ""}\\dfrac{${Math.abs(p)}}{${q}}`);
};

/** 3.10.1: a straight line - its formula, its k, its m, a y read off it. */
function graphFormula(rng: Rng): ChoiceProblem {
  const k = pick(rng, KS);
  const m = randInt(rng, -4, 4);
  const axis: GraphAxis = { min: -6, max: 6, step: 1 };
  const scene: QuestionScene = { kind: "graph", x: axis, y: axis, lines: [{ points: [[-6, k * -6 + m], [6, k * 6 + m]] }] };
  const kind = rng();
  if (kind < 0.4) {
    const slips: Slip[] = [{ option: latex(lineFormula(-k, m)), why: text(k > 0 ? "choice.line.whyUp" : "choice.line.whyDown") }];
    if (m !== 0) slips.push({ option: latex(lineFormula(k, -m)), why: text("choice.line.whyM") });
    if (m !== 0 && Number.isInteger(k) && m !== k) slips.push({ option: latex(lineFormula(m, k)), why: text("choice.line.whySwapped") });
    if (Math.abs(k) !== 1) slips.push({ option: latex(lineFormula(1 / k, m)), why: text("choice.line.whyK") });
    slips.push({ option: latex(lineFormula(k, m + 1)), why: text("choice.line.whyM") });
    return {
      stageId: "3.10.1",
      kind: "choice",
      prompt: text("choice.line.formula"),
      scene,
      ...shuffledOptions(rng, latex(lineFormula(k, m)), slips),
      tip: text("choice.line.tipFormula"),
      explanation: text("choice.line.explainFormula", { k: tex(k).replace("{,}", ","), m, f: `${lineFormula(k, m).replace(/\\frac\{(\d+)\}\{(\d+)\}/, "$1/$2")}` }),
    };
  }
  if (kind < 0.6) {
    const slips: Slip[] = [{ option: slope(-k), why: text(k > 0 ? "choice.line.whyUp" : "choice.line.whyDown") }];
    if (Math.abs(k) !== 1) slips.push({ option: slope(1 / k), why: text("choice.line.whyK") });
    if (m !== k && m !== -k && m !== 1 / k) slips.push({ option: slope(m), why: text("choice.line.whyKnotM") });
    slips.push({ option: slope(k + (k > 0 ? 1 : -1)), why: text("choice.line.whyK") });
    return {
      stageId: "3.10.1",
      kind: "choice",
      prompt: text("choice.line.k"),
      scene,
      ...shuffledOptions(rng, slope(k), slips),
      tip: text("choice.line.tipK"),
      explanation: text("choice.line.explainK", { k: tex(k).replace("{,}", ",") }),
    };
  }
  if (kind < 0.8) {
    const slips: Slip[] = [];
    const zero = -m / k;
    if (Number.isInteger(zero) && zero !== m) slips.push({ option: numberOption(zero), why: text("choice.line.whyXAxis") });
    if (m !== 0) slips.push({ option: numberOption(-m), why: text("choice.line.whyMSign") });
    if (k !== m) slips.push({ option: numberOption(k), why: text("choice.line.whyMnotK") });
    slips.push({ option: numberOption(m + 1), why: text("choice.line.whyMSign") }, { option: numberOption(m - 1), why: text("choice.line.whyMSign") });
    return {
      stageId: "3.10.1",
      kind: "choice",
      prompt: text("choice.line.m"),
      scene,
      ...shuffledOptions(rng, numberOption(m), slips),
      tip: text("choice.line.tipM"),
      explanation: text("choice.line.explainM", { m }),
    };
  }
  // A y off the line, for an x that keeps it whole and on the grid.
  const xs = [-4, -3, -2, -1, 1, 2, 3, 4].filter((x) => Number.isInteger(k * x) && Math.abs(k * x + m) <= 6);
  const x = pick(rng, xs.length > 0 ? xs : [0]);
  const y = k * x + m;
  const slips: Slip[] = [
    { option: numberOption(k * x), why: text("choice.line.whyForgotM") },
    { option: numberOption(-k * x + m), why: text("choice.line.whyXSign") },
    { option: numberOption(x), why: text("choice.line.whyXnotY") },
    { option: numberOption(y + 1), why: text("choice.line.whyRead") },
    { option: numberOption(y - 1), why: text("choice.line.whyRead") },
  ];
  return {
    stageId: "3.10.1",
    kind: "choice",
    prompt: text("choice.line.y", { x }),
    scene,
    ...shuffledOptions(rng, numberOption(y), slips),
    tip: text("choice.line.tipY", { x }),
    explanation: text("choice.line.explainY", { x, y, f: lineFormula(k, m).replace(/\\frac\{(\d+)\}\{(\d+)\}/, "$1/$2") }),
  };
}

/** 3.10.2: a formula for a table - and for a pattern of matchsticks, figure n. */
function tablesAndPatterns(rng: Rng): ChoiceProblem {
  const k = randInt(rng, 2, 5);
  const m = randInt(rng, 1, 7);
  if (rng() < 0.45) {
    const ys = [0, 1, 2, 3].map((x) => k * x + m);
    const slips: Slip[] = [
      { option: latex(lineFormula(k, m + k)), why: text("choice.table.whyStart") },
      { option: latex(lineFormula(k, 0)), why: text("choice.table.whyNoM") },
      { option: latex(lineFormula(1, k)), why: text("choice.table.whyStep") },
    ];
    if (m !== k) slips.unshift({ option: latex(lineFormula(m, k)), why: text("choice.table.whySwapped") });
    return {
      stageId: "3.10.2",
      kind: "choice",
      prompt: text("choice.table.formula"),
      display: `\\begin{array}{c|c|c|c|c} x & 0 & 1 & 2 & 3 \\\\ \\hline y & ${ys.join(" & ")} \\end{array}`,
      ...shuffledOptions(rng, latex(lineFormula(k, m)), slips),
      tip: text("choice.table.tip"),
      explanation: text("choice.table.explain", { k, m, f: lineFormula(k, m) }),
    };
  }
  // Matchsticks: figure 1 has a, each figure d more.
  const d = k;
  const a = d + m;
  const counts = [a, a + d, a + 2 * d];
  if (rng() < 0.55) {
    const slips: Slip[] = [
      { option: latex(lineFormula(d, a, "n", "s")), why: text("choice.sticks.whyFirst", { a }) },
      { option: latex(lineFormula(1, d, "n", "s")), why: text("choice.sticks.whyStep", { d }) },
      { option: latex(lineFormula(a, 0, "n", "s")), why: text("choice.sticks.whyTimesFirst", { a }) },
    ];
    return {
      stageId: "3.10.2",
      kind: "choice",
      prompt: text("choice.sticks.formula", { a: counts[0], b: counts[1], c: counts[2] }),
      ...shuffledOptions(rng, latex(lineFormula(d, m, "n", "s")), slips),
      tip: text("choice.sticks.tip"),
      explanation: text("choice.sticks.explain", { d, m, a }),
    };
  }
  const n = pick(rng, [10, 20, 50, 100]);
  return {
    stageId: "3.10.2",
    kind: "choice",
    prompt: text("choice.sticks.figure", { a: counts[0], b: counts[1], c: counts[2], n }),
    ...shuffledOptions(rng, numberOption(d * n + m), [
      { option: numberOption(a * n), why: text("choice.sticks.whyTimesFirst", { a }) },
      { option: numberOption(a + n * d), why: text("choice.sticks.whyOneStep") },
      { option: numberOption(d * n), why: text("choice.sticks.whyNoM") },
      { option: numberOption(a + d * (n - 2)), why: text("choice.sticks.whyOneStep") },
    ]),
    tip: text("choice.sticks.tip"),
    explanation: text("choice.sticks.explainFigure", { d, m, n, r: d * n + m }),
  };
}

const lhs = (k: number, m: number) => `${kx(k)}${m === 0 ? "" : m > 0 ? ` + ${m}` : ` - ${-m}`}`;

/** 3.3.8: inequalities - a number that makes one true, and solving one (turning the sign when dividing by a negative). */
function inequalities(rng: Rng): ChoiceProblem {
  const negative = rng() < 0.3;
  const k = negative ? -randInt(rng, 2, 4) : randInt(rng, 2, 5);
  const b = randInt(rng, -3, 6);
  const m = randInt(rng, -6, 8);
  const c = k * b + m;
  const greater = rng() < 0.5;
  const sign = greater ? ">" : "<";
  const display = `${lhs(k, m)} ${sign} ${c}`;
  // Dividing by a negative turns the sign: -2x > 6 is x < -3.
  const solvedGreater = negative ? !greater : greater;
  if (rng() < 0.45 && !negative) {
    const step = solvedGreater ? 1 : -1;
    return {
      stageId: "3.3.8",
      kind: "choice",
      prompt: text("choice.ineq.which"),
      display,
      ...shuffledOptions(rng, numberOption(b + step), [
        { option: numberOption(b), why: text("choice.ineq.whyEqual", { c }) },
        { option: numberOption(b - step), why: text("choice.ineq.whyWrongSide") },
        { option: numberOption(b - 2 * step), why: text("choice.ineq.whyWrongSide") },
      ]),
      tip: text("choice.ineq.tipWhich"),
      explanation: text("choice.ineq.explainWhich", { x: b + step, b, sign, c }),
    };
  }
  const solved = (s: boolean, v: number) => latex(`x ${s ? ">" : "<"} ${tex(v)}`);
  const slips: Slip[] = [
    { option: solved(!solvedGreater, b), why: text(negative ? "choice.ineq.whyTurn" : "choice.ineq.whyNoTurn") },
    { option: latex(`x = ${tex(b)}`), why: text("choice.ineq.whyEquals") },
  ];
  const wrongMove = (c + m) / k;
  if (m !== 0 && Number.isInteger(wrongMove) && wrongMove !== b) slips.push({ option: solved(solvedGreater, wrongMove), why: text("choice.ineq.whyMove", { m: Math.abs(m) }) });
  slips.push({ option: solved(solvedGreater, -b === b ? b + 1 : -b), why: text("choice.ineq.whyMove", { m: Math.abs(m) }) });
  return {
    stageId: "3.3.8",
    kind: "choice",
    prompt: text("choice.ineq.solve"),
    display,
    ...shuffledOptions(rng, solved(solvedGreater, b), slips),
    tip: text(negative ? "choice.ineq.tipNegative" : "choice.ineq.tipSolve"),
    explanation: text(negative ? "choice.ineq.explainNegative" : "choice.ineq.explainSolve", { lhs: `${tex(k)}x`, sign, c: c - m, k, b, s: solvedGreater ? ">" : "<" }),
  };
}

export const FUNCTION_CHOICES: Record<FunctionChoiceStageId, (rng: Rng) => ChoiceProblem> = {
  "2.11.3": proportionalGraph,
  "3.10.1": graphFormula,
  "3.10.2": tablesAndPatterns,
  "3.3.8": inequalities,
};
