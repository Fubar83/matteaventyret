/**
 * Writing order: how a character's strokes were drawn - how many, where
 * each starts and which way it goes. Shared by the statistics of how people
 * really write (scripts/ts/strokeOrderStats.ts) and the writing-order rules
 * the advanced question types hold children to.
 */
import type { Point, Stroke } from "./preprocess";

/** Where a stroke starts in its symbol's box, vertically (Top/Middle/Bottom) and horizontally (Left/Centre/Right). */
export type Zone = `${"T" | "M" | "B"}${"L" | "C" | "R"}`;
/**
 * Which way a stroke goes, start to end: D(own), U(p), L(eft), R(ight), a
 * diagonal (DL, DR, UL, UR), or o - ending about where it began (a loop,
 * an "0", a dot).
 */
export type Direction = "D" | "U" | "L" | "R" | "DL" | "DR" | "UL" | "UR" | "o";

export interface StrokeShape {
  zone: Zone;
  direction: Direction;
}

/** A stroke sample's flat [x, y, penDown] points (strokeFeatures.ts) back as strokes. */
export function splitSequence(seq: ArrayLike<number>): Stroke[] {
  const strokes: Stroke[] = [];
  for (let k = 0; k + 2 < seq.length; k += 3) {
    if (seq[k + 2] === 1 || strokes.length === 0) strokes.push([]);
    strokes[strokes.length - 1].push({ x: seq[k], y: seq[k + 1] });
  }
  return strokes;
}

function bounds(strokes: readonly Stroke[]) {
  const pts = strokes.flat();
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return { minX, minY, w: Math.max(...xs) - minX, h: Math.max(...ys) - minY };
}

/** Which way from `a` to `b`, against the symbol's size. */
function directionOf(a: Point, b: Point, size: number): Direction {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (Math.hypot(dx, dy) < size * 0.3) return "o";
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  const v = dy > 0 ? "D" : "U";
  const h = dx > 0 ? "R" : "L";
  // Diagonal when neither way dominates (within about 27-63 degrees).
  if (ax > ay * 0.5 && ay > ax * 0.5) return `${v}${h}` as Direction;
  return ay >= ax ? v : h;
}

/** Each stroke's start zone and direction, in drawing order. */
export function strokeShapes(strokes: readonly Stroke[]): StrokeShape[] {
  const ink = strokes.filter((s) => s.length > 0);
  if (ink.length === 0) return [];
  const b = bounds(ink);
  const size = Math.max(b.w, b.h, 1e-6);
  const third = (v: number, min: number, extent: number) => (extent < size * 0.15 ? 1 : Math.min(2, Math.max(0, Math.floor(((v - min) / extent) * 3))));
  return ink.map((s) => {
    const start = s[0];
    const end = s[s.length - 1];
    const zone = `${"TMB"[third(start.y, b.minY, b.h)]}${"LCR"[third(start.x, b.minX, b.w)]}` as Zone;
    return { zone, direction: directionOf(start, end, size) };
  });
}

/** One stroke of a way of writing a character: which directions it may go, and optionally where it must start (vertically). */
interface StrokeRule {
  dir: readonly Direction[];
  start?: readonly ("T" | "M" | "B")[];
}

const DOWN: readonly Direction[] = ["D", "DL", "DR"];
const RIGHT: readonly Direction[] = ["R", "UR", "DR"];
const ANY: readonly Direction[] = ["D", "U", "L", "R", "DL", "DR", "UL", "UR", "o"];
const fromTop = (dir: readonly Direction[] = ANY): StrokeRule => ({ dir, start: ["T"] });

/**
 * The ways each character may be written in the advanced question types,
 * stroke by stroke in drawing order - several allowed where people really
 * write it more than one way (two kinds of 4, two of 5), each with a fixed
 * order and direction. Chosen from how MathWriting's writers draw them
 * (scripts/ts/strokeOrderStats.ts): the common ways are allowed, the rare
 * ones (a bracket drawn upwards, an "=" bottom bar first, a 5's flag before
 * its body) are what's taught away. A character not listed (letters, most
 * signs) may be written any way.
 */
export const ORDER_RULES: Readonly<Record<string, readonly (readonly StrokeRule[])[]>> = {
  "(": [[fromTop(DOWN)]],
  ")": [[fromTop(DOWN)]],
  "/": [[fromTop(DOWN)]],
  ",": [[{ dir: DOWN }]],
  "-": [[{ dir: RIGHT }]],
  "=": [[{ dir: RIGHT, start: ["T"] }, { dir: RIGHT, start: ["B"] }]],
  "+": [
    [{ dir: RIGHT }, { dir: DOWN }],
    [{ dir: DOWN }, { dir: RIGHT }],
  ],
  // Two crossing strokes, each a diagonal (or a curve, the "two c's" x) - never one stroke.
  x: [[{ dir: [...DOWN, "UR", "UL"] }, { dir: [...DOWN, "UR", "UL"] }]],
  // One stroke - where it starts and whether it closes exactly is how people differ.
  "0": [[{ dir: ANY }]],
  // One stroke down, flag and all.
  "1": [[{ dir: DOWN }]],
  "2": [[fromTop()]],
  "3": [[fromTop()]],
  // An open 4 in one stroke, or the "L" then the stem.
  "4": [[fromTop(DOWN)], [fromTop(DOWN), fromTop(DOWN)]],
  // One stroke from the top right, or the body first and the flag on top after.
  "5": [[fromTop(DOWN)], [fromTop(DOWN), fromTop(RIGHT)]],
  "6": [[fromTop()]],
  // One stroke, or with a crossbar after.
  "7": [[fromTop()], [fromTop(), { dir: RIGHT }]],
  "8": [[{ dir: ANY }]],
  "9": [[fromTop()]],
};

/** Whether `strokes` (in drawing order) are one of the allowed ways of writing `char` - always, for a character without rules. */
export function followsOrder(char: string, strokes: readonly Stroke[]): boolean {
  const variants = ORDER_RULES[char];
  if (!variants) return true;
  const shapes = strokeShapes(strokes);
  return variants.some(
    (rules) => rules.length === shapes.length && rules.every((r, k) => r.dir.includes(shapes[k].direction) && (!r.start || r.start.includes(shapes[k].zone[0] as "T" | "M" | "B")))
  );
}

/** The way a symbol was drawn, as text: "TL:D | TL:R" - one stroke per part. */
export function describeStrokes(strokes: readonly Stroke[]): string {
  return strokeShapes(strokes)
    .map((s) => `${s.zone}:${s.direction}`)
    .join(" | ");
}
