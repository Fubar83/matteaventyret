/**
 * A chance experiment, run on screen: guess first, then spin or throw - ten
 * at a time - and see the results pile up, then answer about what happened.
 * Chance as a prediction against chance as what came out:
 *
 *   åk 1-3  1.11.2 slumpförsök: a spinner, 20 spins - which colour most?
 *   åk 4-6  2.18.3 relativ frekvens: a die, 60 throws - about 10 sixes, and the share that came
 *   åk 7-9  3.7.5  två tärningar: the sum of two dice, 100 throws - why 7 is the most common
 *
 * The throws come from a seed in the question, so the same question gives
 * the same results (in a story, in a test) - and a seed is chosen that gives
 * results to talk about: one colour clearly most, 7 the most common sum.
 *
 * How it works, and what must stay true: docs/question-types/experiment.md.
 */
import { makeRng, pick, randInt, shuffle, type Rng } from "../../rng";
import { fixedOptions, fractionOption, numberOption, shuffledOptions, text, textOption, type ChoiceOption, type ChoiceProblem, type ChoiceText } from "../choice/problem";
import { CHANCE_COLORS, type ChanceColor } from "../scene";
import { questionType, retry } from "../questionType";

export type ExperimentStageId = "1.11.2" | "2.18.3" | "3.7.5";

export type Device = { type: "spinner"; colors: { color: ChanceColor; count: number }[] } | { type: "die" } | { type: "twoDice" };

/** A question to pick an answer to - a single-choice question's parts. */
export type Ask = Pick<ChoiceProblem, "prompt" | "options" | "correct" | "whyNot">;

export interface ExperimentProblem {
  stageId: ExperimentStageId;
  kind: "experiment";
  device: Device;
  /** How many throws in all, ten at a time. */
  throws: number;
  /** The throws' seed. */
  seed: number;
  /** The guess before. */
  predict: Ask;
  /** What's asked after - made from the results by `afterQuestion`. */
  after: "most" | "share" | "sum";
  tip: ChoiceText;
  explanation: ChoiceText;
}

/** The outcomes there can be: a spinner's colours (by index), a die's 1-6, two dice's sums 2-12. */
export function outcomesOf(device: Device): number[] {
  return device.type === "spinner" ? device.colors.map((_, i) => i) : device.type === "die" ? [1, 2, 3, 4, 5, 6] : [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
}

/** The results of the experiment, throw by throw. */
export function runExperiment(p: Pick<ExperimentProblem, "device" | "throws" | "seed">): number[] {
  const rng = makeRng(p.seed);
  const die = () => randInt(rng, 1, 6);
  const sectors = p.device.type === "spinner" ? p.device.colors.flatMap((c, i) => Array(c.count).fill(i) as number[]) : [];
  return Array.from({ length: p.throws }, () => (p.device.type === "spinner" ? pick(rng, sectors) : p.device.type === "die" ? die() : die() + die()));
}

/** How many times each outcome came. */
export function tally(device: Device, results: number[]): number[] {
  return outcomesOf(device).map((o) => results.filter((r) => r === o).length);
}

const colorOption = (c: ChanceColor): ChoiceOption => textOption(`color.${c}`);

/** The question after the throws, from what they gave. */
export function afterQuestion(p: ExperimentProblem, results: number[]): Ask {
  const counts = tally(p.device, results);
  if (p.after === "most" && p.device.type === "spinner") {
    const colors = p.device.colors;
    const most = counts.indexOf(Math.max(...counts));
    return {
      prompt: text("exp.after.most"),
      ...fixedOptions(
        colors.map((c) => colorOption(c.color)),
        most,
        colors.map((c, i) => text("exp.why.count", { color: `@color.${c.color}`, n: counts[i] }))
      ),
    };
  }
  if (p.after === "share") {
    const sixes = counts[5];
    return {
      prompt: text("exp.after.share", { n: p.throws }),
      ...shuffledOptions(rng0(), fractionOption(sixes, p.throws), [
        { option: fractionOption(1, 6), why: text("exp.why.theory", { k: sixes, n: p.throws }) },
        { option: fractionOption(sixes, 6), why: text("exp.why.throws", { n: p.throws }) },
        { option: numberOption(sixes), why: text("exp.why.share") },
      ]),
    };
  }
  return {
    prompt: text("exp.after.sum"),
    ...fixedOptions(
      [textOption("exp.reason.ways"), textOption("exp.reason.lucky"), textOption("exp.reason.middle"), textOption("exp.reason.chance")],
      0,
      [null, text("exp.why.lucky"), text("exp.why.middle"), text("exp.why.chance")]
    ),
  };
}
/** A fixed shuffle for the after-question's options - the same each time it's asked. */
const rng0 = () => makeRng(7);

/** A seed whose results fit: tried in order until one does. */
function seedWhere(rng: Rng, fits: (seed: number) => boolean): number {
  return retry("experiment seed", () => {
    const seed = randInt(rng, 1, 1_000_000);
    return fits(seed) ? seed : null;
  });
}

/** 1.11.2: a spinner with one colour on half of it - which comes most? */
function spinner(rng: Rng): ExperimentProblem {
  const [a, b, c] = shuffle(rng, CHANCE_COLORS).slice(0, 3);
  const colors = shuffle(rng, [
    { color: a, count: 4 },
    { color: b, count: 2 },
    { color: c, count: 2 },
  ]);
  const device: Device = { type: "spinner", colors };
  const big = colors.findIndex((x) => x.count === 4);
  const throws = 20;
  // Results where the big colour clearly came most - the experiment agrees with the chance.
  const seed = seedWhere(rng, (s) => {
    const counts = tally(device, runExperiment({ device, throws, seed: s }));
    return counts[big] > Math.max(...counts.filter((_, i) => i !== big)) + 2;
  });
  return {
    stageId: "1.11.2",
    kind: "experiment",
    device,
    throws,
    seed,
    predict: {
      prompt: text("exp.predict.most"),
      ...fixedOptions(
        colors.map((x) => colorOption(x.color)),
        big,
        colors.map(() => text("exp.why.bigger"))
      ),
    },
    after: "most",
    tip: text("exp.tip.spinner"),
    explanation: text("exp.explain.spinner", { color: `@color.${colors[big].color}` }),
  };
}

/** 2.18.3: a die thrown 60 times - about 10 sixes; the share that came isn't always 1/6. */
function die(rng: Rng): ExperimentProblem {
  const device: Device = { type: "die" };
  const throws = 60;
  // Sixes near 10 but not exactly: the share differs from 1/6, which is the point.
  const seed = seedWhere(rng, (s) => {
    const six = tally(device, runExperiment({ device, throws, seed: s }))[5];
    return six !== 10 && six >= 6 && six <= 15;
  });
  return {
    stageId: "2.18.3",
    kind: "experiment",
    device,
    throws,
    seed,
    predict: {
      prompt: text("exp.predict.sixes", { n: throws }),
      ...shuffledOptions(rng, numberOption(10), [
        { option: numberOption(6), why: text("exp.why.six") },
        { option: numberOption(30), why: text("exp.why.half") },
        { option: numberOption(1), why: text("exp.why.one") },
      ]),
    },
    after: "share",
    tip: text("exp.tip.die"),
    explanation: text("exp.explain.die", { n: throws }),
  };
}

/** 3.7.5: the sum of two dice, 100 times - 7 comes most, as it has the most ways. */
function twoDice(rng: Rng): ExperimentProblem {
  const device: Device = { type: "twoDice" };
  const throws = 100;
  const seed = seedWhere(rng, (s) => {
    const counts = tally(device, runExperiment({ device, throws, seed: s }));
    return counts[5] > Math.max(...counts.filter((_, i) => i !== 5));
  });
  return {
    stageId: "3.7.5",
    kind: "experiment",
    device,
    throws,
    seed,
    predict: {
      prompt: text("exp.predict.sum"),
      ...shuffledOptions(rng, numberOption(7), [
        { option: numberOption(12), why: text("exp.why.twelve") },
        { option: numberOption(2), why: text("exp.why.two") },
        { option: numberOption(6), why: text("exp.why.nearly") },
      ]),
    },
    after: "sum",
    tip: text("exp.tip.twoDice"),
    explanation: text("exp.explain.twoDice"),
  };
}

export const EXPERIMENT_QUESTIONS = questionType<"experiment", ExperimentProblem, ExperimentStageId>({
  id: "experiment",
  kinds: ["experiment"],
  levels: {
    "1.11.2": spinner,
    "2.18.3": die,
    "3.7.5": twoDice,
  },
  key: (p) => `experiment:${p.stageId}:${p.seed}:${JSON.stringify(p.device)}`,
});
