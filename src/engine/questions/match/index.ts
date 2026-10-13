/**
 * Matching pairs: cards face up, tap two that belong together. Every age:
 *
 *   förskoleklass 0.1.7 antal och siffra: a picture of 6 and the digit 6
 *   åk 1-3        1.7.5 talkamrater: pairs that make 10, 20 or 100
 *                 1.5.10 klockan: an analog clock and the time in words
 *   åk 4-6        2.6.10 bråk, decimaltal och procent: 1/4 and 0,25, 0,5 and 50 %
 *                 2.9.9 lika mycket i olika enheter: 1,5 m and 150 cm, 2 kg and 2 000 g
 *   åk 7-9        3.3.9 uttryck: 2(x + 3) and 2x + 6, x · x and x²
 *                 3.10.3 graf och formel: a line and its y = kx + m
 *                 3.1.11 potenser: x³ · x² and x⁵, (x²)³ and x⁶, x⁻¹ and 1/x
 *
 * Each card belongs to exactly one other: the pairs are chosen so no card
 * could go with two.
 *
 * How it works, and what must stay true: docs/question-types/match.md.
 */
import { pick, randInt, shuffle, type Rng } from "../../rng";
import { lineFormula } from "../choice/functions";
import { fractionOption, numberOption, plainOption, text, textOption, type ChoiceOption, type ChoiceText } from "../choice/problem";
import { spokenTime } from "../clock";
import { GROUP_THINGS, type QuestionScene } from "../scene";
import { questionType, retry } from "../questionType";
import { tex } from "../written/problem";

export type MatchStageId = "0.1.7" | "1.7.5" | "1.5.10" | "2.6.10" | "2.9.9" | "3.3.9" | "3.10.3" | "3.1.11";

export interface MatchProblem {
  stageId: MatchStageId;
  kind: "match";
  prompt: ChoiceText;
  /** The cards, shuffled; two cards with the same `pair` belong together. */
  cards: { option: ChoiceOption; pair: number }[];
  tip: ChoiceText;
  explanation: ChoiceText;
}

/** The pairs' cards, shuffled. */
function cards(rng: Rng, pairs: [ChoiceOption, ChoiceOption][]): MatchProblem["cards"] {
  return shuffle(
    rng,
    pairs.flatMap(([a, b], pair) => [
      { option: a, pair },
      { option: b, pair },
    ])
  );
}

/** 0.1.7: a group of things and its number. */
function countAndDigit(rng: Rng): MatchProblem {
  const counts = shuffle(rng, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).slice(0, 4);
  const thing = pick(rng, GROUP_THINGS);
  return {
    stageId: "0.1.7",
    kind: "match",
    prompt: text("match.count.prompt"),
    cards: cards(
      rng,
      counts.map((n) => [{ scene: { kind: "count", groups: [{ thing, n }] } satisfies QuestionScene }, numberOption(n)])
    ),
    tip: text("match.count.tip"),
    explanation: text("match.count.explain"),
  };
}

/** 1.7.5: number friends - two numbers that make 10, 20 or 100 together. */
function friends(rng: Rng): MatchProblem {
  const target = pick(rng, [10, 20, 100]);
  // The smaller of each pair below half, so no number could go with two.
  const smaller = target === 100 ? shuffle(rng, [5, 10, 15, 20, 25, 30, 35, 40, 45]).slice(0, 4) : shuffle(rng, Array.from({ length: target / 2 - 1 }, (_, i) => i + 1)).slice(0, 4);
  return {
    stageId: "1.7.5",
    kind: "match",
    prompt: text("match.friends.prompt", { n: target }),
    cards: cards(
      rng,
      smaller.map((a) => [numberOption(a), numberOption(target - a)])
    ),
    tip: text("match.friends.tip", { n: target }),
    explanation: text("match.friends.explain", { n: target }),
  };
}

/** A time as a card of words: "klockan 3", "halv fyra", "kvart över två". */
const timeWords = (h: number, m: number): ChoiceOption => {
  if (m === 0) return textOption("clock.oclock", { h: String(((h + 11) % 12) + 1) });
  const s = spokenTime(h, m);
  return textOption(s.key, { h: String(s.hour), n: String(s.next) });
};

/** 1.5.10: an analog clock and its time in words - whole, half and quarter hours, and five-minute times. */
function clocks(rng: Rng): MatchProblem {
  const times = new Map<string, [number, number]>();
  while (times.size < 4) {
    const h = randInt(rng, 1, 12);
    const m = pick(rng, [0, 15, 30, 45, 5, 10, 20, 25, 35, 40, 50, 55].slice(0, rng() < 0.6 ? 4 : 12));
    // Not two with the same minutes: one hour-hand reading each.
    if (![...times.values()].some(([, mm]) => mm === m)) times.set(`${h}:${m}`, [h, m]);
  }
  return {
    stageId: "1.5.10",
    kind: "match",
    prompt: text("match.clock.prompt"),
    cards: cards(
      rng,
      [...times.values()].map(([h, m]) => [{ scene: { kind: "clock", h, m } satisfies QuestionScene }, timeWords(h, m)])
    ),
    tip: text("match.clock.tip"),
    explanation: text("match.clock.explain"),
  };
}

const PARTS: [number, number][] = [
  [1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 10], [3, 10], [7, 10], [9, 10], [1, 20], [3, 20], [1, 8], [3, 8], [1, 25],
];

/** 2.6.10: the same number as a fraction, a decimal and a percent - each pair in two of the three forms. */
function forms(rng: Rng): MatchProblem {
  const values = shuffle(rng, PARTS).slice(0, 4);
  const write = (form: string, [s, p]: [number, number]): ChoiceOption =>
    form === "fraction" ? fractionOption(s, p) : form === "decimal" ? numberOption(s / p) : { latex: `${tex((100 * s) / p)}\\,\\%` };
  return {
    stageId: "2.6.10",
    kind: "match",
    prompt: text("match.forms.prompt"),
    cards: cards(
      rng,
      values.map((v) => {
        const [a, b] = shuffle(rng, ["fraction", "decimal", "percent"]).slice(0, 2);
        return [write(a, v), write(b, v)];
      })
    ),
    tip: text("match.forms.tip"),
    explanation: text("match.forms.explain"),
  };
}

/** Pairs of measures that are the same amount, one family each so none could go with two. */
const MEASURES: ((rng: Rng) => [string, string])[] = [
  (rng) => {
    const cm = 10 * randInt(rng, 11, 39);
    return [`${tex(cm / 100).replace("{,}", ",")} m`, `${cm} cm`];
  },
  (rng) => {
    const g = 100 * randInt(rng, 11, 49);
    return [`${tex(g / 1000).replace("{,}", ",")} kg`, `${g} g`];
  },
  (rng) => {
    const dl = randInt(rng, 11, 49);
    return [`${tex(dl / 10).replace("{,}", ",")} l`, `${dl} dl`];
  },
  (rng) => {
    const min = 15 * randInt(rng, 5, 11);
    return [`${Math.floor(min / 60)} h ${min % 60} min`, `${min} min`];
  },
  (rng) => {
    const mm = randInt(rng, 11, 49);
    return [`${tex(mm / 10).replace("{,}", ",")} cm`, `${mm} mm`];
  },
];

/** 2.9.9: the same amount in two units - 1,5 m and 150 cm. */
function units(rng: Rng): MatchProblem {
  return {
    stageId: "2.9.9",
    kind: "match",
    prompt: text("match.units.prompt"),
    cards: cards(
      rng,
      shuffle(rng, MEASURES)
        .slice(0, 4)
        .map((make) => {
          const [a, b] = make(rng);
          return [plainOption(a.replace(" 0 min", "")), plainOption(b)];
        })
    ),
    tip: text("match.units.tip"),
    explanation: text("match.units.explain"),
  };
}

const term = (k: number, v = "x") => (k === 1 ? v : k === -1 ? `-${v}` : `${k}${v}`);
const plus = (n: number) => (n < 0 ? ` - ${-n}` : ` + ${n}`);
/** Expressions and their simplified forms, a different rule each. */
const EXPRESSIONS: ((rng: Rng) => [string, string])[] = [
  (rng) => {
    const [a, b] = [randInt(rng, 2, 5), randInt(rng, 1, 6)];
    return [`${a}(x${plus(b)})`, `${term(a)}${plus(a * b)}`];
  },
  () => ["x \\cdot x", "x^2"],
  (rng) => {
    const [a, b] = [randInt(rng, 3, 7), randInt(rng, 1, 2)];
    return [`${a}x - ${term(b)}`, term(a - b)];
  },
  (rng) => {
    const a = randInt(rng, 1, 5);
    return [`(x + ${a})^2`, `x^2 + ${2 * a}x + ${a * a}`];
  },
  (rng) => {
    const a = randInt(rng, 2, 6);
    return [`(x + ${a})(x - ${a})`, `x^2 - ${a * a}`];
  },
  (rng) => {
    const a = randInt(rng, 2, 4);
    return [`${a}x \\cdot x`, `${a}x^2`];
  },
];

/**
 * 3.1.11: powers and the one power they are - each law once, and every
 * answer a different power of x, so no card could go with two.
 */
function powers(rng: Rng): MatchProblem {
  const pairs = retry("3.1.11", () => {
    const made: [string, number][] = shuffle(rng, [
      () => {
        const [a, b] = [randInt(rng, 2, 5), randInt(rng, 2, 4)];
        return [`x^{${a}} \\cdot x^{${b}}`, a + b] as [string, number];
      },
      () => {
        const [a, b] = [randInt(rng, 2, 3), randInt(rng, 2, 3)];
        return [`(x^{${a}})^{${b}}`, a * b] as [string, number];
      },
      () => {
        const [a, b] = [randInt(rng, 6, 10), randInt(rng, 2, 4)];
        return [`\\dfrac{x^{${a}}}{x^{${b}}}`, a - b] as [string, number];
      },
      () => [pick(rng, ["x^{0}", "\\dfrac{x^{4}}{x^{4}}"]), 0] as [string, number],
      () => ["x^{-1}", -1] as [string, number],
      () => ["\\sqrt{x}", 0.5] as [string, number],
    ])
      .slice(0, 4)
      .map((make) => make());
    return new Set(made.map(([, n]) => n)).size === 4 ? made : null;
  });
  const power = (n: number): ChoiceOption => ({ latex: n === 0 ? "1" : n === 1 ? "x" : n === -1 ? "\\dfrac{1}{x}" : n === 0.5 ? "x^{\\frac{1}{2}}" : `x^{${n}}` });
  return {
    stageId: "3.1.11",
    kind: "match",
    prompt: text("match.powers.prompt"),
    cards: cards(
      rng,
      pairs.map(([shown, n]) => [{ latex: shown }, power(n)])
    ),
    tip: text("match.powers.tip"),
    explanation: text("match.powers.explain"),
  };
}

/** 3.3.9: an expression and its simplified form. */
function expressions(rng: Rng): MatchProblem {
  const pairs = retry("3.3.9", () => {
    const made = shuffle(rng, EXPRESSIONS)
      .slice(0, 4)
      .map((make) => make(rng));
    // Every card different.
    return new Set(made.flat()).size === 8 ? made : null;
  });
  return {
    stageId: "3.3.9",
    kind: "match",
    prompt: text("match.expr.prompt"),
    cards: cards(
      rng,
      pairs.map(([a, b]) => [{ latex: a }, { latex: b }])
    ),
    tip: text("match.expr.tip"),
    explanation: text("match.expr.explain"),
  };
}

/** 3.10.3: a line and its formula - three lines that differ in k, m or both. */
function graphs(rng: Rng): MatchProblem {
  const lines = retry("3.10.3", () => {
    const ls = Array.from({ length: 3 }, () => [pick(rng, [-2, -1, 1, 2, 3, 0.5]), randInt(rng, -3, 3)] as [number, number]);
    return new Set(ls.map((l) => l.join())).size === 3 ? ls : null;
  });
  const axis = { min: -5, max: 5, step: 1 };
  return {
    stageId: "3.10.3",
    kind: "match",
    prompt: text("match.graph.prompt"),
    cards: cards(
      rng,
      lines.map(([k, m]) => [
        { scene: { kind: "graph", x: axis, y: axis, lines: [{ points: [[-5, -5 * k + m], [5, 5 * k + m]] }] } satisfies QuestionScene },
        { latex: lineFormula(k, m) },
      ])
    ),
    tip: text("match.graph.tip"),
    explanation: text("match.graph.explain"),
  };
}

export const MATCH_QUESTIONS = questionType<"match", MatchProblem, MatchStageId>({
  id: "match",
  kinds: ["match"],
  levels: {
    "0.1.7": countAndDigit,
    "1.7.5": friends,
    "1.5.10": clocks,
    "2.6.10": forms,
    "2.9.9": units,
    "3.3.9": expressions,
    "3.10.3": graphs,
    "3.1.11": powers,
  },
  key: (p) => `match:${p.stageId}:${p.cards.map((c) => JSON.stringify(c.option)).sort().join("|")}`,
});
