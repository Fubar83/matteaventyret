/**
 * Questions for åk 7-9 and gymnasiet, answered by writing on a free board
 * (see game/ExpressionPlayer.tsx): each has the task shown as LaTeX, its
 * answer in a form written work can be checked against (mathinput/workCheck.ts),
 * and a help ladder - a tip, the first step, the whole worked solution.
 *
 * Numbers are chosen so answers come out whole (or with one Swedish decimal),
 * as school exercises do. Pure and deterministic given the rng.
 */
import type { ExamStageId } from "./examTopics";
import type { BasicStageId } from "./basicTopics";
import type { ClockSpec, ClockStageId } from "./clock";
import type { QuestionScene } from "./questionScene";
import type { WordStageId } from "./wordProblems";
import type { Figure, GeometryStageId } from "./geometry";
import type { Rng } from "./rng";
import { randInt } from "./rng";

export type AdvancedStageId =
  | "3.1.1"
  | "3.1.2"
  | "3.1.3"
  | "3.2.1"
  | "3.2.2"
  | "3.3.1"
  | "3.3.2"
  | "3.3.3"
  | "3.3.4"
  | "3.3.5"
  | "3.3.6"
  | "3.4.1"
  | "3.4.2"
  | "4.1.1"
  | "4.1.2"
  | "4.2.1"
  | "4.3.1"
  | "4.3.2";

/** The answer, in a form that can be checked against written work (see mathinput/workCheck.ts's Answer). */
export type AnswerSpec =
  /**
   * `approx`: a rounded answer (π, sin), written with "=" or "≈" - right
   * when it's the exact value (`exact`, when known) worked out and rounded
   * correctly, with π taken as 3,14 allowed (see workCheck.ts).
   */
  | { kind: "value"; value: number; approx?: boolean; exact?: number; piAs314?: number; fraction?: boolean }
  | { kind: "solutions"; variable: string; values: number[] }
  /**
   * `latex` is the expected expression, in the form the evaluator reads ("6x + 2").
   * `form`: how it has to be written - "expanded" (no brackets left: utveckla) or
   * "factored" (a product: faktorisera) - not just anything equal to it.
   */
  | { kind: "expression"; variable: string; latex: string; form?: "expanded" | "factored" }
  /** An equation system's solution, one value per variable. */
  | { kind: "system"; variables: string[]; values: number[] };

export interface AdvancedProblem {
  stageId: AdvancedStageId | GeometryStageId | ExamStageId | WordStageId | BasicStageId | ClockStageId;
  kind: "expression";
  /** i18n key for the question's wording ("adv.prompt.*"), and its values. */
  promptKey: string;
  promptVars?: Record<string, string | number>;
  /** The task, shown big (LaTeX). Empty when the words say it all. */
  display: string;
  answer: AnswerSpec;
  /** The help ladder: a tip (i18n key), then the first step, then the whole solution (LaTeX lines). */
  tipKey: string;
  firstStep: string;
  solution: string[];
  /** Geometry (geometry.ts): the shape, its measurements marked. */
  figure?: Figure;
  /** A clock to read (clock.ts) - analog in one of its looks, or digital. */
  clock?: ClockSpec;
  /** How hard it is, where a level knows - a round's questions then come easiest first (generateRound). */
  difficulty?: number;
  /** A picture of the question for the younger levels: a balance, groups of things, things shared out. */
  scene?: QuestionScene;
  /** Geometry: the answer's unit ("cm", "m²") - written after the answer, it isn't part of the number. */
  unit?: string;
  /** The solution as guided steps (training mode: one box per step) - without, stepsOf makes them from `solution`. */
  steps?: SolutionStep[];
}

/** One step of a guided solution: what to do in it (i18n "step.*" and its values), and the step written out - what its help shows. */
export interface SolutionStep {
  guideKey: string;
  guideVars?: Record<string, string | number>;
  line: string;
}

export const st = (guideKey: string, line: string, guideVars?: Record<string, string | number>): SolutionStep => ({ guideKey, guideVars, line });
const withSteps = (p: AdvancedProblem, steps: SolutionStep[]): AdvancedProblem => ({ ...p, steps });

/**
 * A problem's guided steps: its own, or one per line of its worked solution
 * (the task restated first is left out - it's already shown) with a general
 * guide: start from the formula and the given numbers, then work it out.
 */
export function stepsOf(p: AdvancedProblem): SolutionStep[] {
  if (p.steps && p.steps.length > 0) return p.steps;
  const lines = p.solution.filter((line, i) => !(i === 0 && line === p.display && p.solution.length > 1));
  return lines.map((line, i) => st(i === 0 ? "step.first" : i === lines.length - 1 ? "step.finish" : "step.next", line.replace(/^\s*=\s*/, "")));
}

/** A number the Swedish way, for LaTeX: 3{,}5 and −4. */
export function tex(n: number): string {
  const s = Number.isInteger(n) ? String(n) : String(Math.round(n * 1e6) / 1e6);
  return s.replace(".", "{,}");
}

/** A number as written in a task's LaTeX or a figure's label: 8, 4{,}5, 4,5, 12\,500. */
const NUMBER = /\d+(?:\\,\d{3})*(?:(?:\{,\}|[.,])\d+)?/g;

/**
 * The numbers a question gives: its task, its figure's measurements, its
 * wording's values - and the numbers its worked solution passes through
 * (48 on the way to 24), so any right way there is explained. π problems add
 * 3,14, the value most people use for it. (For pointing out a written number
 * that came from nowhere - mathinput/workCheck.ts's unknownNumbers.)
 */
export function givenNumbers(p: AdvancedProblem): number[] {
  const texts = [p.display, p.firstStep, ...p.solution, ...(p.figure?.labels.map((l) => l.text) ?? []), ...Object.values(p.promptVars ?? {}).map(String)];
  const out = texts.flatMap((text) => [...text.matchAll(NUMBER)].map((m) => Number(m[0].replace(/\\,/g, "").replace(/\{,\}|,/, "."))));
  if (texts.some((text) => text.includes("\\pi"))) out.push(3.14);
  return out.filter((n) => Number.isFinite(n));
}

/** In parentheses when negative - what follows an operator. */
export function par(n: number): string {
  return n < 0 ? `(${tex(n)})` : tex(n);
}

/** "+ 3" or "- 3" - a signed term after something. */
export function signed(n: number): string {
  return n < 0 ? `- ${tex(-n)}` : `+ ${tex(n)}`;
}

/** a·x with a coefficient: "x", "-x", "3x". */
export function coef(a: number, x = "x"): string {
  if (a === 1) return x;
  if (a === -1) return `-${x}`;
  return `${tex(a)}${x}`;
}

const nonZero = (rng: Rng, lo: number, hi: number) => {
  for (;;) {
    const v = randInt(rng, lo, hi);
    if (v !== 0) return v;
  }
};

const pick = <T>(rng: Rng, items: readonly T[]): T => items[randInt(rng, 0, items.length - 1)];

function base(stageId: AdvancedStageId, promptKey: string, display: string, answer: AnswerSpec, firstStep: string, solution: string[], promptVars?: Record<string, string | number>): AdvancedProblem {
  return { stageId, kind: "expression", promptKey, promptVars, display, answer, tipKey: `adv.tip.${stageId}`, firstStep, solution };
}

// --- Åk 7-9 ---------------------------------------------------------------

/** Negativa tal: addition, subtraction and multiplication with negative numbers. */
function negativeNumbers(rng: Rng): AdvancedProblem {
  const a = nonZero(rng, -9, 9);
  const b = nonZero(rng, -9, 9);
  const op = pick(rng, ["+", "-", "*"] as const);
  if (op === "*") {
    const value = a * b;
    const rule = (a < 0) === (b < 0) ? "- \\cdot - = +" : "- \\cdot + = -";
    return withSteps(base("3.1.1", "adv.prompt.calculate", `${par(a)} \\cdot ${par(b)}`, { kind: "value", value }, rule, [`${par(a)} \\cdot ${par(b)} = ${tex(value)}`]), [
      st((a < 0) === (b < 0) ? "step.signSame" : "step.signDifferent", `${par(a)} \\cdot ${par(b)} = ${tex(value)}`),
    ]);
  }
  if (op === "-" && b < 0) {
    const value = a - b;
    return withSteps(base("3.1.1", "adv.prompt.calculate", `${tex(a)} - ${par(b)}`, { kind: "value", value }, `${tex(a)} + ${tex(-b)}`, [`${tex(a)} - ${par(b)} = ${tex(a)} + ${tex(-b)} = ${tex(value)}`]), [
      st("step.minusNegative", `${tex(a)} - ${par(b)} = ${tex(a)} + ${tex(-b)}`),
      st("step.calculate", `${tex(a)} + ${tex(-b)} = ${tex(value)}`),
    ]);
  }
  const value = op === "+" ? a + b : a - b;
  const shown = `${tex(a)} ${op} ${par(b)}`;
  const step = op === "+" && b < 0 ? `${tex(a)} - ${tex(-b)}` : shown;
  return withSteps(base("3.1.1", "adv.prompt.calculate", shown, { kind: "value", value }, step, [`${shown} = ${tex(value)}`]), [
    st(op === "+" && b < 0 ? "step.plusNegative" : "step.calculate", `${shown} = ${tex(value)}`),
  ]);
}

/** Potenser: a small base to a small power. */
function powers(rng: Rng): AdvancedProblem {
  const b = randInt(rng, 2, 5);
  const maxExp = b === 2 ? 6 : b === 3 ? 4 : 3;
  const n = randInt(rng, 2, maxExp);
  const value = b ** n;
  const repeated = Array(n).fill(String(b)).join(" \\cdot ");
  return withSteps(base("3.1.2", "adv.prompt.calculate", `${b}^{${n}}`, { kind: "value", value }, repeated, [`${b}^{${n}} = ${repeated} = ${value}`]), [
    st("step.powerAsProduct", `${b}^{${n}} = ${repeated}`, { b, n }),
    st("step.calculate", `${repeated} = ${value}`),
  ]);
}

/** Grundpotensform: a number times a power of ten, written out. */
function scientific(rng: Rng): AdvancedProblem {
  const mantissa = randInt(rng, 11, 99) / 10;
  const n = pick(rng, [-3, -2, 2, 3, 4, 5]);
  const value = Math.round(mantissa * 10 ** n * 1e6) / 1e6;
  const power = tex(Math.round(10 ** n * 1e6) / 1e6);
  return withSteps(base("3.1.3", "adv.prompt.writeOut", `${tex(mantissa)} \\cdot 10^{${n}}`, { kind: "value", value }, `10^{${n}} = ${power}`, [`${tex(mantissa)} \\cdot 10^{${n}} = ${tex(mantissa)} \\cdot ${power} = ${tex(value)}`]), [
    st("step.powerOfTen", `10^{${n}} = ${power}`, { n }),
    st("step.multiplyIt", `${tex(mantissa)} \\cdot ${power} = ${tex(value)}`, { m: tex(mantissa).replace("{,}", ",") }),
  ]);
}

/** Procent av: p % of a number that makes it whole. */
function percentOf(rng: Rng): AdvancedProblem {
  const p = pick(rng, [5, 10, 20, 25, 30, 40, 50, 75]);
  // A whole answer: n a multiple of 100 / gcd(p, 100).
  const g = gcd(p, 100);
  const n = (100 / g) * randInt(rng, 1, Math.floor(400 / (100 / g)));
  const value = (p * n) / 100;
  const factor = tex(p / 100);
  return withSteps(base("3.2.1", "adv.prompt.percentOf", "", { kind: "value", value }, `${factor} \\cdot ${n}`, [`${p} \\% = ${factor}`, `${factor} \\cdot ${n} = ${tex(value)}`], { p, n }), [
    st("step.percentToDecimal", `${p} \\% = ${factor}`, { p }),
    st("step.multiplyBy", `${factor} \\cdot ${n} = ${tex(value)}`, { n }),
  ]);
}

/** Förändringsfaktor: a price raised or lowered by p %. */
function changeFactor(rng: Rng): AdvancedProblem {
  const up = randInt(rng, 0, 1) === 1;
  const p = pick(rng, [10, 15, 20, 25, 30, 40]);
  const n = 20 * randInt(rng, 2, 25);
  const factor = up ? (100 + p) / 100 : (100 - p) / 100;
  const value = Math.round(factor * n * 100) / 100;
  const factorLine = `${up ? `1 + ${tex(p / 100)}` : `1 - ${tex(p / 100)}`} = ${tex(factor)}`;
  return withSteps(base("3.2.2", up ? "adv.prompt.priceUp" : "adv.prompt.priceDown", "", { kind: "value", value }, `${tex(factor)} \\cdot ${n}`, [factorLine, `${tex(factor)} \\cdot ${n} = ${tex(value)}`], { p, n }), [
    st(up ? "step.factorUp" : "step.factorDown", factorLine, { p }),
    st("step.multiplyBy", `${tex(factor)} \\cdot ${n} = ${tex(value)}`, { n }),
  ]);
}

/** Förenkla: collect x-terms and numbers. */
function simplify(rng: Rng): AdvancedProblem {
  const a = randInt(rng, 2, 9);
  const b = nonZero(rng, -6, 8);
  const c = nonZero(rng, -9, 9);
  const d = nonZero(rng, -9, 9);
  const shown = `${coef(a)} ${signed(c)} ${b < 0 ? "-" : "+"} ${coef(Math.abs(b))} ${signed(d)}`;
  const k = a + b;
  const m = c + d;
  const answer = [k === 0 ? "" : coef(k), m === 0 ? "" : k === 0 ? tex(m) : signed(m)].join(" ").trim() || "0";
  const grouped = `${coef(a)} ${b < 0 ? "-" : "+"} ${coef(Math.abs(b))} ${signed(c)} ${signed(d)}`;
  return withSteps(base("3.3.1", "adv.prompt.simplify", shown, { kind: "expression", variable: "x", latex: answer }, grouped, [`${shown} = ${answer}`]), [
    st("step.groupTerms", `${shown} = ${grouped}`),
    st("step.combineTerms", `${grouped} = ${answer}`),
  ]);
}

/** Ekvationer: ax + b = c with a whole solution. */
function equation(rng: Rng): AdvancedProblem {
  const x = nonZero(rng, -6, 9);
  const a = randInt(rng, 2, 9);
  const b = nonZero(rng, -9, 15);
  const c = a * x + b;
  const shown = `${coef(a)} ${signed(b)} = ${tex(c)}`;
  return withSteps(base("3.3.2", "adv.prompt.solve", shown, { kind: "solutions", variable: "x", values: [x] }, `${coef(a)} = ${tex(c)} ${signed(-b)}`, [shown, `${coef(a)} = ${tex(c - b)}`, `x = \\frac{${tex(c - b)}}{${a}}`, `x = ${tex(x)}`]), [
    st(b > 0 ? "step.subtractBoth" : "step.addBoth", `${coef(a)} = ${tex(c - b)}`, { n: Math.abs(b) }),
    st("step.divideBoth", `x = \\frac{${tex(c - b)}}{${a}}`, { n: a }),
    st("step.finishX", `x = ${tex(x)}`),
  ]);
}

/** Ekvationer med x på båda sidor: ax + b = cx + d. */
function equationBothSides(rng: Rng): AdvancedProblem {
  const x = nonZero(rng, -5, 8);
  const c = randInt(rng, 1, 5);
  const a = c + randInt(rng, 1, 5);
  const b = nonZero(rng, -9, 9);
  const d = a * x + b - c * x;
  const shown = `${coef(a)} ${signed(b)} = ${coef(c)} ${signed(d)}`;
  return withSteps(base("3.3.3", "adv.prompt.solve", shown, { kind: "solutions", variable: "x", values: [x] }, `${coef(a)} - ${coef(c)} = ${tex(d)} ${signed(-b)}`, [shown, ...(a - c === 1 ? [] : [`${coef(a - c)} = ${tex(d - b)}`]), `x = ${tex(x)}`]), [
    st("step.collectX", `${coef(a - c)} ${signed(b)} = ${tex(d)}`, { term: coef(c) }),
    st(b > 0 ? "step.subtractBoth" : "step.addBoth", `${coef(a - c)} = ${tex(d - b)}`, { n: Math.abs(b) }),
    ...(a - c === 1 ? [] : [st("step.divideBoth", `x = ${tex(x)}`, { n: a - c })]),
  ]);
}

/** "bx" or "x" - a term with its coefficient, for the rules below. */
const bx = (b: number) => (b === 1 ? "x" : `${b}x`);

/**
 * Kvadreringsreglerna: (a + b)² = a² + 2ab + b² and (a − b)² = a² − 2ab + b².
 * Expanding (the answer has to be written out, no brackets), factoring back
 * into a square, and the rule as a mental-maths trick (31² = (30 + 1)²).
 */
function squareRules(rng: Rng): AdvancedProblem {
  const kind = pick(rng, ["plus", "minus", "coefficient", "factor", "trick"] as const);
  const a = randInt(rng, 1, 9);
  if (kind === "trick") {
    const tens = 10 * randInt(rng, 2, 9);
    const d = pick(rng, [1, 2, -1, -2]);
    const n = tens + d;
    const shown = `${n}^{2}`;
    const rule = `(${tens} ${signed(d)})^{2}`;
    const ruled = `${tens}^{2} ${signed(2 * tens * d)} + ${d * d}`;
    return withSteps(base("3.3.4", "adv.prompt.squareTrick", shown, { kind: "value", value: n * n }, `${shown} = ${rule} = ${ruled}`, [
      `${shown} = ${rule}`,
      `= ${ruled} = ${tens * tens} ${signed(2 * tens * d)} + ${d * d} = ${n * n}`,
    ]), [
      st("step.splitSquare", `${shown} = ${rule}`, { tens, d: Math.abs(d), sign: d < 0 ? "−" : "+" }),
      st("step.squareRule", `${rule} = ${ruled}`),
      st("step.calculate", `${ruled} = ${n * n}`),
    ]);
  }
  const b = kind === "coefficient" ? randInt(rng, 2, 3) : 1;
  const sign = kind === "minus" || (kind === "coefficient" && rng() < 0.5) ? -1 : 1;
  const square = `(${bx(b)} ${sign < 0 ? "-" : "+"} ${a})^{2}`;
  const expanded = `${b === 1 ? "x^{2}" : `${b * b}x^{2}`} ${signedTerm(sign * 2 * a * b)} + ${a * a}`;
  const middle = `${b === 1 ? "x^{2}" : `(${bx(b)})^{2}`} ${sign < 0 ? "-" : "+"} 2 \\cdot ${bx(b)} \\cdot ${a} + ${a}^{2}`;
  if (kind === "factor") {
    return withSteps(base("3.3.4", "adv.prompt.factor", expanded, { kind: "expression", variable: "x", latex: square, form: "factored" }, `2 \\cdot x \\cdot ${a} = ${2 * a}x \\quad ${a * a} = ${a}^{2}`, [
      `${expanded} = ${middle}`,
      `= ${square}`,
    ]), [st("step.findSquares", `${expanded} = ${middle}`), st("step.writeAsSquare", `${middle} = ${square}`)]);
  }
  return withSteps(base("3.3.4", "adv.prompt.expand", square, { kind: "expression", variable: "x", latex: expanded, form: "expanded" }, `${square} = ${middle}`, [`${square} = ${middle}`, `= ${expanded}`]), [
    st("step.squareRule", `${square} = ${middle}`),
    st("step.simplifyTerms", `${middle} = ${expanded}`),
  ]);
}

/**
 * Konjugatregeln: (a + b)(a − b) = a² − b². Expanding, factoring a difference
 * of two squares, and the trick 21 · 19 = (20 + 1)(20 − 1) = 400 − 1.
 */
function conjugateRule(rng: Rng): AdvancedProblem {
  const kind = pick(rng, ["expand", "coefficient", "factor", "trick"] as const);
  const a = randInt(rng, 1, 10);
  if (kind === "trick") {
    const mid = 10 * randInt(rng, 2, 9);
    const d = randInt(rng, 1, 3);
    const shown = `${mid + d} \\cdot ${mid - d}`;
    const value = mid * mid - d * d;
    return withSteps(base("3.3.5", "adv.prompt.conjugateTrick", shown, { kind: "value", value }, `(${mid} + ${d})(${mid} - ${d}) = ${mid}^{2} - ${d}^{2}`, [
      `${shown} = (${mid} + ${d})(${mid} - ${d})`,
      `= ${mid}^{2} - ${d}^{2} = ${mid * mid} - ${d * d} = ${value}`,
    ]), [
      st("step.splitConjugate", `${shown} = (${mid} + ${d})(${mid} - ${d})`, { mid, d }),
      st("step.conjugateRule", `(${mid} + ${d})(${mid} - ${d}) = ${mid}^{2} - ${d}^{2}`),
      st("step.calculate", `${mid}^{2} - ${d}^{2} = ${mid * mid} - ${d * d} = ${value}`),
    ]);
  }
  const b = kind === "coefficient" ? randInt(rng, 2, 5) : 1;
  const product = `(${bx(b)} + ${a})(${bx(b)} - ${a})`;
  const difference = `${b === 1 ? "x^{2}" : `${b * b}x^{2}`} - ${a * a}`;
  const middle = `${b === 1 ? "x^{2}" : `(${bx(b)})^{2}`} - ${a}^{2}`;
  if (kind === "factor") {
    return withSteps(base("3.3.5", "adv.prompt.factor", difference, { kind: "expression", variable: "x", latex: product, form: "factored" }, `${difference} = ${middle}`, [`${difference} = ${middle}`, `= ${product}`]), [
      st("step.findSquaresDifference", `${difference} = ${middle}`),
      st("step.writeAsConjugate", `${middle} = ${product}`),
    ]);
  }
  return withSteps(base("3.3.5", "adv.prompt.expand", product, { kind: "expression", variable: "x", latex: difference, form: "expanded" }, `${product} = ${middle}`, [`${product} = ${middle}`, `= ${difference}`]), [
    st("step.conjugateRule", `${product} = ${middle}`),
    st("step.simplifyTerms", `${middle} = ${difference}`),
  ]);
}

/**
 * Andragradsekvationer without the pq formula: x² = c (two roots, ±), ax² = c,
 * x² + bx = 0 (take x out: x(x + b) = 0) and a product that is zero
 * (nollproduktmetoden).
 */
function quadraticBasics(rng: Rng): AdvancedProblem {
  const kind = pick(rng, ["square", "coefficient", "commonFactor", "zeroProduct"] as const);
  if (kind === "square" || kind === "coefficient") {
    const r = randInt(rng, 2, 12);
    const a = kind === "coefficient" ? randInt(rng, 2, 5) : 1;
    const c = a * r * r;
    const shown = `${a === 1 ? "" : a}x^{2} = ${c}`;
    const steps = a === 1 ? [] : [`x^{2} = \\frac{${c}}{${a}} = ${r * r}`];
    return withSteps(base("3.3.6", "adv.prompt.solve", shown, { kind: "solutions", variable: "x", values: [r, -r] }, a === 1 ? `x = \\pm \\sqrt{${c}}` : `x^{2} = \\frac{${c}}{${a}}`, [
      shown,
      ...steps,
      `x = \\pm \\sqrt{${r * r}}`,
      `x_{1} = ${r}, x_{2} = -${r}`,
    ]), [
      ...(a === 1 ? [] : [st("step.divideBoth", `x^{2} = ${r * r}`, { n: a })]),
      st("step.rootBoth", `x = \\pm \\sqrt{${r * r}}`),
      st("step.bothSolutions", `x_{1} = ${r}, x_{2} = -${r}`),
    ]);
  }
  if (kind === "commonFactor") {
    const b = nonZero(rng, -9, 9);
    const shown = `x^{2} ${signedTerm(b)} = 0`;
    const factored = `x(x ${signed(b)}) = 0`;
    return withSteps(base("3.3.6", "adv.prompt.solve", shown, { kind: "solutions", variable: "x", values: [0, -b] }, factored, [
      shown,
      factored,
      `x_{1} = 0, x ${signed(b)} = 0`,
      `x_{2} = ${tex(-b)}`,
    ]), [
      st("step.factorOutX", factored),
      st("step.zeroProduct", `x_{1} = 0, x ${signed(b)} = 0`),
      st("step.solveTheOther", `x_{2} = ${tex(-b)}`),
    ]);
  }
  const r1 = nonZero(rng, -8, 8);
  let r2 = nonZero(rng, -8, 8);
  while (r2 === r1) r2 = nonZero(rng, -8, 8);
  const shown = `(x ${signed(-r1)})(x ${signed(-r2)}) = 0`;
  return withSteps(base("3.3.6", "adv.prompt.solve", shown, { kind: "solutions", variable: "x", values: [r1, r2] }, `x ${signed(-r1)} = 0 \\quad \\text{eller} \\quad x ${signed(-r2)} = 0`, [
    shown,
    `x ${signed(-r1)} = 0, x ${signed(-r2)} = 0`,
    `x_{1} = ${tex(r1)}, x_{2} = ${tex(r2)}`,
  ]), [st("step.zeroProduct", `x ${signed(-r1)} = 0, x ${signed(-r2)} = 0`), st("step.bothSolutions", `x_{1} = ${tex(r1)}, x_{2} = ${tex(r2)}`)]);
}

/** Pythagoras: the hypotenuse from two whole sides. */
function pythagoras(rng: Rng): AdvancedProblem {
  const [a, b, c] = pick(rng, [
    [3, 4, 5],
    [6, 8, 10],
    [5, 12, 13],
    [8, 15, 17],
    [9, 12, 15],
    [7, 24, 25],
    [12, 16, 20],
  ] as const);
  return withSteps(base("3.4.1", "adv.prompt.hypotenuse", "c^{2} = a^{2} + b^{2}", { kind: "value", value: c }, `c^{2} = ${a}^{2} + ${b}^{2}`, [`c^{2} = ${a}^{2} + ${b}^{2} = ${a * a + b * b}`, `c = \\sqrt{${a * a + b * b}} = ${c}`], { a, b }), [
    st("step.pythagorasInsert", `c^{2} = ${a}^{2} + ${b}^{2}`, { a, b }),
    st("step.pythagorasSquares", `c^{2} = ${a * a} + ${b * b}`, { a, b }),
    st("step.pythagorasAdd", `c^{2} = ${a * a + b * b}`),
    st("step.rootC", `c = \\sqrt{${a * a + b * b}} = ${c}`, { n: a * a + b * b }),
  ]);
}

/** Linjära funktioner: y at an x, or the slope through two points. */
function linear(rng: Rng): AdvancedProblem {
  const k = nonZero(rng, -4, 5);
  const m = randInt(rng, -6, 8);
  if (randInt(rng, 0, 1) === 0) {
    const x = randInt(rng, -3, 6);
    const y = k * x + m;
    const line = `y = ${coef(k)} ${signed(m)}`;
    return withSteps(base("3.4.2", "adv.prompt.lineY", line, { kind: "value", value: y }, `y = ${tex(k)} \\cdot ${par(x)} ${signed(m)}`, [`y = ${tex(k)} \\cdot ${par(x)} ${signed(m)} = ${tex(y)}`], { x }), [
      st("step.insertX", `y = ${tex(k)} \\cdot ${par(x)} ${signed(m)}`, { x: tex(x) }),
      st("step.calculate", `${tex(k)} \\cdot ${par(x)} ${signed(m)} = ${tex(y)}`),
    ]);
  }
  const x1 = randInt(rng, -3, 2);
  const x2 = x1 + randInt(rng, 1, 4);
  const y1 = k * x1 + m;
  const y2 = k * x2 + m;
  const inserted = `\\frac{${tex(y2)} - ${par(y1)}}{${tex(x2)} - ${par(x1)}}`;
  return withSteps(base("3.4.2", "adv.prompt.slope", "k = \\frac{\\Delta y}{\\Delta x}", { kind: "value", value: k }, `k = ${inserted}`, [`k = ${inserted} = \\frac{${tex(y2 - y1)}}{${tex(x2 - x1)}} = ${tex(k)}`], { x1, y1, x2, y2 }), [
    st("step.slopeInsert", `k = ${inserted}`),
    st("step.calculate", `${inserted} = \\frac{${tex(y2 - y1)}}{${tex(x2 - x1)}} = ${tex(k)}`),
  ]);
}

// --- Gymnasiet ------------------------------------------------------------

/** A signed term in x after something: "+ 3x", "- x", nothing for 0. */
function signedTerm(a: number, x = "x"): string {
  if (a === 0) return "";
  return `${a < 0 ? "-" : "+"} ${Math.abs(a) === 1 ? x : `${tex(Math.abs(a))}${x}`}`;
}

/** x to a power, as written: x, x^{3}. */
function xPow(n: number): string {
  return n === 1 ? "x" : `x^{${n}}`;
}

/** pq-formeln: x² + px + q = 0 with whole roots. */
/**
 * pq-formeln, x = −p/2 ± √((p/2)² − q), with whole roots - on an equation
 * already in the form x² + px + q = 0, or one that first has to get there:
 * moved over to "= 0" (x² + px = k), divided through by the x² coefficient
 * (2x² + …), or with a double root (the square root is 0: one solution).
 */
function pq(rng: Rng): AdvancedProblem {
  const kind = pick(rng, ["standard", "standard", "rearrange", "divide", "double"] as const);
  const r1 = nonZero(rng, -7, 7);
  let r2 = kind === "double" ? r1 : nonZero(rng, -7, 7);
  while (kind !== "double" && (r2 === r1 || r1 + r2 === 0)) r2 = nonZero(rng, -7, 7);
  const p = -(r1 + r2);
  const q = r1 * r2;
  const standard = `x^{2} ${signedTerm(p)} ${signed(q)} = 0`;
  const root = Math.sqrt((p / 2) ** 2 - q);

  // What the task shows, and the step that brings it to x² + px + q = 0.
  let shown = standard;
  const before: string[] = [];
  if (kind === "rearrange") {
    shown = `x^{2} ${signedTerm(p)} = ${tex(-q)}`;
    before.push(shown, standard);
  } else if (kind === "divide") {
    const a = randInt(rng, 2, 3);
    shown = `${a}x^{2} ${signedTerm(a * p)} ${signed(a * q)} = 0`;
    before.push(shown, standard);
  }

  const formula = `x = ${tex(-p / 2)} \\pm \\sqrt{${par(p / 2)}^{2} ${signed(-q)}}`;
  const answers =
    kind === "double" ? [`${formula} = ${tex(-p / 2)} \\pm 0`, `x = ${tex(r1)}`] : [`${formula} = ${tex(-p / 2)} \\pm ${tex(root)}`, `x_{1} = ${tex(Math.max(r1, r2))}`, `x_{2} = ${tex(Math.min(r1, r2))}`];
  const firstStep = kind === "rearrange" ? standard : kind === "divide" ? `${standard} \\quad (\\text{dela med } ${shown.split("x")[0]})` : `x = -\\frac{p}{2} \\pm \\sqrt{\\left(\\frac{p}{2}\\right)^{2} - q}`;
  const divisor = kind === "divide" ? Number(shown.split("x")[0]) : 1;
  return withSteps(base("4.1.1", "adv.prompt.solveQuadratic", shown, { kind: "solutions", variable: "x", values: kind === "double" ? [r1] : [r1, r2] }, firstStep, [
    ...before,
    `p = ${tex(p)},\\ q = ${tex(q)}`,
    ...answers,
  ]), [
    ...(kind === "rearrange" ? [st("step.makeZero", standard)] : kind === "divide" ? [st("step.divideBoth", standard, { n: divisor })] : []),
    st("step.readPQ", `p = ${tex(p)},\\ q = ${tex(q)}`),
    st("step.pqFormula", answers[0]),
    kind === "double" ? st("step.doubleRoot", `x = ${tex(r1)}`) : st("step.bothSolutions", `x_{1} = ${tex(Math.max(r1, r2))}, x_{2} = ${tex(Math.min(r1, r2))}`),
  ]);
}

/** Logaritmer: lg of a power of ten, or the x in lg x = n / 10^x = N. */
function logarithms(rng: Rng): AdvancedProblem {
  const n = randInt(rng, 1, 5);
  const N = 10 ** n;
  const form = randInt(rng, 0, 2);
  if (form === 0) {
    return withSteps(base("4.1.2", "adv.prompt.calculate", `\\lg ${N}`, { kind: "value", value: n }, `${N} = 10^{${n}}`, [`\\lg ${N} = \\lg 10^{${n}} = ${n}`]), [
      st("step.asPowerOfTen", `\\lg ${N} = \\lg 10^{${n}} = ${n}`, { N }),
    ]);
  }
  if (form === 1) {
    return withSteps(base("4.1.2", "adv.prompt.solve", `\\lg x = ${n}`, { kind: "solutions", variable: "x", values: [N] }, `x = 10^{${n}}`, [`\\lg x = ${n}`, `x = 10^{${n}} = ${N}`]), [
      st("step.lgMeans", `x = 10^{${n}} = ${N}`, { n }),
    ]);
  }
  return withSteps(base("4.1.2", "adv.prompt.solve", `10^{x} = ${N}`, { kind: "solutions", variable: "x", values: [n] }, `x = \\lg ${N}`, [`10^{x} = ${N}`, `x = \\lg ${N} = ${n}`]), [
    st("step.takeLg", `x = \\lg ${N} = ${n}`, { N }),
  ]);
}

/** What each ratio is, in a right triangle - the first step towards an exact value. */
const DEFINITION = {
  sin: "\\sin v = \\frac{\\text{motstående}}{\\text{hypotenusan}}",
  cos: "\\cos v = \\frac{\\text{närliggande}}{\\text{hypotenusan}}",
  tan: "\\tan v = \\frac{\\text{motstående}}{\\text{närliggande}}",
} as const;

/** Trigonometri: exact values, and a side from the hypotenuse and an angle. */
function trigonometry(rng: Rng): AdvancedProblem {
  if (randInt(rng, 0, 1) === 0) {
    const [fn, v, value] = pick(rng, [
      ["sin", 30, 0.5],
      ["cos", 60, 0.5],
      ["tan", 45, 1],
      ["sin", 90, 1],
      ["cos", 0, 1],
      ["cos", 90, 0],
    ] as const);
    return withSteps(base("4.2.1", "adv.prompt.exact", `\\${fn} ${v}^{\\circ}`, { kind: "value", value }, DEFINITION[fn], [`\\${fn} ${v}^{\\circ} = ${tex(value)}`]), [
      st("step.exactValue", `\\${fn} ${v}^{\\circ} = ${tex(value)}`),
    ]);
  }
  const h = 2 * randInt(rng, 2, 12);
  const [fn, v] = pick(rng, [
    ["sin", 30],
    ["cos", 60],
  ] as const);
  const value = h / 2;
  const sideKey = fn === "sin" ? "adv.prompt.oppositeSide" : "adv.prompt.adjacentSide";
  const side = fn === "sin" ? "a" : "b";
  return withSteps(base("4.2.1", sideKey, `\\${fn} v = \\frac{${side}}{c}`, { kind: "value", value }, `${side} = ${h} \\cdot \\${fn} ${v}^{\\circ}`, [`${side} = ${h} \\cdot \\${fn} ${v}^{\\circ} = ${h} \\cdot 0{,}5 = ${tex(value)}`], { h, v }), [
    st("step.sideFromRatio", `${side} = ${h} \\cdot \\${fn} ${v}^{\\circ}`, { side, h }),
    st("step.calculate", `${h} \\cdot \\${fn} ${v}^{\\circ} = ${h} \\cdot 0{,}5 = ${tex(value)}`),
  ]);
}

/** Derivata: f(x) = ax^n + bx + c. */
function derivative(rng: Rng): AdvancedProblem {
  const a = nonZero(rng, -5, 6);
  const n = randInt(rng, 2, 4);
  const b = nonZero(rng, -7, 7);
  const c = randInt(rng, -9, 9);
  const shown = `f(x) = ${coef(a, xPow(n))} ${signedTerm(b)} ${c === 0 ? "" : signed(c)}`.trim();
  const answer = `${coef(a * n, xPow(n - 1))} ${signed(b)}`;
  const step = `${par(a)} \\cdot ${n}${xPow(n - 1)} ${signed(b)}`;
  return withSteps(base("4.3.1", "adv.prompt.derive", shown, { kind: "expression", variable: "x", latex: answer }, `f'(x) = ${step}`, [`f'(x) = ${step} = ${answer}`]), [
    st("step.deriveTerms", `f'(x) = ${step}`),
    st("step.simplifyTerms", `f'(x) = ${answer}`),
  ]);
}

/** Integraler: ∫ₐᵇ (n+1)·k·xⁿ dx with a whole value. */
function integral(rng: Rng): AdvancedProblem {
  const n = randInt(rng, 1, 2);
  const k = randInt(rng, 1, 3);
  const c = (n + 1) * k;
  const lo = randInt(rng, 0, 1);
  const hi = lo + randInt(rng, 1, 3);
  const value = k * (hi ** (n + 1) - lo ** (n + 1));
  const f = coef(c, n === 1 ? "x" : `x^{${n}}`);
  const F = coef(k, `x^{${n + 1}}`);
  const bounds = `${k === 1 ? "" : `${k} \\cdot `}${hi}^{${n + 1}} - ${k === 1 ? "" : `${k} \\cdot `}${lo}^{${n + 1}} = ${tex(value)}`;
  return withSteps(base("4.3.2", "adv.prompt.integrate", `\\int_{${lo}}^{${hi}} ${f}\\, dx`, { kind: "value", value }, `F(x) = ${F}`, [`\\left[ ${F} \\right]_{${lo}}^{${hi}}`, `= ${bounds}`]), [
    st("step.primitive", `F(x) = ${F}`),
    st("step.insertBounds", bounds, { lo, hi }),
  ]);
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export const ADVANCED_GENERATORS: Record<AdvancedStageId, (rng: Rng) => AdvancedProblem> = {
  "3.1.1": negativeNumbers,
  "3.1.2": powers,
  "3.1.3": scientific,
  "3.2.1": percentOf,
  "3.2.2": changeFactor,
  "3.3.1": simplify,
  "3.3.2": equation,
  "3.3.3": equationBothSides,
  "3.3.4": squareRules,
  "3.3.5": conjugateRule,
  "3.3.6": quadraticBasics,
  "3.4.1": pythagoras,
  "3.4.2": linear,
  "4.1.1": pq,
  "4.1.2": logarithms,
  "4.2.1": trigonometry,
  "4.3.1": derivative,
  "4.3.2": integral,
};
