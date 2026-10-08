import { describe, expect, it } from "vitest";
import { layoutSymbols, type ClassifiedSymbol } from "../layout";
import { segmentSymbols, type BoundingBox } from "../segmentation";
import type { Stroke } from "../../recognition/preprocess";

/** A symbol centered at (cx, cy). */
function s(char: string, cx: number, cy: number, w = 22, h = 36): ClassifiedSymbol {
  const box: BoundingBox = { cx, cy, width: w, height: h, minX: cx - w / 2, maxX: cx + w / 2, minY: cy - h / 2, maxY: cy + h / 2 };
  return { char, box };
}

/** Characters in a row on one line, one every `pitch` px, starting at x - letters are x-height (26px), everything else full height. */
const row = (text: string, x: number, cy = 50, pitch = 25) =>
  [...text].map((ch, i) => (/[a-z]/.test(ch) && !"bdfhklt".includes(ch) ? s(ch, x + i * pitch, cy + 5, 20, 26) : s(ch, x + i * pitch, cy)));

describe("comparison and other signs", () => {
  it("maps the new signs to LaTeX", () => {
    expect(layoutSymbols(row("x≤5", 0))).toBe("x \\le 5");
    expect(layoutSymbols(row("x≥5", 0))).toBe("x \\ge 5");
    expect(layoutSymbols(row("x≠5", 0))).toBe("x \\ne 5");
    expect(layoutSymbols(row("x≈5", 0))).toBe("x \\approx 5");
    expect(layoutSymbols(row("x<5", 0))).toBe("x < 5");
    expect(layoutSymbols(row("25%", 0))).toBe("2 5 \\%");
  });

  it("an underlined '<' or '>' written as two pieces is ≤ / ≥", () => {
    expect(layoutSymbols([s("x", 0, 55, 20, 26), s("<", 30, 45, 22, 24), s("-", 30, 64, 22, 3), s("5", 60, 50)])).toBe("x \\le 5");
    expect(layoutSymbols([s("x", 0, 55, 20, 26), s(">", 30, 45, 22, 24), s("-", 31, 64, 24, 3), s("5", 60, 50)])).toBe("x \\ge 5");
  });

  it("a column sum's line under its '+' stays a column", () => {
    const column = [...row("12", 40, 20, 72), s("+", 0, 110, 30, 30), ...row("34", 40, 110, 72), s("-", 80, 150, 180, 3), ...row("46", 40, 190, 72)];
    expect(layoutSymbols(column)).toContain("\\begin");
  });

  it("a '/' with a small circle either side is %", () => {
    expect(layoutSymbols([...row("50", 0), s("0", 55, 36, 10, 10), s("/", 65, 50, 18, 36), s("°", 75, 64, 10, 10)])).toBe("5 0 \\%");
  });

  it("a dash with a dot over and under it is ÷, not a fraction", () => {
    expect(layoutSymbols([s("8", 0, 50), s(".", 35, 36, 5, 5), s("-", 35, 50, 24, 3), s(".", 35, 64, 5, 5), s("2", 70, 50)])).toBe("8 \\div 2");
  });

  it("a dot is multiplication - halfway up or on the line, whatever the classifier called it", () => {
    expect(layoutSymbols([s("3", 0, 50), s(".", 22, 50, 5, 5), s("4", 44, 50)])).toBe("3 \\cdot 4");
    expect(layoutSymbols([s("3", 0, 50), s("+", 22, 50, 4, 4), s("4", 44, 50)])).toBe("3 \\cdot 4");
    // Low on the line too: in Swedish a dot is the times sign - decimals take a comma.
    expect(layoutSymbols([s("3", 0, 50), s(".", 22, 66, 5, 5), s("4", 44, 50)])).toBe("3 \\cdot 4");
  });

  it("a degree sign is raised onto the number before it", () => {
    expect(layoutSymbols([...row("90", 0), s("°", 42, 34, 10, 10)])).toBe("9 0^{\\circ}");
  });
});

/** A letter-sized symbol at x (x-height 26, sitting on the line at y 63), or a tall one (l, t: 36) - as the recognizer reports it. */
const low = (char: string, x: number, w = 20) => s(char, x, 50, w, 26);
const tall = (char: string, x: number, w = 12) => s(char, x, 45, w, 36);

describe("function names, from the digits their letters are read as", () => {
  it("sin, cos, tan, ln", () => {
    expect(layoutSymbols([low("5", 0), s("i", 22, 45, 6, 36), low("n", 42), low("x", 80)])).toBe("\\sin x");
    expect(layoutSymbols([low("c", 0), low("0", 22), low("5", 44), low("x", 80)])).toBe("\\cos x");
    expect(layoutSymbols([tall("+", 0, 18), low("a", 22), low("n", 44), low("x", 80)])).toBe("\\tan x");
    expect(layoutSymbols([tall("1", 0, 8), low("n", 20), low("x", 60)])).toBe("\\ln x");
  });

  it("a real '+' floats above the line, so '+an' written as a sum isn't tan", () => {
    expect(layoutSymbols([s("+", 0, 50, 18, 18), low("a", 22), low("n", 44)])).toBe("+ a n");
  });

  it("lg and log: only when the '9' hangs below the line like a g", () => {
    const g = (x: number) => s("9", x, 58, 18, 30); // tail below the line (line at y 63)
    expect(layoutSymbols([tall("1", 0, 8), g(20), ...row("100", 60)])).toBe("\\lg 1 0 0");
    expect(layoutSymbols([tall("1", 0, 8), low("0", 20), g(42), ...row("100", 80)])).toBe("\\log 1 0 0");
    expect(layoutSymbols(row("19", 0))).toBe("1 9");
    expect(layoutSymbols(row("109", 0))).toBe("1 0 9");
  });

  it("an exponent on a function name: sin²x", () => {
    const symbols = [low("5", 0), s("i", 22, 45, 6, 36), low("n", 42), s("2", 64, 30, 10, 16), low("x", 88)];
    expect(layoutSymbols(symbols)).toBe("\\sin^{2} x");
  });

  it("letters far apart aren't a name", () => {
    expect(layoutSymbols([low("c", 0), s("=", 40, 50, 22, 14), s("0", 80, 45), s("5", 102, 45)])).toBe("c = 0 5");
  });
});

describe("lookalikes", () => {
  it("a '°' as tall as the writing is a 0", () => {
    expect(layoutSymbols([s("1", 0, 50, 8, 36), s("°", 25, 50, 22, 34)])).toBe("1 0");
  });

  it("an '×' with nothing after it is the letter x", () => {
    expect(layoutSymbols([s("2", 0, 50), s("×", 25, 55, 20, 22)])).toBe("2 x");
    expect(layoutSymbols([s("×", 0, 55, 20, 22), s("=", 30, 50, 22, 14), s("5", 60, 50)])).toBe("x = 5");
    expect(layoutSymbols([s("2", 0, 50), s("×", 25, 55, 20, 22), s("3", 50, 50)])).toBe("2 \\times 3");
  });
});

describe("dots of i and j", () => {
  const line = (x1: number, y1: number, x2: number, y2: number, n = 8): Stroke =>
    Array.from({ length: n + 1 }, (_, k) => ({ x: x1 + ((x2 - x1) * k) / n, y: y1 + ((y2 - y1) * k) / n }));
  const dot = (x: number, y: number): Stroke => [{ x, y }, { x: x + 2, y: y + 1 }];

  it("a dot just above a short upright stroke joins it", () => {
    const symbols = segmentSymbols([line(50, 40, 50, 70), dot(50, 28)]);
    expect(symbols).toHaveLength(1);
    expect(symbols[0].strokes).toHaveLength(2);
  });

  it("a decimal point on the line, and a dot beside a digit, stay separate", () => {
    expect(segmentSymbols([line(50, 30, 50, 70), dot(62, 69)])).toHaveLength(2);
    expect(segmentSymbols([line(50, 30, 50, 70), dot(70, 50)])).toHaveLength(2);
  });
});
