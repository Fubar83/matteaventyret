import { beforeEach, describe, expect, it } from "vitest";
import { layoutLines, type ClassifiedSymbol } from "../../mathinput/layout";
import { readingScore, rerank } from "../../mathinput/rerank";
import { forgetHandwriting, personalSamples, rememberInk } from "../personal";
import { binOf, REL_H_EDGES, sizeWeights, symbolContext } from "../sizePrior";
import { resampleStrokes, STROKE_POINTS } from "../strokeFeatures";

const box = (cx: number, cy: number, w: number, h: number) => ({ cx, cy, width: w, height: h, minX: cx - w / 2, maxX: cx + w / 2, minY: cy - h / 2, maxY: cy + h / 2 });

describe("choosing between near-equal readings (rerank)", () => {
  // "2 ? = 6" where the second symbol is "+" or "4" by a hair - "2 + = 6" isn't maths, "24 = 6" is (if wrong).
  const symbols = [
    { char: "2", alternatives: ["2"], scores: [0.99], confident: true, box: box(10, 50, 20, 36) },
    { char: "+", alternatives: ["+", "4"], scores: [0.52, 0.46], confident: false, box: box(35, 50, 20, 30) },
    { char: "=", alternatives: ["="], scores: [0.99], confident: true, box: box(60, 50, 18, 14) },
    { char: "6", alternatives: ["6"], scores: [0.99], confident: true, box: box(85, 50, 20, 36) },
  ];
  const layout = (chars: string[]) => layoutLines(symbols.map((s, i): ClassifiedSymbol => ({ char: chars[i], box: s.box })));

  it("picks the guess that makes the line read as maths - whether or not the maths is right", () => {
    expect(rerank(symbols, layout)).toEqual(["2", "4", "=", "6"]);
  });

  it("leaves confident symbols and pinned ones alone", () => {
    expect(rerank(symbols.map((s) => ({ ...s, confident: true })), layout)[1]).toBe("+");
    expect(rerank(symbols.map((s, i) => (i === 1 ? { ...s, pinned: true } : s)), layout)[1]).toBe("+");
  });

  it("never prefers a reading because its arithmetic is right", () => {
    // "8 · 5 / 2 = 20" vs "8 · 6 / 2 = 20": both parse, so the classifier's own (higher) guess stays - the mistake stays visible.
    expect(readingScore("\\frac{8 \\cdot 5}{2} = 2 0")).toBe(readingScore("\\frac{8 \\cdot 6}{2} = 2 0"));
  });

  it("a number the question gives counts a little", () => {
    expect(readingScore("8 \\cdot 6", [6])).toBeGreaterThan(readingScore("8 \\cdot 5", [6]));
  });
});

describe("size and height on the line (sizePrior)", () => {
  const digits = [box(10, 50, 20, 40), box(40, 50, 20, 40), box(70, 50, 20, 40)];

  it("a digit among digits is full height and on the middle of the line", () => {
    const c = symbolContext(digits[1], digits);
    expect(c.relH).toBeCloseTo(1);
    expect(c.dy).toBeCloseTo(0);
  });

  it("a dot is small and low; a raised small digit is small and high", () => {
    const dot = box(55, 68, 4, 4);
    expect(symbolContext(dot, [...digits, dot]).relH).toBeLessThan(0.2);
    expect(symbolContext(dot, [...digits, dot]).dy).toBeGreaterThan(0.3);
    const exp = box(85, 32, 12, 20);
    const c = symbolContext(exp, [...digits, exp]);
    expect(c.relH).toBeCloseTo(0.5);
    expect(c.dy).toBeLessThan(-0.3);
  });

  it("bins by the edges", () => {
    expect(binOf(0.1, REL_H_EDGES)).toBe(0);
    expect(binOf(1.1, REL_H_EDGES)).toBe(6);
  });

  it("weights average 1, so they only shift guesses towards what's usual there", () => {
    const w = sizeWeights(["0", "1", ".", "-"], 0.15, 0.4);
    expect(w.reduce((a, b) => a + b, 0) / w.length).toBeCloseTo(1);
  });
});

describe("how it was drawn (strokeFeatures)", () => {
  it("a fixed number of points in [-1, 1], with the pen coming down at each stroke's start", () => {
    // A "+": across, then down.
    const f = resampleStrokes([
      [{ x: 0, y: 20 }, { x: 40, y: 20 }],
      [{ x: 20, y: 0 }, { x: 20, y: 40 }],
    ]);
    expect(f.length).toBe(STROKE_POINTS * 3);
    const penDowns = Array.from({ length: STROKE_POINTS }, (_, k) => f[k * 3 + 2]).filter((v) => v === 1).length;
    expect(penDowns).toBe(2);
    expect(Math.max(...Array.from(f).filter((_, i) => i % 3 !== 2).map(Math.abs))).toBeLessThanOrEqual(1.0001);
  });

  it("a dot still gets a point of its own", () => {
    const f = resampleStrokes([[{ x: 0, y: 0 }, { x: 0, y: 30 }], [{ x: 0, y: 40 }]]);
    expect(Array.from({ length: STROKE_POINTS }, (_, k) => f[k * 3 + 2]).filter((v) => v === 1).length).toBe(2);
  });
});

describe("this writer's own handwriting (personal)", () => {
  beforeEach(() => forgetHandwriting());
  const ink = (dx: number) => [[{ x: dx, y: 0 }, { x: dx + 2, y: 30 }]];

  it("remembers what the writer said, at most 20 per character", () => {
    for (let i = 0; i < 25; i++) rememberInk(ink(i), "1");
    rememberInk(ink(0), "7");
    expect(personalSamples().filter((s) => s.char === "1")).toHaveLength(20);
    expect(personalSamples().filter((s) => s.char === "7")).toHaveLength(1);
  });

  it("forgets everything on request", () => {
    rememberInk(ink(0), "4");
    forgetHandwriting();
    expect(personalSamples()).toHaveLength(0);
  });
});
