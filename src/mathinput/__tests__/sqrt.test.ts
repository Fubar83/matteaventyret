import { describe, expect, it } from "vitest";
import { layoutSymbols, type ClassifiedSymbol } from "../layout";
import type { BoundingBox } from "../segmentation";

/** A symbol centered at (cx, cy). */
function s(char: string, cx: number, cy: number, w = 22, h = 36): ClassifiedSymbol {
  const box: BoundingBox = { cx, cy, width: w, height: h, minX: cx - w / 2, maxX: cx + w / 2, minY: cy - h / 2, maxY: cy + h / 2 };
  return { char, box };
}

/** A horizontal bar (fraction bar) from x1 to x2 at y. */
const bar = (x1: number, x2: number, y: number) => s("-", (x1 + x2) / 2, y, x2 - x1, 3);

/**
 * A hand-drawn root sign: its box from (x, top) to (x + width, top + height),
 * the tick taking the first ~third of the height's worth of width, the bar
 * running along the top from there to the right edge.
 */
function root(x: number, top: number, width: number, height: number): ClassifiedSymbol {
  const box: BoundingBox = { minX: x, maxX: x + width, minY: top, maxY: top + height, cx: x + width / 2, cy: top + height / 2, width, height };
  return { char: "√", box, radical: { minX: x + height * 0.35, maxX: x + width, y: top + 1 } };
}

/** Digits/letters in a row, one every `pitch` px, starting at x. */
const row = (text: string, x: number, cy: number, pitch = 25, h = 36) => [...text].map((ch, i) => s(ch, x + i * pitch, cy, 22, ch === "x" ? 26 : h));

describe("square roots", () => {
  it("√100", () => {
    expect(layoutSymbols([root(0, 20, 130, 70), ...row("100", 55, 60)])).toBe("\\sqrt{1 0 0}");
  });

  it("√(23x / 3) - a fraction under the root", () => {
    const symbols = [root(0, 0, 160, 120), ...row("23x", 60, 35), bar(48, 150, 62), s("3", 95, 92)];
    expect(layoutSymbols(symbols)).toBe("\\sqrt{\\frac{2 3 x}{3}}");
  });

  it("√100 / √(23x / 3) - a root over a fraction bar, and a root with a fraction in it under it", () => {
    const symbols = [
      // numerator: √100
      root(20, 10, 140, 70),
      ...row("100", 75, 50),
      // the main fraction bar
      bar(10, 210, 100),
      // denominator: √(23x / 3)
      root(10, 115, 195, 125),
      ...row("23x", 85, 150),
      bar(70, 200, 177),
      s("3", 130, 207),
    ];
    expect(layoutSymbols(symbols)).toBe("\\frac{\\sqrt{1 0 0}}{\\sqrt{\\frac{2 3 x}{3}}}");
  });

  it("√100 / √(23x / 3) = 10 / … - stops each root at the end of its bar, so what follows the fraction stays outside", () => {
    const symbols = [
      root(20, 10, 140, 70),
      ...row("100", 75, 50),
      bar(10, 210, 100),
      root(10, 115, 195, 125),
      ...row("23x", 85, 150),
      bar(70, 200, 177),
      s("3", 130, 207),
      s("=", 250, 100, 28, 16),
      ...row("10", 290, 100),
    ];
    expect(layoutSymbols(symbols)).toBe("\\frac{\\sqrt{1 0 0}}{\\sqrt{\\frac{2 3 x}{3}}} = 1 0");
  });

  it("a number in front of a root multiplies it: 2√3", () => {
    expect(layoutSymbols([s("2", 10, 60), root(30, 30, 80, 60), s("3", 80, 64)])).toBe("2 \\sqrt{3}");
  });

  it("a root nested in a root: √(1 + √9)", () => {
    const symbols = [root(0, 0, 200, 90), s("1", 50, 50), s("+", 80, 50, 20, 20), root(100, 20, 95, 60), s("9", 150, 52)];
    expect(layoutSymbols(symbols)).toBe("\\sqrt{1 + \\sqrt{9}}");
  });

  it("an exponent under a root: √(x² + 1)", () => {
    const symbols = [root(0, 0, 170, 80), s("x", 50, 50, 22, 26), s("2", 72, 30, 12, 18), s("+", 100, 50, 20, 20), s("1", 135, 46)];
    expect(layoutSymbols(symbols)).toBe("\\sqrt{x^{2} + 1}");
  });

  it("∛27 + 2√3 - a '+' drawn a little low after a root stays an operator, not a subscript", () => {
    const symbols = [
      s("3", 93, 72, 18, 28),
      root(80, 50, 180, 110),
      ...row("27", 175, 106, 42, 52),
      s("+", 293, 116, 29, 29), // small and ~10px below the digits' center
      s("2", 350, 106, 30, 52),
      root(380, 50, 120, 110),
      s("3", 460, 106, 30, 52),
    ];
    expect(layoutSymbols(symbols)).toBe("\\sqrt[3]{2 7} + 2 \\sqrt{3}");
  });

  it("a cube root: the small number in the crook is the index (∛27)", () => {
    const r = root(10, 20, 110, 70);
    expect(layoutSymbols([s("3", 14, 30, 10, 16), r, ...row("27", 70, 58)])).toBe("\\sqrt[3]{2 7}");
  });
});
