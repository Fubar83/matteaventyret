/**
 * Putting things in order:
 *
 *   förskoleklass 0.1.5 färst till flest: groups of things, by how many
 *   åk 1-3        1.8.6 storleksordna tal: 93, 309, 390, 903 - the same digits in other places
 *   åk 4-6        2.16.4 bråk, decimaltal och procent: 1/4, 0,3, 35 %, 1/2
 *                 2.17.2 negativa tal: −10 is less than −2
 *                 2.9.8 längder i olika enheter: 95 cm, 1 050 mm, 11 dm, 1,2 m
 *                 1.11.3 från omöjligt till säkert: what can be drawn from a bag
 *   åk 7-9        3.1.6 grundpotensform: 9 · 10³ is less than 2 · 10⁴
 *                 3.9.3 ordna programmet: its lines in an order that prints the number asked
 *                 3.3.12 ordna lösningen: an equation's steps, from the equation to x
 *
 * The things are chosen so the slip gives the wrong order: the longer number
 * isn't always the bigger, −10 isn't bigger than −2, the mantissa doesn't
 * decide before the power.
 */
import { pick, randInt, shuffle, type Rng } from "../../rng";
import { CHANCE_COLORS, GROUP_THINGS, type CodeLine, type QuestionScene } from "../scene";
import { tex } from "../written/problem";
import { linearExpression } from "../choice/functions";
import { fractionOption, numberOption, plainOption, text, textOption, type ChoiceOption } from "../choice/problem";
import type { SortOrderProblem } from "./problem";

export type SortOrderStageId = "0.1.5" | "1.8.6" | "2.16.4" | "2.17.2" | "2.9.8" | "3.1.6" | "1.11.3" | "3.9.3" | "3.3.12";

/** A thing, its value, and how it's written in a sentence. */
interface Valued {
  item: ChoiceOption;
  value: number;
  say: string;
}

/** The things shuffled for the tray; the answer is their order by value (biggest first when `down`). */
function ordered(rng: Rng, things: Valued[], down: boolean): Pick<SortOrderProblem, "items" | "answer"> & { list: string } {
  if (new Set(things.map((t) => t.value)).size !== things.length) throw new Error("sort: two things of the same value");
  const tray = shuffle(rng, things);
  const answer = tray.map((_, i) => i).sort((a, b) => (down ? tray[b].value - tray[a].value : tray[a].value - tray[b].value));
  return { items: tray.map((t) => t.item), answer, list: answer.map((i) => tray[i].say).join(down ? " > " : " < ") };
}

/** A number the Swedish way: −3, 1,2, and a space in the thousands (1 300). */
const sv = (n: number) => (n < 0 ? `−${-n}` : String(n)).replace(".", ",").replace(/^(\D?\d+)(\d{3})\b/, "$1 $2");
const ends = (down: boolean): SortOrderProblem["ends"] => (down ? [text("sort.end.biggest"), text("sort.end.smallest")] : [text("sort.end.smallest"), text("sort.end.biggest")]);

/** 0.1.5: groups of things, from the fewest to the most. */
function fewestToMost(rng: Rng): SortOrderProblem {
  const counts = shuffle(rng, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]).slice(0, randInt(rng, 3, 4));
  const things: Valued[] = counts.map((n) => ({ item: { scene: { kind: "count", groups: [{ thing: pick(rng, GROUP_THINGS), n }] } satisfies QuestionScene }, value: n, say: String(n) }));
  const { list, ...rest } = ordered(rng, things, false);
  return {
    stageId: "0.1.5",
    kind: "sortOrder",
    prompt: text("sort.fewest.prompt"),
    ...rest,
    ends: [text("sort.end.fewest"), text("sort.end.most")],
    tip: text("sort.fewest.tip"),
    explanation: text("sort.order.explain", { list }),
  };
}

/** 1.8.6: numbers made of the same digits - place value decides, not which digits. */
function orderNumbers(rng: Rng): SortOrderProblem {
  const digits = shuffle(rng, [1, 2, 3, 4, 5, 6, 7, 8, 9, 0]).slice(0, 3);
  const made = new Set<number>();
  for (const [a, b, c] of [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]]) made.add(Number(`${digits[a]}${digits[b]}${digits[c]}`));
  // A two-digit one too: 93 against 309.
  made.add(Number(`${digits[0]}${digits[1]}`));
  const values = shuffle(rng, [...made].filter((n) => n > 0)).slice(0, randInt(rng, 4, 5));
  const down = rng() < 0.3;
  const { list, ...rest } = ordered(rng, values.map((n) => ({ item: numberOption(n), value: n, say: String(n) })), down);
  return {
    stageId: "1.8.6",
    kind: "sortOrder",
    prompt: text(down ? "sort.numbers.promptDown" : "sort.numbers.prompt"),
    ...rest,
    ends: ends(down),
    tip: text("sort.numbers.tip"),
    explanation: text("sort.order.explain", { list }),
  };
}

/** Values that read well as a fraction, a decimal or a percent. */
const PARTS: [number, number][] = [
  [1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 10], [3, 10], [7, 10], [9, 10], [1, 20], [3, 20], [9, 20], [1, 8], [3, 8],
];

/** 2.16.4: fractions, decimals and percent together - each written one of the three ways. */
function mixedForms(rng: Rng): SortOrderProblem {
  const chosen = shuffle(rng, PARTS).slice(0, 4);
  const forms = shuffle(rng, ["fraction", "decimal", "percent", pick(rng, ["fraction", "decimal", "percent"])] as const);
  const things: Valued[] = chosen.map(([s, p], i) => {
    const v = s / p;
    const form = forms[i];
    if (form === "fraction") return { item: fractionOption(s, p), value: v, say: `${s}/${p}` };
    if (form === "decimal") return { item: numberOption(v), value: v, say: sv(v) };
    return { item: { latex: `${tex(v * 100)}\\,\\%` }, value: v, say: `${sv(v * 100)} %` };
  });
  const { list, ...rest } = ordered(rng, things, false);
  return {
    stageId: "2.16.4",
    kind: "sortOrder",
    prompt: text("sort.forms.prompt"),
    ...rest,
    ends: ends(false),
    tip: text("sort.forms.tip"),
    explanation: text("sort.order.explain", { list }),
  };
}

/** 2.17.2: negative numbers - the further below zero, the smaller. */
function negatives(rng: Rng): SortOrderProblem {
  const values = new Set<number>();
  while (values.size < 2) values.add(-randInt(rng, 1, 15));
  while (values.size < 5) values.add(randInt(rng, -15, 12));
  const down = rng() < 0.3;
  const { list, ...rest } = ordered(rng, [...values].map((n) => ({ item: numberOption(n), value: n, say: sv(n) })), down);
  return {
    stageId: "2.17.2",
    kind: "sortOrder",
    prompt: text(down ? "sort.negative.promptDown" : "sort.negative.prompt"),
    ...rest,
    ends: ends(down),
    tip: text("sort.negative.tip"),
    explanation: text("sort.order.explain", { list }),
  };
}

/** Millimetres in each unit. Lengths are whole centimetres, so each unit writes them with two decimals at most. */
const UNITS = [
  ["m", 1000],
  ["dm", 100],
  ["cm", 10],
  ["mm", 1],
] as const;

/** 2.9.8: lengths in different units - change them to the same unit first. */
function mixedUnits(rng: Rng): SortOrderProblem {
  const mm = new Set<number>();
  // Close together around a metre, so the unit can't be guessed from the number.
  while (mm.size < 4) mm.add(10 * randInt(rng, 85, 130));
  // Each in a unit of its own.
  const units = shuffle(rng, UNITS);
  const things: Valued[] = [...mm].map((n, i) => {
    const [unit, f] = units[i];
    const say = `${sv(n / f)} ${unit}`;
    return { item: plainOption(say), value: n, say };
  });
  const { list, ...rest } = ordered(rng, things, false);
  return {
    stageId: "2.9.8",
    kind: "sortOrder",
    prompt: text("sort.units.prompt"),
    ...rest,
    ends: [text("sort.end.shortest"), text("sort.end.longest")],
    tip: text("sort.units.tip"),
    explanation: text("sort.order.explain", { list }),
  };
}

/** 3.1.6: numbers in grundpotensform (and one or two written out) - the power first, then the number before it. */
function standardForm(rng: Rng): SortOrderProblem {
  const values = new Map<number, [number, number]>();
  while (values.size < 4) {
    const a = pick(rng, [1.2, 1.5, 2, 2.5, 3, 4, 5, 7.5, 8, 9]);
    const k = randInt(rng, 3, 6);
    values.set(Math.round(a * 10 ** k), [a, k]);
  }
  const things: Valued[] = [...values].map(([v, [a, k]]) => {
    const written = rng() < 0.3;
    // Written out with a thin space for the thousands: 40 000.
    const out = String(v).replace(/\B(?=(\d{3})+(?!\d))/g, "\\,");
    return written
      ? { item: { latex: out }, value: v, say: String(v).replace(/\B(?=(\d{3})+(?!\d))/g, " ") }
      : { item: { latex: `${tex(a)} \\cdot 10^{${k}}` }, value: v, say: `${sv(a)} · 10^${k}` };
  });
  const { list, ...rest } = ordered(rng, things, false);
  return {
    stageId: "3.1.6",
    kind: "sortOrder",
    prompt: text("sort.power.prompt"),
    ...rest,
    ends: ends(false),
    tip: text("sort.power.tip"),
    explanation: text("sort.order.explain", { list }),
  };
}

/** 1.11.3: what can be drawn from a bag, from impossible to certain. */
function impossibleToCertain(rng: Rng): SortOrderProblem {
  const [many, few, none] = shuffle(rng, CHANCE_COLORS).slice(0, 3);
  const [m, f] = [randInt(rng, 5, 7), randInt(rng, 1, 3)];
  const event = (key: string, vars: Record<string, string>, value: number) => ({ item: textOption(key, vars), value, say: "" });
  const things = [
    event("sort.event.color", { color: `@color.${none}` }, 0),
    event("sort.event.color", { color: `@color.${few}` }, f),
    event("sort.event.color", { color: `@color.${many}` }, m),
    event("sort.event.either", { a: `@color.${many}`, b: `@color.${few}` }, m + f),
  ];
  const { list: _, ...rest } = ordered(rng, things, false);
  return {
    stageId: "1.11.3",
    kind: "sortOrder",
    prompt: text("sort.events.prompt"),
    scene: { kind: "chance", device: "bag", colors: [{ color: many, count: m }, { color: few, count: f }] },
    ...rest,
    ends: [text("sort.end.impossible"), text("sort.end.certain")],
    tip: text("sort.events.tip"),
    explanation: text("sort.events.explain", { none: `@color.${none}`, few: `@color.${few}`, many: `@color.${many}` }),
  };
}

const codeOption = (l: CodeLine): ChoiceOption => textOption(l.key, l.vars);

/** 3.9.3: a program's lines in order - each uses what the line before made, so only one order prints the number. */
function orderProgram(rng: Rng): SortOrderProblem {
  const a = randInt(rng, 2, 6);
  const b = randInt(rng, 2, 6);
  const sum = rng() < 0.5;
  // x = a; y = x + b; x = y · 2; print x - or s = 0; s = s + a; s = s · b; print s.
  const lines: CodeLine[] = sum
    ? [
        { indent: 0, key: "code.set", vars: { v: "x", n: a } },
        { indent: 0, key: "code.setOp", vars: { v: "y", w: "x", op: "+", n: b } },
        { indent: 0, key: "code.setOp", vars: { v: "x", w: "y", op: "·", n: 2 } },
        { indent: 0, key: "code.print", vars: { v: "x" } },
      ]
    : [
        { indent: 0, key: "code.set", vars: { v: "s", n: 1 } },
        { indent: 0, key: "code.setOp", vars: { v: "s", w: "s", op: "+", n: a } },
        { indent: 0, key: "code.setOp", vars: { v: "s", w: "s", op: "·", n: b } },
        { indent: 0, key: "code.print", vars: { v: "s" } },
      ];
  const r = sum ? (a + b) * 2 : (1 + a) * b;
  const { list: _, ...rest } = ordered(
    rng,
    lines.map((l, i) => ({ item: codeOption(l), value: i, say: "" })),
    false
  );
  return {
    stageId: "3.9.3",
    kind: "sortOrder",
    prompt: text("sort.program.prompt", { r }),
    ...rest,
    ends: [text("sort.end.first"), text("sort.end.last")],
    tip: text("sort.program.tip"),
    explanation: text("sort.program.explain", { r }),
  };
}

/** 3.3.12: an equation's solution, step by step - each step follows from the one before. */
function orderSolution(rng: Rng): SortOrderProblem {
  const x = randInt(rng, 2, 9);
  const a = randInt(rng, 2, 5);
  const b = randInt(rng, 1, 6);
  const brackets = rng() < 0.5;
  const steps = brackets
    ? [`${a}(x + ${b}) = ${a * (x + b)}`, `${a}x + ${a * b} = ${a * (x + b)}`, `${a}x = ${a * x}`, `x = ${x}`]
    : (() => {
        // At least 2x left after taking cx off: otherwise "x = …" would come twice.
        const c = randInt(rng, 1, Math.max(1, a - 2));
        const k = Math.max(2, a - c);
        const d = k * x + b;
        return [`${linearExpression(c + k, b)} = ${linearExpression(c, d)}`, `${linearExpression(k, b)} = ${d}`, `${linearExpression(k, 0)} = ${d - b}`, `x = ${x}`];
      })();
  const { list: _, ...rest } = ordered(
    rng,
    steps.map((s, i) => ({ item: { latex: s }, value: i, say: "" })),
    false
  );
  return {
    stageId: "3.3.12",
    kind: "sortOrder",
    prompt: text("sort.solution.prompt"),
    ...rest,
    ends: [text("sort.end.first"), text("sort.end.last")],
    tip: text("sort.solution.tip"),
    explanation: text("sort.solution.explain", { x }),
  };
}

export const SORT_ORDER: Record<SortOrderStageId, (rng: Rng) => SortOrderProblem> = {
  "0.1.5": fewestToMost,
  "1.8.6": orderNumbers,
  "2.16.4": mixedForms,
  "2.17.2": negatives,
  "2.9.8": mixedUnits,
  "3.1.6": standardForm,
  "1.11.3": impossibleToCertain,
  "3.9.3": orderProgram,
  "3.3.12": orderSolution,
};
