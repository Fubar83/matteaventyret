/**
 * Reading the drawing board box by box: which box a stroke belongs to, what
 * a box's ink says (one or two digits, or a line crossing it out), and - when
 * the recognizer isn't sure - the most likely alternatives for the child to
 * pick from.
 *
 * Only digits can be written in a box, so recognition is the digits-only
 * classifier (as the game has always used), plus the one digit-to-digit check
 * that helps there (a narrow "0" the model calls "8" - see glyphChecks.ts).
 */
import { checkGlyph, looksLikeOne } from "../../mathinput/glyphChecks";
import { segmentSymbols } from "../../mathinput/segmentation";
import type { Point, Stroke } from "../../recognition/preprocess";
import type { BoxReading, DrawBox } from "./boardTypes";

function bounds(stroke: Stroke) {
  const xs = stroke.map((p) => p.x);
  const ys = stroke.map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return { minX, minY, maxX, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
}

/**
 * The box a stroke was written in: the one its center is in (with a little
 * slack around each box, since a child's digit rarely stays inside the lines),
 * the nearest one when it's near two. Null when it's nowhere near a box.
 */
export function boxForStroke(stroke: Stroke, boxes: readonly DrawBox[]): string | null {
  if (stroke.length === 0) return null;
  const { cx, cy } = bounds(stroke);
  let best: { id: string; dist: number } | null = null;
  for (const b of boxes) {
    const pad = Math.min(b.w, b.h) * 0.3;
    if (cx < b.x - pad || cx > b.x + b.w + pad || cy < b.y - pad || cy > b.y + b.h + pad) continue;
    // Distance from the box's center, relative to its size - so a small carry box next to a big answer box still wins for ink right on it.
    const dist = Math.hypot((cx - (b.x + b.w / 2)) / b.w, (cy - (b.y + b.h / 2)) / b.h);
    if (!best || dist < best.dist) best = { id: b.id, dist };
  }
  return best?.id ?? null;
}

function pointToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/**
 * A line crossing a box out: one straight stroke, running across most of the
 * box, and not upright (an upright straight stroke is a "1", not a strike).
 */
export function isStrikeLine(stroke: Stroke, box: DrawBox): boolean {
  if (stroke.length < 2) return false;
  const a = stroke[0];
  const b = stroke[stroke.length - 1];
  const dx = Math.abs(b.x - a.x);
  const dy = Math.abs(b.y - a.y);
  const chord = Math.hypot(dx, dy);
  if (chord < Math.min(box.w, box.h) * 0.6) return false;
  if (dx < dy * 0.5) return false;
  // Long enough to cross the box's content, not just a digit inside it.
  if (dx < box.w * 0.5) return false;
  return stroke.every((p) => pointToSegment(p, a, b) <= chord * 0.15);
}

/**
 * A plus sign: two strokes, one running across and one up and down (each
 * within about 35° - a quick "+" is rarely square), crossing each other
 * somewhere in their middle parts. An "x" (two diagonals), a "-", a "1" or
 * a "T" (crossing at an end) isn't one.
 */
export function isPlusSign(strokes: Stroke[]): boolean {
  const lines = strokes
    .filter((s) => s.length >= 2)
    .map((s) => ({ a: s[0], b: s[s.length - 1], len: Math.hypot(s[s.length - 1].x - s[0].x, s[s.length - 1].y - s[0].y) }))
    .filter((l) => l.len > 0);
  const tilt = (l: (typeof lines)[number]) => (Math.atan2(Math.abs(l.b.y - l.a.y), Math.abs(l.b.x - l.a.x)) * 180) / Math.PI; // 0 = across, 90 = up and down
  for (const across of lines.filter((l) => tilt(l) <= 35)) {
    for (const upDown of lines.filter((l) => tilt(l) >= 55)) {
      if (Math.min(across.len, upDown.len) < Math.max(across.len, upDown.len) * 0.35) continue; // a dot or a nick, not an arm
      const hit = crossing(across.a, across.b, upDown.a, upDown.b);
      if (hit && hit.t > 0.15 && hit.t < 0.85 && hit.u > 0.15 && hit.u < 0.85) return true;
    }
  }
  return false;
}

/** Where segments pq and rs cross: the fractions along each (0..1), or null if they don't. */
function crossing(p: Point, q: Point, r: Point, s: Point): { t: number; u: number } | null {
  const d = (q.x - p.x) * (s.y - r.y) - (q.y - p.y) * (s.x - r.x);
  if (d === 0) return null;
  const t = ((r.x - p.x) * (s.y - r.y) - (r.y - p.y) * (s.x - r.x)) / d;
  const u = ((r.x - p.x) * (q.y - p.y) - (r.y - p.y) * (q.x - p.x)) / d;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? { t, u } : null;
}

/** Ink pieces with their extent across the box. */
interface Piece {
  strokes: Stroke[];
  box: { minX: number; maxX: number };
}

/**
 * Two digits in a box are written side by side, so pieces stacked over one
 * another are one digit: a 5's flag above its body, a 4's or 7's crossbar.
 * Merges neighbours (sorted left to right) whose spans across overlap by at
 * least half of the narrower one.
 */
function mergeStacked(pieces: Piece[]): Piece[] {
  const out: Piece[] = [];
  for (const p of pieces) {
    const last = out[out.length - 1];
    if (last) {
      const overlap = Math.min(last.box.maxX, p.box.maxX) - Math.max(last.box.minX, p.box.minX);
      const narrower = Math.min(last.box.maxX - last.box.minX, p.box.maxX - p.box.minX);
      if (overlap >= narrower * 0.5) {
        out[out.length - 1] = { strokes: [...last.strokes, ...p.strokes], box: { minX: Math.min(last.box.minX, p.box.minX), maxX: Math.max(last.box.maxX, p.box.maxX) } };
        continue;
      }
    }
    out.push(p);
  }
  return out;
}

/** Splits a box's ink into up to `maxDigits` digits, left to right - by the widest gaps if the ink falls into more pieces than that. */
export function splitDigits(strokes: Stroke[], maxDigits: number): Stroke[][] {
  if (maxDigits <= 1 || strokes.length <= 1) return [strokes];
  const symbols = mergeStacked(segmentSymbols(strokes).sort((a, b) => a.box.cx - b.box.cx));
  if (symbols.length <= maxDigits) return symbols.map((s) => s.strokes);
  // Cut at the (maxDigits - 1) widest horizontal gaps between neighboring pieces.
  const gaps = symbols.slice(1).map((s, i) => ({ i, gap: s.box.minX - symbols[i].box.maxX }));
  const cuts = new Set(
    gaps
      .sort((p, q) => q.gap - p.gap)
      .slice(0, maxDigits - 1)
      .map((g) => g.i)
  );
  const groups: Stroke[][] = [[]];
  symbols.forEach((s, i) => {
    groups[groups.length - 1].push(...s.strokes);
    if (cuts.has(i)) groups.push([]);
  });
  return groups;
}

/**
 * What a box's ink says. `fresh` are the strokes added since the box was
 * last read - a line crossing the box out only counts when it's new, so an
 * earlier strike through a borrowed "10" doesn't hide its digits later.
 */
export async function readBox(box: DrawBox, strokes: Stroke[], fresh: Stroke[]): Promise<BoxReading> {
  if (strokes.length === 0) return { kind: "empty" };
  if (box.kind === "sign") return { kind: "sign", plus: isPlusSign(strokes), strokes };
  if (box.strikeable) {
    const strike = fresh.filter((s) => isStrikeLine(s, box));
    if (strike.length > 0) return { kind: "strike", strokes: strike };
  }
  if (box.kind === "printed") return { kind: "invalid", strokes: fresh };

  // A borrowed ten crossed out earlier keeps its strike line - it isn't part of the digits.
  const digitStrokes = box.strikeable ? strokes.filter((s) => !isStrikeLine(s, box)) : strokes;
  if (digitStrokes.length === 0) return { kind: "empty" };

  const { recognizeDigitStrokes } = await import("../../recognition/recognizer");
  const groups = splitDigits(digitStrokes, box.maxDigits ?? 1);
  const results = await Promise.all(groups.map((g) => recognizeDigitStrokes(g, box.h)));
  const digits = results.map((r, i) => Number(checkGlyph(String(r.digit), groups[i], r.probs, r.labels)));
  // A "1" settled by its shape (see looksLikeOne) is as sure as a confident read.
  const sure = results.map((r, i) => r.confident || (digits[i] === 1 && looksLikeOne(groups[i])));
  if (sure.every(Boolean)) {
    const mirrored = results.map((r) => r.mirrored);
    return mirrored.some(Boolean) ? { kind: "digits", digits, mirrored } : { kind: "digits", digits };
  }

  // Unsure: the best reading, and the one with the least certain (not shape-settled) digit swapped for its runner-up.
  let weakest = sure.indexOf(false);
  results.forEach((r, i) => {
    if (!sure[i] && r.topTwo.first.prob < results[weakest].topTwo.first.prob) weakest = i;
  });
  const alt = digits.map((d, i) => (i === weakest ? results[i].topTwo.second.digit : d));
  return { kind: "unsure", guesses: [digits, alt] };
}
