import { describe, expect, it } from "vitest";
import type { Stroke } from "../../recognition/preprocess";
import { segmentSymbols } from "../segmentation";
import { hasLearnedSegmenter, PAIR_FEATURES, PAIR_REACH, sameSymbolProbability, strokePairs, typicalSize } from "../strokePairs";
import { strokeBox } from "../strokeGeometry";

const line = (x1: number, y1: number, x2: number, y2: number, n = 8): Stroke =>
  Array.from({ length: n + 1 }, (_, i) => ({ x: x1 + ((x2 - x1) * i) / n, y: y1 + ((y2 - y1) * i) / n }));

/** "x = 1": two crossing diagonals, two bars, an upright far to the right. */
const page: Stroke[] = [line(0, 0, 40, 60), line(40, 0, 0, 60), line(70, 22, 110, 22), line(70, 40, 110, 40), line(150, 0, 150, 60)];

describe("strokePairs", () => {
  it("gives every pair the same features, in order", () => {
    const pairs = strokePairs(page);
    expect(pairs.length).toBeGreaterThan(0);
    for (const p of pairs) {
      expect(p.a).toBeLessThan(p.b);
      expect(p.features).toHaveLength(PAIR_FEATURES.length);
      expect(p.features.every(Number.isFinite)).toBe(true);
    }
  });

  it("measures the crossing legs of an x as touching, drawn one after the other", () => {
    const x = strokePairs(page).find((p) => p.a === 0 && p.b === 1)!;
    const at = (name: (typeof PAIR_FEATURES)[number]) => x.features[PAIR_FEATURES.indexOf(name)];
    expect(at("inkDist")).toBe(0);
    expect(at("crossings")).toBe(1);
    expect(at("consecutive")).toBe(1);
  });

  it("doesn't ask about strokes too far apart to be one symbol", () => {
    const far: Stroke[] = [line(0, 0, 0, 60), line(1000, 0, 1000, 60)];
    expect(PAIR_REACH * typicalSize(far.map(strokeBox))).toBeLessThan(1000);
    expect(strokePairs(far)).toEqual([]);
  });

  it("is a probability", () => {
    for (const p of strokePairs(page)) {
      const v = sameSymbolProbability(p.features);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });
});

describe("segmentSymbols with the learned segmenter", () => {
  it.runIf(hasLearnedSegmenter)("still finds x, = and 1 on a plain page", () => {
    const symbols = segmentSymbols(page, { learned: true });
    expect(symbols.map((s) => s.strokes.length)).toEqual([2, 2, 1]);
    expect(symbols[1].knownChar).toBe("=");
  });

  it("falls back to the rules without a trained net", () => {
    if (hasLearnedSegmenter) return;
    expect(segmentSymbols(page, { learned: true })).toEqual(segmentSymbols(page));
  });
});
