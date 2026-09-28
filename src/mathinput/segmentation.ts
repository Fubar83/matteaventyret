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
import type { Stroke } from "../recognition/preprocess";

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  cx: number;
  cy: number;
  width: number;
  height: number;
}

export interface SegmentedSymbol {
  strokes: Stroke[];
  box: BoundingBox;
}

function strokeBox(stroke: Stroke): BoundingBox {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of stroke) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  if (minX === Infinity) {
    // A single tap with no movement never happens in practice (pointerdown
    // always records at least one point), but stay defined if it ever does.
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, cx: 0, cy: 0, width: 0, height: 0 };
  }
  return boxFromCorners(minX, minY, maxX, maxY);
}

function boxFromCorners(minX: number, minY: number, maxX: number, maxY: number): BoundingBox {
  return { minX, minY, maxX, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, width: maxX - minX, height: maxY - minY };
}

function union(a: BoundingBox, b: BoundingBox): BoundingBox {
  return boxFromCorners(Math.min(a.minX, b.minX), Math.min(a.minY, b.minY), Math.max(a.maxX, b.maxX), Math.max(a.maxY, b.maxY));
}

/** How far (as a fraction of a stroke's OWN size) two strokes' boxes are allowed to bridge a gap and still merge - deliberately small: it only needs to close the little gaps within one multi-stroke symbol (the two legs of an "x", a dot next to its stem), not the gap to the next symbol over. Scaling by each stroke's own size (rather than a single page-wide size) matters because real handwriting mixes stroke sizes - a page-wide margin sized for a big "x" would happily bridge the small gap to a neighboring "=" too. The two bars of "=" itself are too far apart for this to bridge - see pairEqualsBars. */
const MERGE_RATIO = 0.2;
/** Floor for the margin above, in px, so a near-zero-size stroke (a precise tap, or a dot drawn with almost no drag) still gets a sensible merge radius instead of ~0. */
const MIN_MERGE_MARGIN = 6;

function expand(box: BoundingBox): BoundingBox {
  // The margin is scaled off the SHORTER side, not the longer one: a fraction
  // bar or an "=" bar is deliberately wide and thin, and scaling off its
  // width would inflate its margin to the point of swallowing the numerator
  // and denominator above and below it (this is exactly what produced one
  // giant merged blob out of a plain "1 / 2" fraction before this fix).
  const margin = Math.max(Math.min(box.width, box.height) * MERGE_RATIO, MIN_MERGE_MARGIN);
  return boxFromCorners(box.minX - margin, box.minY - margin, box.maxX + margin, box.maxY + margin);
}

function overlaps(a: BoundingBox, b: BoundingBox): boolean {
  return a.minX <= b.maxX && b.minX <= a.maxX && a.minY <= b.maxY && b.minY <= a.maxY;
}

/** One roughly-horizontal single stroke - a candidate bar of an "=". */
function isFlatBar(s: SegmentedSymbol): boolean {
  return s.strokes.length === 1 && s.box.width >= 8 && s.box.height <= s.box.width * 0.35;
}

/**
 * The two bars of an "=" sit farther apart than the proximity merge above
 * can bridge - by design, since that margin is scaled off a bar's thin side
 * so a fraction bar can't swallow its numerator. So they're paired
 * explicitly here: two flat bars of similar length, mostly overlapping
 * horizontally, close together relative to their length, with nothing drawn
 * between them. That last check is what keeps two stacked bars of a nested
 * fraction (which always have a digit or letter between them) apart.
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
      if (shorter / longer < 0.6) continue;
      if (overlapRight - overlapLeft < shorter * 0.6) continue;
      if (gap < 0 || gap > longer * 0.7) continue;
      const somethingBetween = symbols.some(
        (s) => s !== a && s !== b && s.box.cy > top.box.maxY && s.box.cy < bottom.box.minY && s.box.cx > overlapLeft && s.box.cx < overlapRight
      );
      if (somethingBetween) continue;
      paired.add(a);
      paired.add(b);
      merged.push({ strokes: [...top.strokes, ...bottom.strokes], box: union(a.box, b.box) });
      break;
    }
  }
  return [...symbols.filter((s) => !paired.has(s)), ...merged];
}

/** Groups strokes into symbols by proximity, then orders the result left-to-right. Empty strokes are ignored. */
export function segmentSymbols(strokes: Stroke[]): SegmentedSymbol[] {
  const nonEmpty = strokes.filter((s) => s.length > 0);
  if (nonEmpty.length === 0) return [];

  const boxes = nonEmpty.map(strokeBox);
  const expanded = boxes.map(expand);

  // Union-find over strokes whose expanded boxes overlap.
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
  for (let i = 0; i < nonEmpty.length; i++) {
    for (let j = i + 1; j < nonEmpty.length; j++) {
      if (overlaps(expanded[i], expanded[j])) merge(i, j);
    }
  }

  const groups = new Map<number, number[]>();
  for (let i = 0; i < nonEmpty.length; i++) {
    const root = find(i);
    const list = groups.get(root) ?? [];
    list.push(i);
    groups.set(root, list);
  }

  const grouped: SegmentedSymbol[] = [];
  for (const indices of groups.values()) {
    const groupStrokes = indices.map((i) => nonEmpty[i]);
    const box = indices.map((i) => boxes[i]).reduce(union);
    grouped.push({ strokes: groupStrokes, box });
  }

  const symbols = pairEqualsBars(grouped);
  symbols.sort((a, b) => a.box.cx - b.box.cx);
  return symbols;
}
