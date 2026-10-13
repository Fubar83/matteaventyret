/**
 * Tree diagrams for two steps of chance: marbles drawn from a bag twice. The
 * child puts each branch's probability on it - then multiplies along a path,
 * and adds the paths that give what's asked.
 *
 *   åk 7-9  3.7.6 träddiagram: the marble put back - the second draw like the first
 *           3.7.7 utan återläggning: the marble kept - one fewer in the bag, and one
 *                 fewer of its colour, for the second draw
 *
 * How it works, and what must stay true: docs/question-types/tree.md.
 */
import { pick, randInt, shuffle, type Rng } from "../../rng";
import { fractionOption, shuffledOptions, text, type ChoiceProblem, type ChoiceText } from "../choice/problem";
import { questionType } from "../questionType";
import type { ChanceColor } from "../scene";

export type TreeStageId = "3.7.6" | "3.7.7";
/** A fraction, as written: [numerator, denominator] - not simplified, as the tree is read from the bag. */
export type Frac = [number, number];

export interface TreeProblem {
  stageId: TreeStageId;
  kind: "tree";
  colors: [ChanceColor, ChanceColor];
  /** How many of each colour are in the bag. */
  counts: [number, number];
  replace: boolean;
  /** What's asked once the tree is done: two of the first colour, of the second, or one of each. */
  ask: "first" | "second" | "mixed";
  /** The cards to put on branches: every branch's fraction, and the slips. */
  cards: Frac[];
  /** The question after the tree, as a single-choice question. */
  after: Pick<ChoiceProblem, "prompt" | "options" | "correct" | "whyNot">;
  prompt: ChoiceText;
  tip: ChoiceText;
  explanation: ChoiceText;
}

/** The branches, in order: the first draw's two, then the second's under each - [first][second]. */
export function branches(p: Pick<TreeProblem, "counts" | "replace">): { first: Frac[]; second: Frac[][] } {
  const total = p.counts[0] + p.counts[1];
  const first: Frac[] = p.counts.map((c) => [c, total]);
  const second: Frac[][] = [0, 1].map((i) => p.counts.map((c, j) => (p.replace ? [c, total] : [c - (i === j ? 1 : 0), total - 1])));
  return { first, second };
}

export const value = ([n, d]: Frac) => n / d;
const same = (a: Frac, b: Frac) => Math.abs(value(a) - value(b)) < 1e-12;

function make(rng: Rng, stageId: TreeStageId, replace: boolean): TreeProblem {
  const colors = shuffle(rng, ["red", "blue", "yellow", "green"] as ChanceColor[]).slice(0, 2) as [ChanceColor, ChanceColor];
  const counts: [number, number] = [randInt(rng, 2, 5), randInt(rng, 2, 5)];
  const total = counts[0] + counts[1];
  const { first, second } = branches({ counts, replace });
  const ask = pick(rng, ["first", "second", "mixed"] as const);
  // The right cards, once each by value, and the slips: without replacement the "put back" fractions, with it the "kept" ones.
  const right = [...first, ...second.flat()].filter((f, i, all) => all.findIndex((g) => g[0] === f[0] && g[1] === f[1]) === i);
  const slips: Frac[] = replace ? [[counts[0] - 1, total - 1], [counts[1], total - 1]] : [[counts[0], total], [counts[1], total]].filter((f) => !right.some((g) => g[0] === f[0] && g[1] === f[1])) as Frac[];
  // Once each: the two slips are the same card when there's one more of the first colour (4 and 3: 3/6 twice).
  const all = [...right, ...slips];
  const cards = shuffle(
    rng,
    all.filter((f, i) => all.findIndex((g) => g[0] === f[0] && g[1] === f[1]) === i)
  );
  // The answer: along a path multiplied; for one of each, both paths added.
  const path = (i: number, j: number): Frac => [first[i][0] * second[i][j][0], first[i][1] * second[i][j][1]];
  const answer: Frac =
    ask === "mixed"
      ? [path(0, 1)[0] + path(1, 0)[0], path(0, 1)[1]]
      : ask === "first"
        ? path(0, 0)
        : path(1, 1);
  const onePath = ask === "mixed" ? path(0, 1) : null;
  // Added along the path instead of multiplied.
  const add = (f: Frac, g: Frac): Frac => [f[0] * g[1] + g[0] * f[1], f[1] * g[1]];
  const added: Frac = ask === "mixed" ? add(first[0], second[0][1]) : ask === "first" ? add(first[0], second[0][0]) : add(first[1], second[1][1]);
  const putBack: Frac = ask === "first" ? [counts[0] * counts[0], total * total] : ask === "second" ? [counts[1] * counts[1], total * total] : [2 * counts[0] * counts[1], total * total];
  const colorName = (i: number) => `@color.${colors[i]}`;
  const colorsName = (i: number) => `@color.plural.${colors[i]}`;
  const slipList = [
    ...(onePath ? [{ option: fractionOption(...onePath), why: text("tree.why.onePath") }] : []),
    { option: fractionOption(...added), why: text("tree.why.added") },
    ...(!replace && !same(putBack, answer) ? [{ option: fractionOption(...putBack), why: text("tree.why.putBack") }] : []),
    { option: fractionOption(ask === "second" ? counts[1] : counts[0], total), why: text("tree.why.oneDraw") },
  ];
  return {
    stageId,
    kind: "tree",
    colors,
    counts,
    replace,
    ask,
    cards,
    after: {
      prompt: text(ask === "mixed" ? "tree.after.mixed" : "tree.after.two", { c: ask === "second" ? colorsName(1) : colorsName(0), a: colorName(0), b: colorName(1) }),
      ...shuffledOptions(rng, fractionOption(...answer), slipList),
    },
    prompt: text(replace ? "tree.prompt.back" : "tree.prompt.kept", { r: counts[0], b: counts[1], a: colorsName(0), c: colorsName(1) }),
    tip: text(replace ? "tree.tip.back" : "tree.tip.kept"),
    explanation: text(ask === "mixed" ? "tree.explain.mixed" : "tree.explain.two", { p: `${answer[0]}/${answer[1]}` }),
  };
}

export const TREE_QUESTIONS = questionType<"tree", TreeProblem, TreeStageId>({
  id: "tree",
  kinds: ["tree"],
  levels: {
    "3.7.6": (rng) => make(rng, "3.7.6", true),
    "3.7.7": (rng) => make(rng, "3.7.7", false),
  },
  key: (p) => `tree:${p.stageId}:${p.counts.join()}:${p.ask}:${p.colors.join()}`,
});
