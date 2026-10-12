/**
 * Drawing on a grid - tapping squares to colour them, or points to mark:
 *
 *   gridCells
 *     åk 1-3  1.2.6 symmetri: rita klart - colour the mirror image of half a figure
 *             1.9.4 färglägg en del: 3/4 of a grid of 12
 *     åk 4-6  2.6.9 procent av en figur: 35 % of 20 squares
 *             2.4.5 rita en rektangel: area 12 and perimeter 14 - or any with area 12
 *   gridPoints
 *     åk 4-6  2.13.2 pricka in punkter: (3, 5); the fourth corner of a rectangle
 *     åk 7-9  3.4.12 spegling och förflyttning: a triangle reflected or moved
 *
 * The check is here, not in the player, so the tests check the same thing
 * the child is checked on - and it says why an answer isn't right: 2 squares
 * too many, not a rectangle, x and y swapped, reflected in the wrong axis.
 *
 * How it works, and what must stay true: docs/question-types/grid.md.
 */
import { pick, randInt, shuffle, type Rng } from "../../rng";
import { text, type ChoiceText } from "../choice/problem";
import { questionType, retry } from "../questionType";

export type GridStageId = "1.2.6" | "1.9.4" | "2.6.9" | "2.4.5" | "2.13.2" | "3.4.12";

/** A square: [column, row], row 0 at the top. */
export type Cell = [number, number];
/** A point: [x, y], y upwards. */
export type Point = [number, number];

/** What the coloured squares must be: these exactly, this many, or a rectangle of this area (and perimeter). */
export type CellRule = { type: "exact"; cells: Cell[] } | { type: "count"; n: number } | { type: "rectangle"; area: number; perimeter?: number };

export interface GridCellsProblem {
  stageId: GridStageId;
  kind: "gridCells";
  prompt: ChoiceText;
  /** Shown big, when there is one: "\\dfrac{3}{4}", "35\\,\\%". */
  display?: string;
  w: number;
  h: number;
  /** Squares coloured from the start, that stay (half a figure). */
  given: Cell[];
  /** A dashed line after column (or row) `at`. */
  line?: { dir: "vertical" | "horizontal"; at: number };
  rule: CellRule;
  /** One right answer, shown when the answer is (the squares to colour). */
  solution: Cell[];
  tip: ChoiceText;
  explanation: ChoiceText;
}

export interface GridPointsProblem {
  stageId: GridStageId;
  kind: "gridPoints";
  prompt: ChoiceText;
  /** The axes' range. */
  x: [number, number];
  y: [number, number];
  /** Figures and points drawn from the start. */
  shown: { points: Point[]; closed: boolean }[];
  /** The points to mark, in any order. */
  answer: Point[];
  /** Wrong answers that are a known slip, and what to say about them. */
  slips: { points: Point[]; why: ChoiceText }[];
  tip: ChoiceText;
  explanation: ChoiceText;
}

export type GridProblem = GridCellsProblem | GridPointsProblem;

const key = (c: [number, number]) => `${c[0]},${c[1]}`;
const sameSet = (a: [number, number][], b: [number, number][]) => a.length === b.length && new Set([...a.map(key), ...b.map(key)]).size === a.length;

/** The slips that really are wrong (3 right and 3 up swapped is still right), each once (3 right, 3 down swapped is the same as the wrong way). */
const wrongOnly = (answer: Point[], slips: GridPointsProblem["slips"]) =>
  slips.filter((s, i) => !sameSet(s.points, answer) && !slips.slice(0, i).some((t) => sameSet(t.points, s.points)));

/** Is the colouring right - and if not, why. `cells` are the child's, without the given ones. */
export function checkCells(p: GridCellsProblem, cells: Cell[]): { ok: boolean; why: ChoiceText | null } {
  const all = [...p.given, ...cells];
  const rule = p.rule;
  if (rule.type === "exact") {
    if (sameSet(all, rule.cells)) return { ok: true, why: null };
    const want = new Set(rule.cells.map(key));
    const have = new Set(all.map(key));
    const missing = rule.cells.filter((c) => !have.has(key(c))).length;
    const extra = all.filter((c) => !want.has(key(c))).length;
    return { ok: false, why: text("grid.why.exact", { missing, extra }) };
  }
  if (rule.type === "count") return cells.length === rule.n ? { ok: true, why: null } : { ok: false, why: text(cells.length > rule.n ? "grid.why.tooMany" : "grid.why.tooFew", { k: cells.length, n: rule.n }) };
  // A rectangle: its squares fill their bounding box.
  if (cells.length === 0) return { ok: false, why: text("grid.why.notRectangle") };
  const cols = cells.map((c) => c[0]);
  const rows = cells.map((c) => c[1]);
  const [w, h] = [Math.max(...cols) - Math.min(...cols) + 1, Math.max(...rows) - Math.min(...rows) + 1];
  if (w * h !== cells.length) return { ok: false, why: text("grid.why.notRectangle") };
  if (w * h !== rule.area) return { ok: false, why: text("grid.why.area", { a: w * h, want: rule.area }) };
  if (rule.perimeter !== undefined && 2 * (w + h) !== rule.perimeter) return { ok: false, why: text("grid.why.perimeter", { p: 2 * (w + h), want: rule.perimeter }) };
  return { ok: true, why: null };
}

/** Are the marked points right - and if not, why. */
export function checkPoints(p: GridPointsProblem, points: Point[]): { ok: boolean; why: ChoiceText | null } {
  if (sameSet(points, p.answer)) return { ok: true, why: null };
  const slip = p.slips.find((s) => sameSet(points, s.points));
  if (slip) return { ok: false, why: slip.why };
  if (points.length !== p.answer.length) return { ok: false, why: text("grid.why.pointCount", { k: points.length, n: p.answer.length }) };
  const wrong = points.filter((q) => !p.answer.some((a) => key(a) === key(q))).length;
  return { ok: false, why: text("grid.why.points", { k: wrong }) };
}

// --- Squares ---------------------------------------------------------------------

/** 1.2.6: half a figure on one side of the line - colour the other half. */
function symmetry(rng: Rng): GridCellsProblem {
  const size = 8;
  const vertical = rng() < 0.6;
  const half = size / 2;
  // A shape grown square by square in the half next to the line, touching it.
  const cells = retry("1.2.6", () => {
    const shape: Cell[] = [[half - 1, randInt(rng, 1, size - 2)]];
    const target = randInt(rng, 4, 7);
    for (let tries = 0; shape.length < target && tries < 50; tries++) {
      const [c, r] = pick(rng, shape);
      const [dc, dr] = pick(rng, [[1, 0], [-1, 0], [0, 1], [0, -1]] as const);
      const next: Cell = [c + dc, r + dr];
      if (next[0] >= 0 && next[0] < half && next[1] >= 0 && next[1] < size && !shape.some((s) => key(s) === key(next))) shape.push(next);
    }
    return shape.length === target ? shape : null;
  });
  const given: Cell[] = vertical ? cells : cells.map(([c, r]) => [r, c]);
  const mirror = ([c, r]: Cell): Cell => (vertical ? [size - 1 - c, r] : [c, size - 1 - r]);
  const solution = given.map(mirror);
  return {
    stageId: "1.2.6",
    kind: "gridCells",
    prompt: text("grid.symmetry.prompt"),
    w: size,
    h: size,
    given,
    line: { dir: vertical ? "vertical" : "horizontal", at: half },
    rule: { type: "exact", cells: [...given, ...solution] },
    solution,
    tip: text("grid.symmetry.tip"),
    explanation: text("grid.symmetry.explain"),
  };
}

const GRIDS: [number, number][] = [
  [4, 2],
  [3, 4],
  [5, 2],
  [4, 4],
  [6, 2],
  [3, 3],
  [4, 3],
  [5, 4],
];

/** 1.9.4: colour a fraction of the squares - 3/4 of 12 is 9. */
function colourAFraction(rng: Rng): GridCellsProblem {
  const [w, h] = pick(rng, GRIDS);
  const n = w * h;
  const p = pick(rng, [2, 3, 4, 5, 6].filter((q) => n % q === 0 && q < n));
  const s = randInt(rng, 1, p - 1);
  const want = (n / p) * s;
  return {
    stageId: "1.9.4",
    kind: "gridCells",
    prompt: text("grid.fraction.prompt", { f: `${s}/${p}` }),
    display: `\\dfrac{${s}}{${p}}`,
    w,
    h,
    given: [],
    rule: { type: "count", n: want },
    solution: Array.from({ length: want }, (_, i) => [i % w, Math.floor(i / w)] as Cell),
    tip: text("grid.fraction.tip", { n, p }),
    explanation: text("grid.fraction.explain", { n, p, e: n / p, s, want }),
  };
}

/** 2.6.9: colour a percent of a figure of 20 or 25 squares - each square is 5 or 4 %. */
function colourAPercent(rng: Rng): GridCellsProblem {
  const [w, h] = pick(rng, [[5, 4], [5, 5], [10, 2]] as [number, number][]);
  const n = w * h;
  const each = 100 / n;
  const want = randInt(rng, 2, n - 2);
  const pct = want * each;
  return {
    stageId: "2.6.9",
    kind: "gridCells",
    prompt: text("grid.percent.prompt", { p: pct }),
    display: `${pct}\\,\\%`,
    w,
    h,
    given: [],
    rule: { type: "count", n: want },
    solution: Array.from({ length: want }, (_, i) => [i % w, Math.floor(i / w)] as Cell),
    tip: text("grid.percent.tip", { n, e: each }),
    explanation: text("grid.percent.explain", { n, e: each, p: pct, want }),
  };
}

/** 2.4.5: draw a rectangle of a given area - and perimeter, which makes it one. */
function drawRectangle(rng: Rng): GridCellsProblem {
  const [w, h] = [10, 8];
  const [a, b] = shuffle(rng, [randInt(rng, 2, 7), randInt(rng, 2, 6)]);
  const area = a * b;
  const withPerimeter = rng() < 0.6;
  const perimeter = 2 * (a + b);
  return {
    stageId: "2.4.5",
    kind: "gridCells",
    prompt: text(withPerimeter ? "grid.rectangle.both" : "grid.rectangle.area", { a: area, p: perimeter }),
    w,
    h,
    given: [],
    rule: withPerimeter ? { type: "rectangle", area, perimeter } : { type: "rectangle", area },
    solution: Array.from({ length: area }, (_, i) => [i % a, Math.floor(i / a)] as Cell),
    tip: text(withPerimeter ? "grid.rectangle.tipBoth" : "grid.rectangle.tipArea", { a: area, p: perimeter }),
    explanation: text(withPerimeter ? "grid.rectangle.explainBoth" : "grid.rectangle.explainArea", { w: a, h: b, a: area, p: perimeter }),
  };
}

// --- Points ----------------------------------------------------------------------

/** 2.13.2: mark a point - x first, then y - or the fourth corner of a rectangle. */
function plotPoints(rng: Rng): GridPointsProblem {
  const negative = rng() < 0.3;
  const range: [number, number] = negative ? [-5, 5] : [0, 8];
  const coord = () => randInt(rng, negative ? -5 : 1, negative ? 5 : 8);
  if (rng() < 0.6) {
    const pt = retry("2.13.2", () => {
      const q: Point = [coord(), coord()];
      // x ≠ y, so swapping them is a different point - the slip to catch.
      return q[0] !== q[1] && q[0] !== 0 && q[1] !== 0 ? q : null;
    });
    return {
      stageId: "2.13.2",
      kind: "gridPoints",
      prompt: text("grid.point.prompt", { x: pt[0], y: pt[1] }),
      x: range,
      y: range,
      shown: [],
      answer: [pt],
      slips: wrongOnly([pt], [{ points: [[pt[1], pt[0]]], why: text("grid.point.whySwapped") }, ...(negative ? [{ points: [[-pt[0], pt[1]] as Point], why: text("grid.point.whySign") }, { points: [[pt[0], -pt[1]] as Point], why: text("grid.point.whySign") } ] : [])]),
      tip: text("grid.point.tip"),
      explanation: text("grid.point.explain", { x: pt[0], y: pt[1] }),
    };
  }
  // A rectangle with a corner missing.
  const [x0, y0] = [randInt(rng, range[0] + 1, range[1] - 4), randInt(rng, range[0] + 1, range[1] - 4)];
  const [x1, y1] = [x0 + randInt(rng, 2, 3), y0 + randInt(rng, 2, 3)];
  const corners = shuffle(rng, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]] as Point[]);
  const missing = corners[3];
  return {
    stageId: "2.13.2",
    kind: "gridPoints",
    prompt: text("grid.corner.prompt"),
    x: range,
    y: range,
    shown: [{ points: corners.slice(0, 3), closed: false }],
    answer: [missing],
    slips: wrongOnly([missing], [{ points: [[missing[1], missing[0]]], why: text("grid.point.whySwapped") }]),
    tip: text("grid.corner.tip"),
    explanation: text("grid.corner.explain", { x: missing[0], y: missing[1] }),
  };
}

type Move = "reflectY" | "reflectX" | "translate";

/** 3.4.12: a triangle reflected in an axis or moved - where do its corners go? */
function transform(rng: Rng): GridPointsProblem {
  const move = pick(rng, ["reflectY", "reflectX", "translate"] as Move[]);
  const [dx, dy] = [pick(rng, [-4, -3, -2, 2, 3, 4]), pick(rng, [-3, -2, 2, 3])];
  const apply = (m: Move, [x, y]: Point): Point => (m === "reflectY" ? [-x, y] : m === "reflectX" ? [x, -y] : [x + dx, y + dy]);
  const triangle = retry("3.4.12", () => {
    // On one side of the axis it's reflected in (its image on the other); anywhere, for a move.
    const [x0, x1] = move === "reflectY" ? [1, 5] : [-5, 5];
    const [y0, y1] = move === "reflectX" ? [1, 5] : [-5, 5];
    const t: Point[] = Array.from({ length: 3 }, () => [randInt(rng, x0, x1), randInt(rng, y0, y1)] as Point);
    // A real triangle (not three points on a line), its image on the grid and apart from it.
    const area = Math.abs((t[1][0] - t[0][0]) * (t[2][1] - t[0][1]) - (t[2][0] - t[0][0]) * (t[1][1] - t[0][1]));
    const image = t.map((q) => apply(move, q));
    const inside = [...t, ...image].every(([x, y]) => Math.abs(x) <= 6 && Math.abs(y) <= 6);
    const apart = !image.some((q) => t.some((r) => key(q) === key(r)));
    return area > 0 && inside && apart ? t : null;
  });
  const answer = triangle.map((q) => apply(move, q));
  const other: Move = move === "reflectY" ? "reflectX" : "reflectY";
  const slips =
    move === "translate"
      ? [
          { points: triangle.map(([x, y]): Point => [x + dy, y + dx]), why: text("grid.move.whySwapped") },
          { points: triangle.map(([x, y]): Point => [x - dx, y - dy]), why: text("grid.move.whyDirection") },
        ]
      : [{ points: triangle.map((q) => apply(other, q)), why: text("grid.move.whyAxis", { axis: `@grid.axis.${move === "reflectY" ? "y" : "x"}` }) }];
  return {
    stageId: "3.4.12",
    kind: "gridPoints",
    prompt: move === "translate" ? text("grid.move.translate", { dx: Math.abs(dx), dy: Math.abs(dy), h: `@grid.dir.${dx > 0 ? "right" : "left"}`, v: `@grid.dir.${dy > 0 ? "up" : "down"}` }) : text("grid.move.reflect", { axis: `@grid.axis.${move === "reflectY" ? "y" : "x"}` }),
    x: [-6, 6],
    y: [-6, 6],
    shown: [{ points: triangle, closed: true }],
    answer,
    slips: wrongOnly(answer, slips),
    tip: text(move === "translate" ? "grid.move.tipTranslate" : move === "reflectY" ? "grid.move.tipReflectY" : "grid.move.tipReflectX"),
    explanation: text(move === "translate" ? "grid.move.explainTranslate" : move === "reflectY" ? "grid.move.explainReflectY" : "grid.move.explainReflectX", { dx, dy }),
  };
}

export const GRID_QUESTIONS = questionType<"grid", GridProblem, GridStageId>({
  id: "grid",
  kinds: ["gridCells", "gridPoints"],
  levels: {
    "1.2.6": symmetry,
    "1.9.4": colourAFraction,
    "2.6.9": colourAPercent,
    "2.4.5": drawRectangle,
    "2.13.2": plotPoints,
    "3.4.12": transform,
  },
  key: (p) => `grid:${p.stageId}:${JSON.stringify(p.prompt)}:${p.kind === "gridCells" ? JSON.stringify([p.w, p.h, p.given]) : JSON.stringify(p.shown)}`,
});
