import { describe, expect, it } from "vitest";
import { layoutSymbols, type ClassifiedSymbol } from "../layout";
import type { BoundingBox } from "../segmentation";

/** A symbol centered at (cx, cy); digits default to 24x40, like a normal handwritten digit. */
function s(char: string, cx: number, cy: number, opts: { w?: number; h?: number; struck?: boolean } = {}): ClassifiedSymbol {
  const w = opts.w ?? 24;
  const h = opts.h ?? 40;
  const box: BoundingBox = { cx, cy, width: w, height: h, minX: cx - w / 2, maxX: cx + w / 2, minY: cy - h / 2, maxY: cy + h / 2 };
  return { char, box, struck: opts.struck };
}

/** A row of digits whose LAST digit sits at rightX, one column per 34px. */
function digits(text: string, rightX: number, cy: number, opts: { h?: number } = {}): ClassifiedSymbol[] {
  return [...text].map((d, i) => s(d, rightX - (text.length - 1 - i) * 34, cy, { h: opts.h }));
}

/** Whitespace-insensitive comparison - LaTeX doesn't care, and empty cells make exact spacing noisy to spell out. */
const norm = (t: string) => t.replace(/\s+/g, " ");
const line = (fromX: number, toX: number, cy: number) => s("-", (fromX + toX) / 2, cy, { w: toX - fromX, h: 3 });

describe("column arithmetic", () => {
  it("lays out 100 + 23 with the line and no answer yet (the first screenshot)", () => {
    const symbols = [...digits("100", 200, 40), s("+", 90, 100, { w: 20, h: 20 }), ...digits("23", 200, 100), line(80, 230, 140)];
    expect(norm(layoutSymbols(symbols))).toBe(norm("\\begin{array}{rccc} & 1 & 0 & 0 \\\\ + &  & 2 & 3 \\\\ \\hline \\end{array}"));
  });

  it("puts the answer under the line instead of reading the whole thing as a fraction", () => {
    const symbols = [...digits("100", 200, 40), s("+", 90, 100, { w: 20, h: 20 }), ...digits("23", 200, 100), line(80, 230, 140), ...digits("123", 200, 180)];
    expect(norm(layoutSymbols(symbols))).toBe(norm("\\begin{array}{rccc} & 1 & 0 & 0 \\\\ + &  & 2 & 3 \\\\ \\hline  & 1 & 2 & 3 \\end{array}"));
  });

  it("renders borrowing: crossed-out digits and the small borrowed tens above them (the second screenshot, 100 - 9 = 91)", () => {
    const symbols = [
      s("1", 132, 60, { struck: true }),
      s("0", 166, 60, { struck: true }),
      s("0", 200, 60),
      // "10" written small above each 0 (two small digits per note)
      s("1", 160, 22, { w: 10, h: 18 }),
      s("0", 172, 22, { w: 10, h: 18 }),
      s("1", 194, 22, { w: 10, h: 18 }),
      s("0", 206, 22, { w: 10, h: 18 }),
      s("-", 95, 120, { w: 30, h: 3 }),
      s("9", 200, 120),
      line(80, 230, 160),
      ...digits("91", 200, 200),
    ];
    expect(norm(layoutSymbols(symbols))).toBe(norm(
      "\\begin{array}{rccc} & \\cancel{1} & \\overset{10}{\\cancel{0}} & \\overset{10}{0} \\\\ - &  &  & 9 \\\\ \\hline  &  & 9 & 1 \\end{array}"
    ));
  });

  it("reads the latest screenshot (100 - 91 = 009): a slanted struck '1' that looks like an 'x', a struck '10' note replaced by '9', and a '10' note", () => {
    const symbols = [
      s("x", 132, 60), // the struck 1: two crossing diagonals, classified as "x"
      s("0", 166, 60),
      s("0", 200, 60),
      // over the middle 0: "10", crossed out, then "9" - all small
      { ...s("1", 156, 22, { w: 8, h: 18 }), struck: true },
      { ...s("0", 166, 22, { w: 10, h: 18 }), struck: true },
      s("9", 178, 22, { w: 10, h: 18 }),
      // over the last 0: "10"
      s("1", 196, 22, { w: 8, h: 18 }),
      s("0", 207, 22, { w: 10, h: 18 }),
      s("-", 95, 120, { w: 30, h: 3 }),
      ...digits("91", 200, 120),
      line(80, 230, 160),
      ...digits("009", 200, 200),
    ];
    expect(norm(layoutSymbols(symbols))).toBe(
      norm(
        "\\begin{array}{rccc} & \\cancel{1} & \\overset{\\cancel{10}9}{0} & \\overset{10}{0} \\\\ - & & 9 & 1 \\\\ \\hline & 0 & 0 & 9 \\end{array}"
      )
    );
  });

  describe("a borrowed '10' is one number", () => {
    /** 100 - 91 with a "10" over the tens whose strike caught only some of it, plus an optional replacement digit. */
    const withTensNote = (oneStruck: boolean, zeroStruck: boolean, replacement?: string) => [
      s("1", 132, 60, { struck: true }),
      s("0", 166, 60),
      s("0", 200, 60),
      s("1", 156, 22, { w: 8, h: 18, struck: oneStruck }),
      s("0", 166, 22, { w: 10, h: 18, struck: zeroStruck }),
      ...(replacement ? [s(replacement, 178, 22, { w: 10, h: 18 })] : []),
      s("-", 95, 120, { w: 30, h: 3 }),
      ...digits("91", 200, 120),
      line(80, 230, 160),
      ...digits("9", 200, 200),
    ];

    it("crossing out only its '0' crosses out the whole ten", () => {
      expect(layoutSymbols(withTensNote(false, true))).toContain("\\overset{\\cancel{10}}{0}");
    });

    it("crossing out only its '1' crosses out the whole ten", () => {
      expect(layoutSymbols(withTensNote(true, false))).toContain("\\overset{\\cancel{10}}{0}");
    });

    it("leaves a replacement digit written after it alone", () => {
      expect(layoutSymbols(withTensNote(false, true, "9"))).toContain("\\overset{\\cancel{10}9}{0}");
    });

    it("leaves a '10' nobody crossed out alone", () => {
      expect(layoutSymbols(withTensNote(false, false))).toContain("\\overset{10}{0}");
    });
  });

  it("puts a carry above its column, even over a column with no digit in the top row", () => {
    const symbols = [s("1", 166, 22, { w: 10, h: 18 }), ...digits("99", 200, 60), s("+", 120, 110, { w: 20, h: 20 }), ...digits("1", 200, 110), line(110, 230, 150), ...digits("100", 200, 190)];
    // The carry sits over the tens column of "99".
    expect(layoutSymbols(symbols)).toContain("\\overset{1}{9}");
  });

  it("lines up a multiplication's shifted partial products and reads the operator 'x' as \\times", () => {
    const symbols = [
      ...digits("23", 200, 40),
      s("x", 120, 100, { w: 20, h: 22 }),
      ...digits("45", 200, 100),
      line(100, 230, 140),
      ...digits("115", 200, 180),
      ...digits("92", 166, 230), // shifted one column left, no trailing zero
      line(100, 230, 270),
      ...digits("1035", 200, 310),
    ];
    expect(norm(layoutSymbols(symbols))).toBe(norm(
      "\\begin{array}{rcccc} &  &  & 2 & 3 \\\\ \\times &  &  & 4 & 5 \\\\ \\hline  &  & 1 & 1 & 5 \\\\  &  & 9 & 2 &  \\\\ \\hline  & 1 & 0 & 3 & 5 \\end{array}"
    ));
  });

  it("still reads a plain fraction (one row above the line) as a fraction", () => {
    expect(layoutSymbols([s("1", 100, 40), line(80, 120, 80), s("2", 100, 120)])).toBe("\\frac{1}{2}");
  });

  it("doesn't treat two stacked rows without an operator as column arithmetic", () => {
    const symbols = [...digits("12", 200, 40), ...digits("34", 200, 100), line(150, 230, 140), ...digits("5", 200, 180)];
    expect(layoutSymbols(symbols)).not.toContain("array");
  });
});

describe("decimal commas in column arithmetic", () => {
  it("a small mark low between two digits is a comma, not a carry (3,5 + 1,2 = 4,7)", () => {
    const comma = (cx: number, rowY: number) => s("1", cx, rowY + 16, { w: 5, h: 10 });
    const symbols = [
      ...digits("35", 200, 40),
      comma(183, 40),
      s("+", 120, 100, { w: 20, h: 20 }),
      ...digits("12", 200, 100),
      comma(183, 100),
      line(110, 230, 140),
      ...digits("47", 200, 180),
      comma(183, 180),
    ];
    expect(norm(layoutSymbols(symbols))).toBe(
      norm("\\begin{array}{rcc} & 3\\rlap{,} & 5 \\\\ + & 1\\rlap{,} & 2 \\\\ \\hline & 4\\rlap{,} & 7 \\end{array}")
    );
  });
});
