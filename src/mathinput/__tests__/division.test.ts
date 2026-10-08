import { describe, expect, it } from "vitest";
import { findDivisionBracket, type DivisionBracket } from "../divisionBracket";
import { layoutSymbols, type ClassifiedSymbol } from "../layout";
import type { BoundingBox } from "../segmentation";
import type { Point, Stroke } from "../../recognition/preprocess";

function s(char: string, cx: number, cy: number, opts: { w?: number; h?: number } = {}): ClassifiedSymbol {
  const w = opts.w ?? 24;
  const h = opts.h ?? 40;
  const box: BoundingBox = { cx, cy, width: w, height: h, minX: cx - w / 2, maxX: cx + w / 2, minY: cy - h / 2, maxY: cy + h / 2 };
  return { char, box };
}
const digits = (text: string, rightX: number, cy: number) => [...text].map((d, i) => s(d, rightX - (text.length - 1 - i) * 34, cy));
const line = (fromX: number, toX: number, cy: number) => s("-", (fromX + toX) / 2, cy, { w: toX - fromX, h: 3 });
const norm = (t: string) => t.replace(/\s+/g, " ");

function bracketSymbol(b: DivisionBracket): ClassifiedSymbol {
  const minX = Math.min(b.bar.minX, b.stemX);
  const maxX = Math.max(b.bar.maxX, b.stemX);
  const box: BoundingBox = { minX, maxX, minY: b.bar.y, maxY: b.stemBottom, cx: (minX + maxX) / 2, cy: (b.bar.y + b.stemBottom) / 2, width: maxX - minX, height: b.stemBottom - b.bar.y };
  return { char: "⟌", box, bracket: b };
}

describe("long division (trappan / liggande stolen)", () => {
  // 764 / 4 = 191, worked out underneath, digits one column (34px) apart.
  const work = [
    s("-", 100, 150, { w: 16, h: 3 }),
    ...digits("4", 130, 150),
    line(90, 145, 175),
    ...digits("36", 164, 205),
    s("-", 110, 250, { w: 16, h: 3 }),
    ...digits("36", 164, 250),
    line(100, 180, 275),
    ...digits("04", 198, 305),
    s("-", 170, 350, { w: 16, h: 3 }),
    ...digits("4", 198, 350),
    line(160, 215, 375),
    ...digits("0", 198, 405),
  ];

  it("lays out liggande stolen: quotient over the dividend, divisor right of the stem, each step on its own digit columns", () => {
    const bracket = bracketSymbol({ divisorSide: "right", bar: { minX: 100, maxX: 230, y: 60 }, stemX: 230, stemBottom: 120 });
    const symbols = [bracket, ...digits("191", 198, 35), ...digits("764", 198, 90), ...digits("4", 255, 90), ...work];
    expect(norm(layoutSymbols(symbols))).toBe(
      norm(
        "\\begin{array}{rl} 191 & \\\\ \\overline{764} & \\big|\\,4 \\\\ \\underline{-4}\\phantom{0}\\phantom{0} & \\\\ 36\\phantom{0} & \\\\ \\underline{-36}\\phantom{0} & \\\\ 04 & \\\\ \\underline{-4} & \\\\ 0 & \\end{array}"
      )
    );
  });

  it("lays out trappan the same way, with the divisor in a column on the left", () => {
    const bracket = bracketSymbol({ divisorSide: "left", bar: { minX: 100, maxX: 230, y: 60 }, stemX: 100, stemBottom: 120 });
    const symbols = [bracket, ...digits("191", 198, 35), ...digits("764", 198, 90), ...digits("4", 75, 90)];
    expect(norm(layoutSymbols(symbols))).toBe(norm("\\begin{array}{rr} & 191 \\\\ 4\\,\\big| & \\overline{764} \\end{array}"));
  });

  it("leaves whatever is written to the right of the whole division alone", () => {
    const bracket = bracketSymbol({ divisorSide: "left", bar: { minX: 100, maxX: 230, y: 60 }, stemX: 100, stemBottom: 120 });
    const symbols = [bracket, ...digits("191", 198, 35), ...digits("764", 198, 90), ...digits("4", 75, 90), s("=", 290, 90, { h: 20 }), ...digits("191", 400, 90)];
    expect(norm(layoutSymbols(symbols))).toMatch(/\\end\{array\} = 1 9 1$/);
  });
});

describe("kort division", () => {
  it("reads the small remainder note in front of a digit as a prescript on that digit, not an exponent (688 / 4 = 172)", () => {
    const symbols = [
      s("6", 100, 40),
      s("2", 118, 26, { w: 10, h: 16 }), // remainder 2, tucked up-left of the first 8
      s("8", 134, 40),
      s("8", 168, 40),
      line(80, 190, 75),
      s("4", 134, 110),
      s("=", 220, 75, { h: 20 }),
      ...digits("172", 328, 75),
    ];
    expect(layoutSymbols(symbols)).toBe("\\frac{6 {}^{2}8 8}{4} = 1 7 2");
  });

  it("still reads a small raised digit at the END of a number as an exponent", () => {
    expect(layoutSymbols([s("1", 100, 40), s("0", 130, 40), s("2", 150, 24, { w: 10, h: 16 })])).toBe("1 0^{2}");
  });
});

describe("findDivisionBracket", () => {
  function boxOf(strokes: Stroke[]): BoundingBox {
    const pts = strokes.flat();
    const minX = Math.min(...pts.map((p) => p.x));
    const minY = Math.min(...pts.map((p) => p.y));
    const maxX = Math.max(...pts.map((p) => p.x));
    const maxY = Math.max(...pts.map((p) => p.y));
    return { minX, minY, maxX, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, width: maxX - minX, height: maxY - minY };
  }
  function dense(...corners: Point[]): Stroke {
    const out: Point[] = [];
    for (let i = 0; i < corners.length - 1; i++) {
      const [a, b] = [corners[i], corners[i + 1]];
      const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 4));
      for (let k = 0; k < n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
    }
    out.push(corners[corners.length - 1]);
    return out;
  }

  it("finds liggande stolen's '┐' (divisor on the right)", () => {
    const strokes = [dense({ x: 0, y: 0 }, { x: 120, y: 2 }, { x: 121, y: 60 })];
    expect(findDivisionBracket(strokes, boxOf(strokes))?.divisorSide).toBe("right");
  });

  it("finds trappan's '┌' (divisor on the left), drawn as two touching strokes", () => {
    const strokes = [dense({ x: 0, y: 60 }, { x: 1, y: 0 }), dense({ x: 1, y: 0 }, { x: 120, y: 2 })];
    expect(findDivisionBracket(strokes, boxOf(strokes))?.divisorSide).toBe("left");
  });

  it("rejects a '7' (its stem slants)", () => {
    const seven = [dense({ x: 0, y: 0 }, { x: 30, y: 0 }, { x: 12, y: 50 })];
    expect(findDivisionBracket(seven, boxOf(seven))).toBeNull();
  });

  it("rejects a root sign (its tick runs down-left from the bar and back, not straight down)", () => {
    const root = [dense({ x: 0, y: 40 }, { x: 8, y: 34 }, { x: 18, y: 70 }, { x: 30, y: 0 }, { x: 130, y: 2 })];
    expect(findDivisionBracket(root, boxOf(root))).toBeNull();
  });
});
