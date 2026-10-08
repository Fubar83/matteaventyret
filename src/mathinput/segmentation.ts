/**
 * Groups a page of freehand strokes into candidate symbols, purely by
 * position - no recognition happens here. A symbol can be more than one
 * stroke (e.g. "x", "=", "÷", or a letter with a separate dot like "i"), so
 * strokes are merged whenever their (slightly expanded) bounding boxes
 * overlap, using union-find. This is the classic bounding-box grouping step
 * used by real handwritten-math-recognition pipelines (see build brief note
 * in mathinput/README - full 2D layout, e.g. fractions/exponents, is decided
 * afterwards in layout.ts from the classified, positioned symbols this
 * produces, not here).
 */
import type { Point, Stroke } from "../recognition/preprocess";
import { learnedJoins, hasLearnedSegmenter } from "./strokePairs";
import { boxFromCorners, inkDistance, pointToSegment, segmentsCross, strokeBox, union, type BoundingBox } from "./strokeGeometry";

export type { BoundingBox };

export interface SegmentedSymbol {
  strokes: Stroke[];
  box: BoundingBox;
  /** Set when geometry alone already settles what the symbol is (today: two paired bars are "="), so callers can skip the classifier. */
  knownChar?: string;
  /** Set when the symbol was crossed out (a borrowed-from digit in column subtraction) - the strike itself is NOT among `strokes`, so the classifier sees just the digit. */
  struck?: boolean;
}

/** How far (as a fraction of a stroke's OWN size) two strokes' boxes are allowed to bridge a gap and still merge - deliberately small: it only needs to close the little gaps within one multi-stroke symbol (the two legs of an "x", a dot next to its stem), not the gap to the next symbol over. Scaling by each stroke's own size (rather than a single page-wide size) matters because real handwriting mixes stroke sizes - a page-wide margin sized for a big "x" would happily bridge the small gap to a neighboring "=" too. The two bars of "=" itself are too far apart for this to bridge - see pairEqualsBars. */
const MERGE_RATIO = 0.2;
/** Floor for the margin above, in px, so a near-zero-size stroke (a precise tap, or a dot drawn with almost no drag) still gets a sensible merge radius instead of ~0. */
const MIN_MERGE_MARGIN = 6;

function mergeMargin(box: BoundingBox): number {
  // The margin is scaled off the SHORTER side, not the longer one: a fraction
  // bar or an "=" bar is deliberately wide and thin, and scaling off its
  // width would inflate its margin to the point of swallowing the numerator
  // and denominator above and below it (this is exactly what produced one
  // giant merged blob out of a plain "1 / 2" fraction before this fix).
  return Math.max(Math.min(box.width, box.height) * MERGE_RATIO, MIN_MERGE_MARGIN);
}

/** How close two strokes' actual ink must come to join - tighter than the box margin above, since the strokes of one symbol ("x", "+", "π", "√", a two-stroke "4") nearly always cross or touch, while an exponent written just off the tip of an "x"'s arm is only a few pixels away. */
const INK_MERGE_RATIO = 0.12;
const MIN_INK_MARGIN = 4;

function inkMargin(box: BoundingBox): number {
  return Math.max(Math.min(box.width, box.height) * INK_MERGE_RATIO, MIN_INK_MARGIN);
}

function expand(box: BoundingBox): BoundingBox {
  const margin = mergeMargin(box);
  return boxFromCorners(box.minX - margin, box.minY - margin, box.maxX + margin, box.maxY + margin);
}

function overlaps(a: BoundingBox, b: BoundingBox): boolean {
  return a.minX <= b.maxX && b.minX <= a.maxX && a.minY <= b.maxY && b.minY <= a.maxY;
}

/**
 * Strokes that are one bar of an "=" (two flat bars stacked, as pairEqualsBars
 * pairs them), each mapped to the other. Found before the ink merge, so a bar
 * that happens to touch the digit after it can be kept from merging into it
 * (regression, from MathWriting's "0+0=0": the top bar became part of the 0).
 */
function equalsBarPartners(strokes: Stroke[], boxes: BoundingBox[]): Map<number, number> {
  const flat = strokes.map((st, i) => isFlatBar({ strokes: [st], box: boxes[i] }));
  const partner = new Map<number, number>();
  for (let a = 0; a < strokes.length; a++) {
    if (!flat[a] || partner.has(a)) continue;
    for (let b = 0; b < strokes.length; b++) {
      if (b === a || !flat[b] || partner.has(b)) continue;
      const [top, bottom] = boxes[a].cy <= boxes[b].cy ? [boxes[a], boxes[b]] : [boxes[b], boxes[a]];
      const shorter = Math.min(boxes[a].width, boxes[b].width);
      const longer = Math.max(boxes[a].width, boxes[b].width);
      const overlap = Math.min(boxes[a].maxX, boxes[b].maxX) - Math.max(boxes[a].minX, boxes[b].minX);
      const gap = bottom.minY - top.maxY;
      if (shorter / longer >= 0.35 && overlap >= shorter * 0.4 && gap >= 0 && gap <= longer) {
        partner.set(a, b);
        partner.set(b, a);
        break;
      }
    }
  }
  return partner;
}

/** `bar` is one bar of an "=" and `other` sits off its end - not across its middle, where a "+"'s or "≠"'s stroke crosses it. */
function touchesOnlyTheEnd(bar: number, other: number, partner: Map<number, number>, boxes: BoundingBox[]): boolean {
  if (!partner.has(bar) || partner.get(bar) === other) return false;
  const b = boxes[bar];
  const cx = boxes[other].cx;
  return cx < b.minX + b.width * 0.25 || cx > b.maxX - b.width * 0.25;
}

/** One roughly-horizontal single stroke - a candidate bar of an "=". */
function isFlatBar(s: SegmentedSymbol): boolean {
  // A quick bar slopes a little - up to 0.4 of its length in height.
  return s.strokes.length === 1 && s.box.width >= 8 && s.box.height <= s.box.width * 0.4;
}

/**
 * The two bars of an "=" sit farther apart than the proximity merge above
 * can bridge - by design, since that margin is scaled off a bar's thin side
 * so a fraction bar can't swallow its numerator. So they're paired
 * explicitly here: two flat bars of similar length, mostly overlapping
 * horizontally, close together relative to their length, with nothing drawn
 * between them. That last check is what keeps two stacked bars of a nested
 * fraction (which always have a digit or letter between them) apart.
 *
 * A pair that passes all that IS an "=", so it's tagged as one directly
 * rather than handed to the classifier: the model has only a few dozen real
 * "=" samples and misreads a flat one (bars wide relative to their gap) as
 * "4" or "x", while this geometric test doesn't care about the proportions.
 */
function pairEqualsBars(symbols: SegmentedSymbol[]): SegmentedSymbol[] {
  const bars = symbols.filter(isFlatBar);
  const paired = new Set<SegmentedSymbol>();
  const merged: SegmentedSymbol[] = [];
  for (const a of bars) {
    if (paired.has(a)) continue;
    for (const b of bars) {
      if (b === a || paired.has(b)) continue;
      const [top, bottom] = a.box.cy <= b.box.cy ? [a, b] : [b, a];
      const shorter = Math.min(a.box.width, b.box.width);
      const longer = Math.max(a.box.width, b.box.width);
      const overlapLeft = Math.max(a.box.minX, b.box.minX);
      const overlapRight = Math.min(a.box.maxX, b.box.maxX);
      const gap = bottom.box.minY - top.box.maxY;
      // Real bars are often uneven (a quick short top bar over a long one) - down to about a third.
      if (shorter / longer < 0.35) continue;
      // A quick "=" is often slanted or offset: the bars need only overlap for part of the shorter one.
      if (overlapRight - overlapLeft < shorter * 0.4) continue;
      // Short bars can sit wide apart (a tall, narrow "=") - up to their own length.
      if (gap < 0 || gap > longer) continue;
      const somethingBetween = symbols.some(
        (s) => s !== a && s !== b && s.box.cy > top.box.maxY && s.box.cy < bottom.box.minY && s.box.cx > overlapLeft && s.box.cx < overlapRight
      );
      if (somethingBetween) continue;
      paired.add(a);
      paired.add(b);
      merged.push({ strokes: [...top.strokes, ...bottom.strokes], box: union(a.box, b.box), knownChar: "=" });
      break;
    }
  }
  return [...symbols.filter((s) => !paired.has(s)), ...merged];
}

/**
 * The dot of an "i" or "j" is written well clear of its stem - farther than
 * the ink merge above bridges. A tiny single-stroke mark just above a tall,
 * upright symbol, and within its width (give or take a slant), is its dot.
 * A dot anywhere else - on the line (a decimal point), halfway up beside
 * something (a multiplication dot), or over a dash (÷) - stays its own symbol.
 */
function attachDots(symbols: SegmentedSymbol[]): SegmentedSymbol[] {
  const absorbed = new Set<SegmentedSymbol>();
  const result = symbols.map((stem) => {
    const h = stem.box.height;
    if (stem.struck || stem.knownChar || h < 12 || h < stem.box.width * 1.2) return stem;
    const dot = symbols.find((d) => {
      if (d === stem || absorbed.has(d) || d.strokes.length !== 1 || d.struck) return false;
      if (Math.max(d.box.width, d.box.height) > Math.max(8, h * 0.25)) return false;
      const gap = stem.box.minY - d.box.maxY;
      if (gap < -h * 0.05 || gap > h * 0.7) return false;
      return d.box.cx >= stem.box.minX - h * 0.25 && d.box.cx <= stem.box.maxX + h * 0.25;
    });
    if (!dot) return stem;
    absorbed.add(dot);
    return { strokes: [...stem.strokes, ...dot.strokes], box: union(stem.box, dot.box) };
  });
  return result.filter((s) => !absorbed.has(s));
}

/** How far a stroke's path may wander from its own chord and still count as straight, as a fraction of the chord. */
const STRAIGHT_DEVIATION = 0.12;

/** Rise over run of a straight stroke's chord, or null when it isn't straight (or is too short to judge). */
function straightSlope(stroke: Stroke): number | null {
  if (stroke.length < 2) return null;
  const a = stroke[0];
  const b = stroke[stroke.length - 1];
  const chord = Math.hypot(b.x - a.x, b.y - a.y);
  if (chord < 12) return null;
  for (const p of stroke) if (pointToSegment(p, a, b) > chord * STRAIGHT_DEVIATION) return null;
  return Math.abs(b.y - a.y) / Math.max(Math.abs(b.x - a.x), 1e-6);
}

/** A strike-through's slope range: clearly diagonal (~22-80 degrees) - a flat stroke is a bar or a minus, a vertical one a "1". */
const isDiagonal = (slope: number) => slope >= 0.4 && slope <= 6;

/** Points where two strokes' segments properly cross. */
function crossingPoints(s: Stroke, t: Stroke): Point[] {
  const out: Point[] = [];
  for (let i = 1; i < s.length; i++) {
    for (let j = 1; j < t.length; j++) {
      const [a, b, c, d] = [s[i - 1], s[i], t[j - 1], t[j]];
      if (!segmentsCross(a, b, c, d)) continue;
      const den = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x);
      const u = ((c.x - a.x) * (d.y - c.y) - (c.y - a.y) * (d.x - c.x)) / den;
      out.push({ x: a.x + u * (b.x - a.x), y: a.y + u * (b.y - a.y) });
    }
  }
  return out;
}

/**
 * Finds strokes that cross out another stroke (a borrowed-from digit in
 * column subtraction: "1̸0̸0"), returning strike index -> crossed stroke index.
 * These have to be pulled out BEFORE the ink-proximity grouping, which would
 * otherwise merge strike and digit into one unrecognizable symbol. A strike
 * is a straight diagonal stroke, at least most of the digit's height long,
 * crossing the digit through the middle of the digit's own box. That last
 * part is what keeps a two-stroke "4" out (its upright crosses the other
 * stroke at the bottom edge, not the middle), and requiring the crossed
 * stroke not to be a straight diagonal itself keeps an "x"'s legs apart.
 *
 * A strike can also be a flat line drawn straight through a number (often
 * how a borrowed "10" gets crossed out once it's been used). A flat line
 * through ONE straight stroke is indistinguishable from a "+", though, so a
 * flat strike needs more evidence: it has to cross two or more strokes (a
 * whole number, "10" or "100"), or one curved digit (a "0", "2", ...), and
 * run across most of that digit's width - which also keeps a continental
 * "7"'s short crossbar from reading as a strike.
 */
function findStrikes(strokes: Stroke[], boxes: BoundingBox[]): Map<number, number[]> {
  // One strike can cross out several strokes at once - e.g. a whole small
  // "10" borrow note that was itself later struck and replaced by a "9".
  const strikes = new Map<number, number[]>();
  const slopes = strokes.map(straightSlope);
  strokes.forEach((s, i) => {
    const slope = slopes[i];
    if (slope === null) return;
    const flat = slope < 0.4;
    if (!flat && !isDiagonal(slope)) return;
    const length = Math.hypot(boxes[i].width, boxes[i].height);
    const targets: number[] = [];
    for (let j = 0; j < strokes.length; j++) {
      if (j === i || strikes.has(j)) continue;
      const target = boxes[j];
      const targetSlope = slopes[j];
      if (targetSlope !== null && isDiagonal(targetSlope)) continue; // two crossing diagonals: an "x"
      if (target.height < 10 || length < target.height * 0.6) continue;
      if (flat && target.width >= target.height * 0.3) {
        const covered = Math.min(boxes[i].maxX, target.maxX) - Math.max(boxes[i].minX, target.minX);
        if (covered < target.width * 0.85) continue;
      }
      const middle = crossingPoints(s, strokes[j]).some(
        (p) =>
          // A diagonal through an oval "0" crosses it at ~14% and ~86% of its height, so the band can't be much tighter.
          p.y > target.minY + target.height * 0.1 &&
          // Only the height matters: a flatter strike through a narrow "0" crosses its far left and right sides.
          p.y < target.maxY - target.height * 0.1
      );
      if (middle) targets.push(j);
    }
    // A flat line through a single straight stroke is a "+", not a strike.
    if (flat && targets.length === 1 && slopes[targets[0]] !== null) return;
    if (targets.length === 0) return;
    // Once a stroke has clearly crossed something out, whatever else it
    // crosses or touches at that height is crossed out too: a quick dash
    // over a small borrowed "10" cuts the "0" through its middle but often
    // only nicks the top of the "1", or just touches it (regression: only the
    // "0" of a dashed-out "10" registered as struck).
    const strikeBox = boxes[i];
    for (let j = 0; j < strokes.length; j++) {
      if (j === i || strikes.has(j) || targets.includes(j)) continue;
      const other = boxes[j];
      if (other.maxY < strikeBox.minY - 4 || other.minY > strikeBox.maxY + 4) continue;
      if (other.height < 6) continue;
      if (inkDistance(s, strokes[j]) <= Math.max(3, other.height * 0.15)) targets.push(j);
    }
    strikes.set(i, targets);
  });
  return strikes;
}

/**
 * A column calculation's line under a crossed-out digit: a long, flat stroke
 * below it, across it, no more than a few rows down. Crossing out is how
 * borrowing is written in a column subtraction - in free writing without a
 * column, two crossing strokes are an "x" drawn in curves, not a struck 7.
 */
function hasColumnLineBelow(target: BoundingBox, strokes: Stroke[], boxes: BoundingBox[], slopes: (number | null)[]): boolean {
  return boxes.some((b, k) => {
    const slope = slopes[k];
    if (slope === null || slope > 0.15 || b.width < target.width * 1.5 || b.minY <= target.maxY) return false;
    const overlaps = Math.min(b.maxX, target.maxX) - Math.max(b.minX, target.minX) > 0;
    return overlaps && b.minY - target.maxY < target.height * 6 && strokes[k].length > 1;
  });
}

export interface SegmentOptions {
  /**
   * When a line through a digit counts as crossing it out: "always" (the
   * game's boxes, a writing template - there are only digits to cross out),
   * or "inColumns" (free writing - only above a column calculation's line).
   */
  strikes?: "always" | "inColumns";
  /**
   * Which strokes are one symbol, decided by the learned net
   * (strokePairs.ts) instead of the ink-distance rules below - when one has
   * been trained. Strokes must be in the order they were drawn.
   */
  learned?: boolean;
}

/**
 * Shape tests for digits-only input (a writing template - see
 * recognizeExpression.ts), where only a few non-digit shapes can occur at all.
 */

/** Two straight diagonal strokes crossing each other - an "x" shape. Where no "x" can be written, that's a "1" crossed out. */
export function isCrossedDiagonalPair(strokes: Stroke[]): boolean {
  if (strokes.length !== 2) return false;
  const [a, b] = strokes;
  const sa = straightSlope(a);
  const sb = straightSlope(b);
  return sa !== null && sb !== null && isDiagonal(sa) && isDiagonal(sb) && crossingPoints(a, b).length > 0;
}

/** One flat stroke - a minus sign or a line, however short (no digit is a single flat stroke). */
export function isFlatDash(strokes: Stroke[]): boolean {
  if (strokes.length !== 1 || strokes[0].length < 2) return false;
  const xs = strokes[0].map((p) => p.x);
  const ys = strokes[0].map((p) => p.y);
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);
  return width >= 8 && height <= width * 0.35;
}

/** Groups strokes into symbols by proximity, then orders the result left-to-right. Empty strokes are ignored. */
export function segmentSymbols(strokes: Stroke[], options: SegmentOptions = {}): SegmentedSymbol[] {
  const nonEmpty = strokes.filter((s) => s.length > 0);
  if (nonEmpty.length === 0) return [];

  const boxes = nonEmpty.map(strokeBox);
  const expanded = boxes.map(expand);
  const margins = boxes.map(inkMargin);

  // Union-find over strokes whose actual INK comes within the larger of the
  // two strokes' margins - not their bounding boxes. Boxes are a poor proxy
  // for a symbol's extent: an "x"'s box has empty corners an exponent can sit
  // in ("x²" was read as one "4"), a "(" or a radical sign's box covers what
  // it encloses, and a fraction bar's box reaches under its numerator. Ink
  // distance joins what's actually drawn together (an "x"'s or "+"'s crossing
  // strokes, a "π"'s legs touching its bar, a "√"'s tick and bar) and nothing
  // else. The box test only stays as a cheap pre-filter.
  const parent = nonEmpty.map((_, i) => i);
  function find(i: number): number {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  }
  function merge(i: number, j: number) {
    const ri = find(i);
    const rj = find(j);
    if (ri !== rj) parent[ri] = rj;
  }
  const strikes = findStrikes(nonEmpty, boxes);
  if (options.strikes === "inColumns") {
    const slopes = nonEmpty.map(straightSlope);
    for (const [i, targets] of strikes) {
      const target = targets.map((t) => boxes[t]).reduce(union);
      if (!hasColumnLineBelow(target, nonEmpty, boxes, slopes)) strikes.delete(i);
    }
  }
  const barPartner = equalsBarPartners(nonEmpty, boxes);
  if (options.learned && hasLearnedSegmenter) {
    for (const [i, j] of learnedJoins(nonEmpty)) if (!strikes.has(i) && !strikes.has(j)) merge(i, j);
  } else for (let i = 0; i < nonEmpty.length; i++) {
    for (let j = i + 1; j < nonEmpty.length; j++) {
      if (strikes.has(i) || strikes.has(j)) continue;
      // One bar of an "=" doesn't join what only touches its end (the next digit, written close) - see equalsBarPartners.
      if (touchesOnlyTheEnd(i, j, barPartner, boxes) || touchesOnlyTheEnd(j, i, barPartner, boxes)) continue;
      if (!overlaps(expanded[i], boxes[j]) && !overlaps(boxes[i], expanded[j])) continue;
      // Within the SMALLER stroke's reach: a big stroke (a root sign, a long
      // bar) mustn't reach out and swallow the small digits written near it
      // (regression: the "23" of √(23x/3), 15px under a 175px root's bar,
      // became part of the root sign and vanished).
      if (inkDistance(nonEmpty[i], nonEmpty[j]) <= Math.min(margins[i], margins[j])) merge(i, j);
    }
  }

  const groups = new Map<number, number[]>();
  for (let i = 0; i < nonEmpty.length; i++) {
    if (strikes.has(i)) continue; // a strike-through only marks its digit, it isn't a symbol of its own
    const root = find(i);
    const list = groups.get(root) ?? [];
    list.push(i);
    groups.set(root, list);
  }

  const struckStrokes = new Set([...strikes.values()].flat());
  const grouped: SegmentedSymbol[] = [];
  for (const indices of groups.values()) {
    if (indices.some((i) => struckStrokes.has(i))) {
      grouped.push({ strokes: indices.map((i) => nonEmpty[i]), box: indices.map((i) => boxes[i]).reduce(union), struck: true });
      continue;
    }
    // Two flat bars close enough for the proximity merge are handed back to
    // pairEqualsBars as separate bars, so every "=" - tight or wide - goes
    // through the same test and gets tagged the same way.
    if (indices.length === 2 && indices.every((i) => isFlatBar({ strokes: [nonEmpty[i]], box: boxes[i] }))) {
      for (const i of indices) grouped.push({ strokes: [nonEmpty[i]], box: boxes[i] });
      continue;
    }
    const groupStrokes = indices.map((i) => nonEmpty[i]);
    const box = indices.map((i) => boxes[i]).reduce(union);
    grouped.push({ strokes: groupStrokes, box });
  }

  const symbols = attachDots(pairEqualsBars(grouped));
  symbols.sort((a, b) => a.box.cx - b.box.cx);
  return symbols;
}
