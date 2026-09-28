import { describe, expect, it } from "vitest";
import { detectLine } from "../lineDetection";
import type { SegmentedSymbol } from "../../mathinput/segmentation";
import type { Point, Stroke } from "../../recognition/preprocess";

function symbolOf(strokes: Stroke[]): SegmentedSymbol {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of strokes) {
    for (const p of s) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }
  return { strokes, box: { minX, minY, maxX, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, width: maxX - minX, height: maxY - minY } };
}

/** A hand-drawn-ish straight segment: evenly stepped points with a little jitter, never straying far from the a-b line. */
function jitteredLine(a: Point, b: Point, jitter: number, steps = 20): Stroke {
  const pts: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const wobble = Math.sin(t * Math.PI * 3) * jitter;
    const dx = b.y - a.y;
    const dy = -(b.x - a.x);
    const len = Math.hypot(dx, dy) || 1;
    pts.push({ x: a.x + (b.x - a.x) * t + (dx / len) * wobble, y: a.y + (b.y - a.y) * t + (dy / len) * wobble });
  }
  return pts;
}

describe("detectLine", () => {
  it("detects a clean horizontal line", () => {
    const symbol = symbolOf([jitteredLine({ x: 0, y: 0 }, { x: 100, y: 0 }, 1)]);
    const line = detectLine(symbol);
    expect(line).not.toBeNull();
    expect(line!.type).toBe("line");
  });

  it("still accepts a bar that drifts slightly up or down", () => {
    const symbol = symbolOf([jitteredLine({ x: 0, y: 0 }, { x: 100, y: 25 }, 1)]);
    expect(detectLine(symbol)).not.toBeNull();
  });

  it("leaves a straight diagonal stroke to the classifier (a division slash is a glyph, not a line)", () => {
    const symbol = symbolOf([jitteredLine({ x: 0, y: 30 }, { x: 40, y: 0 }, 1)]);
    expect(detectLine(symbol)).toBeNull();
  });

  it("leaves a straight vertical stroke to the classifier (regression: a '1' written as one stroke came back as a line)", () => {
    const symbol = symbolOf([jitteredLine({ x: 0, y: 0 }, { x: 0, y: 90 }, 1)]);
    expect(detectLine(symbol)).toBeNull();
  });

  it("rejects a short mark (e.g. a dot or comma) even if technically straight", () => {
    const symbol = symbolOf([jitteredLine({ x: 0, y: 0 }, { x: 3, y: 0 }, 0.2)]);
    expect(detectLine(symbol)).toBeNull();
  });

  it("rejects a curved stroke (e.g. part of a digit) even at a plausible line length", () => {
    // A big, obvious arc - far too much deviation from straight to pass as a line.
    const pts: Point[] = [];
    for (let i = 0; i <= 20; i++) {
      const t = (i / 20) * Math.PI;
      pts.push({ x: 50 * Math.cos(t), y: 50 * Math.sin(t) });
    }
    const symbol = symbolOf([pts]);
    expect(detectLine(symbol)).toBeNull();
  });

  it("rejects a two-stroke crossing shape (e.g. 'x') as a single line", () => {
    const symbol = symbolOf([jitteredLine({ x: 0, y: 0 }, { x: 30, y: 30 }, 1), jitteredLine({ x: 30, y: 0 }, { x: 0, y: 30 }, 1)]);
    // The two strokes' own endpoints span the full box diagonally-ish in a way
    // that isn't a straight line at all once both are considered together.
    expect(detectLine(symbol)).toBeNull();
  });

  it("returns endpoints matching the actual drawn extent", () => {
    const symbol = symbolOf([jitteredLine({ x: 10, y: 50 }, { x: 110, y: 50 }, 0.5)]);
    const line = detectLine(symbol);
    expect(line).not.toBeNull();
    const xs = [line!.x1, line!.x2].sort((a, b) => a - b);
    expect(xs[0]).toBeCloseTo(10, 0);
    expect(xs[1]).toBeCloseTo(110, 0);
  });
});
