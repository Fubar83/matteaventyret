/**
 * Cheap geometric sanity checks on the classifier's answer, for look-alikes
 * a 28x28 bitmap can't reliably tell apart but the raw ink can.
 *
 * Parentheses vs "1": both are one tall, thin stroke, and since "(" and ")"
 * joined the character set the model reads a plain "1" as ")" more often than
 * not. The difference is plain in the ink, though: a parenthesis curves
 * through its middle, a "1" is straight there - whatever flag it has at the
 * top or foot at the bottom. So the curvature is measured on the middle 60%
 * of the stroke only (between the points 20% and 80% along it), which leaves
 * flags and hooks out of it.
 */
import { LABELS } from "../recognition/labels";
import type { Point, Stroke } from "../recognition/preprocess";

/** The point `t` (0-1) of the way along a stroke's length. */
function pointAlong(stroke: Stroke, t: number): Point {
  const lengths = [0];
  for (let i = 1; i < stroke.length; i++) lengths.push(lengths[i - 1] + Math.hypot(stroke[i].x - stroke[i - 1].x, stroke[i].y - stroke[i - 1].y));
  const target = lengths[lengths.length - 1] * t;
  for (let i = 1; i < stroke.length; i++) {
    if (lengths[i] >= target) {
      const seg = lengths[i] - lengths[i - 1] || 1;
      const f = (target - lengths[i - 1]) / seg;
      return { x: stroke[i - 1].x + (stroke[i].x - stroke[i - 1].x) * f, y: stroke[i - 1].y + (stroke[i].y - stroke[i - 1].y) * f };
    }
  }
  return stroke[stroke.length - 1];
}

/**
 * How far a single stroke's middle bows sideways from straight, as a fraction
 * of its height: positive bows right (like ")"), negative bows left (like
 * "("), ~0 is straight. Null for anything that isn't one tall-ish stroke.
 */
export function middleBulge(strokes: Stroke[]): number | null {
  if (strokes.length !== 1 || strokes[0].length < 3) return null;
  const s = strokes[0];
  const ys = s.map((p) => p.y);
  const height = Math.max(...ys) - Math.min(...ys);
  if (height < 12) return null;
  let a = pointAlong(s, 0.2);
  let b = pointAlong(s, 0.8);
  if (a.y > b.y) [a, b] = [b, a]; // orient the chord top -> bottom
  const m = pointAlong(s, 0.5);
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  // Signed distance of the midpoint from the chord; with the chord pointing down, a point to its right has a negative cross product.
  const cross = (b.x - a.x) * (m.y - a.y) - (b.y - a.y) * (m.x - a.x);
  return -cross / len / height;
}

/** Below this much bow, a stroke is straight - no parenthesis. */
const MIN_PAREN_BULGE = 0.06;
/** Bowed this much is still a bracket when the classifier is sure it is one - a "1" stays under 0.03. */
const SLIGHT_BRACKET_BULGE = 0.03;

/** The middle 60% of a single stroke is straight and steep (within ~17 degrees of vertical). */
function isStraightUpright(strokes: Stroke[], bulge: number | null): boolean {
  if (bulge === null || Math.abs(bulge) >= MIN_PAREN_BULGE) return false;
  const a = pointAlong(strokes[0], 0.2);
  const b = pointAlong(strokes[0], 0.8);
  return Math.abs(b.x - a.x) < Math.abs(b.y - a.y) * 0.3;
}

function segmentsCross(a: Point, b: Point, c: Point, d: Point): boolean {
  const side = (p: Point, q: Point, r: Point) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const d1 = side(c, d, a);
  const d2 = side(c, d, b);
  const d3 = side(a, b, c);
  const d4 = side(a, b, d);
  // Half-open, as in segmentation.ts: a crossing exactly through a shared vertex still counts (once).
  const straddles = (p: number, q: number) => (p >= 0 && q < 0) || (p < 0 && q >= 0);
  return straddles(d1, d2) && straddles(d3, d4);
}

/**
 * A "0" drawn in one stroke: it ends back where it started, and never crosses
 * itself on the way. An "8" drawn in one stroke always crosses itself in the
 * middle - the model mixes the two up for a narrow "0" (the "0" of a borrowed
 * "10" squeezed into its box reads as "8"), but the ink doesn't.
 */
function isSimpleLoop(strokes: Stroke[]): boolean {
  if (strokes.length !== 1 || strokes[0].length < 8) return false;
  const s = strokes[0];
  const ys = s.map((p) => p.y);
  const height = Math.max(...ys) - Math.min(...ys);
  if (height < 8) return false;
  const [first, last] = [s[0], s[s.length - 1]];
  if (Math.hypot(first.x - last.x, first.y - last.y) > height * 0.25) return false;
  // Skip neighboring segments, and the closing ones near the start/end (where the loop meets itself on purpose).
  for (let i = 1; i < s.length; i++) {
    for (let j = i + 2; j < s.length; j++) {
      if (i <= 2 && j >= s.length - 3) continue;
      if (segmentsCross(s[i - 1], s[i], s[j - 1], s[j])) return false;
    }
  }
  return true;
}

/**
 * How many times the pen turns back sideways along a stroke, ignoring
 * wobbles smaller than `slack`. A "1" never does more than once (up the
 * flag, then down a stem leaning back); a "2" does twice - right over its
 * top, left down its diagonal, right along its base.
 */
function sidewaysTurns(stroke: Stroke, slack: number): number {
  let direction = 0;
  let turns = 0;
  let anchor = stroke[0].x;
  for (const p of stroke) {
    const dx = p.x - anchor;
    if (Math.abs(dx) < slack) continue;
    const d = Math.sign(dx);
    if (direction !== 0 && d !== direction) turns++;
    direction = d;
    anchor = p.x;
  }
  return turns;
}

/**
 * A "1": one stroke, straight and upright through its middle (a flag at the
 * top is fine), and narrow overall - which keeps a one-stroke "7" out (its
 * top bar makes it wide). And it doesn't zigzag: a "2" squeezed very narrow
 * is straight and upright enough, but turns back twice on the way down.
 */
export function looksLikeOne(strokes: Stroke[]): boolean {
  if (!isStraightUpright(strokes, middleBulge(strokes))) return false;
  const xs = strokes[0].map((p) => p.x);
  const ys = strokes[0].map((p) => p.y);
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);
  return width <= height * 0.5 && sidewaysTurns(strokes[0], Math.max(2, height * 0.06)) <= 1;
}

/**
 * Returns the classifier's character, corrected where the ink contradicts it.
 * `labels` names what each entry of `probs` stands for (the model's labels -
 * the full model's by default).
 */
export function checkGlyph(char: string, strokes: Stroke[], probs: readonly number[], labels: readonly string[] = LABELS): string {
  if (char === "8" && isSimpleLoop(strokes)) return "0";
  const bulge = middleBulge(strokes);
  // A single straight, upright, narrow stroke can only be a "1" - but the
  // model often calls it ")", "." or "+" (it has far fewer thin,
  // stroke-rendered "1"s to learn from than parentheses), and in digits-only
  // reading sometimes a "4" or "7". Except the characters that ARE a
  // single straight stroke - "l" and "|" - which only context can tell from
  // a "1" (see the layout's letter-between-digits rule). A bracket is
  // decided below, by how much it bows.
  const isBracket = char === "(" || char === ")";
  if (!isBracket && char !== "1" && char !== "l" && char !== "|" && looksLikeOne(strokes)) return "1";
  // An "i" or "j" is two strokes, its dot being one of them; with just one, it's something else.
  if ((char === "i" || char === "j") && strokes.length === 1) return bestOther(probs, labels, ["i", "j"], char);
  if (!isBracket) return char;
  if (bulge === null) return char;
  if (Math.abs(bulge) >= MIN_PAREN_BULGE) return bulge > 0 ? ")" : "(";
  // Only a little bowed: real brackets often are (regression: "(x − 2)(x − 3)"
  // read as "1x − 21 1x − 31"). A bracket the model is sure of keeps its
  // reading, the way it bows; a "1" - the stroke this check is for - bows
  // less than this, flag and all.
  const sure = (probs[labels.indexOf(char)] ?? 0) >= 0.85;
  if (sure && Math.abs(bulge) >= SLIGHT_BRACKET_BULGE) return bulge > 0 ? ")" : "(";
  // Straight: the best-scoring character that isn't a parenthesis - nor a
  // ".", which a tall stroke never is either (the model's few dozen "."
  // samples, scaled up to fill the grid, make it a frequent runner-up here).
  return bestOther(probs, labels, ["(", ")", "."], char);
}

/** The model's best guess among everything but `excluded` - `fallback` if there's nothing else. */
function bestOther(probs: readonly number[], labels: readonly string[], excluded: readonly string[], fallback: string): string {
  let best = -1;
  probs.forEach((p, i) => {
    const c = labels[i];
    if (c === undefined || excluded.includes(c)) return;
    if (best < 0 || p > probs[best]) best = i;
  });
  return best >= 0 ? labels[best] : fallback;
}
