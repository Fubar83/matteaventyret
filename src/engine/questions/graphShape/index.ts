/**
 * Shaping a graph by hand: drag the curve's handles - or step its numbers -
 * until it's the function asked for. What each number in a formula does,
 * seen as it's changed:
 *
 *   åk 7-9    3.10.5 forma linjen: y = kx + m - m where it crosses the y-axis, k the slope
 *   gymnasiet 4.1.7  parabeln i vertexform: y = a(x − h)² + d - the vertex (h, d), a its width and way
 *             4.1.8  exponentialfunktioner: y = C · aˣ - C where x = 0, a the factor per step
 *
 * Half the questions give the formula to make; half give the graph (dashed)
 * to fit, the formula written out as the curve changes.
 *
 * How it works, and what must stay true: docs/question-types/graphShape.md.
 */
import { pick, type Rng } from "../../rng";
import { text, type ChoiceText } from "../choice/problem";
import { questionType, retry } from "../questionType";
import { tex } from "../written/problem";

export type GraphShapeStageId = "3.10.5" | "4.1.7" | "4.1.8";
export type Family = "line" | "parabola" | "exponential";

export interface GraphShapeProblem {
  stageId: GraphShapeStageId;
  kind: "graphShape";
  family: Family;
  /** line: [k, m]; parabola: [a, h, d] in y = a(x − h)² + d; exponential: [C, a] in y = C · aˣ. */
  target: number[];
  start: number[];
  given: "formula" | "graph";
  prompt: ChoiceText;
  tip: ChoiceText;
  explanation: ChoiceText;
}

const range = (lo: number, hi: number, step: number) => Array.from({ length: Math.round((hi - lo) / step) + 1 }, (_, i) => Math.round((lo + i * step) * 100) / 100);

/** Each family's numbers: their names and the values they can take, in order. */
export const PARAMS: Record<Family, { names: string[]; values: number[][] }> = {
  line: { names: ["k", "m"], values: [range(-3, 3, 0.5), range(-5, 5, 1)] },
  parabola: { names: ["a", "h", "d"], values: [[-2, -1, -0.5, 0.5, 1, 2], range(-4, 4, 1), range(-5, 5, 1)] },
  exponential: { names: ["C", "a"], values: [range(1, 6, 1), [0.5, 1.5, 2, 3]] },
};

/** The part of the plane drawn. */
export const VIEW: Record<Family, { x: [number, number]; y: [number, number] }> = {
  line: { x: [-6, 6], y: [-6, 6] },
  parabola: { x: [-6, 6], y: [-6, 6] },
  exponential: { x: [-3, 4], y: [-1, 13] },
};

/** The function's value at x. */
export function valueAt(family: Family, p: number[], x: number): number {
  if (family === "line") return p[0] * x + p[1];
  if (family === "parabola") return p[0] * (x - p[1]) ** 2 + p[2];
  return p[0] * p[1] ** x;
}

/** A whole number as a coefficient: 2x, −x, nothing for 1. */
function coefficient(k: number): string {
  if (k === 1) return "";
  if (k === -1) return "-";
  return tex(k);
}
const signed = (n: number) => (n === 0 ? "" : n > 0 ? ` + ${tex(n)}` : ` - ${tex(-n)}`);

/** The formula, as written in school: y = 2x − 1, y = −(x + 2)² + 3, y = 3 · 2ˣ. */
export function formula(family: Family, p: number[]): string {
  if (family === "line") {
    const [k, m] = p;
    if (k === 0) return `y = ${tex(m)}`;
    const c = Number.isInteger(k) ? coefficient(k) : `${k < 0 ? "-" : ""}${tex(Math.abs(k))}`;
    return `y = ${c}x${signed(m)}`;
  }
  if (family === "parabola") {
    const [a, h, d] = p;
    const c = Number.isInteger(a) ? coefficient(a) : `${a < 0 ? "-" : ""}${tex(Math.abs(a))}`;
    const inner = h === 0 ? "x^{2}" : `(x ${h > 0 ? "-" : "+"} ${Math.abs(h)})^{2}`;
    return `y = ${c}${inner}${signed(d)}`;
  }
  const [C, a] = p;
  return `y = ${C === 1 ? "" : `${C} \\cdot `}${tex(a)}^{x}`;
}

function make(rng: Rng, stageId: GraphShapeStageId, family: Family, start: number[], pickTarget: () => number[]): GraphShapeProblem {
  const target = retry(`graphShape ${stageId}`, () => {
    const t = pickTarget();
    return t.every((v, i) => v === start[i]) ? null : t;
  });
  const given = pick(rng, ["formula", "graph"] as const);
  return {
    stageId,
    kind: "graphShape",
    family,
    target,
    start,
    given,
    prompt: text(given === "formula" ? "gs.prompt.formula" : "gs.prompt.graph"),
    tip: text(`gs.tip.${family}`),
    explanation: text(`gs.explain.${family}`, Object.fromEntries(PARAMS[family].names.map((n, i) => [n, String(target[i]).replace(".", ",")]))),
  };
}

export const GRAPH_SHAPE_QUESTIONS = questionType<"graphShape", GraphShapeProblem, GraphShapeStageId>({
  id: "graphShape",
  kinds: ["graphShape"],
  levels: {
    // A line not flat, not through the origin every time; the slope a whole number or a half.
    "3.10.5": (rng) => make(rng, "3.10.5", "line", [1, 0], () => [pick(rng, PARAMS.line.values[0].filter((k) => k !== 0)), pick(rng, PARAMS.line.values[1])]),
    "4.1.7": (rng) => make(rng, "4.1.7", "parabola", [1, 0, 0], () => [pick(rng, PARAMS.parabola.values[0]), pick(rng, range(-3, 3, 1)), pick(rng, range(-4, 4, 1))]),
    "4.1.8": (rng) => make(rng, "4.1.8", "exponential", [1, 2], () => [pick(rng, range(1, 5, 1)), pick(rng, PARAMS.exponential.values[1])]),
  },
  key: (p) => `graphShape:${p.stageId}:${p.target.join()}:${p.given}`,
});
