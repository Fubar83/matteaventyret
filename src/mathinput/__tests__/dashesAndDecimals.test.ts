import { describe, expect, it } from "vitest";
import type { Stroke } from "../../recognition/preprocess";
import { layoutSymbols, type ClassifiedSymbol } from "../layout";
import { joinStackedDashes, type RecognizedSymbol } from "../recognizeExpression";
import type { SegmentedSymbol } from "../segmentation";
import { boxFromCorners } from "../strokeGeometry";

/** A symbol by its box's corners - as read off real MathWriting ink. */
const at = (char: string, minX: number, maxX: number, minY: number, maxY: number): ClassifiedSymbol => ({ char, box: boxFromCorners(minX, minY, maxX, maxY) });

describe("layout of short marks", () => {
  // MathWriting's "\frac{1}{2}(2-\frac{6}{4})=\frac{1}{4}": the minus is short next to the tall brackets and fractions.
  const page = [
    at("1", 37, 39, 21, 51),
    at("-", 20, 49, 74, 77),
    at("2", 27, 47, 92, 125),
    at("(", 70, 84, 20, 99),
    at("2", 97, 127, 43, 81),
    at("-", 135, 148, 72, 74),
    at("6", 176, 205, 21, 60),
    at("-", 176, 217, 73, 76),
    at("4", 192, 213, 94, 126),
    at(")", 238, 254, 27, 101),
  ];

  it("keeps a short dash a minus, not a multiplication dot", () => {
    expect(layoutSymbols(page)).toBe("\\frac{1}{2} ( 2 - \\frac{6}{4} )");
  });

  it("still reads a tiny dot halfway up as multiplication", () => {
    expect(layoutSymbols([at("2", 0, 20, 0, 30), at(".", 28, 31, 14, 17), at("3", 40, 60, 0, 30)])).toBe("2 \\cdot 3");
  });

  it("doesn't take a small = between two digits for a decimal comma", () => {
    // MathWriting's "0+0=0", its "=" written small and low.
    const symbols = [at("0", 20, 63, 24, 80), at("+", 69, 98, 41, 74), at("0", 107, 148, 20, 79), at("=", 158, 177, 48, 70), at("0", 184, 223, 29, 72)];
    expect(layoutSymbols(symbols)).toBe("0 + 0 = 0");
  });

  it("still reads a small mark low between digits as a decimal comma", () => {
    expect(layoutSymbols([at("3", 0, 20, 0, 30), at(",", 23, 27, 24, 36), at("5", 30, 50, 0, 30)])).toBe("3 {,} 5");
  });
});

describe("joinStackedDashes", () => {
  const bar = (minX: number, maxX: number, minY: number, maxY: number): Stroke => [
    { x: minX, y: minY },
    { x: maxX, y: maxY },
  ];
  const read = (char: string, stroke: Stroke): { seg: SegmentedSymbol; sym: RecognizedSymbol } => {
    const box = boxFromCorners(Math.min(stroke[0].x, stroke[1].x), Math.min(stroke[0].y, stroke[1].y), Math.max(stroke[0].x, stroke[1].x), Math.max(stroke[0].y, stroke[1].y));
    return { seg: { strokes: [stroke], box }, sym: { char, confident: true, alternatives: [char], strokes: [stroke], box } };
  };
  const join = (items: { seg: SegmentedSymbol; sym: RecognizedSymbol }[]) =>
    joinStackedDashes(
      items.map((x) => x.seg),
      items.map((x) => x.sym)
    ).read.map((s) => s.char);

  it("joins two dashes stacked close, barely overlapping, into an =", () => {
    // MathWriting's "x=5+...": the bars, offset, overlap by 4 px of the shorter's 20.
    expect(join([read("-", bar(121, 141, 110, 113)), read("-", bar(137, 167, 123, 132))])).toEqual(["="]);
  });

  it("leaves two dashes side by side alone", () => {
    expect(join([read("-", bar(0, 20, 50, 52)), read("-", bar(40, 60, 50, 52))]).sort()).toEqual(["-", "-"]);
  });

  it("leaves stacked bars with something between them alone (a fraction)", () => {
    const top = read("-", bar(0, 40, 0, 2));
    const digit = read("1", [{ x: 20, y: 10 }, { x: 20, y: 30 }]);
    const bottom = read("-", bar(0, 40, 38, 40));
    expect(join([top, digit, bottom]).sort()).toEqual(["-", "-", "1"]);
  });
});
