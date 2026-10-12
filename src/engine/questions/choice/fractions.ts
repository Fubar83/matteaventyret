/**
 * Fractions as single-choice questions, mostly with things to eat - a pizza
 * in slices, a chocolate bar in squares:
 *
 *   åk 1-3  1.9.1 bråk i bilder: how much is coloured, which picture, del av antal (a quarter of 12)
 *           1.9.2 pizza och choklad: how much is left or eaten, sharing a pizza equally
 *           1.9.3 vem fick mest? 1/3 or 1/5 of a pizza, 3/8 or 5/8, 1/2 or 2/4
 *   åk 4-6  2.6.5 lika stora bråk: 1/2 = 2/4 = 4/8 - multiplied above and below alike
 *           2.6.6 bråk i vardagen: 2/8 + 3/8 of a pizza, 2/3 of a chocolate bar, 11 slices = 2 3/4 pizzas
 *
 * The wrong options are the classic mistakes: 3/1 for 3 of 4 parts, 1/5 >
 * 1/3 because 5 > 3, 2/8 + 3/8 = 5/16, 1/2 = 3/4 by adding 2 above and below.
 */
import { pick, randInt, shuffle, type Rng } from "../../rng";
import { GROUP_THINGS, type QuestionScene } from "../scene";
import { tex } from "../written/problem";
import { fixedOptions, shuffledOptions, text, type ChoiceOption, type ChoiceProblem, type Slip } from "./problem";

export type FractionChoiceStageId = "1.9.1" | "1.9.2" | "1.9.3" | "2.6.5" | "2.6.6";

const latex = (s: string): ChoiceOption => ({ latex: s });
const num = (n: number): ChoiceOption => latex(tex(n));
/** A fraction at full size (\dfrac) - inline it would be too small to read on a button. */
const frac = (s: number, p: number) => latex(`\\dfrac{${s}}{${p}}`);
/** A mixed number: 2 3/4. */
const mixed = (whole: number, s: number, p: number) => latex(`${whole}\\,\\dfrac{${s}}{${p}}`);
/** A fraction in running text: 3/4. */
const say = (s: number, p: number) => `${s}/${p}`;

/** Names for the children in the questions - the same in both languages. */
const NAMES = ["Liv", "Omar", "Elsa", "Noah", "Saga", "Ali", "Maja", "Leo", "Wilma", "Elias"];
const twoNames = (rng: Rng) => shuffle(rng, NAMES).slice(0, 2) as [string, string];

const FRACTION_SHAPES = ["circle", "bar", "square"] as const;

/** 1.9.1: how big a part is coloured - or which picture shows a half, a third, a quarter. */
function fractionPictures(rng: Rng): ChoiceProblem {
  const shape = pick(rng, FRACTION_SHAPES);
  if (rng() < 0.65) {
    const p = rng() < 0.8 ? randInt(rng, 2, 4) : pick(rng, [6, 8]);
    const s = randInt(rng, 1, p - 1);
    const slips: Slip[] = [
      { option: frac(s, p - s), why: text("choice.fraction.whyRest") },
      { option: frac(p - s, p), why: text("choice.fraction.whyWhite") },
      { option: frac(p, s), why: text("choice.fraction.whyUpsideDown") },
      { option: frac(1, p), why: text("choice.fraction.whyOne", { s }) },
      { option: frac(s, p + 1), why: text("choice.fraction.whyCount", { p }) },
    ];
    return {
      stageId: "1.9.1",
      kind: "choice",
      prompt: text("choice.fraction.howMuch"),
      scene: { kind: "fraction", shape, parts: p, shaded: s },
      ...shuffledOptions(rng, frac(s, p), slips),
      tip: text("choice.fraction.tip"),
      explanation: text("choice.fraction.explain", { s, p }),
    };
  }
  if (rng() < 0.45) {
    // Del av antal: a quarter of 12 - share them out in 4, and take that many shares.
    const [s, p] = pick(rng, [[1, 2], [1, 3], [1, 4], [3, 4], [2, 3]] as const);
    const n = p * randInt(rng, 2, Math.floor(24 / p));
    const part = n / p;
    const right = s * part;
    const slips: Slip[] = [
      { option: num(part), why: s > 1 ? text("choice.partOf.whyOnePart", { part, s }) : text("choice.partOf.whyCount", { p }) },
      { option: num(n - right), why: text("choice.partOf.whyRest") },
      { option: num(n / 2), why: text("choice.partOf.whyHalf", { p }) },
      { option: num(right + part), why: text("choice.partOf.whyCount", { p }) },
      { option: num(n * s), why: text("choice.partOf.whyTimes", { p }) },
    ];
    return {
      stageId: "1.9.1",
      kind: "choice",
      prompt: text("choice.partOf.prompt", { name: `@fraction.${s}-${p}`, n }),
      scene: { kind: "share", total: n, among: p, thing: pick(rng, GROUP_THINGS) },
      ...shuffledOptions(rng, num(right), slips),
      tip: text("choice.partOf.tip"),
      explanation: text("choice.partOf.explain", { n, p, part, s, right }),
    };
  }
  // Which picture: a half, a third, a quarter, three quarters, two thirds.
  const [s, p] = pick(rng, [[1, 2], [1, 3], [1, 4], [3, 4], [2, 3]] as const);
  const picture = (shaded: number, parts: number): ChoiceOption => ({ scene: { kind: "fraction", shape, parts, shaded } satisfies QuestionScene });
  const slips: Slip[] = [
    { option: picture(s, p + 1), why: text("choice.fraction.whyParts", { p }) },
    { option: picture(p - s === s ? s + 1 : p - s, p), why: text("choice.fraction.whyShaded", { s }) },
    { option: picture(s, p + 2), why: text("choice.fraction.whyParts", { p }) },
    { option: picture(s + 1, p + 2), why: text("choice.fraction.whyParts", { p }) },
  ];
  return {
    stageId: "1.9.1",
    kind: "choice",
    prompt: text("choice.fraction.which", { name: `@fraction.${s}-${p}` }),
    ...shuffledOptions(rng, picture(s, p), slips),
    tip: text("choice.fraction.tip"),
    explanation: text("choice.fraction.explain", { s, p }),
  };
}

const SLICES = [2, 3, 4, 6, 8];
const BARS: [number, number][] = [
  [2, 3],
  [2, 4],
  [3, 4],
  [2, 5],
];

/** 1.9.2: a pizza with slices eaten - how much is left, how much was eaten; a chocolate bar; a pizza shared equally. */
function pizzaAndChocolate(rng: Rng): ChoiceProblem {
  const kind = rng();
  if (kind < 0.45) {
    const p = pick(rng, SLICES);
    const eaten = randInt(rng, 1, p - 1);
    const left = p - eaten;
    const askLeft = rng() < 0.6;
    const [asked, other] = askLeft ? [left, eaten] : [eaten, left];
    return {
      stageId: "1.9.2",
      kind: "choice",
      prompt: text(askLeft ? "choice.pizza.howMuchLeft" : "choice.pizza.howMuchEaten"),
      scene: { kind: "pizza", pizzas: [{ slices: p, left }] },
      ...shuffledOptions(rng, frac(asked, p), [
        { option: frac(other, p), why: text(askLeft ? "choice.pizza.whyEaten" : "choice.pizza.whyLeft") },
        // Coloured against uncoloured - unless that's 1/1.
        ...(asked !== other ? [{ option: frac(asked, other), why: text("choice.fraction.whyRest") }] : []),
        { option: frac(p, asked), why: text("choice.fraction.whyUpsideDown") },
        { option: frac(1, p), why: text("choice.fraction.whyOne", { s: asked }) },
        { option: frac(asked, p + 1), why: text("choice.fraction.whyCount", { p }) },
      ]),
      tip: text("choice.pizza.tip"),
      explanation: text(askLeft ? "choice.pizza.explainLeft" : "choice.pizza.explainEaten", { n: asked, p }),
    };
  }
  if (kind < 0.75) {
    const [rows, cols] = pick(rng, BARS);
    const n = rows * cols;
    const eaten = randInt(rng, 1, n - 1);
    return {
      stageId: "1.9.2",
      kind: "choice",
      prompt: text("choice.chocolate.howMuchEaten"),
      scene: { kind: "chocolate", rows, cols, eaten },
      ...shuffledOptions(rng, frac(eaten, n), [
        { option: frac(n - eaten, n), why: text("choice.pizza.whyLeft") },
        { option: frac(eaten, cols), why: text("choice.chocolate.whyRow", { n }) },
        { option: frac(eaten, n - eaten), why: text("choice.fraction.whyRest") },
        { option: frac(1, n), why: text("choice.fraction.whyOne", { s: eaten }) },
      ]),
      tip: text("choice.chocolate.tip"),
      explanation: text("choice.chocolate.explain", { e: eaten, n }),
    };
  }
  // Sharing a pizza equally: one slice each.
  const k = pick(rng, SLICES);
  return {
    stageId: "1.9.2",
    kind: "choice",
    prompt: text("choice.share.prompt", { k }),
    scene: { kind: "pizza", pizzas: [{ slices: k, left: k, taken: 1 }] },
    ...shuffledOptions(rng, frac(1, k), [
      { option: frac(k, 1), why: text("choice.fraction.whyUpsideDown") },
      { option: frac(k - 1, k), why: text("choice.share.whyOthers") },
      { option: frac(1, k + 1), why: text("choice.share.whyCount", { k }) },
      { option: frac(2, k), why: text("choice.share.whyCount", { k }) },
    ]),
    tip: text("choice.share.tip"),
    explanation: text("choice.share.explain", { k }),
  };
}

/** 1.9.3: who gets the most pizza - more slices make smaller slices; the same slices, more of them; and the same, cut differently. */
function whoGetsMost(rng: Rng): ChoiceProblem {
  const [a, b] = twoNames(rng);
  const kind = rng();
  let fa: [number, number];
  let fb: [number, number];
  if (kind < 0.55) {
    // One slice each, of pizzas cut differently: 1/3 or 1/5.
    const [pa, pb] = shuffle(rng, [2, 3, 4, 5, 6, 8]).slice(0, 2);
    [fa, fb] = [
      [1, pa],
      [1, pb],
    ];
  } else if (kind < 0.85) {
    // The same slices: 3/8 or 5/8.
    const p = pick(rng, [4, 5, 6, 8]);
    const [sa, sb] = shuffle(rng, Array.from({ length: p - 1 }, (_, i) => i + 1)).slice(0, 2);
    [fa, fb] = [
      [sa, p],
      [sb, p],
    ];
  } else {
    // The same amount, cut differently: 1/2 or 2/4.
    const [s, p] = pick(rng, [[1, 2], [1, 3], [1, 4], [2, 3], [3, 4]] as const);
    const k = randInt(rng, 2, 8 / p >= 2 ? Math.floor(8 / p) : 2);
    [fa, fb] = rng() < 0.5 ? [[s, p], [s * k, p * k]] : [[s * k, p * k], [s, p]];
  }
  const [va, vb] = [fa[0] / fa[1], fb[0] / fb[1]];
  const winner = va > vb ? a : vb > va ? b : null;
  const correct = va > vb ? 0 : vb > va ? 1 : 2;
  const unit = fa[0] === 1 && fb[0] === 1 && fa[1] !== fb[1];
  const sameParts = fa[1] === fb[1];
  const whyName = text(unit ? "choice.most.whyUnit" : sameParts ? "choice.most.whySameParts" : "choice.most.whyEqual");
  return {
    stageId: "1.9.3",
    kind: "choice",
    prompt: text("choice.most.prompt", { a, fa: say(...fa), b, fb: say(...fb) }),
    scene: {
      kind: "pizza",
      pizzas: [
        { slices: fa[1], left: fa[1], taken: fa[0], label: a },
        { slices: fb[1], left: fb[1], taken: fb[0], label: b },
      ],
    },
    ...fixedOptions([{ plain: a }, { plain: b }, { text: text("choice.most.same") }], correct, [whyName, whyName, text("choice.most.whyNotSame")]),
    tip: text("choice.most.tip"),
    explanation: winner
      ? unit
        ? text("choice.most.explainUnit", { winner, small: Math.min(fa[1], fb[1]), big: Math.max(fa[1], fb[1]) })
        : text("choice.most.explainSameParts", { winner, p: fa[1] })
      : text("choice.most.explainEqual", { fa: say(...fa), fb: say(...fb) }),
  };
}

const BASES: [number, number][] = [
  [1, 2],
  [1, 3],
  [2, 3],
  [1, 4],
  [3, 4],
  [2, 5],
];

/** 2.6.5: equal fractions - which one is as much as 2/3, and the number missing in 1/2 = □/8. */
function equalFractions(rng: Rng): ChoiceProblem {
  const [s, p] = pick(rng, BASES);
  const k = randInt(rng, 2, Math.max(2, Math.floor(12 / p)));
  const [S, P] = [s * k, p * k];
  if (rng() < 0.55) {
    return {
      stageId: "2.6.5",
      kind: "choice",
      prompt: text("choice.equal.which"),
      display: `\\dfrac{${s}}{${p}}`,
      scene: { kind: "pizza", pizzas: [{ slices: p, left: p, taken: s }] },
      ...shuffledOptions(rng, frac(S, P), [
        { option: frac(s + k, p + k), why: text("choice.equal.whyAdd") },
        { option: frac(S, p), why: text("choice.equal.whyOneOnly") },
        { option: frac(s, P), why: text("choice.equal.whyOneOnly") },
        { option: frac(S + 1, P), why: text("choice.equal.whyCount") },
      ]),
      tip: text("choice.equal.tip"),
      explanation: text("choice.equal.explain", { s, p, k, S, P }),
    };
  }
  return {
    stageId: "2.6.5",
    kind: "choice",
    prompt: text("choice.equal.missing"),
    display: `\\dfrac{${s}}{${p}} = \\dfrac{\\square}{${P}}`,
    ...shuffledOptions(rng, num(S), [
      { option: num(s + (P - p)), why: text("choice.equal.whyAdd") },
      { option: num(s), why: text("choice.equal.whyOneOnly") },
      { option: num(k), why: text("choice.equal.whyFactor", { k }) },
      { option: num(S + 1), why: text("choice.equal.whyCount") },
    ]),
    tip: text("choice.equal.tip"),
    explanation: text("choice.equal.explainMissing", { s, p, k, S, P }),
  };
}

/** 2.6.6: fractions in everyday life - pizza eaten together, part of a chocolate bar, slices that make more than one pizza. */
function everydayFractions(rng: Rng): ChoiceProblem {
  const [a, b] = twoNames(rng);
  const kind = rng();
  if (kind < 0.4) {
    // 2/8 + 3/8 of a pizza: the slices are the same size, so the denominator stays.
    const p = pick(rng, [4, 6, 8, 10, 12]);
    const x = randInt(rng, 1, p - 2);
    const y = randInt(rng, 1, p - 1 - x);
    const together = rng() < 0.6;
    const [asked, other] = together ? [x + y, p - x - y] : [p - x - y, x + y];
    return {
      stageId: "2.6.6",
      kind: "choice",
      prompt: text(together ? "choice.everyday.together" : "choice.everyday.left", { a, x: say(x, p), b, y: say(y, p) }),
      scene: { kind: "pizza", pizzas: [{ slices: p, left: p - x - y }] },
      ...shuffledOptions(rng, frac(asked, p), [
        { option: frac(x + y, 2 * p), why: text("choice.everyday.whyAddBottoms") },
        { option: frac(other, p), why: text(together ? "choice.pizza.whyLeft" : "choice.pizza.whyEaten") },
        // Multiplied - while that's still part of one pizza.
        ...(x * y < p ? [{ option: frac(x * y, p), why: text("choice.everyday.whyTimes") }] : []),
        // Eaten against left - while that's less than a pizza (not 5/5 or 7/3).
        ...(asked < other ? [{ option: frac(asked, other), why: text("choice.fraction.whyRest") }] : []),
        // When the slips above coincide, a slice miscounted.
        ...[asked + 1, asked - 1].filter((n) => n >= 1 && n < p).map((n) => ({ option: frac(n, p), why: text("choice.everyday.whyRecount") })),
      ]),
      tip: text("choice.everyday.tipAdd"),
      explanation: text(together ? "choice.everyday.explainTogether" : "choice.everyday.explainLeft", { x, y, p, s: x + y, r: p - x - y }),
    };
  }
  if (kind < 0.75) {
    // 2/3 of a chocolate bar of 12 squares.
    const [rows, cols] = pick(rng, [[3, 4], [2, 6], [4, 6], [3, 6]] as const);
    const n = rows * cols;
    const [s, p] = pick(
      rng,
      ([[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 6], [5, 6]] as [number, number][]).filter(([, q]) => n % q === 0)
    );
    const part = n / p;
    const right = s * part;
    return {
      stageId: "2.6.6",
      kind: "choice",
      prompt: text("choice.everyday.chocolate", { a, n, f: say(s, p) }),
      scene: { kind: "chocolate", rows, cols, eaten: 0 },
      ...shuffledOptions(rng, num(right), [
        { option: num(part), why: s > 1 ? text("choice.partOf.whyOnePart", { part, s }) : text("choice.partOf.whyCount", { p }) },
        { option: num(n - right), why: text("choice.partOf.whyRest") },
        { option: num(n * s), why: text("choice.partOf.whyTimes", { p }) },
        { option: num(right + part), why: text("choice.partOf.whyCount", { p }) },
        // For 1/2 most of the above are 6 or 12: these keep it from being a coin toss.
        { option: num(p), why: text("choice.everyday.whyParts", { p }) },
        { option: num(n - p), why: text("choice.everyday.whyMinus", { n, p }) },
      ]),
      tip: text("choice.partOf.tip"),
      explanation: text("choice.partOf.explain", { n, p, part, s, right }),
    };
  }
  // More than one pizza: 11 slices of pizzas cut in 4 is 2 whole and 3/4.
  const p = pick(rng, [3, 4, 6, 8]);
  const whole = randInt(rng, 1, 3);
  const r = randInt(rng, 1, p - 1);
  const m = whole * p + r;
  return {
    stageId: "2.6.6",
    kind: "choice",
    prompt: text("choice.everyday.mixed", { m, p }),
    scene: { kind: "pizza", pizzas: [...Array.from({ length: whole }, () => ({ slices: p, left: p })), { slices: p, left: r }] },
    ...shuffledOptions(rng, mixed(whole, r, p), [
      { option: mixed(r, whole, p), why: text("choice.everyday.whySwapped") },
      { option: mixed(whole, p - r, p), why: text("choice.everyday.whyMissing") },
      { option: mixed(whole + 1, r, p), why: text("choice.everyday.whyWholes") },
      { option: mixed(whole, r, m), why: text("choice.everyday.whyPerPizza", { p }) },
    ]),
    tip: text("choice.everyday.tipMixed"),
    explanation: text("choice.everyday.explainMixed", { whole, r, p, wp: whole * p }),
  };
}

export const FRACTION_CHOICES: Record<FractionChoiceStageId, (rng: Rng) => ChoiceProblem> = {
  "1.9.1": fractionPictures,
  "1.9.2": pizzaAndChocolate,
  "1.9.3": whoGetsMost,
  "2.6.5": equalFractions,
  "2.6.6": everydayFractions,
};
