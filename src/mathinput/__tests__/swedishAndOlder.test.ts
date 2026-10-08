import { describe, expect, it } from "vitest";
import { layoutLines, layoutSymbols, settledByContext, type ClassifiedSymbol } from "../layout";
import type { BoundingBox } from "../segmentation";

/** A symbol centered at (cx, cy) - digits 22x36 by default, the line's middle at y 50. */
function s(char: string, cx: number, cy = 50, w = 22, h = 36): ClassifiedSymbol {
  const box: BoundingBox = { cx, cy, width: w, height: h, minX: cx - w / 2, maxX: cx + w / 2, minY: cy - h / 2, maxY: cy + h / 2 };
  return { char, box };
}
/** An x-height letter (26 tall), sitting on the same line as the digits. */
const low = (char: string, cx: number) => s(char, cx, 55, 20, 26);
const bar = (x1: number, x2: number, y: number) => s("-", (x1 + x2) / 2, y, x2 - x1, 3);

describe("Swedish numbers", () => {
  it("a tick low between two digits is a decimal comma - a comma, or a comma the classifier took for a 1", () => {
    expect(layoutSymbols([s("3", 0), s(",", 22, 64, 5, 10), s("5", 44)])).toBe("3 {,} 5");
    expect(layoutSymbols([s("3", 0), s("1", 22, 63, 5, 12), s("5", 44)])).toBe("3 {,} 5");
  });

  it("but a round dot there is the times sign: 4 . 3 + 5 . 2 is 4 · 3 + 5 · 2", () => {
    expect(layoutSymbols([s("3", 0), s(".", 22, 66, 5, 5), s("5", 44)])).toBe("3 \\cdot 5");
    expect(layoutSymbols([s("4", 0), s(".", 22, 64, 4, 4), s("3", 44), s("+", 70), s("5", 96), s(".", 118, 64, 4, 4), s("2", 140)])).toBe("4 \\cdot 3 + 5 \\cdot 2");
  });

  it("a comma with space after it separates, as in coordinates (2, 3)", () => {
    expect(layoutSymbols([s("(", 0, 50, 12, 44), s("2", 22), s(",", 40, 64, 5, 10), s("3", 90), s(")", 112, 50, 12, 44)])).toBe("( 2 , 3 )");
  });

  it("a wider space before three digits groups thousands: 12 500", () => {
    const n = [s("1", 0), s("2", 25), s("5", 75), s("0", 100), s("0", 125)];
    expect(layoutSymbols(n)).toBe("1 2 \\, 5 0 0");
  });

  it("but a space before two digits doesn't", () => {
    expect(layoutSymbols([s("1", 0), s("2", 25), s("5", 75), s("0", 100)])).toBe("1 2 5 0");
  });

  it("x between two numbers is the times sign; next to a letter or alone it's x", () => {
    expect(layoutSymbols([s("3", 0), low("x", 25), s("4", 50)])).toBe("3 \\times 4");
    expect(layoutSymbols([s("2", 0), low("x", 25), s("+", 55, 50, 20, 20), s("1", 85)])).toBe("2 x + 1");
  });

  it("a mixed number is a whole number and a fraction side by side", () => {
    expect(layoutSymbols([s("2", 0), s("1", 40, 25, 14, 22), bar(30, 52, 50), s("2", 41, 75, 14, 22)])).toBe("2 \\frac{1}{2}");
  });
});

describe("brackets come in pairs", () => {
  it("a ')' that closes nothing is a 1", () => {
    expect(layoutSymbols([s("2", 0), s(")", 25, 50, 8, 36), s("5", 50)])).toBe("2 1 5");
    expect(layoutSymbols([s("(", 0, 50, 12, 44), s("2", 22), s("+", 50, 50, 20, 20), s("3", 78), s(")", 100, 50, 12, 44)])).toBe("( 2 + 3 )");
  });

  it("a lone '|' is a 1, a pair around something an absolute value", () => {
    expect(layoutSymbols([s("2", 0), s("|", 25, 50, 6, 36), s("5", 50)])).toBe("2 1 5");
    expect(layoutSymbols([s("|", 0, 50, 6, 40), low("x", 20), s("|", 40, 50, 6, 40)])).toBe("| x |");
  });
});

describe("capital or small: c, v, p are one class each", () => {
  it("as tall as the digits is a capital", () => {
    expect(layoutSymbols([s("v", 0), s("=", 30, 50, 22, 14), s("5", 60)])).toBe("V = 5");
    expect(layoutSymbols([low("v", 0), s("=", 30, 50, 22, 14), s("5", 60)])).toBe("v = 5");
  });

  it("a p that hangs below the line is small, one that stands on it is P", () => {
    expect(layoutSymbols([s("p", 0), s("(", 22, 50, 12, 44), s("A", 40), s(")", 60, 50, 12, 44), s("=", 90, 50, 22, 14), s("1", 120)])).toBe("P ( A ) = 1");
    expect(layoutSymbols([s("p", 0, 62), s("=", 30, 50, 22, 14), s("1", 60)])).toBe("p = 1");
  });
});

describe("gymnasiet", () => {
  it("a small tick up at the right of f is a prime: f′(x)", () => {
    const symbols = [s("f", 0), s("1", 16, 36, 3, 10), s("(", 30, 50, 12, 44), low("x", 48), s(")", 66, 50, 12, 44)];
    expect(layoutSymbols(symbols)).toBe("f' ( x )");
  });

  it("lim with h → 0 under it", () => {
    // "lim" read as 1-i-m; "h → 0" small, under it.
    const symbols = [s("1", 0, 50, 6, 36), low("i", 14), low("m", 36), s("h", 2, 85, 10, 16), s("→", 20, 85, 18, 8), s("0", 38, 85, 10, 16), low("x", 70)];
    expect(layoutSymbols(symbols)).toBe("\\lim_{h \\to 0} x");
  });

  it("an integral with its bounds, then what's integrated", () => {
    const symbols = [s("∫", 0, 50, 16, 90), s("1", 16, 10, 8, 14), s("0", 16, 92, 8, 14), low("x", 40), low("d", 62), low("x", 84)];
    expect(layoutSymbols(symbols)).toBe("\\int_{0}^{1} x d x");
  });
});

describe("several lines", () => {
  it("an equation solved step by step: one line each", () => {
    const line1 = [low("x", 0), s("+", 30, 50, 20, 20), s("2", 60), s("=", 90, 50, 22, 14), s("5", 120)];
    const line2 = [s("x", 0, 145, 20, 26), s("=", 30, 140, 22, 14), s("3", 60, 140)];
    expect(layoutLines([...line1, ...line2])).toBe("\\begin{gathered} x + 2 = 5 \\\\ x = 3 \\end{gathered}");
  });

  it("a fraction is one line, however tall", () => {
    const frac = [s("1", 20, 20), bar(0, 40, 50), s("2", 20, 80)];
    expect(layoutLines(frac)).toBe("\\frac{1}{2}");
  });

  it("a fraction on the first line, the answer on the next", () => {
    const line1 = [s("6", 20, 20), bar(0, 40, 50), s("2", 20, 80), s("=", 70, 50, 22, 14), low("x", 100)];
    const line2 = [s("x", 0, 175, 20, 26), s("=", 30, 170, 22, 14), s("3", 60, 170)];
    expect(layoutLines([...line1, ...line2])).toBe("\\begin{gathered} \\frac{6}{2} = x \\\\ x = 3 \\end{gathered}");
  });
});

describe("what the page settles", () => {
  it("letters of a function name, dots and paired brackets aren't asked about", () => {
    const five = s("5", 0, 55, 20, 26);
    const n = low("n", 44);
    const lone = s(")", 150, 50, 8, 36);
    const open = s("(", 70, 50, 12, 44);
    const close = s(")", 110, 50, 12, 44);
    const dot = s(".", 200, 50, 4, 4);
    const settled = settledByContext([five, s("i", 22, 50, 6, 36), n, open, low("x", 90), close, lone, dot]);
    expect(settled.has(five)).toBe(true);
    expect(settled.has(n)).toBe(true);
    expect(settled.has(open)).toBe(true);
    expect(settled.has(dot)).toBe(true);
  });
});

describe("commas in a list", () => {
  it("a small low tick after a number is a comma - even read as '1' - not a subscript (regression: '0,1,3' became '0,1_13')", () => {
    // A space after each comma - "0,1" written tight would be the decimal 0,1.
    // Real commas (measured in MathWriting) start at the bottom of the digits and hang below them.
    const list = [s("0", 0), s("1", 18, 69, 4, 14), s("1", 50), s("1", 68, 69, 4, 14), s("3", 100)];
    expect(layoutSymbols(list)).toBe("0 , 1 , 3");
  });

  it("a real subscript is bigger than a comma: x₁ stays x₁", () => {
    expect(layoutSymbols([s("x", 0, 55, 20, 26), s("1", 16, 66, 8, 18), s("=", 45, 50, 22, 14), s("2", 75)])).toBe("x_{1} = 2");
  });
});

describe("a '(' the classifier took for a 1", () => {
  it("a tall '1' before an unmatched ')' is its '(' (regression: '4(1-x)' read as '411-x1')", () => {
    const symbols = [s("4", 0), s("1", 25, 50, 8, 48), s("1", 45), s("-", 65, 50, 16, 3), low("x", 90), s(")", 112, 50, 10, 46)];
    expect(layoutSymbols(symbols)).toBe("4 ( 1 - x )");
  });

  it("a '1' as tall as the digits stays a 1, and the lone ')' is the 1 then", () => {
    expect(layoutSymbols([s("2", 0), s("1", 25), s(")", 50, 50, 8, 36)])).toBe("2 1 1");
  });
});

describe("arrows drawn as a shaft and a head", () => {
  const eq = (cx: number) => s("=", cx, 50, 26, 14);
  const head = (cx: number) => s(">", cx, 50, 14, 24);

  it("'=' with '>' at its end is ⇒ (regression, from MathWriting: 36 of 39 '⇒' read as '= >')", () => {
    expect(layoutSymbols([s("x", 0, 55, 20, 26), eq(35), head(52), s("5", 85)])).toBe("x \\Rightarrow 5");
  });

  it("'-' with '>' is →, and '<' in front of ⇒ makes ⇔", () => {
    expect(layoutSymbols([low("h", 0), s("-", 30, 50, 22, 3), head(46), s("0", 80)])).toBe("h \\to 0");
    expect(layoutSymbols([s("a", 0, 55, 20, 26), s("<", 30, 50, 14, 24), eq(47), head(64), low("b", 95)])).toBe("a \\Leftrightarrow b");
  });

  it("two separate shaft lines and a head are ⇒ too", () => {
    const symbols = [s("x", 0, 55, 20, 26), s("-", 35, 45, 24, 3), s("-", 35, 56, 24, 3), head(52), s("5", 85)];
    expect(layoutSymbols(symbols)).toBe("x \\Rightarrow 5");
  });

  it("an '=' then a '>' with space between them are two signs", () => {
    expect(layoutSymbols([s("a", 0, 55, 20, 26), eq(35), head(75), s("5", 110)])).toBe("a = > 5");
  });
});

describe("the pieces of a sign drawn in parts aren't asked about", () => {
  it("the '=' and '>' of an ⇒ are settled by each other", () => {
    const eq = s("=", 35, 50, 26, 14);
    const head = s(">", 52, 50, 14, 24);
    const settled = settledByContext([s("x", 0, 55, 20, 26), eq, head, s("5", 85)]);
    expect(settled.has(eq)).toBe(true);
    expect(settled.has(head)).toBe(true);
  });
});
