import { describe, expect, it } from "vitest";
import { segmentSymbols } from "../segmentation";
import type { Stroke } from "../../recognition/preprocess";

function box(x: number, y: number, w: number, h: number): Stroke {
  return [
    { x, y },
    { x: x + w, y: y + h },
  ];
}

describe("segmentSymbols", () => {
  it("returns nothing for an empty page", () => {
    expect(segmentSymbols([])).toEqual([]);
  });

  it("keeps far-apart strokes as separate symbols, ordered left to right", () => {
    const strokes = [box(200, 0, 20, 20), box(0, 0, 20, 20), box(400, 0, 20, 20)];
    const symbols = segmentSymbols(strokes);
    expect(symbols.length).toBe(3);
    expect(symbols.map((s) => s.box.cx)).toEqual([10, 210, 410]);
  });

  it("merges strokes with a small gap between them into one symbol (e.g. the two legs of an 'x', or a dot and its stem)", () => {
    const strokes = [box(0, 0, 20, 20), box(25, 0, 20, 20)];
    const symbols = segmentSymbols(strokes);
    expect(symbols.length).toBe(1);
    expect(symbols[0].strokes.length).toBe(2);
  });

  it("does not merge a numerator and denominator just because they share a column (different rows)", () => {
    // Same horizontal span, but far apart vertically - should stay separate symbols.
    const strokes = [box(0, 0, 20, 10), box(0, 100, 20, 10)];
    const symbols = segmentSymbols(strokes);
    expect(symbols.length).toBe(2);
  });

  it("keeps a page of tightly-but-distinctly spaced symbols separate, while still merging each symbol's own strokes (regression: a whole '1/x^2=10' page was once merged into a single blob)", () => {
    const x = [box(0, 0, 20, 40), box(20, 0, 20, 40)]; // two touching strokes, one symbol
    const equals = [box(60, 10, 30, 8), box(60, 25, 30, 8)]; // two close-but-separate bars, one symbol
    const digit = [box(110, 0, 15, 40)]; // a lone symbol
    const symbols = segmentSymbols([...x, ...equals, ...digit]);
    expect(symbols.length).toBe(3);
    expect(symbols.map((s) => s.strokes.length)).toEqual([2, 2, 1]);
  });

  it("doesn't let a wide, thin fraction bar swallow the numerator and denominator above and below it (regression: a plain '1 / 2' was merged into a single blob)", () => {
    const numerator = box(60, 0, 15, 40); // "1", tall and narrow
    const bar = box(0, 55, 150, 8); // a full-width horizontal bar, wide and thin
    const denominator = box(55, 85, 40, 50); // "2"
    const symbols = segmentSymbols([numerator, bar, denominator]);
    expect(symbols.length).toBe(3);
  });
});
