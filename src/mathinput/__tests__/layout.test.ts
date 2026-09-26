import { describe, expect, it } from "vitest";
import { layoutSymbols, type ClassifiedSymbol } from "../layout";
import type { BoundingBox } from "../segmentation";

/** A normal-sized symbol on the shared baseline, `x` pixels wide, at horizontal position `cx`. */
function sym(char: string, cx: number, opts?: Partial<BoundingBox>): ClassifiedSymbol {
  const width = opts?.width ?? 20;
  const height = opts?.height ?? 30;
  const cy = opts?.cy ?? 100;
  const box: BoundingBox = {
    cx,
    cy,
    width,
    height,
    minX: cx - width / 2,
    maxX: cx + width / 2,
    minY: cy - height / 2,
    maxY: cy + height / 2,
  };
  return { char, box };
}

describe("layoutSymbols", () => {
  it("returns an empty string for no symbols", () => {
    expect(layoutSymbols([])).toBe("");
  });

  it("concatenates a plain left-to-right sequence, mapping signs to LaTeX", () => {
    const symbols = [sym("1", 0), sym("+", 30), sym("2", 60), sym("×", 90), sym("3", 120)];
    expect(layoutSymbols(symbols)).toBe("1 + 2 \\times 3");
  });

  it("orders symbols by position, not by the order they're passed in", () => {
    const symbols = [sym("2", 60), sym("1", 0), sym("+", 30)];
    expect(layoutSymbols(symbols)).toBe("1 + 2");
  });

  it("reads a small, raised symbol next to a base as a superscript", () => {
    const base = sym("x", 0);
    const exp = sym("2", 22, { width: 10, height: 14, cy: 80 }); // smaller, higher (lower cy = higher on screen)
    expect(layoutSymbols([base, exp])).toBe("x^{2}");
  });

  it("merges consecutive raised digits into one exponent group (a two-digit exponent)", () => {
    const base = sym("x", 0);
    const e1 = sym("1", 22, { width: 10, height: 14, cy: 80 });
    const e2 = sym("2", 34, { width: 10, height: 14, cy: 80 });
    expect(layoutSymbols([base, e1, e2])).toBe("x^{12}");
  });

  it("reads a small, lowered symbol as a subscript", () => {
    const base = sym("x", 0);
    const sub = sym("n", 22, { width: 10, height: 14, cy: 120 }); // lower cy = lower on screen
    expect(layoutSymbols([base, sub])).toBe("x_{n}");
  });

  it("treats an explicit '^' as an unambiguous superscript trigger regardless of position", () => {
    const base = sym("x", 0);
    const caret = sym("^", 25);
    const exp = sym("2", 45); // normal size/position - would NOT be read as a superscript on its own
    expect(layoutSymbols([base, caret, exp])).toBe("x^{2}");
  });

  it("does not treat an isolated '-' with nothing above or below it as a fraction", () => {
    const symbols = [sym("5", 0), sym("-", 30), sym("3", 60)];
    expect(layoutSymbols(symbols)).toBe("5 - 3");
  });

  it("reads a '-' with content both above and below its span as a fraction bar", () => {
    const bar = sym("-", 50, { width: 60, cy: 100 });
    const numerator = sym("1", 50, { cy: 60 });
    const denominator = sym("2", 50, { cy: 140 });
    expect(layoutSymbols([bar, numerator, denominator])).toBe("\\frac{1}{2}");
  });

  it("lays out a multi-symbol numerator/denominator and keeps the fraction in its left-to-right position", () => {
    const one = sym("1", 0, { cy: 60 });
    const plus = sym("+", 25, { cy: 60 });
    const x = sym("x", 50, { cy: 60 });
    const bar = sym("-", 25, { width: 70, cy: 100 });
    const two = sym("2", 25, { cy: 140 });
    const equals = sym("=", 150, { cy: 100 });
    const three = sym("3", 180, { cy: 100 });
    expect(layoutSymbols([one, plus, x, bar, two, equals, three])).toBe("\\frac{1 + x}{2} = 3");
  });

  describe("parentheses", () => {
    it("passes parentheses through verbatim in a plain sequence", () => {
      const symbols = [sym("(", 0), sym("1", 20), sym("+", 40), sym("2", 60), sym(")", 80), sym("×", 100), sym("3", 120)];
      expect(layoutSymbols(symbols)).toBe("( 1 + 2 ) \\times 3");
    });

    it("attaches an exponent to a closing paren, exactly as LaTeX expects for (expr)^n", () => {
      const close = sym(")", 0);
      const exp = sym("2", 15, { width: 10, height: 14, cy: 80 });
      expect(layoutSymbols([close, exp])).toBe(")^{2}");
    });
  });

  describe("multiple and nested fractions", () => {
    it("lays out two independent fractions on the same line", () => {
      const one = sym("1", 0, { cy: 60 });
      const bar1 = sym("-", 0, { width: 30, cy: 100 });
      const two = sym("2", 0, { cy: 140 });
      const plus = sym("+", 60, { cy: 100 });
      const three = sym("3", 120, { cy: 60 });
      const bar2 = sym("-", 120, { width: 30, cy: 100 });
      const four = sym("4", 120, { cy: 140 });
      expect(layoutSymbols([one, bar1, two, plus, three, bar2, four])).toBe("\\frac{1}{2} + \\frac{3}{4}");
    });

    it("nests a fraction in the numerator: (1/2)/3, not the inverted 1/(2/3) (regression: bar processing order used to invert this)", () => {
      const num1 = sym("1", 50, { cy: 60 });
      const innerBar = sym("-", 50, { width: 40, cy: 80 });
      const den1 = sym("2", 50, { cy: 100 });
      const outerBar = sym("-", 50, { width: 70, cy: 140 });
      const den2 = sym("3", 50, { cy: 180 });
      expect(layoutSymbols([num1, innerBar, den1, outerBar, den2])).toBe("\\frac{\\frac{1}{2}}{3}");
    });

    it("nests a fraction in the denominator: 1/(2/3)", () => {
      const num1 = sym("1", 50, { cy: 20 });
      const outerBar = sym("-", 50, { width: 70, cy: 60 });
      const num2 = sym("2", 50, { cy: 100 });
      const innerBar = sym("-", 50, { width: 40, cy: 120 });
      const den2 = sym("3", 50, { cy: 140 });
      expect(layoutSymbols([num1, outerBar, num2, innerBar, den2])).toBe("\\frac{1}{\\frac{2}{3}}");
    });
  });

  describe("equations and comparisons", () => {
    it("lays out a full equation with a fraction on one side", () => {
      const x = sym("x", 0, { cy: 100 });
      const equals = sym("=", 30, { cy: 100 });
      const one = sym("1", 60, { cy: 60 });
      const bar = sym("-", 60, { width: 30, cy: 100 });
      const two = sym("2", 60, { cy: 140 });
      expect(layoutSymbols([x, equals, one, bar, two])).toBe("x = \\frac{1}{2}");
    });

    it("passes comparison operators through verbatim, unaffected by fraction/script detection", () => {
      const symbols = [sym("5", 0), sym("<", 30), sym("9", 60), sym(">", 90), sym("3", 120)];
      expect(layoutSymbols(symbols)).toBe("5 < 9 > 3");
    });

    it("lays out an equation with an exponent on the left and a plain number on the right", () => {
      const x = sym("x", 0, { cy: 100 });
      const exp = sym("2", 15, { width: 10, height: 14, cy: 80 });
      const equals = sym("=", 50, { cy: 100 });
      const nine = sym("9", 80, { cy: 100 });
      expect(layoutSymbols([x, exp, equals, nine])).toBe("x^{2} = 9");
    });
  });

  describe("combined fraction + exponent", () => {
    it("puts an exponent on a symbol inside a fraction's denominator", () => {
      const one = sym("1", 0, { cy: 60 });
      const bar = sym("-", 0, { width: 40, cy: 100 });
      const x = sym("x", -8, { cy: 140 });
      const exp = sym("2", 5, { width: 10, height: 14, cy: 120 });
      expect(layoutSymbols([one, bar, x, exp])).toBe("\\frac{1}{x^{2}}");
    });

    it("puts an exponent on a symbol inside a fraction's numerator, alongside other terms", () => {
      const one = sym("1", -15, { cy: 40 });
      const plus = sym("+", 0, { cy: 60 });
      const x = sym("x", 15, { cy: 60 });
      const exp = sym("2", 25, { width: 10, height: 14, cy: 40 });
      const bar = sym("-", 5, { width: 60, cy: 100 });
      const pi = sym("π", 5, { cy: 140 });
      expect(layoutSymbols([one, plus, x, exp, bar, pi])).toBe("\\frac{1 + x^{2}}{\\pi}");
    });
  });

  describe("subscripts alongside other structure", () => {
    it("handles a superscript on one symbol and a subscript on another in the same sequence", () => {
      const x = sym("x", 0, { cy: 100 });
      const exp = sym("2", 15, { width: 10, height: 14, cy: 80 });
      const plus = sym("+", 50, { cy: 100 });
      const y = sym("y", 80, { cy: 100 });
      const sub = sym("1", 95, { width: 10, height: 14, cy: 120 });
      expect(layoutSymbols([x, exp, plus, y, sub])).toBe("x^{2} + y_{1}");
    });

    it("merges consecutive lowered digits into one subscript group (a two-digit subscript)", () => {
      const base = sym("a", 0);
      const s1 = sym("1", 22, { width: 10, height: 14, cy: 120 });
      const s2 = sym("2", 34, { width: 10, height: 14, cy: 120 });
      expect(layoutSymbols([base, s1, s2])).toBe("a_{12}");
    });
  });

  describe("longer sequences", () => {
    it("lays out a long chain of additions", () => {
      const symbols = [sym("1", 0), sym("+", 30), sym("2", 60), sym("+", 90), sym("3", 120), sym("+", 150), sym("4", 180), sym("=", 210), sym("1", 240), sym("0", 260)];
      expect(layoutSymbols(symbols)).toBe("1 + 2 + 3 + 4 = 1 0");
    });

    it("lays out a mixed-operator sequence with parentheses", () => {
      const symbols = [
        sym("(", 0),
        sym("4", 20),
        sym("-", 40),
        sym("1", 60),
        sym(")", 80),
        sym("×", 100),
        sym("2", 120),
        sym("=", 150),
        sym("6", 180),
      ];
      expect(layoutSymbols(symbols)).toBe("( 4 - 1 ) \\times 2 = 6");
    });
  });
});
