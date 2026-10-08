import { describe, expect, it } from "vitest";
import { findRadicalBar, isRootIndex, isUnderBar } from "../radical";
import type { BoundingBox } from "../segmentation";
import type { Point, Stroke } from "../../recognition/preprocess";

function boxOf(strokes: Stroke[]): BoundingBox {
  const pts = strokes.flat();
  const minX = Math.min(...pts.map((p) => p.x));
  const minY = Math.min(...pts.map((p) => p.y));
  const maxX = Math.max(...pts.map((p) => p.x));
  const maxY = Math.max(...pts.map((p) => p.y));
  return { minX, minY, maxX, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, width: maxX - minX, height: maxY - minY };
}

/** Densifies a polyline the way real pointer input arrives - many short segments, not a few long ones. */
function dense(...corners: Point[]): Stroke {
  const out: Point[] = [];
  for (let i = 0; i < corners.length - 1; i++) {
    const a = corners[i];
    const b = corners[i + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 4));
    for (let k = 0; k < n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
  }
  out.push(corners[corners.length - 1]);
  return out;
}

/** A radical drawn in one stroke: short lead-in, down to the bottom of the tick, up to the top, then a bar of the given length. */
function radical(barLength: number): Stroke[] {
  return [dense({ x: 0, y: 40 }, { x: 8, y: 34 }, { x: 18, y: 70 }, { x: 30, y: 0 }, { x: 30 + barLength, y: 2 })];
}

describe("findRadicalBar", () => {
  it.each([40, 120, 300])("finds the overbar whatever its length (%ipx)", (len) => {
    const strokes = radical(len);
    const bar = findRadicalBar(strokes, boxOf(strokes));
    expect(bar).not.toBeNull();
    expect(bar!.minX).toBeCloseTo(30, 0);
    expect(bar!.maxX).toBeCloseTo(30 + len, 0);
  });

  it("finds it when the bar is a separate stroke, even one drawn right-to-left", () => {
    const strokes = [dense({ x: 0, y: 40 }, { x: 8, y: 34 }, { x: 18, y: 70 }, { x: 30, y: 0 }), dense({ x: 150, y: 1 }, { x: 31, y: 0 })];
    expect(findRadicalBar(strokes, boxOf(strokes))).not.toBeNull();
  });

  it("rejects a '7' (flat top, but no tick to the left of it)", () => {
    const seven = [dense({ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 15, y: 60 })];
    expect(findRadicalBar(seven, boxOf(seven))).toBeNull();
  });

  it("rejects a '5' (its lowest point is out under the hat, not at the start of the bar)", () => {
    const five = [dense({ x: 8, y: 0 }, { x: 5, y: 28 }, { x: 30, y: 25 }, { x: 40, y: 45 }, { x: 25, y: 60 }, { x: 0, y: 55 }), dense({ x: 8, y: 0 }, { x: 40, y: 0 })];
    expect(findRadicalBar(five, boxOf(five))).toBeNull();
  });

  it("rejects a plain horizontal line", () => {
    const line = [dense({ x: 0, y: 0 }, { x: 100, y: 0 })];
    expect(findRadicalBar(line, boxOf(line))).toBeNull();
  });
});

describe("radicand and index regions", () => {
  const strokes = radical(100);
  const box = boxOf(strokes);
  const bar = findRadicalBar(strokes, box)!;
  const at = (cx: number, cy: number, w = 20, h = 40): BoundingBox => ({ cx, cy, width: w, height: h, minX: cx - w / 2, maxX: cx + w / 2, minY: cy - h / 2, maxY: cy + h / 2 });

  it("counts a symbol under the bar as radicand, and one past the bar's end as not", () => {
    expect(isUnderBar(bar, box, at(70, 40))).toBe(true);
    expect(isUnderBar(bar, box, at(200, 40))).toBe(false);
  });

  it("reads a small symbol in the crook as the index, but not a normal-sized symbol on the baseline before the root", () => {
    expect(isRootIndex(bar, box, at(6, 18, 10, 16))).toBe(true);
    expect(isRootIndex(bar, box, at(-20, 45))).toBe(false);
  });
});
