/**
 * The rest of åk 1-6 (Lgr22's central content) that the column methods and
 * the national-test topics don't cover - each with a guided step plan and
 * checked like every other written question (mathinput/workCheck.ts):
 *
 *   åk 1-3  1.4.1 gångertabellen, 1.4.2 division (dela lika), 1.4.3 vilket tal saknas?
 *           1.5.1 klockan, 1.5.2 hur lång tid?, 1.6.1 pengar
 *           1.2.2 hörn, sidor och kanter
 *   åk 4-6  2.12.1 vinklar (90°, 180°, 360°), 2.13.1 koordinatsystem
 *           2.14.1 ekvationer med ett obekant tal, 2.15.1 delbarhet och primtal
 *           2.10.3 överslag, 2.9.4 areaenheter, 2.9.5 tidsskillnader
 *
 * Times are written the Swedish way, hours and minutes with a point: 3.30,
 * 15.05 - read as the number 3,3 or 15,05, which is all an answer needs to be.
 */
import { st, tex, type AdvancedProblem, type AnswerSpec, type SolutionStep } from "./advanced";
import type { ClockSpec } from "./clock";
import { GROUP_THINGS, type QuestionScene, type ScaleTerm } from "./questionScene";
import type { Figure, FigureLabel, FigureShape, Point } from "./geometry";
import { randInt, type Rng } from "./rng";

export type BasicStageId =
  | "1.4.1"
  | "1.4.2"
  | "1.4.3"
  | "1.5.2"
  | "1.6.1"
  | "1.2.2"
  | "2.12.1"
  | "2.13.1"
  | "2.14.1"
  | "2.15.1"
  | "2.10.3"
  | "2.9.4"
  | "2.9.5";

const pick = <T>(rng: Rng, items: readonly T[]): T => items[randInt(rng, 0, items.length - 1)];
const dec = (n: number) => Math.round(n * 1e6) / 1e6;
/** A clock time the Swedish way: 9.05, 15.30. */
const clock = (h: number, m: number) => `${h}.${String(m).padStart(2, "0")}`;
/** The same as the number an answer is: 9.05 → 9,05. */
const clockValue = (h: number, m: number) => dec(h + m / 100);

interface Spec {
  promptKey: string;
  promptVars?: Record<string, string | number>;
  display?: string;
  answer: AnswerSpec;
  steps: SolutionStep[];
  figure?: Figure;
  clock?: ClockSpec;
  scene?: QuestionScene;
  unit?: string;
  answerOnly?: { choices: number[] };
}

function make(stageId: BasicStageId, s: Spec): AdvancedProblem {
  return {
    stageId,
    kind: "expression",
    promptKey: s.promptKey,
    promptVars: s.promptVars,
    display: s.display ?? "",
    answer: s.answer,
    tipKey: `basic.tip.${stageId}`,
    firstStep: s.steps[0].line,
    solution: s.steps.map((x) => x.line),
    steps: s.steps,
    ...(s.figure ? { figure: s.figure } : {}),
    ...(s.clock ? { clock: s.clock } : {}),
    ...(s.scene ? { scene: s.scene } : {}),
    ...(s.unit ? { unit: s.unit } : {}),
    ...(s.answerOnly ? { answerOnly: s.answerOnly } : {}),
  };
}

const value = (v: number): AnswerSpec => ({ kind: "value", value: v });

// --- Åk 1-3: tabeller och saknade tal -----------------------------------------------

/** 7 · 8: a fact from the tables 2-10. */
/**
 * What a times-table question offers besides a · b: the slips children make -
 * the next or the previous fact in either table (7 · 9 or 6 · 8 for 7 · 8),
 * then the sum. Three of them, all different, shuffled in with the answer.
 */
export function tableChoices(rng: Rng, a: number, b: number): number[] {
  const right = a * b;
  const slips = [a * (b + 1), (a + 1) * b, a * (b - 1), (a - 1) * b, a + b, right + 10, right - 10, right + 1, right - 1];
  const wrong: number[] = [];
  for (const n of slips) if (wrong.length < 3 && n > 0 && n !== right && !wrong.includes(n)) wrong.push(n);
  const all = [right, ...wrong];
  for (let i = all.length - 1; i > 0; i--) {
    const j = randInt(rng, 0, i);
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}

/** Gångertabellen: just the answer - picked or written (see answerOnly); the groups picture is there to count on. */
function timesTables(rng: Rng): AdvancedProblem {
  const a = randInt(rng, 2, 10);
  const b = randInt(rng, 2, 10);
  const answerOnly = { choices: tableChoices(rng, a, b) };
  if (rng() < 0.3) {
    // In words: groups of things.
    return make("1.4.1", {
      promptKey: "basic.prompt.groups",
      promptVars: { a, b },
      answer: value(a * b),
      scene: { kind: "groups", groups: a, each: b, thing: "cookies" },
      steps: [st("step.basic.groups", `${a} \\cdot ${b} = ${a * b}`, { a, b })],
      answerOnly,
    });
  }
  return make("1.4.1", {
    promptKey: "basic.prompt.calc",
    display: `${a} \\cdot ${b}`,
    answer: value(a * b),
    scene: { kind: "groups", groups: a, each: b, thing: pick(rng, GROUP_THINGS) },
    steps: [st("step.basic.table", `${a} \\cdot ${b} = ${a * b}`, { a, b })],
    answerOnly,
  });
}

/** 56 / 8: division as the table backwards - or sharing equally. */
function divisionFacts(rng: Rng): AdvancedProblem {
  const b = randInt(rng, 2, 10);
  const q = randInt(rng, 2, 10);
  const a = b * q;
  if (rng() < 0.4) {
    return make("1.4.2", {
      promptKey: "basic.prompt.share",
      promptVars: { a, b },
      answer: value(q),
      scene: { kind: "share", total: a, among: b, thing: "cookies" },
      steps: [st("step.basic.share", `${a} / ${b} = ${q}`, { a, b })],
    });
  }
  return make("1.4.2", {
    promptKey: "basic.prompt.calc",
    display: `${a} / ${b}`,
    answer: value(q),
    scene: { kind: "share", total: a, among: b, thing: pick(rng, GROUP_THINGS) },
    steps: [st("step.basic.divideTable", `${a} / ${b} = ${q}`, { a, b })],
  });
}

const UNKNOWN_BOX: ScaleTerm = { kind: "unknown", label: "?" };
const UNKNOWN_X: ScaleTerm = { kind: "unknown", label: "x" };
const w = (value: number): ScaleTerm => ({ kind: "weight", value });
const balance = (left: ScaleTerm[], right: ScaleTerm[]): QuestionScene => ({ kind: "balance", left, right });

/** □ + 7 = 15, 20 − □ = 12, □ · 4 = 24: the missing number, found by counting back. */
function missingNumber(rng: Rng): AdvancedProblem {
  const kind = pick(rng, ["addFirst", "addSecond", "subSecond", "subFirst", "times"] as const);
  const box = "\\square";
  if (kind === "times") {
    const b = randInt(rng, 2, 9);
    const x = randInt(rng, 2, 9);
    return make("1.4.3", {
      promptKey: "basic.prompt.missing",
      display: `${box} \\cdot ${b} = ${x * b}`,
      answer: value(x),
      scene: balance(Array.from({ length: b }, () => UNKNOWN_BOX), [w(x * b)]),
      steps: [st("step.basic.missingTimes", `${x * b} / ${b} = ${x}`, { b, c: x * b })],
    });
  }
  const a = randInt(rng, 2, 40);
  const b = randInt(rng, 2, 40);
  const c = a + b;
  if (kind === "addFirst")
    return make("1.4.3", { promptKey: "basic.prompt.missing", display: `${box} + ${b} = ${c}`, answer: value(a), scene: balance([UNKNOWN_BOX, w(b)], [w(c)]), steps: [st("step.basic.missingAdd", `${c} - ${b} = ${a}`, { b, c })] });
  if (kind === "addSecond")
    return make("1.4.3", { promptKey: "basic.prompt.missing", display: `${a} + ${box} = ${c}`, answer: value(b), scene: balance([w(a), UNKNOWN_BOX], [w(c)]), steps: [st("step.basic.missingAdd", `${c} - ${a} = ${b}`, { b: a, c })] });
  // c − □ = a: what was taken away is the difference.
  if (kind === "subSecond") return make("1.4.3", { promptKey: "basic.prompt.missing", display: `${c} - ${box} = ${a}`, answer: value(b), steps: [st("step.basic.missingTakeAway", `${c} - ${a} = ${b}`, { c, a })] });
  return make("1.4.3", { promptKey: "basic.prompt.missing", display: `${box} - ${b} = ${a}`, answer: value(c), steps: [st("step.basic.missingStart", `${a} + ${b} = ${c}`, { a, b })] });
}

// --- Åk 1-3: klockan och pengar -----------------------------------------------------

/** How long from one time to another, in minutes: to the whole hour, the whole hours, and what's left - added up. */
function spanSteps(h1: number, m1: number, h2: number, m2: number): SolutionStep[] {
  if (h1 === h2) return [st("step.basic.spanSameHour", `${m2} - ${m1} = ${m2 - m1}`, { from: clock(h1, m1), to: clock(h2, m2) })];
  const toHour = m1 === 0 ? 0 : 60 - m1;
  const nextHour = m1 === 0 ? h1 : h1 + 1;
  const hours = h2 - nextHour;
  const steps: SolutionStep[] = [];
  if (toHour > 0) steps.push(st("step.basic.spanToHour", `60 - ${m1} = ${toHour}`, { from: clock(h1, m1), hour: clock(nextHour, 0) }));
  if (hours > 0) steps.push(st("step.basic.spanHours", `${hours} \\cdot 60 = ${hours * 60}`, { from: clock(nextHour, 0), to: clock(h2, 0), n: hours }));
  const parts = [toHour, hours * 60, m2].filter((x) => x > 0);
  if (parts.length > 1) steps.push(st("step.basic.spanAdd", `${parts.join(" + ")} = ${parts.reduce((a, b) => a + b, 0)}`, { to: clock(h2, m2), m: m2 }));
  else if (steps.length === 0) steps.push(st("step.basic.spanAdd", `${parts[0]}`, { to: clock(h2, m2), m: m2 }));
  return steps;
}

/** Hur lång tid? Within a day, whole and half hours and quarters (åk 3). */
function duration(rng: Rng): AdvancedProblem {
  const h1 = randInt(rng, 7, 16);
  const m1 = pick(rng, [0, 30, 15, 0, 30, 45]);
  const length = pick(rng, [15, 30, 45, 60, 90, 120, 75, 105]);
  const end = h1 * 60 + m1 + length;
  const [h2, m2] = [Math.floor(end / 60), end % 60];
  const what = pick(rng, ["lesson", "film", "match", "trip"] as const);
  return make("1.5.2", {
    promptKey: `basic.prompt.duration.${what}`,
    promptVars: { start: clock(h1, m1), end: clock(h2, m2) },
    answer: value(length),
    unit: "min",
    steps: spanSteps(h1, m1, h2, m2),
  });
}

/** Pengar: counting what's in the wallet, or how many coins make a sum. */
function money(rng: Rng): AdvancedProblem {
  if (rng() < 0.65) {
    const kinds = [100, 50, 20, 10, 5, 2, 1];
    const chosen = kinds.filter(() => rng() < 0.5).slice(0, 4);
    if (chosen.length < 2) chosen.push(10, 1);
    const items = chosen.flatMap((k) => Array.from({ length: k >= 20 ? randInt(rng, 1, 2) : randInt(rng, 1, 3) }, () => k)).sort((a, b) => b - a);
    const sum = items.reduce((a, b) => a + b, 0);
    return make("1.6.1", {
      promptKey: "basic.prompt.wallet",
      promptVars: { list: items.map((k) => `${k} kr`).join(", ") },
      answer: value(sum),
      unit: "kr",
      steps: [st("step.basic.wallet", `${items.join(" + ")} = ${sum}`)],
    });
  }
  const coin = pick(rng, [2, 5, 10, 20]);
  const n = randInt(rng, 3, 10);
  return make("1.6.1", { promptKey: "basic.prompt.howManyCoins", promptVars: { coin, sum: coin * n }, answer: value(n), steps: [st("step.basic.howManyCoins", `${coin * n} / ${coin} = ${n}`, { coin })] });
}

// --- Åk 1-3: former -----------------------------------------------------------------

type ShapeName = "triangle" | "square" | "rectangle" | "pentagon" | "hexagon" | "cube" | "box" | "pyramid";

/** A regular polygon of n corners, pointing up. */
function polygon(n: number, r = 3): Point[] {
  return Array.from({ length: n }, (_, i) => [r * Math.sin((2 * Math.PI * i) / n), -r * Math.cos((2 * Math.PI * i) / n)] as Point);
}

/** A box drawn the way it's drawn on paper: front, back shifted up and right, joined at the corners; hidden edges dashed. */
function boxFigure(w: number, h: number, d: number): Figure {
  const front: Point[] = [[0, h], [w, h], [w, 0], [0, 0]];
  const back = front.map(([x, y]) => [x + d, y - d] as Point);
  const shapes: FigureShape[] = [{ kind: "polygon", points: front, fill: "plain" }];
  // The back's edges: the bottom-left corner's three are hidden.
  for (let i = 0; i < 4; i++) {
    const hidden = i === 0 || i === 3;
    shapes.push({ kind: "segment", from: back[i], to: back[(i + 1) % 4], ...(hidden ? { dashed: true } : {}) });
    shapes.push({ kind: "segment", from: front[i], to: back[i], ...(i === 0 ? { dashed: true } : {}) });
  }
  return { shapes, labels: [] };
}

function pyramidFigure(): Figure {
  const base: Point[] = [[0, 4], [4, 4], [5.5, 3], [1.5, 3]];
  const top: Point = [2.75, -1];
  const shapes: FigureShape[] = [];
  base.forEach((p, i) => shapes.push({ kind: "segment", from: p, to: base[(i + 1) % 4], ...(i >= 2 ? { dashed: true } : {}) }));
  base.forEach((p, i) => shapes.push({ kind: "segment", from: p, to: top, ...(i === 3 ? { dashed: true } : {}) }));
  return { shapes, labels: [] };
}

/** Hörn, sidor, kanter, sidoytor: counted on a shape that's drawn. */
function shapes(rng: Rng): AdvancedProblem {
  const shape = pick(rng, ["triangle", "square", "rectangle", "pentagon", "hexagon", "cube", "box", "pyramid", "cube", "box"] as ShapeName[]);
  const flat = shape === "triangle" || shape === "square" || shape === "rectangle" || shape === "pentagon" || shape === "hexagon";
  if (flat) {
    const n = { triangle: 3, square: 4, rectangle: 4, pentagon: 5, hexagon: 6 }[shape];
    const pts = shape === "rectangle" ? ([[0, 0], [6, 0], [6, 3], [0, 3]] as Point[]) : shape === "square" ? ([[0, 0], [4, 0], [4, 4], [0, 4]] as Point[]) : polygon(n);
    const prop = pick(rng, ["corners", "sides"] as const);
    return make("1.2.2", {
      promptKey: "basic.prompt.shapeCount",
      promptVars: { prop: `@shape.prop.${prop}`, shape: `@shape.name.${shape}` },
      figure: { shapes: [{ kind: "polygon", points: pts, fill: "asked" }], labels: [] },
      answer: value(n),
      steps: [st(`step.basic.count.${prop}`, `${n}`)],
    });
  }
  const prop = pick(rng, ["corners", "edges", "faces"] as const);
  const figure = shape === "pyramid" ? pyramidFigure() : shape === "cube" ? boxFigure(4, 4, 1.8) : boxFigure(6, 3, 1.8);
  // A box (and a cube): 4 on top, 4 at the bottom - and 4 edges standing up between them.
  const solid = shape === "pyramid" ? { corners: [4, 1], edges: [4, 4], faces: [1, 4] } : { corners: [4, 4], edges: [4, 4, 4], faces: [1, 1, 4] };
  const parts = solid[prop];
  const total = parts.reduce((a, b) => a + b, 0);
  return make("1.2.2", {
    promptKey: "basic.prompt.shapeCount",
    promptVars: { prop: `@shape.prop.${prop}`, shape: `@shape.name.${shape}` },
    figure,
    answer: value(total),
    steps: [st(`step.basic.solid.${shape === "pyramid" ? "pyramid" : "box"}.${prop}`, `${parts.join(" + ")} = ${total}`)],
  });
}

// --- Åk 4-6: vinklar och koordinater -----------------------------------------------

/** A triangle with the angles a (left) and b (right) at its base, drawn true to them; the third at the top. */
function triangleWithAngles(a: number, b: number): { points: [Point, Point, Point] } {
  const base = 8;
  const ta = Math.tan((a * Math.PI) / 180);
  const tb = Math.tan((b * Math.PI) / 180);
  const x = (base * tb) / (ta + tb);
  const y = x * ta;
  return { points: [[0, 0], [base, 0], [x, -y]] };
}

/** Vinklar: what's left of 90°, 180°, the triangle's 180° or the quadrilateral's 360°. */
function angles(rng: Rng): AdvancedProblem {
  const kind = pick(rng, ["triangle", "triangle", "right", "straight", "quad"] as const);
  if (kind === "triangle") {
    let a: number, b: number;
    do {
      a = 5 * randInt(rng, 6, 16);
      b = 5 * randInt(rng, 6, 16);
    } while (a + b > 150 || a + b === 90); // not 90: then the sum would already be the answer
    const x = 180 - a - b;
    const [A, B, C] = triangleWithAngles(a, b).points;
    const inside = (p: Point): Point => [p[0] + ((A[0] + B[0] + C[0]) / 3 - p[0]) * 0.32, p[1] + ((A[1] + B[1] + C[1]) / 3 - p[1]) * 0.32];
    return make("2.12.1", {
      promptKey: "basic.prompt.angleX",
      figure: {
        shapes: [
          { kind: "polygon", points: [A, B, C], fill: "plain" },
          { kind: "angle", at: A, a: B, b: C },
          { kind: "angle", at: B, a: C, b: A },
          { kind: "angle", at: C, a: A, b: B },
        ],
        labels: [
          { text: `${a}°`, at: inside(A), place: "center" },
          { text: `${b}°`, at: inside(B), place: "center" },
          { text: "x", at: inside(C), place: "center" },
        ],
      },
      answer: value(x),
      steps: [st("step.basic.angleSumKnown", `${a} + ${b} = ${a + b}`), st("step.basic.angleTriangle", `x = 180 - ${a + b} = ${x}`)],
    });
  }
  if (kind === "quad") {
    let ang: number[];
    do ang = [5 * randInt(rng, 14, 26), 5 * randInt(rng, 14, 26), 5 * randInt(rng, 12, 24)];
    while (360 - ang[0] - ang[1] - ang[2] < 50 || 360 - ang[0] - ang[1] - ang[2] > 150);
    const x = 360 - ang[0] - ang[1] - ang[2];
    const sum = ang[0] + ang[1] + ang[2];
    return make("2.12.1", {
      promptKey: "basic.prompt.angleQuad",
      promptVars: { a: ang[0], b: ang[1], c: ang[2] },
      answer: value(x),
      steps: [st("step.basic.angleSumKnown", `${ang[0]} + ${ang[1]} + ${ang[2]} = ${sum}`), st("step.basic.angleQuad", `x = 360 - ${sum} = ${x}`)],
    });
  }
  // A right angle split in two, or a straight line with a ray from it.
  const whole = kind === "right" ? 90 : 180;
  const a = kind === "right" ? 5 * randInt(rng, 2, 16) : 5 * randInt(rng, 4, 32);
  const x = whole - a;
  const O: Point = [0, 0];
  const ray = (deg: number, r = 5): Point => [r * Math.cos((deg * Math.PI) / 180), -r * Math.sin((deg * Math.PI) / 180)];
  const mid = (from: number, to: number): Point => ray((from + to) / 2, 2.2);
  const figure: Figure =
    kind === "right"
      ? {
          shapes: [
            { kind: "segment", from: O, to: ray(0) },
            { kind: "segment", from: O, to: ray(90) },
            { kind: "segment", from: O, to: ray(a) },
            { kind: "rightAngle", at: O, a: ray(0), b: ray(90) },
          ],
          labels: [
            { text: `${a}°`, at: mid(0, a), place: "center" },
            { text: "x", at: mid(a, 90), place: "center" },
          ],
        }
      : {
          shapes: [
            { kind: "segment", from: ray(180), to: ray(0) },
            { kind: "segment", from: O, to: ray(a) },
            { kind: "angle", at: O, a: ray(0), b: ray(a) },
            { kind: "angle", at: O, a: ray(a), b: ray(180) },
          ],
          labels: [
            { text: `${a}°`, at: mid(0, a), place: "center" },
            { text: "x", at: mid(a, 180), place: "center" },
          ],
        };
  return make("2.12.1", {
    promptKey: "basic.prompt.angleX",
    figure,
    answer: value(x),
    steps: [st(kind === "right" ? "step.basic.angleRight" : "step.basic.angleStraight", `x = ${whole} - ${a} = ${x}`)],
  });
}

/** A coordinate system 0-8 on both axes, a light grid, and the points to read. */
function grid(points: { name: string; at: [number, number] }[]): Figure {
  const N = 8;
  const P = (x: number, y: number): Point => [x, -y];
  const shapes: FigureShape[] = [];
  for (let i = 1; i <= N; i++) {
    shapes.push({ kind: "segment", from: P(i, 0), to: P(i, N), faint: true }, { kind: "segment", from: P(0, i), to: P(N, i), faint: true });
  }
  shapes.push({ kind: "segment", from: P(0, 0), to: P(N + 0.6, 0) }, { kind: "segment", from: P(0, 0), to: P(0, N + 0.6) });
  const labels: FigureLabel[] = [];
  for (let i = 1; i <= N; i++) labels.push({ text: String(i), at: P(i, 0), place: "below" }, { text: String(i), at: P(0, i), place: "left" });
  labels.push({ text: "x", at: P(N + 0.6, 0), place: "right" }, { text: "y", at: P(0, N + 0.6), place: "above" });
  for (const p of points) {
    shapes.push({ kind: "circle", center: P(...p.at), r: 0.16, fill: "asked" });
    labels.push({ text: p.name, at: P(...p.at), place: "right" });
  }
  return { shapes, labels };
}

/** Koordinatsystem: a point's x or y, or how far apart two points on a line are. */
function coordinates(rng: Rng): AdvancedProblem {
  const x = randInt(rng, 1, 8);
  const y = randInt(rng, 1, 8);
  const kind = pick(rng, ["x", "y", "x", "y", "distance"] as const);
  if (kind === "distance") {
    let x2 = randInt(rng, 1, 8);
    while (x2 === x) x2 = randInt(rng, 1, 8);
    const [a, b] = [Math.min(x, x2), Math.max(x, x2)];
    return make("2.13.1", {
      promptKey: "basic.prompt.coordDistance",
      figure: grid([
        { name: "A", at: [a, y] },
        { name: "B", at: [b, y] },
      ]),
      answer: value(b - a),
      steps: [st("step.basic.coordDistance", `${b} - ${a} = ${b - a}`, { a, b })],
    });
  }
  return make("2.13.1", {
    promptKey: `basic.prompt.coord.${kind}`,
    figure: grid([{ name: "A", at: [x, y] }]),
    answer: value(kind === "x" ? x : y),
    steps: [st(`step.basic.coord.${kind}`, `${kind === "x" ? x : y}`)],
  });
}

// --- Åk 4-6: ekvationer, delbarhet, överslag ----------------------------------------

/** x + 7 = 15, x − 4 = 9, 6x = 42, x / 3 = 5, 2x + 3 = 11: the unknown number, by doing the opposite. */
function simpleEquations(rng: Rng): AdvancedProblem {
  const kind = pick(rng, ["plus", "minus", "times", "divide", "twoStep"] as const);
  const x = randInt(rng, 2, 15);
  const a = randInt(rng, 2, 12);
  const sol = (display: string, solution: number, steps: SolutionStep[], scene?: QuestionScene) =>
    make("2.14.1", { promptKey: "basic.prompt.equation", display, answer: { kind: "solutions", variable: "x", values: [solution] }, steps, ...(scene ? { scene } : {}) });
  const xs = (n: number) => Array.from({ length: n }, () => UNKNOWN_X);
  if (kind === "plus") return sol(`x + ${a} = ${x + a}`, x, [st("step.basic.eqMinus", `x = ${x + a} - ${a} = ${x}`, { a })], balance([UNKNOWN_X, w(a)], [w(x + a)]));
  if (kind === "minus") return sol(`x - ${a} = ${x}`, x + a, [st("step.basic.eqPlus", `x = ${x} + ${a} = ${x + a}`, { a })]);
  if (kind === "times") return sol(`${a}x = ${a * x}`, x, [st("step.basic.eqDivide", `x = \\frac{${a * x}}{${a}} = ${x}`, { a })], balance(xs(a), [w(a * x)]));
  if (kind === "divide") return sol(`\\frac{x}{${a}} = ${x}`, x * a, [st("step.basic.eqTimes", `x = ${x} \\cdot ${a} = ${x * a}`, { a })]);
  const b = randInt(rng, 2, 5);
  return sol(
    `${b}x + ${a} = ${b * x + a}`,
    x,
    [st("step.basic.eqMinusFirst", `${b}x = ${b * x + a} - ${a} = ${b * x}`, { a }), st("step.basic.eqDivide", `x = \\frac{${b * x}}{${b}} = ${x}`, { a: b })],
    balance([...xs(b), w(a)], [w(b * x + a)])
  );
}

const isPrime = (n: number) => n > 1 && Array.from({ length: Math.floor(Math.sqrt(n)) - 1 }, (_, i) => i + 2).every((d) => n % d !== 0);
const smallestFactor = (n: number) => [2, 3, 5, 7, 11, 13].find((p) => n % p === 0) ?? n;

/** Delbarhet och primtal: the next prime, the biggest prime factor, the smallest number both go into. */
function primes(rng: Rng): AdvancedProblem {
  const kind = pick(rng, ["nextPrime", "factor", "lcm"] as const);
  if (kind === "nextPrime") {
    const n = randInt(rng, 10, 60);
    const steps: SolutionStep[] = [];
    let m = n + 1;
    // Each number tried that isn't a prime, shown split by its smallest factor.
    while (!isPrime(m)) {
      const p = smallestFactor(m);
      steps.push(st("step.basic.notPrime", `${m} = ${p} \\cdot ${m / p}`, { m, p }));
      m++;
    }
    steps.push(st("step.basic.isPrime", `${m}`, { m }));
    return make("2.15.1", { promptKey: "basic.prompt.nextPrime", promptVars: { n }, answer: value(m), steps });
  }
  if (kind === "factor") {
    // A number made of small primes, split one factor at a time.
    const fs = Array.from({ length: randInt(rng, 3, 4) }, () => pick(rng, [2, 2, 3, 3, 5, 7]));
    const n = fs.reduce((a, b) => a * b, 1);
    const steps: SolutionStep[] = [];
    let rest = n;
    while (!isPrime(rest)) {
      const p = smallestFactor(rest);
      steps.push(st("step.basic.factorOut", `${rest} = ${p} \\cdot ${rest / p}`, { p }));
      rest /= p;
    }
    const biggest = Math.max(...fs);
    steps.push(st("step.basic.biggestFactor", `${biggest}`));
    return make("2.15.1", { promptKey: "basic.prompt.biggestFactor", promptVars: { n }, answer: value(biggest), steps });
  }
  const [a, b] = pick(rng, [
    [4, 6],
    [6, 8],
    [3, 4],
    [4, 10],
    [6, 9],
    [5, 6],
    [8, 12],
    [3, 5],
    [6, 10],
  ] as const);
  const gcd = (x: number, y: number): number => (y === 0 ? x : gcd(y, x % y));
  const l = (a * b) / gcd(a, b);
  const k = l / b;
  return make("2.15.1", {
    promptKey: "basic.prompt.lcm",
    promptVars: { a, b },
    answer: value(l),
    steps: [st("step.basic.lcmTry", `${b} \\cdot ${k} = ${l}`, { a, b })],
  });
}

/** Överslag: round first, then work it out - a sum to hundreds, a product to tens, a shop's prices. */
function estimation(rng: Rng): AdvancedProblem {
  const kind = pick(rng, ["product", "sum", "prices"] as const);
  const r10 = (n: number) => Math.round(n / 10) * 10;
  const r100 = (n: number) => Math.round(n / 100) * 100;
  if (kind === "product") {
    let a: number, b: number;
    do {
      a = randInt(rng, 12, 98);
      b = randInt(rng, 12, 49);
    } while (a % 10 === 0 || b % 10 === 0 || a % 10 === 5 || b % 10 === 5);
    return make("2.10.3", {
      promptKey: "basic.prompt.estimateProduct",
      display: `${a} \\cdot ${b}`,
      answer: value(r10(a) * r10(b)),
      scene: { kind: "rounding", numbers: [{ value: a, step: 10 }, { value: b, step: 10 }] },
      steps: [st("step.basic.estimateRound", `${r10(a)} \\cdot ${r10(b)} = ${r10(a) * r10(b)}`, { a, b, ra: r10(a), rb: r10(b) })],
    });
  }
  if (kind === "sum") {
    let a: number, b: number;
    do {
      a = randInt(rng, 120, 880);
      b = randInt(rng, 120, 880);
    } while (a % 100 === 50 || b % 100 === 50);
    return make("2.10.3", {
      promptKey: "basic.prompt.estimateSum",
      display: `${a} + ${b}`,
      answer: value(r100(a) + r100(b)),
      scene: { kind: "rounding", numbers: [{ value: a, step: 100 }, { value: b, step: 100 }] },
      steps: [st("step.basic.estimateRound100", `${r100(a)} + ${r100(b)} = ${r100(a) + r100(b)}`, { a, b, ra: r100(a), rb: r100(b) })],
    });
  }
  const prices = Array.from({ length: 3 }, () => {
    let p: number;
    do p = randInt(rng, 11, 98);
    while (p % 10 === 5 || p % 10 === 0);
    return p;
  });
  const rounded = prices.map(r10);
  return make("2.10.3", {
    promptKey: "basic.prompt.estimatePrices",
    promptVars: { a: prices[0], b: prices[1], c: prices[2] },
    answer: value(rounded.reduce((s, x) => s + x, 0)),
    unit: "kr",
    steps: [st("step.basic.estimatePrices", `${rounded.join(" + ")} = ${rounded.reduce((s, x) => s + x, 0)}`)],
  });
}

// --- Åk 4-6: areaenheter och tidsskillnader ------------------------------------------

/** cm², dm², m² (and mm²): a hundred between each - ten each way, both ways. */
function areaUnits(rng: Rng): AdvancedProblem {
  const units = ["mm²", "cm²", "dm²", "m²"];
  const from = randInt(rng, 0, 3);
  let to = randInt(rng, 0, 3);
  while (to === from || Math.abs(to - from) > 2) to = randInt(rng, 0, 3);
  const factor = 100 ** Math.abs(to - from);
  const bigger = to > from; // to a bigger unit: fewer of them
  const n = bigger ? pick(rng, [100, 200, 300, 450, 500, 1200, 2500, 50, 750]) * (Math.abs(to - from) === 2 ? 100 : 1) : pick(rng, [1, 2, 3, 4, 5, 1.5, 2.5, 0.5, 12]);
  const result = dec(bigger ? n / factor : n * factor);
  const line = bigger ? `${tex(n)} / ${factor} = ${tex(result)}` : `${tex(n)} \\cdot ${factor} = ${tex(result)}`;
  return make("2.9.4", {
    promptKey: "basic.prompt.areaUnit",
    promptVars: { n: tex(n).replace("{,}", ","), from: units[from], to: units[to] },
    answer: value(result),
    scene: { kind: "units", family: "area", from: units[from], to: units[to], value: n },
    steps: [st(bigger ? "step.basic.areaToBigger" : "step.basic.areaToSmaller", line, { from: units[from], to: units[to], factor })],
  });
}

/** Tidsskillnader with the 24-hour clock: how long a trip takes, or what the time is after a while. */
function timeDifference(rng: Rng): AdvancedProblem {
  const h1 = randInt(rng, 6, 20);
  const m1 = 5 * randInt(rng, 1, 11);
  if (rng() < 0.6) {
    const length = 5 * randInt(rng, 9, 60);
    const end = h1 * 60 + m1 + length;
    const [h2, m2] = [Math.floor(end / 60), end % 60];
    if (h2 > 23) return timeDifference(rng);
    return make("2.9.5", {
      promptKey: "basic.prompt.trip",
      promptVars: { start: clock(h1, m1), end: clock(h2, m2) },
      answer: value(length),
      unit: "min",
      steps: spanSteps(h1, m1, h2, m2),
    });
  }
  // The time after a while: the minutes added, a full hour carried over.
  const add = 5 * randInt(rng, 3, 11);
  const total = m1 + add;
  const [h2, m2] = total >= 60 ? [h1 + 1, total - 60] : [h1, total];
  const steps = [st("step.basic.laterAdd", `${m1} + ${add} = ${total}`, { m: m1, add })];
  if (total >= 60) steps.push(st("step.basic.laterCarry", `${total} - 60 = ${m2}`));
  steps.push(st("step.basic.laterTime", clock(h2, m2)));
  return make("2.9.5", { promptKey: "basic.prompt.later", promptVars: { start: clock(h1, m1), add }, answer: value(clockValue(h2, m2)), steps });
}

export const BASIC_GENERATORS: Record<BasicStageId, (rng: Rng) => AdvancedProblem> = {
  "1.4.1": timesTables,
  "1.4.2": divisionFacts,
  "1.4.3": missingNumber,
  "1.5.2": duration,
  "1.6.1": money,
  "1.2.2": shapes,
  "2.12.1": angles,
  "2.13.1": coordinates,
  "2.14.1": simpleEquations,
  "2.15.1": primes,
  "2.10.3": estimation,
  "2.9.4": areaUnits,
  "2.9.5": timeDifference,
};
