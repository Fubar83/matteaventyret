/**
 * Questions for åk 7-9 and gymnasiet, answered by writing on a free board
 * (see game/questions/written/ExpressionPlayer.tsx): each has the task shown as LaTeX, its
 * answer in a form written work can be checked against (mathinput/workCheck.ts),
 * and a help ladder - a tip, the first step, the whole worked solution.
 *
 * Numbers are chosen so answers come out whole (or with one Swedish decimal),
 * as school exercises do. Pure and deterministic given the rng.
 */
import type { Rng } from "../../rng";
import { pick, randInt } from "../../rng";
import { coef, par, signed, st, tex, type WrittenProblem, type AnswerSpec, type SolutionStep } from "./problem";
import { RATIO, randomShape, sideOf, SIDES, type Role } from "../rightTriangle";
import { exact } from "../unitCircle";

export type AdvancedStageId =
  | "3.1.1"
  | "3.1.2"
  | "3.1.3"
  | "3.1.9"
  | "3.2.1"
  | "3.2.2"
  | "3.3.1"
  | "3.3.2"
  | "3.3.3"
  | "3.3.4"
  | "3.3.5"
  | "3.3.6"
  | "3.3.14"
  | "3.3.18"
  | "3.4.1"
  | "3.4.2"
  | "4.1.1"
  | "4.1.2"
  | "4.1.6"
  | "4.2.1"
  | "4.2.8"
  | "4.2.12"
  | "4.3.1"
  | "4.3.2";

const withSteps = (p: WrittenProblem, steps: SolutionStep[]): WrittenProblem => ({ ...p, steps });

const nonZero = (rng: Rng, lo: number, hi: number) => {
  for (;;) {
    const v = randInt(rng, lo, hi);
    if (v !== 0) return v;
  }
};


function base(stageId: AdvancedStageId, promptKey: string, display: string, answer: AnswerSpec, firstStep: string, solution: string[], promptVars?: Record<string, string | number>): WrittenProblem {
  return { stageId, kind: "expression", promptKey, promptVars, display, answer, tipKey: `adv.tip.${stageId}`, firstStep, solution };
}

// --- Åk 7-9 ---------------------------------------------------------------

/** Negativa tal: addition, subtraction and multiplication with negative numbers. */
function negativeNumbers(rng: Rng): WrittenProblem {
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
function powers(rng: Rng): WrittenProblem {
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
function scientific(rng: Rng): WrittenProblem {
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
function percentOf(rng: Rng): WrittenProblem {
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
function changeFactor(rng: Rng): WrittenProblem {
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
function simplify(rng: Rng): WrittenProblem {
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
function equation(rng: Rng): WrittenProblem {
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
function equationBothSides(rng: Rng): WrittenProblem {
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
function squareRules(rng: Rng): WrittenProblem {
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
function conjugateRule(rng: Rng): WrittenProblem {
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
function quadraticBasics(rng: Rng): WrittenProblem {
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
function pythagoras(rng: Rng): WrittenProblem {
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
function linear(rng: Rng): WrittenProblem {
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
function pq(rng: Rng): WrittenProblem {
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
function logarithms(rng: Rng): WrittenProblem {
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
function trigonometry(rng: Rng): WrittenProblem {
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

/**
 * Trigonometri utan räknare: a side from an exact ratio (sin v = 3/5, from a
 * Pythagorean triple), or an angle from two sides whose ratio is in the table
 * (5 and 10: sin v = 1/2, v = 30°). The triangle is drawn, any way round.
 */
function trigNoCalculator(rng: Rng): WrittenProblem {
  if (rng() < 0.6) {
    const [p, q, h] = pick(rng, [[3, 4, 5], [5, 12, 13], [8, 15, 17]] as const);
    const k = randInt(rng, 2, 4);
    const [opp, adj] = rng() < 0.5 ? [p, q] : [q, p];
    const sides: Record<Role, number> = { opposite: opp, adjacent: adj, hypotenuse: h };
    const fn = pick(rng, ["sin", "cos", "tan"] as const);
    const [top, bottom] = RATIO[fn];
    // Mostly the top of the ratio is asked (x = c · sin v); sometimes the bottom (c = a / sin v).
    const askTop = rng() < 0.7;
    const [asked, given] = askTop ? [top, bottom] : [bottom, top];
    const g = sides[given] * k;
    const x = sides[asked] * k;
    const shape = randomShape(rng);
    const legs: [number, number] = shape.angleAt === 0 ? [adj, opp] : [opp, adj];
    const labels: [string | null, string | null, string | null] = [null, null, null];
    labels[SIDES.indexOf(sideOf(shape.angleAt, given))] = String(g);
    labels[SIDES.indexOf(sideOf(shape.angleAt, asked))] = "x";
    const ratio = `\\frac{${sides[top]}}{${sides[bottom]}}`;
    const setUp = askTop ? `\\${fn} v = \\frac{x}{${g}}` : `\\${fn} v = \\frac{${g}}{x}`;
    const last = askTop ? `x = ${g} \\cdot ${ratio} = ${x}` : `x = ${g} \\cdot \\frac{${sides[bottom]}}{${sides[top]}} = ${x}`;
    return {
      ...withSteps(base("4.2.8", "adv.prompt.trigSide", `\\${fn} v = ${ratio}`, { kind: "value", value: x }, setUp, [setUp, last]), [
        st("step.trigSetUp", setUp, { fn }),
        st(askTop ? "step.trigMultiply" : "step.trigDivide", last, { g }),
      ]),
      scene: { kind: "rightTriangle", shape: { ...shape, legs }, labels, angle: "v" },
    };
  }
  // Two sides in a ratio from the table: 1 : 2 is sin 30° (or cos 60°), equal legs tan 45°.
  const k = randInt(rng, 2, 9);
  const which = pick(rng, ["sin30", "cos60", "tan45"] as const);
  const [fn, roles, angle, ratio] =
    which === "sin30"
      ? (["sin", ["opposite", "hypotenuse"], 30, "\\frac{1}{2}"] as const)
      : which === "cos60"
        ? (["cos", ["adjacent", "hypotenuse"], 60, "\\frac{1}{2}"] as const)
        : (["tan", ["opposite", "adjacent"], 45, "1"] as const);
  const lengths: Record<Role, number> = { opposite: which === "tan45" ? k : which === "sin30" ? k : 0, adjacent: which === "tan45" ? k : which === "cos60" ? k : 0, hypotenuse: 2 * k };
  const shape = randomShape(rng);
  // Drawn true to shape: 30° has the short leg across from it.
  const opp = which === "sin30" ? 1 : which === "cos60" ? 1.73 : 1;
  const adj = which === "sin30" ? 1.73 : 1;
  const legs: [number, number] = shape.angleAt === 0 ? [adj, opp] : [opp, adj];
  const labels: [string | null, string | null, string | null] = [null, null, null];
  for (const r of roles) labels[SIDES.indexOf(sideOf(shape.angleAt, r))] = String(lengths[r]);
  const first = `\\${fn} v = \\frac{${lengths[roles[0]]}}{${lengths[roles[1]]}} = ${ratio}`;
  const answer = `v = ${angle}^{\\circ}`;
  return {
    ...withSteps(base("4.2.8", "adv.prompt.trigAngle", "", { kind: "value", value: angle }, first, [first, answer]), [
      st("step.trigWhichRatio", first, { fn }),
      st("step.trigAngle", answer),
    ]),
    scene: { kind: "rightTriangle", shape: { ...shape, legs }, labels, angle: "v" },
  };
}

/**
 * Trigonometriska ekvationer, 0° ≤ v < 360°: sin, cos or tan equal to an exact
 * value - the angle from the table, then the other one on the circle. Now and
 * then 2 sin v = 1, to divide first.
 */
function trigEquations(rng: Rng): WrittenProblem {
  const fn = pick(rng, ["sin", "cos", "tan"] as const);
  const a = pick(rng, [30, 45, 60]);
  const sign = pick(rng, [1, -1]);
  const solutions = (
    fn === "sin" ? (sign > 0 ? [a, 180 - a] : [180 + a, 360 - a]) : fn === "cos" ? (sign > 0 ? [a, 360 - a] : [180 - a, 180 + a]) : sign > 0 ? [a, 180 + a] : [180 - a, 360 - a]
  ).sort((x, y) => x - y);
  const tanValue: Record<number, string> = { 30: "\\frac{1}{\\sqrt{3}}", 45: "1", 60: "\\sqrt{3}" };
  const positive = fn === "tan" ? tanValue[a] : exact(fn === "sin" ? Math.sin((a * Math.PI) / 180) : Math.cos((a * Math.PI) / 180));
  const value = sign > 0 ? positive : `-${positive}`;
  // 2 sin v = 1, 2 cos v = −√3: twice the value is 1, √2 or √3.
  const doubled = fn !== "tan" && rng() < 0.35;
  const twice = positive.replace(/\\frac\{(.+)\}\{2\}/, "$1");
  const equation = doubled ? `2\\${fn} v = ${sign > 0 ? "" : "-"}${twice}` : `\\${fn} v = ${value}`;
  const plain = `\\${fn} v = ${value}`;
  const baseLine = `\\${fn} ${a}^{\\circ} = ${positive}`;
  const both = `v = ${solutions[0]}^{\\circ}, v = ${solutions[1]}^{\\circ}`;
  return withSteps(
    base("4.2.12", "adv.prompt.trigEquation", `${equation},\\quad 0^{\\circ} \\le v < 360^{\\circ}`, { kind: "solutions", variable: "v", values: solutions }, doubled ? plain : baseLine, [...(doubled ? [plain] : []), baseLine, both]),
    [
      ...(doubled ? [st("step.divideBoth", plain, { n: 2 })] : []),
      st("step.trigBase", baseLine, { fn }),
      st(`step.trigSecond.${fn}`, both, { a }),
    ]
  );
}

/**
 * Räkna med potenslagarna: a calculation that's quick with the laws and slow
 * without - 2¹⁰ / 2⁷ = 2³ = 8, (3²)² = 3⁴, 5⁴ · 5³ / 5⁶ = 5, 10⁵ · 10⁻² = 1000.
 */
function powerLaws(rng: Rng): WrittenProblem {
  const b = pick(rng, [2, 3, 5, 10]);
  const most = b === 2 ? 6 : b === 3 ? 4 : b === 5 ? 3 : 4;
  const e = randInt(rng, b === 10 ? 2 : 0, most);
  const value = b ** e;
  const p = (n: number) => `${b}^{${n}}`;
  // Each law needs an e it can make: a power of a power needs e = 2k or 3k, a product e ≥ 2.
  let kind = pick(rng, ["quotient", "product", "power", "mixed", "negative"] as const);
  if (kind === "power" && (e < 2 || (e % 2 !== 0 && e % 3 !== 0))) kind = "quotient";
  if (kind === "product" && e < 2) kind = "quotient";
  let shown: string;
  let law: string;
  let key: string;
  if (kind === "quotient") {
    const m = e + randInt(rng, 3, 7);
    shown = `\\frac{${p(m)}}{${p(m - e)}}`;
    law = `${b}^{${m} - ${m - e}}`;
    key = "step.powerQuotient";
  } else if (kind === "power") {
    const k = e % 2 === 0 ? 2 : 3;
    shown = `(${p(e / k)})^{${k}}`;
    law = `${b}^{${e / k} \\cdot ${k}}`;
    key = "step.powerPower";
  } else if (kind === "product") {
    const m = randInt(rng, 1, e - 1);
    shown = `${p(m)} \\cdot ${p(e - m)}`;
    law = `${b}^{${m} + ${e - m}}`;
    key = "step.powerProduct";
  } else if (kind === "negative") {
    const m = e + randInt(rng, 2, 5);
    shown = `${p(m)} \\cdot ${p(e - m)}`;
    law = `${b}^{${m} + (${e - m})}`;
    key = "step.powerProduct";
  } else {
    // Both laws: a product over a power.
    const m = randInt(rng, 2, 5);
    const n = randInt(rng, 2, 5);
    shown = `\\frac{${p(m)} \\cdot ${p(n)}}{${p(m + n - e)}}`;
    law = `${b}^{${m} + ${n} - ${m + n - e}}`;
    key = "step.powerMixed";
  }
  const one = `${shown} = ${law} = ${b}^{${e}}`;
  return withSteps(base("3.1.9", "adv.prompt.powerLaws", shown, { kind: "value", value }, one, [one, `${b}^{${e}} = ${value}`]), [
    st(key, one),
    st(e === 0 ? "step.powerZero" : "step.calculate", `${b}^{${e}} = ${value}`),
  ]);
}

/** A term as written: 6x, −x, 4x², 9 - with its sign, or without a + when it comes first. */
function term(c: number, power: number, first = false): string {
  const x = power === 0 ? "" : power === 1 ? "x" : `x^{${power}}`;
  const n = Math.abs(c) === 1 && power > 0 ? "" : String(Math.abs(c));
  if (first) return `${c < 0 ? "-" : ""}${n}${x}`;
  return `${c < 0 ? "-" : "+"} ${n}${x}`;
}

/**
 * Bryta ut: the greatest common factor out of a sum - a number (6x + 15 =
 * 3(2x + 5)), x (x² − 7x = x(x − 7)) or both (4x² + 6x = 2x(2x + 3)).
 */
function commonFactor(rng: Rng): WrittenProblem {
  const kind = pick(rng, ["number", "number", "x", "both"] as const);
  const g = (a: number, b: number): number => (b === 0 ? Math.abs(a) : g(b, a % b));
  let a: number;
  let b: number;
  do {
    a = randInt(rng, 1, 7);
    b = nonZero(rng, -9, 9);
  } while (g(a, b) !== 1 || (kind === "x" && a !== 1));
  const k = kind === "x" ? 1 : randInt(rng, 2, 6);
  // number: k(ax + b); x: x(x + b); both: kx(ax + b).
  const px = kind === "number" ? 1 : 2;
  const shown = `${term(k * a, px, true)} ${term(k * b, px - 1)}`;
  const outside = kind === "number" ? String(k) : kind === "x" ? "x" : `${k}x`;
  const answer = `${outside}(${term(a, 1, true)} ${term(b, 0)})`;
  const split = `${outside} \\cdot ${term(a, 1, true)} ${b < 0 ? "-" : "+"} ${outside} \\cdot ${Math.abs(b)}`;
  return withSteps(base("3.3.14", "adv.prompt.factorOut", shown, { kind: "expression", variable: "x", latex: answer, form: "factored" }, `${shown} = ${split}`, [`${shown} = ${split}`, `= ${answer}`]), [
    st("step.findCommon", `${shown} = ${split}`, { f: outside }),
    st("step.takeOut", `${split} = ${answer}`),
  ]);
}

/**
 * Multiplicera parenteser: a(x + b) − c(x + d), where the minus changes every
 * sign in its bracket; and (x + a)(x + b), every term times every term.
 */
function brackets(rng: Rng): WrittenProblem {
  if (rng() < 0.45) {
    const a = randInt(rng, 2, 6);
    const b = nonZero(rng, -7, 7);
    const c = pick(rng, [2, 3, 4, 5].filter((n) => n !== a));
    const d = nonZero(rng, -7, 7);
    const shown = `${a}(x ${signed(b)}) - ${c}(x ${signed(d)})`;
    const out = `${a}x ${signed(a * b)} - ${c}x ${signed(-c * d)}`;
    const k = a - c;
    const m = a * b - c * d;
    const answer = `${coef(k)}${m === 0 ? "" : ` ${signed(m)}`}`;
    return withSteps(base("3.3.18", "adv.prompt.expandSimplify", shown, { kind: "expression", variable: "x", latex: answer, form: "expanded" }, `${shown} = ${out}`, [`${shown} = ${out}`, `= ${answer}`]), [
      st("step.minusBracket", `${shown} = ${out}`),
      st("step.simplifyTerms", `${out} = ${answer}`),
    ]);
  }
  const a = nonZero(rng, -7, 8);
  const b = nonZero(rng, -7, 8);
  const shown = `(x ${signed(a)})(x ${signed(b)})`;
  const four = `x^{2} ${signedTerm(b)} ${signedTerm(a)} ${signed(a * b)}`;
  const answer = `x^{2}${a + b === 0 ? "" : ` ${signedTerm(a + b)}`} ${signed(a * b)}`;
  return withSteps(base("3.3.18", "adv.prompt.expandSimplify", shown, { kind: "expression", variable: "x", latex: answer, form: "expanded" }, `${shown} = ${four}`, [`${shown} = ${four}`, `= ${answer}`]), [
    st("step.everyTerm", `${shown} = ${four}`),
    st("step.simplifyTerms", `${four} = ${answer}`),
  ]);
}

/** Faktorisera x² + bx + c: two numbers with the product c and the sum b. */
function factorQuadratic(rng: Rng): WrittenProblem {
  let p: number;
  let q: number;
  do {
    p = nonZero(rng, -9, 9);
    q = nonZero(rng, -9, 9);
  } while (p === q || p === -q);
  const shown = `x^{2}${p + q === 0 ? "" : ` ${signedTerm(p + q)}`} ${signed(p * q)}`;
  const answer = `(x ${signed(p)})(x ${signed(q)})`;
  const pair = `${par(p)} \\cdot ${par(q)} = ${tex(p * q)}, \\quad ${par(p)} + ${par(q)} = ${tex(p + q)}`;
  return withSteps(base("4.1.6", "adv.prompt.factor", shown, { kind: "expression", variable: "x", latex: answer, form: "factored" }, pair, [`${shown} = ${answer}`]), [
    st("step.sumProduct", `${shown} = ${answer}`, { c: tex(p * q), b: tex(p + q), p: tex(p), q: tex(q) }),
  ]);
}

/** Derivata: f(x) = ax^n + bx + c. */
function derivative(rng: Rng): WrittenProblem {
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
function integral(rng: Rng): WrittenProblem {
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

export const ADVANCED_GENERATORS: Record<AdvancedStageId, (rng: Rng) => WrittenProblem> = {
  "3.1.1": negativeNumbers,
  "3.1.2": powers,
  "3.1.3": scientific,
  "3.1.9": powerLaws,
  "3.2.1": percentOf,
  "3.2.2": changeFactor,
  "3.3.1": simplify,
  "3.3.2": equation,
  "3.3.3": equationBothSides,
  "3.3.4": squareRules,
  "3.3.5": conjugateRule,
  "3.3.6": quadraticBasics,
  "3.3.14": commonFactor,
  "3.3.18": brackets,
  "3.4.1": pythagoras,
  "3.4.2": linear,
  "4.1.1": pq,
  "4.1.2": logarithms,
  "4.1.6": factorQuadratic,
  "4.2.1": trigonometry,
  "4.2.8": trigNoCalculator,
  "4.2.12": trigEquations,
  "4.3.1": derivative,
  "4.3.2": integral,
};
