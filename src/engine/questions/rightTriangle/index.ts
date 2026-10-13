/**
 * The right triangle, by hand - the first steps of trigonometry, before any
 * value is worked out:
 *
 *   gymnasiet 4.2.4 namnge sidorna: drag "motstående", "närliggande" and
 *             "hypotenusa" onto the sides, seen from the angle v - the triangle
 *             turned and mirrored, v at either acute corner
 *   gymnasiet 4.2.5 bygg sin, cos och tan: drag the sides' lengths into a
 *             fraction that makes sin v, cos v or tan v
 *
 * The triangle's shape and the side roles are shared with the trigonometry
 * choices (choice/trig.ts) and the written trigonometry (written/advanced.ts).
 *
 * How it works, and what must stay true: docs/question-types/rightTriangle.md.
 */
import { pick, shuffle, type Rng } from "../../rng";
import { text, type ChoiceText } from "../choice/problem";
import { questionType } from "../questionType";

export type RightTriangleStageId = "4.2.4" | "4.2.5";
/** A side: the leg drawn first (from the right angle along x), the other leg, the hypotenuse. */
export type Side = "leg1" | "leg2" | "hyp";
export type Role = "opposite" | "adjacent" | "hypotenuse";
export type TrigFn = "sin" | "cos" | "tan";
export const SIDES: readonly Side[] = ["leg1", "leg2", "hyp"];
export const ROLES: readonly Role[] = ["opposite", "adjacent", "hypotenuse"];

/**
 * How a right triangle is drawn: the right angle's legs (their lengths, for
 * the shape), turned `turn` degrees and mirrored when `flip`, with the angle v
 * at the far end of leg 1 (`angleAt` 0) or of leg 2 (1).
 */
export interface TriangleShape {
  legs: [number, number];
  turn: number;
  flip: boolean;
  angleAt: 0 | 1;
}

/** What a side is, seen from v: the hypotenuse is always across from the right angle; of the legs, the one not touching v is opposite. */
export function roleOf(angleAt: 0 | 1, side: Side): Role {
  if (side === "hyp") return "hypotenuse";
  // v at the end of leg 1 touches leg 1 - leg 2 is across from it; and the other way round.
  return (side === "leg1") === (angleAt === 0) ? "adjacent" : "opposite";
}
export const sideOf = (angleAt: 0 | 1, role: Role): Side => SIDES.find((s) => roleOf(angleAt, s) === role)!;

/** What each ratio is: sin = opposite / hypotenuse, cos = adjacent / hypotenuse, tan = opposite / adjacent. */
export const RATIO: Record<TrigFn, [Role, Role]> = {
  sin: ["opposite", "hypotenuse"],
  cos: ["adjacent", "hypotenuse"],
  tan: ["opposite", "adjacent"],
};

/** The ratio a fraction of two roles is - or "upside down" of one, or none. */
export function ratioOf(top: Role, bottom: Role): { fn: TrigFn; inverted: boolean } | null {
  for (const fn of ["sin", "cos", "tan"] as const) {
    if (RATIO[fn][0] === top && RATIO[fn][1] === bottom) return { fn, inverted: false };
    if (RATIO[fn][0] === bottom && RATIO[fn][1] === top) return { fn, inverted: true };
  }
  return null;
}

/** Pythagorean triples: legs and hypotenuse, so every ratio is a plain fraction. */
export const TRIPLES: readonly [number, number, number][] = [
  [3, 4, 5],
  [6, 8, 10],
  [5, 12, 13],
  [8, 15, 17],
  [7, 24, 25],
  [9, 12, 15],
  [12, 16, 20],
];

/** A right triangle drawn any way round: legs in proportion, turned by 0-330° in steps of 30, mirrored half the time. */
export function randomShape(rng: Rng, legs?: [number, number]): TriangleShape {
  const shape = legs ?? pick(rng, [[3, 4], [4, 3], [5, 12], [12, 5], [1, 1], [1, 1.7], [1.7, 1], [2, 3], [3, 2]] as [number, number][]);
  return { legs: shape, turn: 30 * Math.floor(rng() * 12), flip: rng() < 0.5, angleAt: rng() < 0.5 ? 0 : 1 };
}

export interface RightTriangleProblem {
  stageId: RightTriangleStageId;
  kind: "rightTriangle";
  mode: "name" | "ratio";
  shape: TriangleShape;
  /** Ratio: the sides' lengths, [leg 1, leg 2, hypotenuse], and the ratio to build. */
  lengths: [number, number, number] | null;
  fn: TrigFn | null;
  prompt: ChoiceText;
  tip: ChoiceText;
  explanation: ChoiceText;
}

/** Whether names put on the sides are right: each side's role seen from v. */
export const namesRight = (p: RightTriangleProblem, names: Partial<Record<Side, Role>>) => SIDES.map((s) => names[s] === roleOf(p.shape.angleAt, s));

/** Whether a fraction of two sides is the ratio asked - and if not, what it is instead. */
export function checkRatio(p: RightTriangleProblem, top: Side, bottom: Side): { ok: true } | { ok: false; why: ChoiceText } {
  const r = ratioOf(roleOf(p.shape.angleAt, top), roleOf(p.shape.angleAt, bottom));
  if (r && r.fn === p.fn && !r.inverted) return { ok: true };
  if (r && r.fn === p.fn) return { ok: false, why: text("rt.why.upsideDown", { fn: p.fn }) };
  if (r && !r.inverted) return { ok: false, why: text("rt.why.otherRatio", { fn: r.fn }) };
  return { ok: false, why: text("rt.why.roles", { fn: p.fn! }) };
}

/** 4.2.4: name the three sides from v. */
function nameSides(rng: Rng): RightTriangleProblem {
  return {
    stageId: "4.2.4",
    kind: "rightTriangle",
    mode: "name",
    shape: randomShape(rng),
    lengths: null,
    fn: null,
    prompt: text("rt.prompt.name"),
    tip: text("rt.tip.name"),
    explanation: text("rt.explain.name"),
  };
}

/** 4.2.5: a triangle with its sides' lengths (a Pythagorean triple) - build sin v, cos v or tan v from them. */
function buildRatio(rng: Rng): RightTriangleProblem {
  const [a, b, c] = pick(rng, TRIPLES);
  // Either leg first: v sees the short or the long one across from it.
  const [l1, l2] = shuffle(rng, [a, b]);
  const shape = randomShape(rng, [l1, l2]);
  const fn = pick(rng, ["sin", "cos", "tan"] as const);
  const lengths: [number, number, number] = [l1, l2, c];
  const len = (role: Role) => lengths[SIDES.indexOf(sideOf(shape.angleAt, role))];
  const [top, bottom] = RATIO[fn];
  return {
    stageId: "4.2.5",
    kind: "rightTriangle",
    mode: "ratio",
    shape,
    lengths,
    fn,
    prompt: text("rt.prompt.ratio", { fn }),
    tip: text(`rt.tip.${fn}`),
    explanation: text(`rt.explain.${fn}`, { a: len(top), b: len(bottom) }),
  };
}

export const RIGHT_TRIANGLE_QUESTIONS = questionType<"rightTriangle", RightTriangleProblem, RightTriangleStageId>({
  id: "rightTriangle",
  kinds: ["rightTriangle"],
  levels: {
    "4.2.4": nameSides,
    "4.2.5": buildRatio,
  },
  key: (p) => `rightTriangle:${p.stageId}:${JSON.stringify([p.shape, p.lengths, p.fn])}`,
});
