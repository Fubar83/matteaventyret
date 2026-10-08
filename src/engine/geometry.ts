/**
 * Geometry questions - perimeter, area, circles - from the basic shapes up to
 * figures put together (and taken apart): a triangle cut out of a rectangle,
 * a square with a hole, a rectangle with a half circle on the end. Each comes
 * with a figure (the shape, its measurements marked, the part asked about
 * coloured) and is answered on the free board like any åk 7+ question
 * (game/ExpressionPlayer.tsx), so the working can earn the third star.
 *
 *   åk 1-3     1.2.1  omkrets: add up the sides
 *   åk 4-6     2.4.1  rektangel och kvadrat: area (and omkrets from two sides)
 *              2.4.2  triangel: base · höjd / 2
 *              2.4.3  parallellogram: base · höjd (not the slanted side)
 *              2.4.4  sammansatta figurer: rectangles and triangles, added or taken away
 *   åk 7-9     3.4.3  cirkeln: omkrets, area, radie / diameter
 *              3.4.4  parallelltrapets: (a + b) · h / 2
 *              3.4.5  sammansatta figurer med cirklar: half circles, holes, rings
 *              3.4.6  baklänges: a side, a height or a diameter from the area / omkrets
 *   gymnasiet  4.2.2  cirkelsektorer: sector area and arc length
 *              4.2.3  areasatsen: T = a · b · sin C / 2
 *
 * Whole-number answers wherever π and sin don't come in; with them, the
 * answer is to one decimal and anything that rounds to it (π ≈ 3,14 or the
 * π key) is right - see AnswerSpec's `approx`.
 */
import { st, tex, type AdvancedProblem, type AnswerSpec, type SolutionStep } from "./advanced";
import type { Rng } from "./rng";
import { randInt } from "./rng";

export type GeometryStageId = "1.2.1" | "2.4.1" | "2.4.2" | "2.4.3" | "2.4.4" | "3.4.3" | "3.4.4" | "3.4.5" | "3.4.6" | "4.2.2" | "4.2.3";

// --- Figures ---------------------------------------------------------------

export type Point = [number, number];

/** "asked": the area the question is about (coloured); "cut": a part taken away (white, dashed); "plain": just the shape. */
export type FigureFill = "asked" | "cut" | "plain";

export type FigureShape =
  | { kind: "polygon"; points: Point[]; fill: FigureFill }
  | { kind: "circle"; center: Point; r: number; fill: FigureFill }
  /** A pie slice from angle `from` to `to` (degrees, counter-clockwise from "east", as in maths). A half circle is 180°. */
  | { kind: "sector"; center: Point; r: number; from: number; to: number; fill: FigureFill }
  /** A measuring line - a height, a radius. */
  | { kind: "segment"; from: Point; to: Point; dashed?: boolean; /** Drawn light - a grid line, a minute tick. */ faint?: boolean }
  /** The small square marking a right angle at `at`, between the directions towards `a` and `b`. */
  | { kind: "rightAngle"; at: Point; a: Point; b: Point }
  /** An angle's arc at `at`, between the directions towards `a` and `b`. */
  | { kind: "angle"; at: Point; a: Point; b: Point };

export interface FigureLabel {
  text: string;
  at: Point;
  /** Which way from `at` the text sits, so it doesn't cover the line it names. */
  place: "above" | "below" | "left" | "right" | "center";
}

/** A figure in drawing units (y grows downwards); the renderer scales it to fit. */
export interface Figure {
  shapes: FigureShape[];
  labels: FigureLabel[];
}

// --- Helpers ---------------------------------------------------------------

const pick = <T>(rng: Rng, items: readonly T[]): T => items[randInt(rng, 0, items.length - 1)];
const round1 = (n: number) => Math.round(n * 10) / 10;
const sq = (unit: string) => `${unit}²`;

function rect(x: number, y: number, w: number, h: number): Point[] {
  return [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ];
}

const mid = (a: Point, b: Point): Point => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const len = (n: number, unit: string) => `${tex(n).replace("{,}", ",")} ${unit}`;

interface Spec {
  stageId: GeometryStageId;
  promptKey: string;
  promptVars?: Record<string, string | number>;
  figure: Figure;
  value: number;
  approx?: boolean;
  /** A rounded answer's exact value (π · 25 = 78,539…) - the answer has to round to it (workCheck.ts). */
  exact?: number;
  /** The same worked out with π ≈ 3,14, unrounded - rounding it is right too. */
  piAs314?: number;
  unit: string;
  firstStep: string;
  /** The worked solution, a step at a time, each with what to do (StepSolver's Guidat). Its lines are also the solution shown. */
  steps: SolutionStep[];
}

function problem(s: Spec): AdvancedProblem {
  const answer: AnswerSpec = { kind: "value", value: s.value, ...(s.approx ? { approx: true } : {}), ...(s.exact !== undefined ? { exact: s.exact } : {}), ...(s.piAs314 !== undefined ? { piAs314: s.piAs314 } : {}) };
  return {
    stageId: s.stageId,
    kind: "expression",
    promptKey: s.promptKey,
    promptVars: { unit: s.unit, ...s.promptVars },
    display: "",
    answer,
    tipKey: `geo.tip.${s.stageId}`,
    firstStep: s.firstStep,
    solution: s.steps.map((x) => x.line),
    steps: s.steps,
    figure: s.figure,
    unit: s.unit,
  };
}

/** Exact to the decimals that are really there (3,14 · 36 = 113,04, not 113,0400001). */
const dec = (n: number) => Math.round(n * 1e6) / 1e6;
/** π taken as 3,14 - what's worked out by hand, in a column. */
const piTimes = (n: number) => dec(3.14 * n);
const decimalsIn = (n: number) => (String(dec(n)).split(".")[1] ?? "").length;
/** One decimal, always shown: 113,0. */
const tex1 = (n: number) => round1(n).toFixed(1).replace(".", "{,}");

/** "= 113,04 ≈ 113,0": a result, and rounded to one decimal when there's more to round away. */
const result = (n: number) => `= ${tex(n)}${decimalsIn(n) > 1 ? ` \\approx ${tex1(n)}` : ""}`;

/** "A ≈ 3,14 · 36 = 113,04 ≈ 113,0" - the multiplication done in a column (Ställ upp), then rounded. */
function piSteps(label: string, x: number): SolutionStep[] {
  const p = piTimes(x);
  return [st(decimalsIn(p) > 1 ? "step.geo.piTimesRound" : "step.geo.piTimes", `${label} \\approx 3{,}14 \\cdot ${x} ${result(p)}`, { x })];
}

// --- Åk 1-3: omkrets ---------------------------------------------------------

function perimeter(rng: Rng): AdvancedProblem {
  const unit = "cm";
  const shape = pick(rng, ["rectangle", "square", "triangle"] as const);
  if (shape === "triangle") {
    // Whole sides that make a real triangle, drawn with the base along the bottom.
    for (;;) {
      const a = randInt(rng, 3, 9);
      const b = randInt(rng, 3, 9);
      const c = randInt(rng, 3, 9);
      if (a + b <= c || a + c <= b || b + c <= a) continue;
      // Place the apex from the side lengths (base a, left side b, right side c).
      const x = (a * a + b * b - c * c) / (2 * a);
      const y = Math.sqrt(Math.max(b * b - x * x, 1));
      const A: Point = [0, y];
      const B: Point = [a, y];
      const C: Point = [x, 0];
      const sum = a + b + c;
      return problem({
        stageId: "1.2.1",
        promptKey: "geo.prompt.perimeter",
        figure: {
          shapes: [{ kind: "polygon", points: [A, B, C], fill: "plain" }],
          labels: [
            { text: len(a, unit), at: mid(A, B), place: "below" },
            { text: len(b, unit), at: mid(A, C), place: "left" },
            { text: len(c, unit), at: mid(B, C), place: "right" },
          ],
        },
        value: sum,
        unit,
        firstStep: `${a} + ${b} + ${c}`,
        steps: [st("step.geo.perimeter", `${a} + ${b} + ${c} = ${sum}`)],
      });
    }
  }
  const w = randInt(rng, 2, 9);
  const h = shape === "square" ? w : pick(rng, [2, 3, 4, 5, 6, 7, 8, 9].filter((n) => n !== w));
  const p = rect(0, 0, w, h);
  const sum = 2 * (w + h);
  return problem({
    stageId: "1.2.1",
    promptKey: "geo.prompt.perimeter",
    figure: {
      shapes: [{ kind: "polygon", points: p, fill: "plain" }],
      labels: [
        { text: len(w, unit), at: mid(p[0], p[1]), place: "above" },
        { text: len(h, unit), at: mid(p[1], p[2]), place: "right" },
        { text: len(w, unit), at: mid(p[2], p[3]), place: "below" },
        { text: len(h, unit), at: mid(p[3], p[0]), place: "left" },
      ],
    },
    value: sum,
    unit,
    firstStep: `${w} + ${h} + ${w} + ${h}`,
    steps: [st("step.geo.perimeter", `${w} + ${h} + ${w} + ${h} = ${sum}`)],
  });
}

// --- Åk 4-6 ------------------------------------------------------------------

function rectangleArea(rng: Rng): AdvancedProblem {
  const unit = pick(rng, ["cm", "m"]);
  const kind = pick(rng, ["area", "area", "square", "perimeter"] as const);
  const w = randInt(rng, 3, 12);
  const h = kind === "square" ? w : pick(rng, [2, 3, 4, 5, 6, 7, 8, 9].filter((n) => n !== w));
  const p = rect(0, 0, w, h);
  const labels: FigureLabel[] = [{ text: len(w, unit), at: mid(p[2], p[3]), place: "below" }];
  if (kind !== "square") labels.push({ text: len(h, unit), at: mid(p[3], p[0]), place: "left" });
  if (kind === "perimeter") {
    const sum = 2 * (w + h);
    return problem({
      stageId: "2.4.1",
      promptKey: "geo.prompt.perimeter",
      figure: { shapes: [{ kind: "polygon", points: p, fill: "plain" }], labels },
      value: sum,
      unit,
      firstStep: `O = ${w} + ${h} + ${w} + ${h}`,
      steps: [st("step.geo.perimeter", `O = ${w} + ${h} + ${w} + ${h} = ${sum}`)],
    });
  }
  const area = w * h;
  return problem({
    stageId: "2.4.1",
    promptKey: kind === "square" ? "geo.prompt.squareArea" : "geo.prompt.area",
    figure: { shapes: [{ kind: "polygon", points: p, fill: "asked" }], labels },
    value: area,
    unit: sq(unit),
    firstStep: `A = b \\cdot h = ${w} \\cdot ${h}`,
    steps: [kind === "square" ? st("step.geo.squareArea", `A = ${w} \\cdot ${w} = ${area}`, { s: w }) : st("step.geo.rectArea", `A = ${w} \\cdot ${h} = ${area}`, { b: w, h })],
  });
}

function triangleArea(rng: Rng): AdvancedProblem {
  const unit = pick(rng, ["cm", "m"]);
  // b · h even, so the area is whole.
  let b: number, h: number;
  do {
    b = randInt(rng, 3, 12);
    h = randInt(rng, 2, 10);
  } while ((b * h) % 2 !== 0);
  const area = (b * h) / 2;
  const right = rng() < 0.4;
  const A: Point = [0, h];
  const B: Point = [b, h];
  const apexX = right ? 0 : Math.round(b * (0.3 + rng() * 0.4) * 10) / 10;
  const C: Point = [apexX, 0];
  const foot: Point = [apexX, h];
  const shapes: FigureShape[] = [{ kind: "polygon", points: [A, B, C], fill: "asked" }];
  if (right) shapes.push({ kind: "rightAngle", at: A, a: B, b: C });
  else shapes.push({ kind: "segment", from: C, to: foot, dashed: true }, { kind: "rightAngle", at: foot, a: B, b: C });
  return problem({
    stageId: "2.4.2",
    promptKey: "geo.prompt.triangleArea",
    figure: {
      shapes,
      labels: [
        { text: len(b, unit), at: mid(A, B), place: "below" },
        { text: len(h, unit), at: mid(C, foot), place: right ? "left" : "right" },
      ],
    },
    value: area,
    unit: sq(unit),
    firstStep: `A = \\frac{b \\cdot h}{2} = \\frac{${b} \\cdot ${h}}{2}`,
    steps: [st("step.geo.baseTimesHeight", `${b} \\cdot ${h} = ${b * h}`, { b, h }), st("step.geo.halfOf", `A = \\frac{${b * h}}{2} = ${area}`, { n: b * h })],
  });
}

function parallelogram(rng: Rng): AdvancedProblem {
  const unit = pick(rng, ["cm", "m"]);
  const b = randInt(rng, 5, 12);
  const h = randInt(rng, 3, 8);
  const shift = randInt(rng, 2, 4);
  // The slanted side, shown too - the usual mistake is to multiply by it.
  const slant = Math.round(Math.sqrt(h * h + shift * shift) * 10) / 10;
  const A: Point = [0, h];
  const B: Point = [b, h];
  const C: Point = [b + shift, 0];
  const D: Point = [shift, 0];
  const foot: Point = [shift, h];
  const area = b * h;
  return problem({
    stageId: "2.4.3",
    promptKey: "geo.prompt.parallelogramArea",
    figure: {
      shapes: [
        { kind: "polygon", points: [A, B, C, D], fill: "asked" },
        { kind: "segment", from: D, to: foot, dashed: true },
        { kind: "rightAngle", at: foot, a: B, b: D },
      ],
      labels: [
        { text: len(b, unit), at: mid(A, B), place: "below" },
        { text: len(h, unit), at: mid(D, foot), place: "right" },
        { text: len(slant, unit), at: mid(A, D), place: "left" },
      ],
    },
    value: area,
    unit: sq(unit),
    firstStep: `A = b \\cdot h = ${b} \\cdot ${h}`,
    steps: [st("step.geo.parallelogram", `A = ${b} \\cdot ${h} = ${area}`, { b, h })],
  });
}

function compositeBasic(rng: Rng): AdvancedProblem {
  const unit = pick(rng, ["cm", "m"]);
  const kind = pick(rng, ["lShape", "cutCorner", "house", "triangleInside"] as const);
  const W = randInt(rng, 6, 12);
  const H = randInt(rng, 4, 9);

  if (kind === "lShape") {
    // A rectangle with its top-right corner cut away.
    const cw = randInt(rng, 2, W - 2);
    const ch = randInt(rng, 1, H - 2);
    const pts: Point[] = [
      [0, 0],
      [W - cw, 0],
      [W - cw, ch],
      [W, ch],
      [W, H],
      [0, H],
    ];
    const area = W * H - cw * ch;
    return problem({
      stageId: "2.4.4",
      promptKey: "geo.prompt.shapeArea",
      figure: {
        shapes: [{ kind: "polygon", points: rect(W - cw, 0, cw, ch), fill: "cut" }, { kind: "polygon", points: pts, fill: "asked" }],
        labels: [
          { text: len(W, unit), at: [W / 2, H], place: "below" },
          { text: len(H, unit), at: [0, H / 2], place: "left" },
          { text: len(cw, unit), at: [W - cw / 2, 0], place: "above" },
          { text: len(ch, unit), at: [W, ch / 2], place: "right" },
        ],
      },
      value: area,
      unit: sq(unit),
      firstStep: `${W} \\cdot ${H} - ${cw} \\cdot ${ch}`,
      steps: [
        st("step.geo.whole", `${W} \\cdot ${H} = ${W * H}`, { b: W, h: H }),
        st("step.geo.cutRect", `${cw} \\cdot ${ch} = ${cw * ch}`, { b: cw, h: ch }),
        st("step.geo.takeAway", `A = ${W * H} - ${cw * ch} = ${area}`),
      ],
    });
  }

  if (kind === "cutCorner") {
    // A right triangle cut out of the top-right corner: legs a (along the top) and b (down the side).
    let a: number, b: number;
    do {
      a = randInt(rng, 2, W - 1);
      b = randInt(rng, 2, H - 1);
    } while ((a * b) % 2 !== 0);
    const pts: Point[] = [
      [0, 0],
      [W - a, 0],
      [W, b],
      [W, H],
      [0, H],
    ];
    const area = W * H - (a * b) / 2;
    return problem({
      stageId: "2.4.4",
      promptKey: "geo.prompt.shapeArea",
      figure: {
        shapes: [
          { kind: "polygon", points: [[W - a, 0], [W, 0], [W, b]], fill: "cut" },
          { kind: "polygon", points: pts, fill: "asked" },
        ],
        labels: [
          { text: len(W, unit), at: [W / 2, H], place: "below" },
          { text: len(H, unit), at: [0, H / 2], place: "left" },
          { text: len(a, unit), at: [W - a / 2, 0], place: "above" },
          { text: len(b, unit), at: [W, b / 2], place: "right" },
        ],
      },
      value: area,
      unit: sq(unit),
      firstStep: `${W} \\cdot ${H} - \\frac{${a} \\cdot ${b}}{2}`,
      steps: [
        st("step.geo.whole", `${W} \\cdot ${H} = ${W * H}`, { b: W, h: H }),
        st("step.geo.cutTriangle", `\\frac{${a} \\cdot ${b}}{2} = ${(a * b) / 2}`, { b: a, h: b }),
        st("step.geo.takeAway", `A = ${W * H} - ${(a * b) / 2} = ${area}`),
      ],
    });
  }

  if (kind === "triangleInside") {
    // A triangle on the rectangle's bottom side with its tip on the top side: always half the rectangle.
    let w = W;
    if ((w * H) % 2 !== 0) w += 1;
    const tip = randInt(rng, 1, w - 1);
    const area = (w * H) / 2;
    return problem({
      stageId: "2.4.4",
      promptKey: "geo.prompt.shadedArea",
      figure: {
        shapes: [
          { kind: "polygon", points: rect(0, 0, w, H), fill: "plain" },
          { kind: "polygon", points: [[0, H], [w, H], [tip, 0]], fill: "asked" },
        ],
        labels: [
          { text: len(w, unit), at: [w / 2, H], place: "below" },
          { text: len(H, unit), at: [0, H / 2], place: "left" },
        ],
      },
      value: area,
      unit: sq(unit),
      firstStep: `\\frac{${w} \\cdot ${H}}{2}`,
      steps: [st("step.geo.whole", `${w} \\cdot ${H} = ${w * H}`, { b: w, h: H }), st("step.geo.halfOfRect", `A = \\frac{${w * H}}{2} = ${area}`)],
    });
  }

  // A house: a rectangle with a triangle roof.
  let r = randInt(rng, 2, 5);
  if ((W * r) % 2 !== 0) r += 1;
  const area = W * H + (W * r) / 2;
  return problem({
    stageId: "2.4.4",
    promptKey: "geo.prompt.shapeArea",
    figure: {
      shapes: [
        { kind: "polygon", points: [[0, r], [W / 2, 0], [W, r], [W, r + H], [0, r + H]], fill: "asked" },
        { kind: "segment", from: [0, r], to: [W, r], dashed: true },
        { kind: "segment", from: [W / 2, 0], to: [W / 2, r], dashed: true },
      ],
      labels: [
        { text: len(W, unit), at: [W / 2, r + H], place: "below" },
        { text: len(H, unit), at: [0, r + H / 2], place: "left" },
        { text: len(r, unit), at: [W / 2, r / 2], place: "right" },
      ],
    },
    value: area,
    unit: sq(unit),
    firstStep: `${W} \\cdot ${H} + \\frac{${W} \\cdot ${r}}{2}`,
    steps: [
      st("step.geo.walls", `${W} \\cdot ${H} = ${W * H}`, { b: W, h: H }),
      st("step.geo.roof", `\\frac{${W} \\cdot ${r}}{2} = ${(W * r) / 2}`, { b: W, h: r }),
      st("step.geo.addParts", `A = ${W * H} + ${(W * r) / 2} = ${area}`),
    ],
  });
}

// --- Åk 7-9 ------------------------------------------------------------------

function circleFigure(r: number, unit: string, show: "radius" | "diameter", fill: FigureFill = "asked", value?: string): Figure {
  const c: Point = [r, r];
  const text = value ?? len(show === "radius" ? r : 2 * r, unit);
  return {
    shapes: [
      { kind: "circle", center: c, r, fill },
      show === "radius" ? { kind: "segment", from: c, to: [2 * r, r] } : { kind: "segment", from: [0, r], to: [2 * r, r] },
    ],
    labels: [{ text, at: show === "radius" ? [1.5 * r, r] : [r, r], place: "above" }],
  };
}

function circle(rng: Rng): AdvancedProblem {
  const unit = "cm";
  const kind = pick(rng, ["circumferenceD", "circumferenceR", "areaR", "areaD", "radius"] as const);
  const r = randInt(rng, 2, 12);
  const d = 2 * r;
  if (kind === "radius") {
    return problem({
      stageId: "3.4.3",
      promptKey: "geo.prompt.radius",
      figure: circleFigure(r, unit, "diameter", "plain"),
      value: r,
      unit,
      firstStep: `r = \\frac{d}{2}`,
      steps: [st("step.geo.radius", `r = \\frac{${d}}{2} = ${r}`, { d })],
    });
  }
  if (kind === "circumferenceD" || kind === "circumferenceR") {
    const exact = Math.PI * d;
    const value = round1(piTimes(d));
    const piAs314 = piTimes(d);
    const fromD = kind === "circumferenceD";
    return problem({
      stageId: "3.4.3",
      promptKey: "geo.prompt.circumference",
      figure: circleFigure(r, unit, fromD ? "diameter" : "radius", "plain"),
      value,
      exact,
      piAs314,
      approx: true,
      unit,
      firstStep: fromD ? `O = \\pi \\cdot d = \\pi \\cdot ${d}` : `O = 2 \\pi r = 2 \\cdot \\pi \\cdot ${r}`,
      steps: [
        fromD ? st("step.geo.circumferenceD", `O = \\pi \\cdot ${d}`, { d }) : st("step.geo.circumferenceR", `O = 2 \\cdot \\pi \\cdot ${r} = \\pi \\cdot ${d}`, { r, d }),
        ...piSteps("O", d),
      ],
    });
  }
  const exact = Math.PI * r * r;
  const value = round1(piTimes(r * r));
  const fromD = kind === "areaD";
  return problem({
    stageId: "3.4.3",
    promptKey: "geo.prompt.circleArea",
    figure: circleFigure(r, unit, fromD ? "diameter" : "radius"),
    value,
    exact,
    piAs314: piTimes(r * r),
    approx: true,
    unit: sq(unit),
    firstStep: fromD ? `r = \\frac{${d}}{2} = ${r} \\qquad A = \\pi r^{2}` : `A = \\pi r^{2} = \\pi \\cdot ${r}^{2}`,
    steps: [
      ...(fromD ? [st("step.geo.radius", `r = \\frac{${d}}{2} = ${r}`, { d })] : []),
      st("step.geo.circleArea", `A = \\pi \\cdot ${r}^{2} = \\pi \\cdot ${r * r}`, { r, rr: r * r }),
      ...piSteps("A", r * r),
    ],
  });
}

function trapezoid(rng: Rng): AdvancedProblem {
  const unit = pick(rng, ["cm", "m"]);
  let a: number, b: number, h: number;
  do {
    b = randInt(rng, 6, 14); // the bottom side
    a = randInt(rng, 3, b - 2); // the top side
    h = randInt(rng, 3, 8); // not 2: then a + b would already be the area
  } while (((a + b) * h) % 2 !== 0);
  const left = Math.round((b - a) * (0.2 + rng() * 0.6) * 10) / 10;
  const A: Point = [0, h];
  const B: Point = [b, h];
  const C: Point = [left + a, 0];
  const D: Point = [left, 0];
  const foot: Point = [left, h];
  const area = ((a + b) * h) / 2;
  return problem({
    stageId: "3.4.4",
    promptKey: "geo.prompt.trapezoidArea",
    figure: {
      shapes: [
        { kind: "polygon", points: [A, B, C, D], fill: "asked" },
        { kind: "segment", from: D, to: foot, dashed: true },
        { kind: "rightAngle", at: foot, a: B, b: D },
      ],
      labels: [
        { text: len(b, unit), at: mid(A, B), place: "below" },
        { text: len(a, unit), at: mid(D, C), place: "above" },
        { text: len(h, unit), at: mid(D, foot), place: "right" },
      ],
    },
    value: area,
    unit: sq(unit),
    firstStep: `A = \\frac{(a + b) \\cdot h}{2} = \\frac{(${a} + ${b}) \\cdot ${h}}{2}`,
    steps: [
      st("step.geo.parallelSides", `${a} + ${b} = ${a + b}`),
      st("step.geo.timesHeight", `${a + b} \\cdot ${h} = ${(a + b) * h}`, { h }),
      st("step.geo.halfOf", `A = \\frac{${(a + b) * h}}{2} = ${area}`, { n: (a + b) * h }),
    ],
  });
}

function compositeCircle(rng: Rng): AdvancedProblem {
  const unit = "cm";
  const kind = pick(rng, ["halfCircleEnd", "squareHole", "ring", "quarter"] as const);

  if (kind === "halfCircleEnd") {
    // A rectangle with a half circle on its right end (diameter = the rectangle's height).
    const W = randInt(rng, 5, 12);
    const H = 2 * randInt(rng, 2, 5);
    const r = H / 2;
    const exact = W * H + (Math.PI * r * r) / 2;
    const circleArea = piTimes(r * r);
    const total = dec(W * H + circleArea / 2);
    const value = round1(total);
    return problem({
      stageId: "3.4.5",
      promptKey: "geo.prompt.shapeAreaRounded",
      piAs314: total,
      figure: {
        shapes: [
          { kind: "sector", center: [W, r], r, from: -90, to: 90, fill: "asked" },
          { kind: "polygon", points: rect(0, 0, W, H), fill: "asked" },
          { kind: "segment", from: [W, 0], to: [W, H], dashed: true },
        ],
        labels: [
          { text: len(W, unit), at: [W / 2, H], place: "below" },
          { text: len(H, unit), at: [0, H / 2], place: "left" },
        ],
      },
      value,
      exact,
      approx: true,
      unit: sq(unit),
      firstStep: `${W} \\cdot ${H} + \\frac{\\pi \\cdot ${r}^{2}}{2}`,
      steps: [
        st("step.geo.rectPart", `${W} \\cdot ${H} = ${W * H}`, { b: W, h: H }),
        st("step.geo.halfCircleRadius", `r = \\frac{${H}}{2} = ${r}`, { d: H }),
        st("step.geo.wholeCircle", `3{,}14 \\cdot ${r}^{2} = 3{,}14 \\cdot ${r * r} = ${tex(circleArea)}`, { r, rr: r * r }),
        st("step.geo.halfCircle", `\\frac{${tex(circleArea)}}{2} = ${tex(dec(circleArea / 2))}`),
        st("step.geo.addParts", `A \\approx ${W * H} + ${tex(dec(circleArea / 2))} ${result(total)}`),
      ],
    });
  }

  if (kind === "squareHole") {
    // A square with the biggest circle that fits cut out of it.
    const s = 2 * randInt(rng, 2, 6);
    const r = s / 2;
    const exact = s * s - Math.PI * r * r;
    const hole = piTimes(r * r);
    const left = dec(s * s - hole);
    const value = round1(left);
    return problem({
      stageId: "3.4.5",
      promptKey: "geo.prompt.shadedAreaRounded",
      piAs314: left,
      figure: {
        shapes: [
          { kind: "polygon", points: rect(0, 0, s, s), fill: "asked" },
          { kind: "circle", center: [r, r], r, fill: "cut" },
        ],
        labels: [{ text: len(s, unit), at: [s / 2, s], place: "below" }],
      },
      value,
      exact,
      approx: true,
      unit: sq(unit),
      firstStep: `${s}^{2} - \\pi \\cdot ${r}^{2}`,
      steps: [
        st("step.geo.squarePart", `${s} \\cdot ${s} = ${s * s}`, { s }),
        st("step.geo.holeRadius", `r = \\frac{${s}}{2} = ${r}`, { d: s }),
        st("step.geo.wholeCircle", `3{,}14 \\cdot ${r}^{2} = 3{,}14 \\cdot ${r * r} = ${tex(hole)}`, { r, rr: r * r }),
        st("step.geo.takeAwayHole", `A \\approx ${s * s} - ${tex(hole)} ${result(left)}`),
      ],
    });
  }

  if (kind === "ring") {
    const R = randInt(rng, 4, 10);
    const r = randInt(rng, 2, R - 1);
    const exact = Math.PI * (R * R - r * r);
    const value = round1(piTimes(R * R - r * r));
    return problem({
      stageId: "3.4.5",
      promptKey: "geo.prompt.shadedAreaRounded",
      piAs314: piTimes(R * R - r * r),
      figure: {
        shapes: [
          { kind: "circle", center: [R, R], r: R, fill: "asked" },
          { kind: "circle", center: [R, R], r, fill: "cut" },
          { kind: "segment", from: [R, R], to: [2 * R, R] },
          { kind: "segment", from: [R, R], to: [R, R - r] },
        ],
        // Each radius named by its own line: the outer one just outside the ring, the inner one inside the hole.
        labels: [
          { text: `R = ${len(R, unit)}`, at: [2 * R, R], place: "right" },
          { text: `r = ${len(r, unit)}`, at: [R, R - r / 2], place: "right" },
        ],
      },
      value,
      exact,
      approx: true,
      unit: sq(unit),
      firstStep: `\\pi \\cdot ${R}^{2} - \\pi \\cdot ${r}^{2}`,
      steps: [
        st("step.geo.ring", `A = \\pi \\cdot ${R}^{2} - \\pi \\cdot ${r}^{2} = \\pi \\cdot (${R * R} - ${r * r}) = \\pi \\cdot ${R * R - r * r}`, { R, r }),
        ...piSteps("A", R * R - r * r),
      ],
    });
  }

  // A square with a quarter circle drawn from one corner, radius the whole side: the part outside it.
  const s = randInt(rng, 3, 10);
  const exact = s * s - (Math.PI * s * s) / 4;
  const circleArea = piTimes(s * s);
  const quarter = dec(circleArea / 4);
  const left = dec(s * s - quarter);
  const value = round1(left);
  return problem({
    stageId: "3.4.5",
    promptKey: "geo.prompt.shadedAreaRounded",
    piAs314: left,
    figure: {
      shapes: [
        { kind: "polygon", points: rect(0, 0, s, s), fill: "asked" },
        { kind: "sector", center: [0, s], r: s, from: 0, to: 90, fill: "cut" },
      ],
      labels: [{ text: len(s, unit), at: [s / 2, s], place: "below" }],
    },
    value,
    exact,
    approx: true,
    unit: sq(unit),
    firstStep: `${s}^{2} - \\frac{\\pi \\cdot ${s}^{2}}{4}`,
    steps: [
      st("step.geo.squarePart", `${s} \\cdot ${s} = ${s * s}`, { s }),
      st("step.geo.wholeCircle", `3{,}14 \\cdot ${s}^{2} = 3{,}14 \\cdot ${s * s} = ${tex(circleArea)}`, { r: s, rr: s * s }),
      st("step.geo.quarterCircle", `\\frac{${tex(circleArea)}}{4} = ${tex(quarter)}`),
      st("step.geo.takeAway", `A \\approx ${s * s} - ${tex(quarter)} ${result(left)}`),
    ],
  });
}

function inverse(rng: Rng): AdvancedProblem {
  const unit = "cm";
  const kind = pick(rng, ["rectangleSide", "triangleHeight", "squareSide", "diameter"] as const);

  if (kind === "rectangleSide") {
    const w = randInt(rng, 3, 12);
    const h = randInt(rng, 2, 9);
    const area = w * h;
    const p = rect(0, 0, w, h);
    return problem({
      stageId: "3.4.6",
      promptKey: "geo.prompt.missingSide",
      promptVars: { area, areaUnit: sq(unit) },
      figure: {
        shapes: [{ kind: "polygon", points: p, fill: "asked" }],
        labels: [
          { text: len(w, unit), at: mid(p[2], p[3]), place: "below" },
          { text: "?", at: mid(p[3], p[0]), place: "left" },
          { text: `${area} ${sq(unit)}`, at: [w / 2, h / 2], place: "center" },
        ],
      },
      value: h,
      unit,
      firstStep: `${w} \\cdot h = ${area}`,
      steps: [st("step.geo.areaEquation", `${w} \\cdot h = ${area}`), st("step.geo.divideBoth", `h = \\frac{${area}}{${w}} = ${h}`, { n: w })],
    });
  }

  if (kind === "triangleHeight") {
    let b: number, h: number;
    do {
      b = randInt(rng, 4, 12);
      h = randInt(rng, 2, 10);
    } while ((b * h) % 2 !== 0);
    const area = (b * h) / 2;
    const apex = Math.round(b * 0.4 * 10) / 10;
    return problem({
      stageId: "3.4.6",
      promptKey: "geo.prompt.triangleHeight",
      promptVars: { area, areaUnit: sq(unit) },
      figure: {
        shapes: [
          { kind: "polygon", points: [[0, h], [b, h], [apex, 0]], fill: "asked" },
          { kind: "segment", from: [apex, 0], to: [apex, h], dashed: true },
          { kind: "rightAngle", at: [apex, h], a: [b, h], b: [apex, 0] },
        ],
        labels: [
          { text: len(b, unit), at: [b / 2, h], place: "below" },
          { text: "h = ?", at: [apex, h / 2], place: "right" },
        ],
      },
      value: h,
      unit,
      firstStep: `\\frac{${b} \\cdot h}{2} = ${area}`,
      steps: [
        st("step.geo.areaEquation", `\\frac{${b} \\cdot h}{2} = ${area}`),
        st("step.geo.timesTwoBoth", `${b} \\cdot h = ${2 * area}`),
        st("step.geo.divideBoth", `h = \\frac{${2 * area}}{${b}} = ${h}`, { n: b }),
      ],
    });
  }

  if (kind === "squareSide") {
    const s = randInt(rng, 3, 15);
    const area = s * s;
    const p = rect(0, 0, s, s);
    return problem({
      stageId: "3.4.6",
      promptKey: "geo.prompt.squareSide",
      promptVars: { area, areaUnit: sq(unit) },
      figure: {
        shapes: [{ kind: "polygon", points: p, fill: "asked" }],
        labels: [
          { text: "?", at: mid(p[2], p[3]), place: "below" },
          { text: `${area} ${sq(unit)}`, at: [s / 2, s / 2], place: "center" },
        ],
      },
      value: s,
      unit,
      firstStep: `s^{2} = ${area}`,
      steps: [st("step.geo.areaEquation", `s^{2} = ${area}`), st("step.geo.squareRoot", `s = \\sqrt{${area}} = ${s}`, { area })],
    });
  }

  // The diameter from the circumference.
  // The circumference as 3,14 · d, so dividing back by 3,14 comes out even (with the π key, nearly).
  const d = randInt(rng, 3, 20);
  const circumference = piTimes(d);
  const exact = circumference / Math.PI;
  const value = d;
  return problem({
    stageId: "3.4.6",
    promptKey: "geo.prompt.diameterFromCircumference",
    promptVars: { circumference: tex(circumference).replace("{,}", ",") },
    figure: circleFigure(d / 2, unit, "diameter", "plain", "d = ?"),
    value,
    exact,
    piAs314: d,
    approx: true,
    unit,
    firstStep: `3{,}14 \\cdot d = ${tex(circumference)}`,
    steps: [
      st("step.geo.circumferenceEquation", `3{,}14 \\cdot d = ${tex(circumference)}`),
      st("step.geo.divideByPi", `d = \\frac{${tex(circumference)}}{3{,}14} = ${d}`, { c: Math.round(circumference * 100) }),
    ],
  });
}

// --- Gymnasiet ---------------------------------------------------------------

/** Each sector angle as a part of the whole circle, in lowest terms: 150° is 5/12. */
const SECTOR_PARTS: Record<number, [number, number]> = {
  30: [1, 12], 45: [1, 8], 60: [1, 6], 72: [1, 5], 90: [1, 4], 120: [1, 3], 135: [3, 8], 150: [5, 12], 210: [7, 12], 240: [2, 3], 270: [3, 4],
};

/** p/q of the whole: times p first (exact), then divided by q in a trappan, rounded. */
function partSteps(label: string, whole: number, p: number, q: number): SolutionStep[] {
  const times = dec(whole * p);
  const part = dec(times / q);
  return [
    ...(p > 1 ? [st("step.geo.timesParts", `${tex(whole)} \\cdot ${p} = ${tex(times)}`, { p })] : []),
    st("step.geo.divideParts", `${label} = \\frac{${tex(times)}}{${q}} ${decimalsIn(part) > 1 ? "\\approx" : "="} ${decimalsIn(part) > 1 ? tex1(part) : tex(part)}`, { q }),
  ];
}

function sector(rng: Rng): AdvancedProblem {
  const unit = "cm";
  const v = pick(rng, [30, 45, 60, 72, 90, 120, 135, 150, 210, 240, 270]);
  // v/360 in lowest terms: which part of the circle - p parts of q.
  const [p, q] = SECTOR_PARTS[v];
  const r = randInt(rng, 3, 12);
  const arc = rng() < 0.5;
  // Drawn with one edge pointing right and the slice opening upwards.
  const c: Point = [r, r];
  const end: Point = [r + r * Math.cos((v * Math.PI) / 180), r - r * Math.sin((v * Math.PI) / 180)];
  const figure: Figure = {
    shapes: [
      { kind: "circle", center: c, r, fill: "plain" },
      { kind: "sector", center: c, r, from: 0, to: v, fill: "asked" },
      { kind: "angle", at: c, a: [2 * r, r], b: end },
    ],
    labels: [
      { text: len(r, unit), at: [1.5 * r, r], place: "below" },
      { text: `${v}°`, at: c, place: v > 180 ? "below" : "left" },
    ],
  };
  if (arc) {
    const exact = (v / 360) * 2 * Math.PI * r;
    const whole = piTimes(2 * r);
    const value = round1((whole * p) / q);
    return problem({
      stageId: "4.2.2",
      promptKey: "geo.prompt.arcLength",
      figure,
      value,
      exact,
      piAs314: dec((whole * p) / q),
      approx: true,
      unit,
      firstStep: `b = \\frac{${v}}{360} \\cdot 2 \\pi \\cdot ${r}`,
      steps: [
        st("step.geo.sectorPart", `\\frac{${v}}{360} = \\frac{${p}}{${q}}`, { v }),
        st("step.geo.wholeCircumference", `2 \\cdot 3{,}14 \\cdot ${r} = 3{,}14 \\cdot ${2 * r} = ${tex(whole)}`, { d: 2 * r }),
        ...partSteps("b", whole, p, q),
      ],
    });
  }
  const exact = (v / 360) * Math.PI * r * r;
  const whole = piTimes(r * r);
  const value = round1((whole * p) / q);
  return problem({
    stageId: "4.2.2",
    promptKey: "geo.prompt.sectorArea",
    figure,
    value,
    exact,
    piAs314: dec((whole * p) / q),
    approx: true,
    unit: sq(unit),
    firstStep: `A = \\frac{${v}}{360} \\cdot \\pi \\cdot ${r}^{2}`,
    steps: [
      st("step.geo.sectorPart", `\\frac{${v}}{360} = \\frac{${p}}{${q}}`, { v }),
      st("step.geo.wholeCircle", `3{,}14 \\cdot ${r}^{2} = 3{,}14 \\cdot ${r * r} = ${tex(whole)}`, { r, rr: r * r }),
      ...partSteps("A", whole, p, q),
    ],
  });
}

function areaSine(rng: Rng): AdvancedProblem {
  const unit = "cm";
  const C = pick(rng, [30, 150, 30, 150, 90]);
  const a = randInt(rng, 4, 12);
  const b = randInt(rng, 4, 12);
  const sin = C === 90 ? 1 : 0.5;
  const value = (a * b * sin) / 2;
  // The angle C at the bottom left: side b along the bottom, side a up at angle C.
  const P: Point = [0, 0];
  const Q: Point = [b, 0];
  const R: Point = [a * Math.cos((C * Math.PI) / 180), -a * Math.sin((C * Math.PI) / 180)];
  return problem({
    stageId: "4.2.3",
    promptKey: "geo.prompt.triangleArea",
    figure: {
      shapes: [
        { kind: "polygon", points: [P, Q, R], fill: "asked" },
        { kind: "angle", at: P, a: Q, b: R },
      ],
      labels: [
        { text: len(b, unit), at: mid(P, Q), place: "below" },
        { text: len(a, unit), at: mid(P, R), place: C > 90 ? "right" : "left" },
        { text: `${C}°`, at: P, place: C > 90 ? "below" : "right" },
      ],
    },
    value,
    unit: sq(unit),
    firstStep: `T = \\frac{a \\cdot b \\cdot \\sin C}{2} = \\frac{${a} \\cdot ${b} \\cdot \\sin ${C}^{\\circ}}{2}`,
    steps: [
      st("step.geo.sinValue", `\\sin ${C}^{\\circ} = ${tex(sin)}`, { C }),
      st("step.geo.sidesTimes", `${a} \\cdot ${b} = ${a * b}`),
      st("step.geo.areaSine", `T = \\frac{${a * b} \\cdot ${tex(sin)}}{2} = ${tex(value)}`),
    ],
  });
}

export const GEOMETRY_GENERATORS: Record<GeometryStageId, (rng: Rng) => AdvancedProblem> = {
  "1.2.1": perimeter,
  "2.4.1": rectangleArea,
  "2.4.2": triangleArea,
  "2.4.3": parallelogram,
  "2.4.4": compositeBasic,
  "3.4.3": circle,
  "3.4.4": trapezoid,
  "3.4.5": compositeCircle,
  "3.4.6": inverse,
  "4.2.2": sector,
  "4.2.3": areaSine,
};
