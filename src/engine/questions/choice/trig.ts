/**
 * Trigonometry without a calculator, as single-choice questions:
 *
 *   gymnasiet 4.2.6 exakta värden: sin, cos and tan of 0°, 30°, 45°, 60°, 90°;
 *             the angle with a value; and where the values come from - the
 *             half square (1, 1, √2) and the half equilateral triangle (1, √3, 2)
 *   gymnasiet 4.2.7 samband: sin v = sin(180° − v), cos v = sin(90° − v),
 *             cos(−v) = cos v, sin²v + cos²v = 1, tan v = sin v / cos v -
 *             cos v from sin v with a Pythagorean triple
 *
 * The slips: sin and cos swapped (sin 60° = 1/2), tan upside down
 * (tan 30° = √3), 1 − sin v for cos v, the product sin v · cos v for tan v.
 */
import { pick, shuffle, type Rng } from "../../rng";
import { randomShape, sideOf, SIDES, TRIPLES } from "../rightTriangle";
import { fixedOptions, fractionOption, shuffledOptions, text, type ChoiceOption, type ChoiceProblem, type Slip } from "./problem";

export type TrigChoiceStageId = "4.2.6" | "4.2.7";

type Fn = "sin" | "cos" | "tan";
/** The table's values, in one form each - √2/2, not 1/√2 - so no two options are the same number. */
const VALUE: Record<string, string> = {
  "0": "0",
  half: "\\dfrac{1}{2}",
  r2: "\\dfrac{\\sqrt{2}}{2}",
  r3: "\\dfrac{\\sqrt{3}}{2}",
  "1": "1",
  sqrt3: "\\sqrt{3}",
  inv3: "\\dfrac{1}{\\sqrt{3}}",
};
const TABLE: Record<Fn, Record<number, keyof typeof VALUE>> = {
  sin: { 0: "0", 30: "half", 45: "r2", 60: "r3", 90: "1" },
  cos: { 0: "1", 30: "r3", 45: "r2", 60: "half", 90: "0" },
  tan: { 0: "0", 30: "inv3", 45: "1", 60: "sqrt3" },
};
/** The same values as plain text, for the words. */
const PLAIN: Record<keyof typeof VALUE, string> = { "0": "0", half: "1/2", r2: "√2/2", r3: "√3/2", "1": "1", sqrt3: "√3", inv3: "1/√3" };
const latex = (k: keyof typeof VALUE): ChoiceOption => ({ latex: VALUE[k] });
const deg = (d: number): ChoiceOption => ({ plain: `${d}°` });

/** 4.2.6: a value from the table, an angle from its value, or a value read off the triangle it comes from. */
function exactValues(rng: Rng): ChoiceProblem {
  const form = pick(rng, ["value", "value", "angle", "triangle"] as const);
  if (form === "triangle") {
    // The half equilateral triangle (1, √3, 2) or the half square (1, 1, √2): the ratios read off it.
    const half = rng() < 0.6;
    const angle = half ? pick(rng, [30, 60]) : 45;
    const fn = pick(rng, ["sin", "cos", "tan"] as const);
    // v at the end of leg 1: leg 2 is across from it. 30° has the short side, 1, across from it.
    const legs: [number, number] = half ? (angle === 30 ? [1.73, 1] : [1, 1.73]) : [1, 1];
    const labels: [string, string, string] = half ? (angle === 30 ? ["√3", "1", "2"] : ["1", "√3", "2"]) : ["1", "1", "√2"];
    const shape = { ...randomShape(rng, legs), angleAt: 0 as const };
    const right: ChoiceOption = half
      ? { latex: { sin: angle === 30 ? "\\dfrac{1}{2}" : "\\dfrac{\\sqrt{3}}{2}", cos: angle === 30 ? "\\dfrac{\\sqrt{3}}{2}" : "\\dfrac{1}{2}", tan: angle === 30 ? "\\dfrac{1}{\\sqrt{3}}" : "\\sqrt{3}" }[fn] }
      : { latex: { sin: "\\dfrac{1}{\\sqrt{2}}", cos: "\\dfrac{1}{\\sqrt{2}}", tan: "1" }[fn] };
    const pool = half ? ["\\dfrac{1}{2}", "\\dfrac{\\sqrt{3}}{2}", "\\dfrac{1}{\\sqrt{3}}", "\\sqrt{3}", "2", "\\dfrac{2}{\\sqrt{3}}"] : ["\\dfrac{1}{\\sqrt{2}}", "1", "\\sqrt{2}", "\\dfrac{1}{2}"];
    return {
      stageId: "4.2.6",
      kind: "choice",
      prompt: text("choice.trig.fromTriangle", { fn, v: angle }),
      scene: { kind: "rightTriangle", shape, labels, angle: `${angle}°` },
      ...shuffledOptions(
        rng,
        right,
        pool.map((l) => ({ option: { latex: l }, why: text(`choice.trig.why.ratio.${fn}`) }))
      ),
      tip: text(`choice.trig.tip.${fn}`),
      explanation: text(half ? "choice.trig.explainHalf" : "choice.trig.explainSquare", { fn, v: angle }),
    };
  }
  if (form === "angle") {
    // Which angle (0°-90°) has this sine or cosine - the swap is the slip.
    const fn = pick(rng, ["sin", "cos"] as const);
    const v = pick(rng, [30, 45, 60]);
    const key = TABLE[fn][v];
    // sin and cos swap values between v and 90° − v.
    const swapped = 90 - v;
    return {
      stageId: "4.2.6",
      kind: "choice",
      prompt: text("choice.trig.whichAngle"),
      display: `\\${fn} v = ${VALUE[key].replace("\\dfrac", "\\frac")},\\quad 0^{\\circ} \\le v \\le 90^{\\circ}`,
      ...fixedOptions(
        [30, 45, 60, 90].map(deg),
        [30, 45, 60, 90].indexOf(v),
        [30, 45, 60, 90].map((d) => (d === v ? null : d === swapped ? text("choice.trig.why.swap") : text("choice.trig.why.table")))
      ),
      tip: text("choice.trig.tip.table"),
      explanation: text("choice.trig.explainAngle", { fn, v, val: PLAIN[key] }),
    };
  }
  const fn = pick(rng, ["sin", "cos", "tan"] as const);
  const v = pick(rng, Object.keys(TABLE[fn]).map(Number));
  const key = TABLE[fn][v];
  // The slips: the other function's value at v (sin and cos swapped), tan upside down, the neighbours in the table.
  const slips: Slip[] = [];
  if (fn !== "tan") slips.push({ option: latex(TABLE[fn === "sin" ? "cos" : "sin"][v]), why: text("choice.trig.why.swap") });
  if (fn === "tan" && v === 30) slips.push({ option: latex("sqrt3"), why: text("choice.trig.why.tanFlip") });
  if (fn === "tan" && v === 60) slips.push({ option: latex("inv3"), why: text("choice.trig.why.tanFlip") });
  if (fn === "tan" && v === 45) slips.push({ option: latex("r2"), why: text("choice.trig.why.tan45") });
  for (const k of shuffle(rng, Object.keys(VALUE) as (keyof typeof VALUE)[])) slips.push({ option: latex(k), why: text("choice.trig.why.table") });
  return {
    stageId: "4.2.6",
    kind: "choice",
    prompt: text("choice.trig.exact"),
    display: `\\${fn} ${v}^{\\circ}`,
    ...shuffledOptions(rng, latex(key), slips),
    tip: text(fn === "tan" ? "choice.trig.tip.tanTable" : "choice.trig.tip.table"),
    explanation: text("choice.trig.explainValue", { fn, v, val: PLAIN[key] }),
  };
}

const sinDeg = (fn: Fn, d: number) => ({ latex: `\\${fn} ${d}^{\\circ}` });

/** 4.2.7: the connections between sin, cos and tan - each one a question that needs no calculator. */
function identities(rng: Rng): ChoiceProblem {
  const form = pick(rng, ["supplement", "complement", "negative", "pythagoras", "pythagoras", "tanRatio", "squares"] as const);
  const a = pick(rng, [10, 20, 25, 35, 40, 50, 55, 70, 80]);
  if (form === "supplement") {
    return {
      stageId: "4.2.7",
      kind: "choice",
      prompt: text("choice.trig.equalTo"),
      display: `\\sin ${a}^{\\circ}`,
      ...shuffledOptions(rng, sinDeg("sin", 180 - a), [
        { option: sinDeg("cos", 180 - a), why: text("choice.trig.why.cosSupplement") },
        { option: sinDeg("sin", 180 + a), why: text("choice.trig.why.belowAxis") },
        { option: sinDeg("sin", 360 - a), why: text("choice.trig.why.belowAxis") },
      ]),
      tip: text("choice.trig.tip.supplement"),
      explanation: text("choice.trig.explainSupplement", { a, b: 180 - a }),
    };
  }
  if (form === "complement") {
    return {
      stageId: "4.2.7",
      kind: "choice",
      prompt: text("choice.trig.equalTo"),
      display: `\\cos ${a}^{\\circ}`,
      ...shuffledOptions(rng, sinDeg("sin", 90 - a), [
        { option: sinDeg("sin", a), why: text("choice.trig.why.complement") },
        { option: sinDeg("cos", 90 - a), why: text("choice.trig.why.complement") },
        { option: sinDeg("tan", 90 - a), why: text("choice.trig.why.complement") },
      ]),
      tip: text("choice.trig.tip.complement"),
      explanation: text("choice.trig.explainComplement", { a, b: 90 - a }),
    };
  }
  if (form === "negative") {
    const fn = pick(rng, ["sin", "cos"] as const);
    const right = fn === "cos" ? `\\cos ${a}^{\\circ}` : `-\\sin ${a}^{\\circ}`;
    const wrong = fn === "cos" ? `-\\cos ${a}^{\\circ}` : `\\sin ${a}^{\\circ}`;
    return {
      stageId: "4.2.7",
      kind: "choice",
      prompt: text("choice.trig.equalTo"),
      display: `\\${fn}(-${a}^{\\circ})`,
      ...shuffledOptions(rng, { latex: right }, [
        { option: { latex: wrong }, why: text(fn === "cos" ? "choice.trig.why.cosEven" : "choice.trig.why.sinOdd") },
        { option: { latex: fn === "cos" ? `-\\sin ${a}^{\\circ}` : `\\cos ${a}^{\\circ}` }, why: text("choice.trig.why.otherFn") },
        { option: { latex: fn === "cos" ? `\\sin ${a}^{\\circ}` : `-\\cos ${a}^{\\circ}` }, why: text("choice.trig.why.otherFn") },
      ]),
      tip: text("choice.trig.tip.negative"),
      explanation: text(fn === "cos" ? "choice.trig.explainCosEven" : "choice.trig.explainSinOdd", { a }),
    };
  }
  if (form === "squares") {
    return {
      stageId: "4.2.7",
      kind: "choice",
      prompt: text("choice.trig.calculateExact"),
      display: `\\sin^{2} ${a}^{\\circ} + \\cos^{2} ${a}^{\\circ}`,
      ...shuffledOptions(rng, { latex: "1" }, [
        { option: { latex: "0" }, why: text("choice.trig.why.squares") },
        { option: { latex: "2" }, why: text("choice.trig.why.squares") },
        { option: { latex: "\\dfrac{1}{2}" }, why: text("choice.trig.why.squares") },
      ]),
      tip: text("choice.trig.tip.squares"),
      explanation: text("choice.trig.explainSquares"),
    };
  }
  // A Pythagorean triple: sin v = a/c gives cos v = b/c - in the triangle, b from a and c.
  const [p, q, c] = pick(rng, TRIPLES.filter(([x, , z]) => z <= 25 && x !== 6 && x !== 9 && x !== 12));
  const [opp, adj] = rng() < 0.5 ? [p, q] : [q, p];
  if (form === "tanRatio") {
    return {
      stageId: "4.2.7",
      kind: "choice",
      prompt: text("choice.trig.tanFrom", { s: `${opp}/${c}`, c: `${adj}/${c}` }),
      display: `\\sin v = \\frac{${opp}}{${c}},\\quad \\cos v = \\frac{${adj}}{${c}}`,
      ...shuffledOptions(rng, fractionOption(opp, adj), [
        { option: fractionOption(adj, opp), why: text("choice.trig.why.tanUpside") },
        { option: fractionOption(opp * adj, c * c), why: text("choice.trig.why.tanProduct") },
        { option: fractionOption(opp + adj, c), why: text("choice.trig.why.tanSum") },
      ]),
      tip: text("choice.trig.tip.tanRatio"),
      explanation: text("choice.trig.explainTanRatio", { a: opp, b: adj, c }),
    };
  }
  const given = pick(rng, ["sin", "cos"] as const);
  const [g, w] = given === "sin" ? [opp, adj] : [adj, opp];
  const asked = given === "sin" ? "cos" : "sin";
  // The triangle helps: v drawn, the hypotenuse and the given side known.
  const shape = randomShape(rng, [adj, opp]);
  const labels: [string | null, string | null, string | null] = [null, null, String(c)];
  labels[SIDES.indexOf(sideOf(shape.angleAt, given === "sin" ? "opposite" : "adjacent"))] = String(g);
  const legs: [number, number] = shape.angleAt === 0 ? [adj, opp] : [opp, adj];
  return {
    stageId: "4.2.7",
    kind: "choice",
    prompt: text("choice.trig.pythagoras", { given, asked }),
    display: `\\${given} v = \\frac{${g}}{${c}},\\quad 0^{\\circ} < v < 90^{\\circ}`,
    scene: { kind: "rightTriangle", shape: { ...shape, legs }, labels, angle: "v" },
    ...shuffledOptions(rng, fractionOption(w, c), [
      { option: fractionOption(c - g, c), why: text("choice.trig.why.oneMinus") },
      { option: fractionOption(g, w), why: text("choice.trig.why.isTan") },
      { option: fractionOption(c, w), why: text("choice.trig.why.upside") },
      { option: fractionOption(w, g), why: text("choice.trig.why.isTan") },
    ]),
    tip: text("choice.trig.tip.pythagoras"),
    explanation: text("choice.trig.explainPythagoras", { a: g, b: w, c, given, asked }),
  };
}

export const TRIG_CHOICES: Record<TrigChoiceStageId, (rng: Rng) => ChoiceProblem> = {
  "4.2.6": exactValues,
  "4.2.7": identities,
};

