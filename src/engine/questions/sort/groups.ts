/**
 * Sorting into groups:
 *
 *   förskoleklass 0.4.1 sortera: shapes by shape or by colour
 *   åk 1-3        1.8.5 udda och jämna: numbers into odd and even
 *                 1.2.5 figurer och kroppar: flat figures and solids
 *   åk 4-6        2.15.2 primtal: primes and not (1, 9, 51 and 2 the traps)
 *                 2.6.7 bråk kring en halv: less than, equal to, more than a half
 *                 2.15.3 venndiagram: divisible by 2, by 3, by both, by neither
 *                 2.12.7 fyrhörningar: four right angles or not, two pairs of parallel sides or not
 *   åk 7-9        3.1.5 rationella och irrationella tal: √9 and 3,14 against √2 and π
 *                 3.3.17 stämmer alltid?: the rules, and the rules that only look like rules -
 *                        (a + b)² = a² + b², √(a + b) = √a + √b
 *
 * The things that are easy to get wrong are always among them: 2 is a prime,
 * 51 isn't, 4/8 is a half, √16 is rational, 3,14 isn't π.
 */
import { pick, randInt, shuffle, type Rng } from "../../rng";
import { retry } from "../questionType";
import { CHANCE_COLORS, PLANE_SHAPES, QUADS, SOLIDS, type PatternItem, type Quad, type QuestionScene } from "../scene";
import { fractionOption, numberOption, text, textOption, type ChoiceOption, type ChoiceText } from "../choice/problem";
import type { SortGroupsProblem } from "./problem";

export type SortGroupsStageId = "0.4.1" | "1.8.5" | "1.2.5" | "2.15.2" | "2.6.7" | "3.1.5" | "2.15.3" | "2.12.7" | "3.3.17";

/** A thing, the group it goes in, and why it goes there. */
interface Sorted {
  item: ChoiceOption;
  group: number;
  why: ChoiceText | null;
}

/** The things shuffled, with their groups and reasons in the same order. */
function sorted(rng: Rng, things: Sorted[]): Pick<SortGroupsProblem, "items" | "answer" | "why"> {
  const order = shuffle(rng, things);
  return { items: order.map((t) => t.item), answer: order.map((t) => t.group), why: order.map((t) => t.why) };
}

const SHAPES: readonly PatternItem["shape"][] = ["circle", "square", "triangle", "star", "heart"];

/** 0.4.1: shapes by their shape (whatever the colour), or by their colour (whatever the shape). */
function sortShapes(rng: Rng): SortGroupsProblem {
  const byShape = rng() < 0.5;
  const groups = byShape ? shuffle(rng, SHAPES).slice(0, 2) : shuffle(rng, CHANCE_COLORS).slice(0, randInt(rng, 2, 3));
  const n = randInt(rng, 6, 8);
  // Each group gets two first, then the rest anywhere.
  const of = [...groups.map((_, g) => g), ...groups.map((_, g) => g), ...Array.from({ length: n - 2 * groups.length }, () => randInt(rng, 0, groups.length - 1))];
  const things: Sorted[] = of.map((g) => {
    const item: PatternItem = byShape
      ? { shape: groups[g] as PatternItem["shape"], color: pick(rng, CHANCE_COLORS) }
      : { shape: pick(rng, SHAPES), color: groups[g] as PatternItem["color"] };
    return { item: { scene: { kind: "pattern", items: [item], blank: false } satisfies QuestionScene }, group: g, why: text(byShape ? "sort.why.shape" : "sort.why.color") };
  });
  return {
    stageId: "0.4.1",
    kind: "sortGroups",
    prompt: text(byShape ? "sort.shapes.byShape" : "sort.shapes.byColor"),
    groups: groups.map((g) => textOption(byShape ? `sort.group.shape.${g}` : `sort.group.color.${g}`)),
    ...sorted(rng, things),
    tip: text(byShape ? "sort.shapes.tipShape" : "sort.shapes.tipColor"),
    explanation: text(byShape ? "sort.shapes.explainShape" : "sort.shapes.explainColor"),
  };
}

/** 1.8.5: odd and even - the last digit decides, however big the number. */
function oddEven(rng: Rng): SortGroupsProblem {
  const numbers = new Set<number>();
  // Two of each at least, some of them big: 347 is odd as 7 is.
  while (numbers.size < 6) {
    const n = numbers.size < 2 ? randInt(rng, 100, 999) : randInt(rng, 1, 99);
    const wantOdd = numbers.size % 2 === 0;
    if (n % 2 === (wantOdd ? 1 : 0)) numbers.add(n);
  }
  const things: Sorted[] = [...numbers].map((n) => ({ item: numberOption(n), group: n % 2 === 1 ? 0 : 1, why: text("sort.why.lastDigit", { n, d: n % 10 }) }));
  return {
    stageId: "1.8.5",
    kind: "sortGroups",
    prompt: text("sort.parity.prompt"),
    groups: [textOption("sort.group.odd"), textOption("sort.group.even")],
    ...sorted(rng, things),
    tip: text("sort.parity.tip"),
    explanation: text("sort.parity.explain"),
  };
}

/** 1.2.5: flat figures and solids. */
function planeOrSolid(rng: Rng): SortGroupsProblem {
  const flat = shuffle(rng, PLANE_SHAPES).slice(0, 3);
  const solid = shuffle(rng, SOLIDS).slice(0, 3);
  const picture = (shape: (typeof flat)[number] | (typeof solid)[number]): ChoiceOption => ({ scene: { kind: "shape", shape } satisfies QuestionScene });
  return {
    stageId: "1.2.5",
    kind: "sortGroups",
    prompt: text("sort.solids.prompt"),
    groups: [textOption("sort.group.plane"), textOption("sort.group.solid")],
    ...sorted(rng, [
      ...flat.map((s) => ({ item: picture(s), group: 0, why: text("sort.why.plane") })),
      ...solid.map((s) => ({ item: picture(s), group: 1, why: text("sort.why.solid") })),
    ]),
    tip: text("sort.solids.tip"),
    explanation: text("sort.solids.explain"),
  };
}

const isPrime = (n: number) => n > 1 && Array.from({ length: Math.floor(Math.sqrt(n)) - 1 }, (_, i) => i + 2).every((d) => n % d !== 0);
const smallestFactor = (n: number) => Array.from({ length: n }, (_, i) => i + 2).find((d) => n % d === 0)!;
/** Numbers that look like primes and aren't, and the two that surprise. */
const ODD_COMPOSITES = [9, 15, 21, 25, 27, 33, 35, 39, 45, 49, 51, 57];

/** 2.15.2: primes and not - with 1, 2 and an odd number that isn't prime among them. */
function primes(rng: Rng): SortGroupsProblem {
  const numbers = new Set<number>();
  numbers.add(pick(rng, ODD_COMPOSITES));
  numbers.add(rng() < 0.5 ? 2 : 1);
  const ps = Array.from({ length: 58 }, (_, i) => i + 2).filter(isPrime);
  while ([...numbers].filter(isPrime).length < 3) numbers.add(pick(rng, ps));
  while (numbers.size < 7) numbers.add(randInt(rng, 4, 60));
  const things: Sorted[] = [...numbers].map((n) => {
    const prime = isPrime(n);
    const why =
      n === 1 ? text("sort.why.one") : n === 2 ? text("sort.why.two") : prime ? text("sort.why.prime", { n }) : text("sort.why.composite", { n, a: smallestFactor(n), b: n / smallestFactor(n) });
    return { item: numberOption(n), group: prime ? 0 : 1, why };
  });
  return {
    stageId: "2.15.2",
    kind: "sortGroups",
    prompt: text("sort.primes.prompt"),
    groups: [textOption("sort.group.prime"), textOption("sort.group.notPrime")],
    ...sorted(rng, things),
    tip: text("sort.primes.tip"),
    explanation: text("sort.primes.explain"),
  };
}

/** 2.6.7: less than a half, a half, more than a half - compare the numerator with half the denominator. */
function aroundAHalf(rng: Rng): SortGroupsProblem {
  const fractions = new Map<string, [number, number]>();
  const add = (s: number, p: number) => fractions.set(`${s}/${p}`, [s, p]);
  // At least one of each, a half among them written another way (4/8).
  const half = pick(rng, [4, 6, 8, 10, 12]);
  add(half / 2, half);
  while (fractions.size < 6) {
    const p = randInt(rng, 3, 12);
    const s = randInt(rng, 1, p - 1);
    const below = [...fractions.values()].filter(([a, b]) => 2 * a < b).length;
    const above = [...fractions.values()].filter(([a, b]) => 2 * a > b).length;
    // Keep both sides represented.
    if (fractions.size >= 4 && (below === 0 ? 2 * s >= p : above === 0 ? 2 * s <= p : false)) continue;
    add(s, p);
  }
  const things: Sorted[] = [...fractions.values()].map(([s, p]) => ({
    item: fractionOption(s, p),
    group: 2 * s < p ? 0 : 2 * s === p ? 1 : 2,
    why: text("sort.why.half", { s, p, h: String(p / 2).replace(".", ",") }),
  }));
  return {
    stageId: "2.6.7",
    kind: "sortGroups",
    prompt: text("sort.half.prompt"),
    groups: [textOption("sort.group.lessHalf"), textOption("sort.group.half"), textOption("sort.group.moreHalf")],
    ...sorted(rng, things),
    tip: text("sort.half.tip"),
    explanation: text("sort.half.explain"),
  };
}

/** Numbers to tell rational from irrational, each with why it is what it is. */
const RATIONAL: { latex: string; why: ChoiceText }[] = [
  { latex: "\\sqrt{9}", why: text("sort.why.squareRoot", { n: 9, r: 3 }) },
  { latex: "\\sqrt{16}", why: text("sort.why.squareRoot", { n: 16, r: 4 }) },
  { latex: "\\sqrt{25}", why: text("sort.why.squareRoot", { n: 25, r: 5 }) },
  { latex: "0{,}75", why: text("sort.why.decimal", { f: "3/4" }) },
  { latex: "\\dfrac{1}{3}", why: text("sort.why.fraction") },
  { latex: "\\dfrac{22}{7}", why: text("sort.why.fraction") },
  { latex: "-5", why: text("sort.why.integer") },
  { latex: "3{,}14", why: text("sort.why.rounded") },
  { latex: "0{,}\\overline{3}", why: text("sort.why.repeating") },
];
const IRRATIONAL: { latex: string; why: ChoiceText }[] = [
  { latex: "\\sqrt{2}", why: text("sort.why.notSquare", { n: 2 }) },
  { latex: "\\sqrt{3}", why: text("sort.why.notSquare", { n: 3 }) },
  { latex: "\\sqrt{5}", why: text("sort.why.notSquare", { n: 5 }) },
  { latex: "\\sqrt{10}", why: text("sort.why.notSquare", { n: 10 }) },
  { latex: "\\pi", why: text("sort.why.pi") },
  { latex: "2\\pi", why: text("sort.why.pi") },
];

/** 3.1.5: rational or irrational - √16 and 3,14 are rational; √2 and π aren't. */
function rationalOrNot(rng: Rng): SortGroupsProblem {
  const rational = shuffle(rng, RATIONAL).slice(0, 4);
  const irrational = shuffle(rng, IRRATIONAL).slice(0, 3);
  return {
    stageId: "3.1.5",
    kind: "sortGroups",
    prompt: text("sort.rational.prompt"),
    groups: [textOption("sort.group.rational"), textOption("sort.group.irrational")],
    ...sorted(rng, [
      ...rational.map((r) => ({ item: { latex: r.latex }, group: 0, why: r.why })),
      ...irrational.map((r) => ({ item: { latex: r.latex }, group: 1, why: r.why })),
    ]),
    tip: text("sort.rational.tip"),
    explanation: text("sort.rational.explain"),
  };
}

/** Equalities that always hold - the rules. */
const ALWAYS: string[] = [
  "(a + b)^{2} = a^{2} + 2ab + b^{2}",
  "(a + b)(a - b) = a^{2} - b^{2}",
  "(ab)^{2} = a^{2}b^{2}",
  "a(b + c) = ab + ac",
  "-(a - b) = b - a",
  "\\frac{a + b}{c} = \\frac{a}{c} + \\frac{b}{c}",
  "x^{a} \\cdot x^{b} = x^{a + b}",
  "(a - b)^{2} = (b - a)^{2}",
  "\\frac{a}{b} \\cdot \\frac{c}{d} = \\frac{ac}{bd}",
];
/** Equalities that look like rules and aren't - each with the numbers that show it. */
const LOOKS_LIKE: { latex: string; why: string }[] = [
  { latex: "(a + b)^{2} = a^{2} + b^{2}", why: "square" },
  { latex: "\\sqrt{a + b} = \\sqrt{a} + \\sqrt{b}", why: "rootSum" },
  { latex: "\\frac{a}{b + c} = \\frac{a}{b} + \\frac{a}{c}", why: "splitBottom" },
  { latex: "-a^{2} = (-a)^{2}", why: "minusSquare" },
  { latex: "\\frac{a + b}{a} = b", why: "cancelTerm" },
  { latex: "x^{a} \\cdot x^{b} = x^{ab}", why: "powerTimes" },
  { latex: "(x^{a})^{b} = x^{a + b}", why: "powerPlus" },
  { latex: "a - (b + c) = a - b + c", why: "minusBracket" },
  { latex: "\\frac{a}{b} + \\frac{c}{d} = \\frac{a + c}{b + d}", why: "addFractions" },
];

/** Fractions at full size on a card. */
const full = (latex: string) => latex.replace(/\\frac/g, "\\dfrac");

/** 3.3.17: which equalities always hold - three rules among three that only look like rules. */
function alwaysTrue(rng: Rng): SortGroupsProblem {
  return {
    stageId: "3.3.17",
    kind: "sortGroups",
    prompt: text("sort.always.prompt"),
    groups: [textOption("sort.group.always"), textOption("sort.group.notAlways")],
    ...sorted(rng, [
      ...shuffle(rng, ALWAYS).slice(0, 3).map((latex) => ({ item: { latex: full(latex) }, group: 0, why: text("sort.why.always") })),
      ...shuffle(rng, LOOKS_LIKE).slice(0, 3).map((f) => ({ item: { latex: full(f.latex) }, group: 1, why: text(`sort.why.not.${f.why}`) })),
    ]),
    tip: text("sort.always.tip"),
    explanation: text("sort.always.explain"),
  };
}

/** Pairs of divisors for a Venn diagram - different enough that every part of it gets numbers. */
const DIVISORS: [number, number][] = [
  [2, 3],
  [2, 5],
  [3, 5],
  [3, 4],
  [2, 7],
];

/** 2.15.3: a Venn diagram - divisible by one, by the other, by both, by neither. */
function venn(rng: Rng): SortGroupsProblem {
  const [a, b] = pick(rng, DIVISORS);
  const region = (n: number) => (n % a === 0 ? (n % b === 0 ? 1 : 0) : n % b === 0 ? 2 : 3);
  // Two numbers in each part, from 1 to 60.
  const numbers = shuffle(rng, Array.from({ length: 60 }, (_, i) => i + 1));
  const chosen = [0, 1, 2, 3].flatMap((r) => numbers.filter((n) => region(n) === r).slice(0, 2));
  const why = (n: number) =>
    text("sort.why.divides", { n, a, b, ya: `@sort.yesNo.${n % a === 0}`, yb: `@sort.yesNo.${n % b === 0}` });
  return {
    stageId: "2.15.3",
    kind: "sortGroups",
    prompt: text("sort.venn.prompt"),
    venn: [text("sort.venn.divisible", { n: a }), text("sort.venn.divisible", { n: b })],
    groups: [textOption("sort.venn.onlyA"), textOption("sort.venn.both"), textOption("sort.venn.onlyB"), textOption("sort.venn.neither")],
    ...sorted(rng, chosen.map((n) => ({ item: numberOption(n), group: region(n), why: why(n) }))),
    tip: text("sort.venn.tip", { a, b }),
    explanation: text("sort.venn.explain", { a, b, ab: a * b }),
  };
}

/** The quadrilaterals' properties. */
const HAS: Record<"rightAngles" | "parallel" | "equalSides", Quad[]> = {
  rightAngles: ["square", "rectangle"],
  parallel: ["square", "rectangle", "rhombus", "parallelogram"],
  equalSides: ["square", "rhombus"],
};

/** 2.12.7: quadrilaterals by a property - four right angles, two pairs of parallel sides, four equal sides. */
function quadrilaterals(rng: Rng): SortGroupsProblem {
  const property = pick(rng, ["rightAngles", "parallel", "equalSides"] as const);
  const yes = HAS[property];
  // Six, some of each, turned so it isn't just the look.
  const shapes = retry("2.12.7", () => {
    const s = Array.from({ length: 6 }, () => pick(rng, QUADS));
    return s.some((q) => yes.includes(q)) && s.some((q) => !yes.includes(q)) && new Set(s).size >= 4 ? s : null;
  });
  return {
    stageId: "2.12.7",
    kind: "sortGroups",
    prompt: text(`sort.quad.${property}`),
    groups: [textOption("sort.group.yes"), textOption("sort.group.no")],
    ...sorted(
      rng,
      shapes.map((q) => ({
        item: { scene: { kind: "quad", shape: q, turn: pick(rng, [0, 0, 15, -20, 30, 90]) } satisfies QuestionScene },
        group: yes.includes(q) ? 0 : 1,
        why: text(`sort.why.quad.${property}.${yes.includes(q) ? "yes" : "no"}`, { name: `@sort.quadName.${q}` }),
      }))
    ),
    tip: text(`sort.quad.tip.${property}`),
    explanation: text(`sort.quad.explain.${property}`),
  };
}

export const SORT_GROUPS: Record<SortGroupsStageId, (rng: Rng) => SortGroupsProblem> = {
  "0.4.1": sortShapes,
  "1.8.5": oddEven,
  "1.2.5": planeOrSolid,
  "2.15.2": primes,
  "2.6.7": aroundAHalf,
  "3.1.5": rationalOrNot,
  "2.15.3": venn,
  "2.12.7": quadrilaterals,
  "3.3.17": alwaysTrue,
};
