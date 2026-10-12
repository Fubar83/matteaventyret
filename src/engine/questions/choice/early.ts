/**
 * Förskoleklass - before åk 1, as single-choice questions with pictures:
 *
 *   0.1.1 räkna: how many apples? which picture shows six?
 *   0.1.2 fler eller färre: where are there more, fewer - or as many? how many more?
 *   0.1.3 före och efter: the number after 7, before 12, between 5 and 7
 *   0.1.4 ordningstal: who is third in the queue? which place has the frog?
 *   0.2.1 mönster: shapes repeating - which comes next?
 *   0.3.1 lägesord: what's under the ball, left of the cup, between the two?
 *   0.3.2 jämföra: the longest ribbon (not all start at the same place), the heavier thing on the balance
 *
 * Three options where a young child picks among them, and the wrong ones are
 * the slips: one counted twice, counted from the wrong end, over for under.
 */
import { pick, randInt, shuffle, type Rng } from "../../rng";
import { ANIMALS, CHANCE_COLORS, GROUP_THINGS, SHELF_THINGS, type PatternItem, type QuestionScene, type ShelfThing } from "../scene";
import { fixedOptions, numberOption, plainOption, shuffledOptions, text, textOption, type ChoiceOption, type ChoiceProblem, type Slip } from "./problem";

export type EarlyChoiceStageId = "0.1.1" | "0.1.2" | "0.1.3" | "0.1.4" | "0.2.1" | "0.3.1" | "0.3.2";

/** Close numbers as slips - counted one too many or too few - kept to what can be counted. */
function countSlips(n: number, why: Slip["why"]): Slip[] {
  return [n + 1, n - 1, n + 2, n - 2].filter((m) => m >= 1).map((m) => ({ option: numberOption(m), why }));
}

/** 0.1.1: count the things - or pick the picture with that many. */
function counting(rng: Rng): ChoiceProblem {
  const thing = pick(rng, GROUP_THINGS);
  const n = randInt(rng, 1, 10);
  if (n === 1 || rng() < 0.65) {
    return {
      stageId: "0.1.1",
      kind: "choice",
      prompt: text("choice.count.howMany", { thing: `@countThing.${thing}` }),
      scene: { kind: "count", groups: [{ thing, n }] },
      ...shuffledOptions(rng, numberOption(n), countSlips(n, text("choice.count.whyRecount")), 3),
      tip: text("choice.count.tip"),
      explanation: text("choice.count.explain", { n, thing: `@countThing.${thing}` }),
    };
  }
  const picture = (m: number): ChoiceOption => ({ scene: { kind: "count", groups: [{ thing, n: m }] } satisfies QuestionScene });
  const slips: Slip[] = [n + 1, n - 1, n + 2].filter((m) => m >= 1).map((m) => ({ option: picture(m), why: text("choice.count.whyPicture", { m }) }));
  return {
    stageId: "0.1.1",
    kind: "choice",
    prompt: text("choice.count.which", { n }),
    ...shuffledOptions(rng, picture(n), slips, 3),
    tip: text("choice.count.tip"),
    explanation: text("choice.count.explainWhich", { n }),
  };
}

/** 0.1.2: two groups - where are there more, or fewer, or just as many; and how many more. */
function moreOrFewer(rng: Rng): ChoiceProblem {
  const [ta, tb] = shuffle(rng, GROUP_THINGS).slice(0, 2);
  const a = randInt(rng, 1, 9);
  const b = rng() < 0.2 ? a : pick(rng, [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((m) => m !== a));
  const scene: QuestionScene = { kind: "count", groups: [{ thing: ta, n: a }, { thing: tb, n: b }] };
  if (a !== b && rng() < 0.3) {
    const d = Math.abs(a - b);
    return {
      stageId: "0.1.2",
      kind: "choice",
      prompt: text("choice.more.howManyMore", { more: a > b ? "A" : "B", fewer: a > b ? "B" : "A" }),
      scene,
      ...shuffledOptions(rng, numberOption(d), [
        { option: numberOption(Math.max(a, b)), why: text("choice.more.whyBigger") },
        ...countSlips(d, text("choice.more.whyPair")),
      ], 3),
      tip: text("choice.more.tipPair"),
      explanation: text("choice.more.explainHowMany", { a, b, d }),
    };
  }
  const fewer = rng() < 0.4;
  const correct = a === b ? 2 : (a > b) !== fewer ? 0 : 1;
  const why = text("choice.more.whyCount", { a, b });
  return {
    stageId: "0.1.2",
    kind: "choice",
    prompt: text(fewer ? "choice.more.fewer" : "choice.more.more"),
    scene,
    ...fixedOptions([plainOption("A"), plainOption("B"), textOption("choice.more.same")], correct, [why, why, text("choice.more.whyNotSame", { a, b })]),
    tip: text("choice.more.tip"),
    explanation: text(a === b ? "choice.more.explainSame" : "choice.more.explain", { a, b }),
  };
}

/** 0.1.3: the number after, before, or between - up to 20, on a number line to count along. */
function beforeAfter(rng: Rng): ChoiceProblem {
  const kind = pick(rng, ["after", "after", "before", "before", "between"] as const);
  const n = kind === "before" ? randInt(rng, 1, 20) : randInt(rng, 0, 19);
  const top = n >= 9 || kind === "between" ? 20 : 10;
  const line: QuestionScene = { kind: "numberLine", from: 0, to: top, step: 1, labelEvery: top === 10 ? 1 : 5, arrow: n };
  if (kind === "between") {
    const a = randInt(rng, 0, 18);
    return {
      stageId: "0.1.3",
      kind: "choice",
      prompt: text("choice.order.between", { a, b: a + 2 }),
      display: `${a} \\quad \\square \\quad ${a + 2}`,
      ...shuffledOptions(rng, numberOption(a + 1), [
        { option: numberOption(a + 3), why: text("choice.order.whyBetween", { a, b: a + 2 }) },
        ...(a > 0 ? [{ option: numberOption(a - 1), why: text("choice.order.whyBetween", { a, b: a + 2 }) }] : []),
        { option: numberOption(a + 4), why: text("choice.order.whyBetween", { a, b: a + 2 }) },
      ], 3),
      tip: text("choice.order.tip"),
      explanation: text("choice.order.explainBetween", { a, b: a + 2, m: a + 1 }),
    };
  }
  const after = kind === "after";
  const right = after ? n + 1 : n - 1;
  const wrongWay = after ? n - 1 : n + 1;
  return {
    stageId: "0.1.3",
    kind: "choice",
    prompt: text(after ? "choice.order.after" : "choice.order.before", { n }),
    display: after ? `${n} \\quad \\square` : `\\square \\quad ${n}`,
    scene: line,
    ...shuffledOptions(rng, numberOption(right), [
      ...(wrongWay >= 0 ? [{ option: numberOption(wrongWay), why: text(after ? "choice.order.whyBefore" : "choice.order.whyAfter", { n }) }] : []),
      { option: numberOption(n + 2), why: text("choice.order.whyTwo", { n }) },
      ...(n - 2 >= 0 ? [{ option: numberOption(n - 2), why: text("choice.order.whyTwo", { n }) }] : []),
      // At 0 the slips below it are gone: one more above.
      { option: numberOption(n + 3), why: text("choice.order.whyTwo", { n }) },
    ], 3),
    tip: text("choice.order.tip"),
    explanation: text(after ? "choice.order.explainAfter" : "choice.order.explainBefore", { n, m: right }),
  };
}

/** 0.1.4: ordinal numbers - who stands third in the queue, which place the frog has. Counted from the flag. */
function ordinals(rng: Rng): ChoiceProblem {
  const len = randInt(rng, 4, 6);
  const animals = shuffle(rng, ANIMALS).slice(0, len);
  const place = randInt(rng, 1, len);
  // Counted from the wrong end - the slip the flag is there to prevent.
  const fromEnd = len + 1 - place;
  const name = (i: number) => textOption(`animal.${animals[i - 1]}`);
  if (rng() < 0.55) {
    const slips: Slip[] = [];
    if (fromEnd !== place) slips.push({ option: name(fromEnd), why: text("choice.queue.whyEnd") });
    for (const p of [place - 1, place + 1]) if (p >= 1 && p <= len) slips.push({ option: name(p), why: text("choice.queue.whyRecount") });
    return {
      stageId: "0.1.4",
      kind: "choice",
      prompt: text("choice.queue.who", { ord: `@ordinal.${place}` }),
      scene: { kind: "queue", animals },
      ...shuffledOptions(rng, name(place), slips, 3),
      tip: text("choice.queue.tip"),
      explanation: text("choice.queue.explain", { animal: `@animal.${animals[place - 1]}`, ord: `@ordinal.${place}` }),
    };
  }
  const ord = (p: number) => textOption(`ordinal.${p}`);
  const slips: Slip[] = [];
  if (fromEnd !== place) slips.push({ option: ord(fromEnd), why: text("choice.queue.whyEnd") });
  for (const p of [place + 1, place - 1, place + 2]) if (p >= 1 && p <= 6) slips.push({ option: ord(p), why: text("choice.queue.whyRecount") });
  return {
    stageId: "0.1.4",
    kind: "choice",
    prompt: text("choice.queue.place", { animal: `@animal.${animals[place - 1]}` }),
    scene: { kind: "queue", animals },
    ...shuffledOptions(rng, ord(place), slips, 3),
    tip: text("choice.queue.tip"),
    explanation: text("choice.queue.explain", { animal: `@animal.${animals[place - 1]}`, ord: `@ordinal.${place}` }),
  };
}

const PATTERN_SHAPES: readonly PatternItem["shape"][] = ["circle", "square", "triangle", "star", "heart"];
/** The repeating units: AB, AAB, ABB, ABC, AABB. */
const UNITS = [[0, 1], [0, 0, 1], [0, 1, 1], [0, 1, 2], [0, 0, 1, 1]] as const;
const sameItem = (a: PatternItem, b: PatternItem) => a.shape === b.shape && a.color === b.color;

/** 0.2.1: a repeating pattern of shapes - which one comes next? */
function patterns(rng: Rng): ChoiceProblem {
  const unit = pick(rng, UNITS);
  const kinds = Math.max(...unit) + 1;
  // The items differ in shape, colour, or both.
  const by = pick(rng, ["shape", "color", "both"] as const);
  const shapes = shuffle(rng, PATTERN_SHAPES).slice(0, kinds);
  const colors = shuffle(rng, CHANCE_COLORS).slice(0, kinds);
  const fixedShape = shapes[0];
  const fixedColor = colors[0];
  const items: PatternItem[] = Array.from({ length: kinds }, (_, i) => ({
    shape: by === "color" ? fixedShape : shapes[i],
    color: by === "shape" ? fixedColor : colors[i],
  }));
  // Two to three rounds of the unit, stopping anywhere in it.
  const shown = randInt(rng, unit.length * 2, unit.length * 3 - 1);
  const row = Array.from({ length: shown }, (_, i) => items[unit[i % unit.length]]);
  const next = items[unit[shown % unit.length]];
  const picture = (item: PatternItem): ChoiceOption => ({ scene: { kind: "pattern", items: [item], blank: false } satisfies QuestionScene });
  const slips: Slip[] = items.filter((it) => !sameItem(it, next)).map((it) => ({ option: picture(it), why: text("choice.pattern.whyOther") }));
  // A shape that's never in the pattern - or the right shape in a colour it never has.
  const stranger: PatternItem =
    by === "color"
      ? { shape: fixedShape, color: CHANCE_COLORS.find((c) => !colors.includes(c)) ?? "green" }
      : { shape: PATTERN_SHAPES.find((s) => !shapes.includes(s))!, color: by === "shape" ? fixedColor : next.color };
  slips.push({ option: picture(stranger), why: text("choice.pattern.whyNever") });
  return {
    stageId: "0.2.1",
    kind: "choice",
    prompt: text("choice.pattern.next"),
    scene: { kind: "pattern", items: row, blank: true },
    ...shuffledOptions(rng, picture(next), slips, 3),
    tip: text("choice.pattern.tip"),
    explanation: text("choice.pattern.explain", { n: unit.length }),
  };
}

type Where = "under" | "over" | "left" | "right";
const STEP: Record<Where, [number, number]> = { under: [1, 0], over: [-1, 0], left: [0, -1], right: [0, 1] };
const OPPOSITE: Record<Where, Where> = { under: "over", over: "under", left: "right", right: "left" };

/** 0.3.1: position words - what is under the ball, to the left of the cup, between the two? */
function positions(rng: Rng): ChoiceProblem {
  // A 3 × 3 shelf, one or two places empty.
  const things = shuffle(rng, SHELF_THINGS);
  const empty = new Set(shuffle(rng, [0, 1, 2, 3, 4, 5, 6, 7, 8]).slice(0, randInt(rng, 1, 2)));
  const placed = things.slice(0, 9 - empty.size);
  let k = 0;
  const rows: (ShelfThing | null)[][] = [0, 1, 2].map((r) => [0, 1, 2].map((c) => (empty.has(r * 3 + c) ? null : placed[k++])));
  const at = (r: number, c: number) => (r >= 0 && r < 3 && c >= 0 && c < 3 ? rows[r][c] : null);
  const name = (x: ShelfThing) => textOption(`thing.${x}`);
  const scene: QuestionScene = { kind: "shelf", rows };
  const tip = text("choice.where.tip");

  // Between: a full row, the middle one asked.
  const fullRows = [0, 1, 2].filter((r) => rows[r].every((x) => x));
  if (fullRows.length > 0 && rng() < 0.25) {
    const r = pick(rng, fullRows);
    const [a, mid, b] = rows[r] as ShelfThing[];
    const above = at(r - 1, 1);
    const below = at(r + 1, 1);
    return {
      stageId: "0.3.1",
      kind: "choice",
      prompt: text("choice.where.between", { a: `@thing.${a}`, b: `@thing.${b}` }),
      scene,
      ...shuffledOptions(rng, name(mid), [
        ...[above, below].filter((x): x is ShelfThing => !!x).map((x) => ({ option: name(x), why: text("choice.where.whyNotBetween", { a: `@thing.${a}`, b: `@thing.${b}` }) })),
        { option: name(a), why: text("choice.where.whyEnd") },
        { option: name(b), why: text("choice.where.whyEnd") },
      ], 3),
      tip,
      explanation: text("choice.where.explainBetween", { x: `@thing.${mid}`, a: `@thing.${a}`, b: `@thing.${b}` }),
    };
  }

  // A thing and a direction with something there.
  const asks: { r: number; c: number; where: Where }[] = [];
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 3; c++)
      for (const where of ["under", "over", "left", "right"] as Where[]) if (rows[r][c] && at(r + STEP[where][0], c + STEP[where][1])) asks.push({ r, c, where });
  const { r, c, where } = pick(rng, asks);
  const anchor = rows[r][c]!;
  const right = at(r + STEP[where][0], c + STEP[where][1])!;
  const slips: Slip[] = [];
  const opposite = at(r + STEP[OPPOSITE[where]][0], c + STEP[OPPOSITE[where]][1]);
  if (opposite) slips.push({ option: name(opposite), why: text("choice.where.whyOpposite", { where: `@where.${OPPOSITE[where]}`, thing: `@thing.${anchor}` }) });
  for (const w of ["under", "over", "left", "right"] as Where[]) {
    const x = w === where || w === OPPOSITE[where] ? null : at(r + STEP[w][0], c + STEP[w][1]);
    if (x) slips.push({ option: name(x), why: text("choice.where.whyOpposite", { where: `@where.${w}`, thing: `@thing.${anchor}` }) });
  }
  slips.push(...placed.filter((x) => x !== anchor && x !== right).map((x) => ({ option: name(x), why: text("choice.where.whyLook", { where: `@where.${where}`, thing: `@thing.${anchor}` }) })));
  return {
    stageId: "0.3.1",
    kind: "choice",
    prompt: text("choice.where.what", { where: `@where.${where}`, thing: `@thing.${anchor}` }),
    scene,
    ...shuffledOptions(rng, name(right), slips, 3),
    tip,
    explanation: text("choice.where.explain", { x: `@thing.${right}`, where: `@where.${where}`, thing: `@thing.${anchor}` }),
  };
}

const LETTERS = ["A", "B", "C"];
const WEIGH_THINGS: readonly ShelfThing[] = ["ball", "teddy", "book", "cup", "car", "apple", "melon", "clock"];

/** 0.3.2: compare - the longest or shortest ribbon (counted in squares, not by where it ends), the heavier thing on the balance. */
function compare(rng: Rng): ChoiceProblem {
  if (rng() < 0.6) {
    const lengths = shuffle(rng, [3, 4, 5, 6, 7, 8, 9]).slice(0, 3);
    const aligned = rng() < 0.4;
    // Not lined up: the longest doesn't reach furthest - the slip to catch.
    const starts = aligned ? [0, 0, 0] : lengths.map((l) => (l === Math.max(...lengths) ? 0 : randInt(rng, 1, 10 - l)));
    const colors = shuffle(rng, CHANCE_COLORS).slice(0, 3);
    const ribbons = lengths.map((length, i) => ({ letter: LETTERS[i], start: starts[i], length, color: colors[i] }));
    const shortest = rng() < 0.35;
    const want = shortest ? Math.min(...lengths) : Math.max(...lengths);
    const correct = lengths.indexOf(want);
    return {
      stageId: "0.3.2",
      kind: "choice",
      prompt: text(shortest ? "choice.ribbon.shortest" : "choice.ribbon.longest"),
      scene: { kind: "lengths", ribbons },
      ...fixedOptions(
        LETTERS.map((l) => plainOption(l)),
        correct,
        ribbons.map((r) => text("choice.ribbon.whyLength", { letter: r.letter, n: r.length }))
      ),
      tip: text(aligned ? "choice.ribbon.tip" : "choice.ribbon.tipStart"),
      explanation: text("choice.ribbon.explain", { letter: LETTERS[correct], n: want }),
    };
  }
  const [left, right] = shuffle(rng, WEIGH_THINGS).slice(0, 2);
  const heavier = pick(rng, ["left", "right", "left", "right", "same"] as const);
  const lightest = rng() < 0.4;
  const correct = heavier === "same" ? 2 : (heavier === "left") !== lightest ? 0 : 1;
  const tilt = text("choice.weigh.whyTilt");
  return {
    stageId: "0.3.2",
    kind: "choice",
    prompt: text(lightest ? "choice.weigh.lightest" : "choice.weigh.heaviest"),
    scene: { kind: "weigh", left, right, heavier },
    ...fixedOptions([textOption(`thing.${left}`), textOption(`thing.${right}`), textOption("choice.weigh.same")], correct, [tilt, tilt, text("choice.weigh.whyNotSame")]),
    tip: text("choice.weigh.tip"),
    explanation:
      heavier === "same"
        ? text("choice.weigh.explainSame")
        : text("choice.weigh.explain", { heavy: `@thing.${heavier === "left" ? left : right}`, light: `@thing.${heavier === "left" ? right : left}` }),
  };
}

export const EARLY_CHOICES: Record<EarlyChoiceStageId, (rng: Rng) => ChoiceProblem> = {
  "0.1.1": counting,
  "0.1.2": moreOrFewer,
  "0.1.3": beforeAfter,
  "0.1.4": ordinals,
  "0.2.1": patterns,
  "0.3.1": positions,
  "0.3.2": compare,
};
