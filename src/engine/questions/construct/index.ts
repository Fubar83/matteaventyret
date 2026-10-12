/**
 * Constructing with ruler, protractor and compasses - drawn by tapping:
 *
 *   åk 1-3  1.10.4 rita en sträcka: a line 7 cm long - from where it starts, not from the ruler's 0
 *   åk 4-6  2.12.5 rita en vinkel: 65° with a protractor - on the scale that starts at the first arm
 *   åk 7-9  3.4.13 konstruera en triangel: sides 7, 5 and 6 cm - compass arcs from both ends of the base
 *
 * The checks are here, so the tests check what the child is checked on, and
 * they name the slips: counting from the ruler's 0, reading the protractor's
 * other scale.
 *
 * How it works, and what must stay true: docs/question-types/construct.md.
 */
import { pick, randInt, type Rng } from "../../rng";
import { text, type ChoiceText } from "../choice/problem";
import { questionType, retry } from "../questionType";

export type ConstructStageId = "1.10.4" | "2.12.5" | "3.4.13";

interface Base {
  stageId: ConstructStageId;
  kind: "construct";
  prompt: ChoiceText;
  tip: ChoiceText;
  explanation: ChoiceText;
}
/** A line from `start` cm on the ruler, `length` long; the end snaps to `snap` cm. */
export interface LineTask extends Base {
  task: "line";
  start: number;
  length: number;
  snap: number;
}
/** An angle of `degrees` from a first arm pointing right or left from the protractor's middle. */
export interface AngleTask extends Base {
  task: "angle";
  degrees: number;
  base: "right" | "left";
}
/** A triangle with sides a = BC, b = AC on the base AB = c, in cm. */
export interface TriangleTask extends Base {
  task: "triangle";
  a: number;
  b: number;
  c: number;
}
export type ConstructProblem = LineTask | AngleTask | TriangleTask;

type Verdict = { ok: boolean; why: ChoiceText | null };
const sv = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");

/** A line ending at `end` cm on the ruler. */
export function checkLine(p: LineTask, end: number): Verdict {
  const have = Math.round((end - p.start) * 100) / 100;
  if (Math.abs(have - p.length) < 1e-9) return { ok: true, why: null };
  if (p.start > 0 && Math.abs(end - p.length) < 1e-9) return { ok: false, why: text("construct.why.fromZero", { s: sv(p.start) }) };
  return { ok: false, why: text("construct.why.length", { have: sv(Math.abs(have)), want: sv(p.length) }) };
}

/** The angle a second arm at `theta` (degrees anticlockwise from pointing right, 0-180) makes with the first. */
export const angleMade = (p: AngleTask, theta: number) => (p.base === "right" ? theta : 180 - theta);

/** A second arm at `theta`. Two degrees either way is right - as near as a protractor can be read. */
export function checkAngle(p: AngleTask, theta: number): Verdict {
  const have = angleMade(p, theta);
  if (Math.abs(have - p.degrees) <= 2) return { ok: true, why: null };
  if (Math.abs(have - (180 - p.degrees)) <= 2) return { ok: false, why: text("construct.why.scale", { d: p.degrees }) };
  return { ok: false, why: text("construct.why.angle", { have: Math.round(have), want: p.degrees }) };
}

/** The third corner at (x, y) cm, A at (0, 0) and B at (c, 0). A millimetre or two out is still a good drawing. */
export function checkTriangle(p: TriangleTask, [x, y]: [number, number]): Verdict {
  const ac = Math.hypot(x, y);
  const bc = Math.hypot(x - p.c, y);
  if (Math.abs(ac - p.b) <= 0.2 && Math.abs(bc - p.a) <= 0.2) return { ok: true, why: null };
  return { ok: false, why: text("construct.why.triangle", { ac: sv(ac), bc: sv(bc), a: p.a, b: p.b }) };
}

/** Where C is: above the base, where the two compass circles meet. */
export function thirdCorner({ a, b, c }: TriangleTask): [number, number] {
  const x = (b * b - a * a + c * c) / (2 * c);
  return [x, Math.sqrt(b * b - x * x)];
}

/** 1.10.4: a line of whole centimetres - starting at 0, or further in along the ruler. */
function drawLine(rng: Rng): LineTask {
  const start = rng() < 0.5 ? 0 : randInt(rng, 1, 3);
  const length = randInt(rng, 3, 10);
  return {
    stageId: "1.10.4",
    kind: "construct",
    task: "line",
    prompt: text(start === 0 ? "construct.line.prompt" : "construct.line.promptFrom", { l: length, s: start }),
    start,
    length,
    snap: 0.5,
    tip: text(start === 0 ? "construct.line.tip" : "construct.line.tipFrom", { s: start }),
    explanation: text("construct.line.explain", { s: start, l: length, e: start + length }),
  };
}

/** 2.12.5: an angle with the protractor, the first arm pointing right or left. */
function drawAngle(rng: Rng): AngleTask {
  const degrees = 5 * pick(rng, [4, 5, 6, 7, 8, 9, 10, 11, 13, 14, 15, 16, 22, 23, 24, 25, 26, 27, 28, 30, 32]);
  const base = rng() < 0.6 ? "right" : "left";
  return {
    stageId: "2.12.5",
    kind: "construct",
    task: "angle",
    prompt: text("construct.angle.prompt", { d: degrees }),
    degrees,
    base,
    tip: text(base === "right" ? "construct.angle.tipRight" : "construct.angle.tipLeft"),
    explanation: text("construct.angle.explain", { d: degrees, scale: `@construct.scale.${base === "right" ? "outer" : "inner"}` }),
  };
}

/** 3.4.13: a triangle from three sides - one that can be drawn, not too flat. */
function drawTriangle(rng: Rng): TriangleTask {
  const [a, b, c] = retry("3.4.13", () => {
    const sides = [randInt(rng, 3, 8), randInt(rng, 3, 8), randInt(rng, 6, 9)];
    const [x, y, z] = sides;
    // Each side clearly shorter than the other two together.
    return x + y > z + 1 && x + z > y + 1 && y + z > x + 1 ? sides : null;
  });
  return {
    stageId: "3.4.13",
    kind: "construct",
    task: "triangle",
    prompt: text("construct.triangle.prompt", { a, b, c }),
    a,
    b,
    c,
    tip: text("construct.triangle.tip", { a, b }),
    explanation: text("construct.triangle.explain", { a, b }),
  };
}

export const CONSTRUCT_QUESTIONS = questionType<"construct", ConstructProblem, ConstructStageId>({
  id: "construct",
  kinds: ["construct"],
  levels: {
    "1.10.4": drawLine,
    "2.12.5": drawAngle,
    "3.4.13": drawTriangle,
  },
  key: (p) => `construct:${p.stageId}:${JSON.stringify(p.prompt)}${p.task === "angle" ? p.base : ""}`,
});
