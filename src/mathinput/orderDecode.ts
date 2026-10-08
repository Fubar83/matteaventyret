/**
 * Reading writing whose order is part of the input (a profile's
 * strictOrder): each symbol is finished before the next is started, so the
 * strokes, in the order they were drawn, split into consecutive groups - one
 * per symbol. Which split is chosen together with what each group reads as:
 * every group of 1-4 consecutive strokes is classified, and the split whose
 * groups read best wins (dynamic programming over the strokes), weighed
 * with the learned segmenter's view of which strokes belong together
 * (strokePairs.ts). Nothing is cut first and read afterwards, so "these two
 * strokes are a 5" and "these two strokes are an =" are compared on how
 * well each reads. The symbol checker (symbolCheck.ts) says how likely each
 * group is a real symbol at all, so a wrong cut that happens to look like a
 * character (one bar of an "=" is a fine "-") still loses.
 *
 * Each group is also held to how its character may be written
 * (strokeOrder.ts): a reading the ink wasn't written the allowed way for
 * counts far less, and if it still wins, the symbol is marked so the child
 * can be shown how to write it. Symbols can come in any order (brackets
 * added afterwards), except a fraction's numerator before its bar.
 */
import type { Stroke } from "../recognition/preprocess";
import { followsOrder } from "../recognition/strokeOrder";
import { symbolProbabilities } from "../recognition/symbolCheck";
import type { RecognizedSymbol } from "./recognizeExpression";
import type { SegmentedSymbol } from "./segmentation";
import { boxFromCorners, strokeBox, union, type BoundingBox } from "./strokeGeometry";
import { sameSymbolProbability, strokePairs, typicalSize } from "./strokePairs";

/** Longest run of strokes one symbol can be (π, ≠, a crossed 7 are 3). */
const MAX_GROUP = 4;
/** More strokes than this and the page is read the ordinary way (strokes are classified up to MAX_GROUP times each). */
const MAX_STROKES = 60;
/**
 * How much less a reading counts when the ink wasn't written the way its
 * character is taught, and the weight of how well each group reads against
 * the segmenter's view of which strokes belong together. An object so the
 * benchmark (scripts/ts/benchmarkOrder.ts) can try others.
 */
export const ORDER_TUNING = { wrongOrderFactor: 0.08, readingWeight: 1, checkerWeight: 1 };
/** The segmenter's probability for strokes too far apart to be asked about - they're surely not one symbol. */
const FAR_APART = 0.001;

/** Why a symbol is asked about: its strokes weren't written the taught way, or a fraction's bar came before its numerator. */
export type OrderProblem = "strokes" | "numeratorFirst";

type Classify = (seg: SegmentedSymbol, all: SegmentedSymbol[]) => Promise<RecognizedSymbol>;

/** A group's best reading under the writing rules, and how sure it is. */
function judged(read: RecognizedSymbol, strokes: Stroke[]): { read: RecognizedSymbol; p: number } {
  const scores = read.scores ?? read.alternatives.map((_, k) => (k === 0 ? (read.confident ? 0.95 : 0.5) : 0));
  let best = { char: read.char, p: -1, ok: true };
  read.alternatives.forEach((char, k) => {
    const ok = followsOrder(char, strokes);
    const p = (scores[k] ?? 0) * (ok ? 1 : ORDER_TUNING.wrongOrderFactor);
    if (p > best.p) best = { char, p, ok };
  });
  const p = Math.max(best.p, 1e-4);
  if (best.char === read.char && best.ok) return { read, p };
  const alternatives = [best.char, ...read.alternatives.filter((c) => c !== best.char)];
  const orderProblem: OrderProblem | undefined = best.ok ? undefined : "strokes";
  return { read: { ...read, char: best.char, alternatives, confident: read.confident && best.ok && best.char === read.char, orderProblem }, p };
}

/**
 * The strokes (in drawing order) read as consecutive groups - or null when
 * the page is too long to read this way. `context` is the ordinary
 * segmentation, which each group is read next to (a symbol's size on its
 * line, what's under a root's bar).
 */
export async function decodeInOrder(strokes: Stroke[], context: SegmentedSymbol[], classify: Classify): Promise<{ segments: SegmentedSymbol[]; read: RecognizedSymbol[] } | null> {
  const n = strokes.length;
  if (n === 0 || n > MAX_STROKES) return null;
  const boxes = strokes.map(strokeBox);
  const u = typicalSize(boxes);

  // The segmenter's view of every close pair: log-odds of being one symbol.
  const logOdds = new Map<number, number>();
  for (const pair of strokePairs(strokes)) {
    const p = Math.min(0.999, Math.max(FAR_APART, sameSymbolProbability(pair.features)));
    logOdds.set(pair.a * n + pair.b, Math.log(p) - Math.log(1 - p));
  }
  const odds = (i: number, j: number) => logOdds.get(i * n + j) ?? Math.log(FAR_APART) - Math.log(1 - FAR_APART);

  // Every run of consecutive strokes compact enough to be one symbol, read.
  const ordinary = new Map(context.map((seg) => [seg.strokes.map((s) => strokes.indexOf(s)).join(","), seg]));
  const candidates: { start: number; size: number; seg: SegmentedSymbol }[] = [];
  for (let t = 0; t < n; t++) {
    let box: BoundingBox = boxes[t];
    for (let m = 1; m <= MAX_GROUP && t + m <= n; m++) {
      if (m > 1) box = union(box, boxes[t + m - 1]);
      if (m > 1 && Math.max(box.width, box.height) > u * 2.5) break;
      const key = Array.from({ length: m }, (_, k) => t + k).join(",");
      // A group the ordinary segmentation also found keeps what it settled by geometry (a paired "=").
      const seg = ordinary.get(key) ?? { strokes: strokes.slice(t, t + m), box: boxFromCorners(box.minX, box.minY, box.maxX, box.maxY) };
      candidates.push({ start: t, size: m, seg });
    }
  }
  const reads = await Promise.all(
    candidates.map(async (c) => {
      const others = context.filter((o) => !o.strokes.some((s) => c.seg.strokes.includes(s)));
      return judged(await classify(c.seg, [...others, c.seg]), c.seg.strokes);
    })
  );
  // Whether each group is one real symbol at all (symbolCheck.ts) - the picture model names a character for anything,
  // half of a "+" included. Without a trained checker, every group counts as one.
  const real = await symbolProbabilities(
    candidates.map((c) => c.seg.strokes),
    u
  );

  // Best split: best[t] = the best score reading the first t strokes.
  const best = new Array(n + 1).fill(-Infinity);
  const choice = new Array<number>(n + 1).fill(-1);
  best[0] = 0;
  const startsAt = new Map<number, number[]>();
  candidates.forEach((c, k) => startsAt.set(c.start, [...(startsAt.get(c.start) ?? []), k]));
  for (let t = 0; t < n; t++) {
    if (best[t] === -Infinity) continue;
    for (const k of startsAt.get(t) ?? []) {
      const { size } = candidates[k];
      let together = 0;
      for (let i = t; i < t + size; i++) for (let j = i + 1; j < t + size; j++) together += odds(i, j);
      const isSymbol = real ? ORDER_TUNING.checkerWeight * Math.log(Math.max(real[k], 1e-4)) : 0;
      const score = best[t] + ORDER_TUNING.readingWeight * Math.log(reads[k].p) + isSymbol + together;
      if (score > best[t + size]) {
        best[t + size] = score;
        choice[t + size] = k;
      }
    }
  }
  if (best[n] === -Infinity) return null;
  const picked: number[] = [];
  for (let t = n; t > 0; t -= candidates[choice[t]].size) picked.unshift(choice[t]);
  const segments = picked.map((k) => candidates[k].seg);
  const read = picked.map((k) => reads[k].read);
  markNumeratorsAfterBars(segments, read, picked.map((k) => candidates[k].start));
  return { segments, read };
}

/** Brackets may be added around a numerator afterwards - only what's inside them has to come before the bar. */
const ADDED_LATER = new Set(["(", ")"]);

/**
 * A fraction's numerator is written before its bar. A bar is a dash with
 * writing just above it and just below it, within its width; anything above
 * it drawn after it (brackets aside) marks the bar.
 */
function markNumeratorsAfterBars(segments: SegmentedSymbol[], read: RecognizedSymbol[], drawnAt: number[]) {
  read.forEach((bar, b) => {
    if (bar.char !== "-") return;
    const box = segments[b].box;
    const within = (o: BoundingBox) => o.cx > box.minX && o.cx < box.maxX;
    const reach = Math.max(box.width, 1);
    const above = read.map((_, k) => k).filter((k) => k !== b && within(segments[k].box) && segments[k].box.maxY <= box.cy && box.cy - segments[k].box.maxY < reach);
    const below = read.some((_, k) => k !== b && within(segments[k].box) && segments[k].box.minY >= box.cy && segments[k].box.minY - box.cy < reach);
    if (above.length === 0 || !below) return;
    if (above.some((k) => drawnAt[k] > drawnAt[b] && !ADDED_LATER.has(read[k].char))) read[b] = { ...bar, confident: false, orderProblem: "numeratorFirst" };
  });
}
