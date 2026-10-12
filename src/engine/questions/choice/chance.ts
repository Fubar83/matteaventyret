/**
 * Chance, as single-choice questions:
 *
 *   åk 1-3  1.11.1 slumpen: säkert, möjligt eller omöjligt? which colour is most likely?
 *   åk 4-6  2.18.1 sannolikhet: the chance as a fraction - marbles, a spinner, a die
 *
 * A probability is given as the count over the total, the way it's counted
 * (3/6 for an even number on a die), and no two options have the same value.
 */
import { pick, randInt, shuffle, type Rng } from "../../rng";
import { CHANCE_COLORS, type ChanceColor, type QuestionScene } from "../scene";
import { fixedOptions, shuffledOptions, text, type ChoiceOption, type ChoiceProblem, type Slip } from "./problem";

export type ChanceChoiceStageId = "1.11.1" | "2.18.1";

type Device = "bag" | "spinner";
const colorText = (c: ChanceColor) => ({ text: text(`color.${c}`) });

/** Marbles in a bag, or sectors of a spinner: 2-3 colours with different counts, `total` in all. */
function stock(rng: Rng, colors: number, max: number): { color: ChanceColor; count: number }[] {
  const picked = shuffle(rng, CHANCE_COLORS).slice(0, colors);
  const counts = new Set<number>();
  while (counts.size < colors) counts.add(randInt(rng, 1, max));
  return picked.map((color, i) => ({ color, count: [...counts][i] }));
}

/** 1.11.1: certain, possible or impossible - and which colour is the most likely. */
function chanceWords(rng: Rng): ChoiceProblem {
  const device: Device = rng() < 0.6 ? "bag" : "spinner";
  if (rng() < 0.65) {
    // All one colour (certain), some (possible), or a colour that isn't there (impossible).
    const kind = pick(rng, ["certain", "possible", "impossible"] as const);
    const colors = kind === "certain" ? stock(rng, 1, 6) : stock(rng, randInt(rng, 2, 3), 4);
    const asked = kind === "impossible" ? CHANCE_COLORS.find((c) => !colors.some((x) => x.color === c))! : colors[0].color;
    const scene: QuestionScene = { kind: "chance", device, colors };
    return {
      stageId: "1.11.1",
      kind: "choice",
      prompt: text(`choice.chance.words.${device}`, { color: `@color.${asked}` }),
      scene,
      ...fixedOptions(
        [{ text: text("choice.chance.certain") }, { text: text("choice.chance.possible") }, { text: text("choice.chance.impossible") }],
        ["certain", "possible", "impossible"].indexOf(kind),
        [text("choice.chance.whyCertain"), text("choice.chance.whyPossible"), text("choice.chance.whyImpossible")]
      ),
      tip: text("choice.chance.tipWords"),
      explanation: text(`choice.chance.explain.${kind}`, { color: `@color.${asked}` }),
    };
  }
  const colors = stock(rng, randInt(rng, 2, 3), 6);
  const most = colors.reduce((a, b) => (b.count > a.count ? b : a));
  return {
    stageId: "1.11.1",
    kind: "choice",
    prompt: text(`choice.chance.most.${device}`),
    scene: { kind: "chance", device, colors },
    ...shuffledOptions(
      rng,
      colorText(most.color),
      colors.filter((c) => c !== most).map((c) => ({ option: colorText(c.color), why: text("choice.chance.whyFewer", { color: `@color.${c.color}`, n: c.count, m: most.count }) }))
    ),
    tip: text("choice.chance.tipMost"),
    explanation: text("choice.chance.explainMost", { color: `@color.${most.color}`, n: most.count }),
  };
}

/** A fraction at full size (\dfrac) - inline it would be too small to read on a button. */
const frac = (a: number, b: number): ChoiceOption => ({ latex: `\\dfrac{${a}}{${b}}` });

/** Slips for a chance of `n` out of `total`, none worth the same as it: n to the rest, the rest, one over n. */
function chanceSlips(n: number, total: number): Slip[] {
  const right = n / total;
  const candidates: [number, number, string][] = [
    [n, total - n, "choice.chance.whyRest"],
    [total - n, total, "choice.chance.whyOther"],
    [1, n, "choice.chance.whyOne"],
    [n, total + 1, "choice.chance.whyTotal"],
    [1, total, "choice.chance.whyOne"],
    [n + 1, total, "choice.chance.whyTotal"],
  ];
  // Only what a probability can be - between 0 and 1, and not 1/1.
  return candidates.filter(([a, b]) => b > 0 && a > 0 && a < b && Math.abs(a / b - right) > 1e-9).map(([a, b, why]) => ({ option: frac(a, b), why: text(why) }));
}

const DIE_EVENTS: { key: string; count: number }[] = [
  { key: "six", count: 1 },
  { key: "even", count: 3 },
  { key: "odd", count: 3 },
  { key: "moreThan4", count: 2 },
  { key: "lessThan3", count: 2 },
  { key: "oneOrTwo", count: 2 },
  { key: "notSix", count: 5 },
];

/** 2.18.1: the chance as a fraction - count the ways it can happen, over all the ways. */
function probability(rng: Rng): ChoiceProblem {
  if (rng() < 0.35) {
    const e = pick(rng, DIE_EVENTS);
    return {
      stageId: "2.18.1",
      kind: "choice",
      prompt: text(`choice.chance.die.${e.key}`),
      scene: { kind: "chance", device: "die", colors: [] },
      ...shuffledOptions(rng, frac(e.count, 6), chanceSlips(e.count, 6)),
      tip: text("choice.chance.tipFraction"),
      explanation: text("choice.chance.explainDie", { event: `@choice.chance.dieEvent.${e.key}`, n: e.count }),
    };
  }
  const device: Device = rng() < 0.6 ? "bag" : "spinner";
  const colors = stock(rng, randInt(rng, 2, 3), device === "bag" ? 5 : 4);
  const total = colors.reduce((s, c) => s + c.count, 0);
  const asked = pick(rng, colors);
  return {
    stageId: "2.18.1",
    kind: "choice",
    prompt: text(`choice.chance.fraction.${device}`, { color: `@color.${asked.color}` }),
    scene: { kind: "chance", device, colors },
    ...shuffledOptions(rng, frac(asked.count, total), chanceSlips(asked.count, total)),
    tip: text("choice.chance.tipFraction"),
    explanation: text(`choice.chance.explainFraction.${device}`, { color: `@color.${asked.color}`, n: asked.count, total }),
  };
}

export const CHANCE_CHOICES: Record<ChanceChoiceStageId, (rng: Rng) => ChoiceProblem> = {
  "1.11.1": chanceWords,
  "2.18.1": probability,
};
