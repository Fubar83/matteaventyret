/**
 * Programs in words - the step from arrows on a grid to code - as
 * single-choice questions: what does the program write?
 *
 *   åk 4-6  2.19.3 villkor: om … annars - even or odd, more points than needed, counting the even numbers
 *   åk 7-9  3.9.1  variabler och loopar: doubling in a loop, a running sum, medan (while), swapping two variables
 *           3.9.2  vilken rad saknas? the line that makes the program do what it should
 *
 * The program is a `code` scene, each line an i18n key ("code.*") so it reads
 * "om tal är jämnt:" in Swedish and "if number is even:" in English. The
 * slips: the other branch taken, > read as ≥, the loop once too few, a = b
 * taken for a swap.
 */
import { pick, randInt, type Rng } from "../../rng";
import type { CodeLine } from "../scene";
import { fixedOptions, numberOption, shuffledOptions, text, textOption, type ChoiceProblem } from "./problem";

export type CodeChoiceStageId = "2.19.3" | "3.9.1" | "3.9.2";

const line = (indent: number, key: string, vars?: CodeLine["vars"]): CodeLine => ({ indent, key, vars });

/** 2.19.3: conditions - which branch runs, and what the program writes. */
function conditions(rng: Rng): ChoiceProblem {
  const kind = rng();
  if (kind < 0.4) {
    // Halve an even number; add to (or triple) an odd one.
    const n = randInt(rng, 3, 30);
    const v = "@code.var.number";
    const [op, c] = pick(rng, [["+", 1], ["+", 3], ["·", 3]] as const);
    const other = op === "+" ? n + c : n * c;
    const right = n % 2 === 0 ? n / 2 : other;
    const wrongBranch = n % 2 === 0 ? other : n / 2;
    return {
      stageId: "2.19.3",
      kind: "choice",
      prompt: text("choice.code.writes"),
      scene: {
        kind: "code",
        lines: [
          line(0, "code.set", { v, n }),
          line(0, "code.ifEven", { v }),
          line(1, "code.setOp", { v, w: v, op: "/", n: 2 }),
          line(0, "code.else"),
          line(1, "code.setOp", { v, w: v, op, n: c }),
          line(0, "code.print", { v }),
        ],
      },
      ...shuffledOptions(rng, numberOption(right), [
        { option: numberOption(wrongBranch), why: text(n % 2 === 0 ? "choice.code.whyEven" : "choice.code.whyOdd", { n }) },
        { option: numberOption(n), why: text("choice.code.whyChanged") },
        { option: numberOption(n % 2 === 0 ? (op === "+" ? n / 2 + c : (n / 2) * c) : (op === "+" ? (n + c) / 2 : (n * c) / 2)), why: text("choice.code.whyBoth") },
      ]),
      tip: text("choice.code.tipIf"),
      explanation: text(n % 2 === 0 ? "choice.code.explainEven" : "choice.code.explainOdd", { n, r: right }),
    };
  }
  if (kind < 0.7) {
    // More points than needed wins - exactly as many doesn't.
    const g = randInt(rng, 8, 12);
    const p = rng() < 0.35 ? g : pick(rng, [g - 3, g - 2, g - 1, g + 1, g + 2, g + 4]);
    const v = "@code.var.points";
    return {
      stageId: "2.19.3",
      kind: "choice",
      prompt: text("choice.code.writes"),
      scene: {
        kind: "code",
        lines: [
          line(0, "code.set", { v, n: p }),
          line(0, "code.ifGreater", { v, n: g }),
          line(1, "code.printText", { s: "@code.out.win" }),
          line(0, "code.else"),
          line(1, "code.printText", { s: "@code.out.again" }),
        ],
      },
      ...fixedOptions([textOption("code.out.win"), textOption("code.out.again"), textOption("choice.code.nothing")], p > g ? 0 : 1, [
        text(p === g ? "choice.code.whyEqual" : "choice.code.whyNotMore", { p, g }),
        text("choice.code.whyMore", { p, g }),
        text("choice.code.whyAlways"),
      ]),
      tip: text("choice.code.tipIf"),
      explanation: text(p > g ? "choice.code.explainWin" : p === g ? "choice.code.explainEqual" : "choice.code.explainAgain", { p, g }),
    };
  }
  // Count the even numbers from 1 to n.
  const n = randInt(rng, 5, 12);
  const v = "@code.var.counter";
  const right = Math.floor(n / 2);
  return {
    stageId: "2.19.3",
    kind: "choice",
    prompt: text("choice.code.writes"),
    scene: {
      kind: "code",
      lines: [
        line(0, "code.set", { v, n: 0 }),
        line(0, "code.for", { v: "i", a: 1, b: n }),
        line(1, "code.ifEven", { v: "i" }),
        line(2, "code.setOp", { v, w: v, op: "+", n: 1 }),
        line(0, "code.print", { v }),
      ],
    },
    ...shuffledOptions(rng, numberOption(right), [
      { option: numberOption(n), why: text("choice.code.whyAll") },
      { option: numberOption(n - right), why: text("choice.code.whyOddCount") },
      { option: numberOption(right + 1), why: text("choice.code.whyCountAgain", { n }) },
      { option: numberOption(right * (right + 1)), why: text("choice.code.whySum") },
    ]),
    tip: text("choice.code.tipLoop"),
    explanation: text("choice.code.explainCount", { n, r: right }),
  };
}

/** 3.9.1: variables in loops - what the program writes at the end. */
function variablesAndLoops(rng: Rng): ChoiceProblem {
  const kind = rng();
  const writes = text("choice.code.writes");
  if (kind < 0.3) {
    const a = randInt(rng, 1, 5);
    const n = randInt(rng, 3, 5);
    const right = a * 2 ** n;
    return {
      stageId: "3.9.1",
      kind: "choice",
      prompt: writes,
      scene: { kind: "code", lines: [line(0, "code.set", { v: "x", n: a }), line(0, "code.repeat", { n }), line(1, "code.setOp", { v: "x", w: "x", op: "·", n: 2 }), line(0, "code.print", { v: "x" })] },
      ...shuffledOptions(rng, numberOption(right), [
        { option: numberOption(a * 2 * n), why: text("choice.code.whyDouble", { n }) },
        { option: numberOption(right / 2), why: text("choice.code.whyRounds", { n }) },
        { option: numberOption(a + 2 * n), why: text("choice.code.whyTimesNotPlus") },
        { option: numberOption(right * 2), why: text("choice.code.whyRounds", { n }) },
      ]),
      tip: text("choice.code.tipTrace"),
      explanation: text("choice.code.explainDouble", { a, n, r: right }),
    };
  }
  if (kind < 0.55) {
    const n = randInt(rng, 4, 8);
    const right = (n * (n + 1)) / 2;
    return {
      stageId: "3.9.1",
      kind: "choice",
      prompt: writes,
      scene: { kind: "code", lines: [line(0, "code.set", { v: "s", n: 0 }), line(0, "code.for", { v: "i", a: 1, b: n }), line(1, "code.setOp", { v: "s", w: "s", op: "+", n: "i" }), line(0, "code.print", { v: "s" })] },
      ...shuffledOptions(rng, numberOption(right), [
        { option: numberOption(n), why: text("choice.code.whySumNotCount") },
        { option: numberOption(right - n), why: text("choice.code.whyLast", { n }) },
        { option: numberOption(right + n + 1), why: text("choice.code.whyLast", { n }) },
        { option: numberOption(n * n), why: text("choice.code.whySumNotCount") },
      ]),
      tip: text("choice.code.tipTrace"),
      explanation: text("choice.code.explainSum", { n, r: right }),
    };
  }
  if (kind < 0.8) {
    const a = randInt(rng, 1, 6);
    const d = randInt(rng, 3, 7);
    const g = randInt(rng, 15, 40);
    let x = a;
    while (x < g) x += d;
    return {
      stageId: "3.9.1",
      kind: "choice",
      prompt: writes,
      scene: { kind: "code", lines: [line(0, "code.set", { v: "x", n: a }), line(0, "code.while", { v: "x", n: g }), line(1, "code.setOp", { v: "x", w: "x", op: "+", n: d }), line(0, "code.print", { v: "x" })] },
      ...shuffledOptions(rng, numberOption(x), [
        { option: numberOption(x - d), why: text("choice.code.whyWhileStops", { g }) },
        { option: numberOption(g), why: text("choice.code.whyLimit", { g }) },
        { option: numberOption(x + d), why: text("choice.code.whyWhileStops", { g }) },
      ]),
      tip: text("choice.code.tipWhile", { g }),
      explanation: text("choice.code.explainWhile", { x, g, prev: x - d }),
    };
  }
  // Swapping two variables the naive way: a = b, then b = a - both end up as b.
  const p = randInt(rng, 2, 9);
  const q = pick(rng, [2, 3, 4, 5, 6, 7, 8, 9].filter((n) => n !== p));
  const ab = (a: number, b: number) => textOption("code.out.ab", { a, b });
  return {
    stageId: "3.9.1",
    kind: "choice",
    prompt: writes,
    scene: {
      kind: "code",
      lines: [line(0, "code.set", { v: "a", n: p }), line(0, "code.set", { v: "b", n: q }), line(0, "code.set", { v: "a", n: "b" }), line(0, "code.set", { v: "b", n: "a" }), line(0, "code.printTwo", { v: "a", w: "b" })],
    },
    ...shuffledOptions(rng, ab(q, q), [
      { option: ab(q, p), why: text("choice.code.whySwap", { p, q }) },
      { option: ab(p, p), why: text("choice.code.whyOrder") },
      { option: ab(p, q), why: text("choice.code.whyChanged") },
    ]),
    tip: text("choice.code.tipTrace"),
    explanation: text("choice.code.explainSwap", { p, q }),
  };
}

/** The line that's missing, as it's shown - "?????" in its place. */
const MISSING = (indent: number) => line(indent, "code.missing");
const option = (key: string, vars?: CodeLine["vars"]) => textOption(key, vars);

/** 3.9.2: a program with a line missing - which line makes it do what it should? */
function missingLine(rng: Rng): ChoiceProblem {
  const kind = rng();
  if (kind < 0.35) {
    // The sum 1 + 2 + … + n: add i, not 1.
    const n = randInt(rng, 4, 9);
    return {
      stageId: "3.9.2",
      kind: "choice",
      prompt: text("choice.code.purpose.sum", { n }),
      scene: { kind: "code", lines: [line(0, "code.set", { v: "s", n: 0 }), line(0, "code.for", { v: "i", a: 1, b: n }), MISSING(1), line(0, "code.print", { v: "s" })] },
      ...shuffledOptions(rng, option("code.setOp", { v: "s", w: "s", op: "+", n: "i" }), [
        { option: option("code.setOp", { v: "s", w: "s", op: "+", n: 1 }), why: text("choice.code.whyCounts", { n }) },
        { option: option("code.set", { v: "s", n: "i" }), why: text("choice.code.whyOverwrites", { n }) },
        { option: option("code.setOp", { v: "i", w: "s", op: "+", n: "i" }), why: text("choice.code.whyWrongVariable") },
      ]),
      tip: text("choice.code.tipMissing"),
      explanation: text("choice.code.explainSum", { n, r: (n * (n + 1)) / 2 }),
    };
  }
  if (kind < 0.7) {
    // Doubling: 1, 2, 4, 8 … - times 2, not plus 2.
    const n = randInt(rng, 4, 6);
    const list = Array.from({ length: n }, (_, i) => 2 ** i).join(", ");
    return {
      stageId: "3.9.2",
      kind: "choice",
      prompt: text("choice.code.purpose.double", { list }),
      scene: { kind: "code", lines: [line(0, "code.set", { v: "x", n: 1 }), line(0, "code.repeat", { n }), line(1, "code.print", { v: "x" }), MISSING(1)] },
      ...shuffledOptions(rng, option("code.setOp", { v: "x", w: "x", op: "·", n: 2 }), [
        { option: option("code.setOp", { v: "x", w: "x", op: "+", n: 2 }), why: text("choice.code.whyPlusTwo") },
        { option: option("code.set", { v: "x", n: 2 }), why: text("choice.code.whySetTwo") },
        { option: option("code.setOp", { v: "x", w: "x", op: "·", n: "x" }), why: text("choice.code.whySquare") },
      ]),
      tip: text("choice.code.tipMissing"),
      explanation: text("choice.code.explainMissingDouble"),
    };
  }
  // Counting the even numbers: the condition is on i, not on the counter.
  const n = randInt(rng, 6, 12);
  const v = "@code.var.counter";
  return {
    stageId: "3.9.2",
    kind: "choice",
    prompt: text("choice.code.purpose.count", { n }),
    scene: {
      kind: "code",
      lines: [line(0, "code.set", { v, n: 0 }), line(0, "code.for", { v: "i", a: 1, b: n }), MISSING(1), line(2, "code.setOp", { v, w: v, op: "+", n: 1 }), line(0, "code.print", { v })],
    },
    ...shuffledOptions(rng, option("code.ifEven", { v: "i" }), [
      { option: option("code.ifEven", { v }), why: text("choice.code.whyCounterEven") },
      { option: option("code.ifGreater", { v: "i", n: 2 }), why: text("choice.code.whyGreater") },
      { option: option("code.repeat", { n: 2 }), why: text("choice.code.whyRepeatTwice") },
    ]),
    tip: text("choice.code.tipMissing"),
    explanation: text("choice.code.explainCount", { n, r: Math.floor(n / 2) }),
  };
}

export const CODE_CHOICES: Record<CodeChoiceStageId, (rng: Rng) => ChoiceProblem> = {
  "2.19.3": conditions,
  "3.9.1": variablesAndLoops,
  "3.9.2": missingLine,
};
