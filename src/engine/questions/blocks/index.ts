/**
 * Building numbers with base-ten blocks: ones, ten-rods, hundred-plates -
 * or, for decimals, a whole plate cut into tenth-rods and hundredth-cubes.
 *
 *   förskoleklass 0.1.8 bygg talet till 20: a ten and some ones
 *   åk 1-3        1.14.1 bygg tresiffriga tal: 407 - no tens, but a 0 to remember
 *                 1.14.2 växla och ta bort: 52 take 7 - a ten changed into ten ones first
 *   åk 4-6        2.16.6 bygg decimaltal: 2,35 and 1,07
 *
 * In "take" the child can only take blocks away and change a bigger one into
 * ten smaller: taking 7 from 5 tens and 2 ones means changing a ten - växling,
 * as in a column subtraction.
 *
 * How it works, and what must stay true: docs/question-types/blocks.md.
 */
import { pick, randInt, type Rng } from "../../rng";
import { text, type ChoiceText } from "../choice/problem";
import { questionType, retry } from "../questionType";
import { tex } from "../written/problem";

export type BlocksStageId = "0.1.8" | "1.14.1" | "1.14.2" | "2.16.6";

export interface BlocksProblem {
  stageId: BlocksStageId;
  kind: "buildNumber";
  prompt: ChoiceText;
  /** What to build, or the subtraction, shown big (LaTeX). */
  display: string;
  /** The places, biggest first, as powers of ten: [2, 1, 0] or, for decimals, [0, -1, -2]. */
  places: number[];
  /** The blocks there from the start, per place. */
  start: number[];
  /** "build": add and take blocks freely; "take": only take away, and change one block into ten smaller. */
  mode: "build" | "take";
  /** The value to end with. */
  target: number;
  tip: ChoiceText;
  explanation: ChoiceText;
}

/** What blocks are worth together. */
export const valueOf = (places: number[], counts: number[]) => Math.round(counts.reduce((s, c, i) => s + c * 10 ** places[i], 0) * 1e6) / 1e6;

/** A number as the fewest blocks: one count per place, each 0-9. */
export function blocksOf(places: number[], value: number): number[] {
  let left = Math.round(value * 100);
  return places.map((p) => {
    const unit = Math.round(10 ** p * 100);
    const n = Math.floor(left / unit);
    left -= n * unit;
    return n;
  });
}

/** Are the blocks right - and if not, why. */
export function checkBlocks(p: BlocksProblem, counts: number[]): { ok: boolean; why: ChoiceText | null } {
  const have = valueOf(p.places, counts);
  if (Math.abs(have - p.target) > 1e-9) {
    return { ok: false, why: text(p.mode === "take" ? "blocks.why.take" : have > p.target ? "blocks.why.tooMuch" : "blocks.why.tooLittle") };
  }
  // Built with ten or more of a kind: right in value, but a number is written with one digit per place.
  if (p.mode === "build" && counts.some((c) => c > 9)) return { ok: false, why: text("blocks.why.exchange") };
  return { ok: true, why: null };
}

const say = (n: number) => tex(n).replace("{,}", ",");

/** 0.1.8: a number to 20 - one ten and some ones (or two tens). */
function toTwenty(rng: Rng): BlocksProblem {
  const n = randInt(rng, 10, 20);
  return {
    stageId: "0.1.8",
    kind: "buildNumber",
    prompt: text("blocks.build", { n }),
    display: String(n),
    places: [1, 0],
    start: [0, 0],
    mode: "build",
    target: n,
    tip: text("blocks.tipTwenty"),
    explanation: text("blocks.explainTwenty", { n, t: Math.floor(n / 10), o: n % 10 }),
  };
}

/** 1.14.1: a three-digit number - often with a 0 in it (407, 350). */
function threeDigits(rng: Rng): BlocksProblem {
  const zero = rng() < 0.4 ? pick(rng, [1, 2]) : -1;
  const digits = [randInt(rng, 1, 9), randInt(rng, 1, 9), randInt(rng, 1, 9)];
  if (zero >= 0) digits[zero] = 0;
  const n = digits[0] * 100 + digits[1] * 10 + digits[2];
  return {
    stageId: "1.14.1",
    kind: "buildNumber",
    prompt: text("blocks.build", { n }),
    display: String(n),
    places: [2, 1, 0],
    start: [0, 0, 0],
    mode: "build",
    target: n,
    tip: text("blocks.tipThree"),
    explanation: text("blocks.explainThree", { n, h: digits[0], t: digits[1], o: digits[2] }),
  };
}

/** 1.14.2: take away more ones than there are - change a ten (or a hundred) into ten smaller first. */
function exchange(rng: Rng): BlocksProblem {
  const big = rng() < 0.4;
  const places = big ? [2, 1, 0] : [1, 0];
  const { n, k } = retry("1.14.2", () => {
    const m = big ? randInt(rng, 101, 499) : randInt(rng, 21, 99);
    const take = big ? randInt(rng, 3, 9) + 10 * randInt(rng, 0, 4) : randInt(rng, 3, 9);
    // The ones taken away are more than the ones there: a ten has to be changed.
    return take % 10 > m % 10 && take < m ? { n: m, k: take } : null;
  });
  return {
    stageId: "1.14.2",
    kind: "buildNumber",
    prompt: text("blocks.take", { n, k }),
    display: `${n} - ${k}`,
    places,
    start: blocksOf(places, n),
    mode: "take",
    target: n - k,
    tip: text("blocks.tipTake"),
    explanation: text("blocks.explainTake", { n, k, r: n - k }),
  };
}

/** 2.16.6: a decimal with ones, tenths and hundredths - a 0 tenth sometimes (1,07). */
function decimals(rng: Rng): BlocksProblem {
  const ones = randInt(rng, 0, 3);
  const tenths = rng() < 0.3 ? 0 : randInt(rng, 1, 9);
  const hundredths = randInt(rng, 1, 9);
  const v = Math.round((ones + tenths / 10 + hundredths / 100) * 100) / 100;
  return {
    stageId: "2.16.6",
    kind: "buildNumber",
    prompt: text("blocks.buildDecimal"),
    display: tex(v),
    places: [0, -1, -2],
    start: [0, 0, 0],
    mode: "build",
    target: v,
    tip: text("blocks.tipDecimal"),
    explanation: text("blocks.explainDecimal", { v: say(v), a: ones, b: tenths, c: hundredths }),
  };
}

export const BLOCKS_QUESTIONS = questionType<"blocks", BlocksProblem, BlocksStageId>({
  id: "blocks",
  kinds: ["buildNumber"],
  levels: {
    "0.1.8": toTwenty,
    "1.14.1": threeDigits,
    "1.14.2": exchange,
    "2.16.6": decimals,
  },
  key: (p) => `blocks:${p.stageId}:${p.display}`,
});
