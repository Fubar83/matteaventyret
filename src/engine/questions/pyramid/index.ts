/**
 * Number pyramids (talpyramider): every brick is the sum of the two under it.
 * Some bricks are given, the rest are worked out - adding up, or, when the
 * brick above is known, subtracting down.
 *
 *   åk 1-3  1.7.8  talpyramider: the bottom row given, sums to 20
 *   åk 4-6  2.1.7  talpyramider till 100: bricks missing low down too - subtract to find them
 *   åk 7-9  3.3.19 algebrapyramid: a, x, b at the bottom and the top given: a + 2x + b = top
 *
 * How it works, and what must stay true: docs/question-types/pyramid.md.
 */
import { pick, randInt, type Rng } from "../../rng";
import { text, type ChoiceText } from "../choice/problem";
import { questionType, retry } from "../questionType";

export type PyramidStageId = "1.7.8" | "2.1.7" | "3.3.19";

export interface PyramidProblem {
  stageId: PyramidStageId;
  kind: "pyramid";
  /** Every brick's value, row by row from the bottom: the bottom row is widest. */
  values: number[][];
  /** Which bricks are given (true) and which are worked out (false). */
  shown: boolean[][];
  /** The algebra pyramid: bricks written as expressions instead of their value, by [row, place]; x is the one asked. */
  labels: Record<string, string> | null;
  prompt: ChoiceText;
  tip: ChoiceText;
  explanation: ChoiceText;
}

/** A pyramid from its bottom row: each brick above the sum of the two under it. */
export function build(bottom: number[]): number[][] {
  const rows = [bottom];
  while (rows[rows.length - 1].length > 1) {
    const r = rows[rows.length - 1];
    rows.push(r.slice(1).map((v, i) => r[i] + v));
  }
  return rows;
}

/**
 * Which hidden bricks can be found from what's known, in the order they can:
 * a brick from the two under it, or one under from the brick above and its
 * neighbour. Null when some can't be found at all.
 */
export function solveOrder(shown: boolean[][]): [number, number][] | null {
  const known = shown.map((r) => [...r]);
  const order: [number, number][] = [];
  for (let changed = true; changed; ) {
    changed = false;
    for (let r = 0; r < known.length; r++)
      for (let i = 0; i < known[r].length; i++) {
        if (known[r][i]) continue;
        const fromBelow = r > 0 && known[r - 1][i] && known[r - 1][i + 1];
        // Under a known brick, with its neighbour under it known too.
        const fromAbove = r + 1 < known.length && ((i > 0 && known[r + 1][i - 1] && known[r][i - 1]) || (i < known[r + 1].length && known[r + 1][i] && known[r][i + 1]));
        if (fromBelow || fromAbove) {
          known[r][i] = true;
          order.push([r, i]);
          changed = true;
        }
      }
  }
  return known.every((r) => r.every(Boolean)) ? order : null;
}

/** 1.7.8: three at the bottom, the top at most 20 - everything above is added up. */
function small(rng: Rng): PyramidProblem {
  const bottom = retry("pyramid 1.7.8", () => {
    const b = [randInt(rng, 1, 7), randInt(rng, 1, 6), randInt(rng, 1, 7)];
    return b[0] + 2 * b[1] + b[2] <= 20 ? b : null;
  });
  const values = build(bottom);
  return {
    stageId: "1.7.8",
    kind: "pyramid",
    values,
    shown: values.map((r, k) => r.map(() => k === 0)),
    labels: null,
    prompt: text("pyr.prompt"),
    tip: text("pyr.tip.add"),
    explanation: text("pyr.explain", { top: values[2][0] }),
  };
}

/** Which bricks a 3-row pyramid gives: the bottom (all adding), or a mix where some are found by subtracting. */
const GIVEN_3: boolean[][][] = [
  [[true, false, true], [true, false], [false]],
  [[false, true, false], [true, true], [false]],
  [[false, false, true], [true, false], [true]],
  [[true, false, false], [false, true], [true]],
];

/** 2.1.7: up to 100 - four at the bottom to add up, or three with bricks to subtract down to. */
function hundred(rng: Rng): PyramidProblem {
  if (rng() < 0.35) {
    const bottom = retry("pyramid 2.1.7 wide", () => {
      const b = Array.from({ length: 4 }, () => randInt(rng, 3, 20));
      return b[0] + 3 * b[1] + 3 * b[2] + b[3] <= 100 ? b : null;
    });
    const values = build(bottom);
    return { stageId: "2.1.7", kind: "pyramid", values, shown: values.map((r, k) => r.map(() => k === 0)), labels: null, prompt: text("pyr.prompt"), tip: text("pyr.tip.add"), explanation: text("pyr.explain", { top: values[3][0] }) };
  }
  const bottom = retry("pyramid 2.1.7", () => {
    const b = [randInt(rng, 5, 30), randInt(rng, 5, 25), randInt(rng, 5, 30)];
    return b[0] + 2 * b[1] + b[2] <= 100 ? b : null;
  });
  const values = build(bottom);
  return { stageId: "2.1.7", kind: "pyramid", values, shown: pick(rng, GIVEN_3), labels: null, prompt: text("pyr.prompt"), tip: text("pyr.tip.subtract"), explanation: text("pyr.explain", { top: values[2][0] }) };
}

/** 3.3.19: a, x and b at the bottom, the top given - the bricks between written a + x and x + b. */
function algebra(rng: Rng): PyramidProblem {
  const [a, b] = [randInt(rng, 2, 15), randInt(rng, 2, 15)];
  const x = randInt(rng, 2, 12);
  const values = build([a, x, b]);
  const top = values[2][0];
  return {
    stageId: "3.3.19",
    kind: "pyramid",
    values,
    // a, b and the top are given; x is asked - the middle bricks are written as expressions.
    shown: [[true, false, true], [true, true], [true]],
    labels: { "1,0": `${a} + x`, "1,1": `x + ${b}` },
    prompt: text("pyr.prompt.algebra"),
    tip: text("pyr.tip.algebra", { a, b }),
    explanation: text("pyr.explain.algebra", { a, b, top, x, twice: top - a - b }),
  };
}

export const PYRAMID_QUESTIONS = questionType<"pyramid", PyramidProblem, PyramidStageId>({
  id: "pyramid",
  kinds: ["pyramid"],
  levels: {
    "1.7.8": small,
    "2.1.7": hundred,
    "3.3.19": algebra,
  },
  key: (p) => `pyramid:${p.stageId}:${JSON.stringify(p.values)}:${JSON.stringify(p.shown)}`,
});
