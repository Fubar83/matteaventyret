import { describe, expect, it } from "vitest";
import { isCrossedDiagonalPair, isFlatDash, segmentSymbols } from "../segmentation";
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

  it("merges strokes with a small gap between them into one symbol (e.g. a '5' whose hat doesn't quite touch its stem)", () => {
    const stem = box(0, 0, 20, 20); // (0,0) -> (20,20)
    const hat = [{ x: 23, y: 20 }, { x: 43, y: 0 }]; // starts 3px from the stem's end
    const symbols = segmentSymbols([stem, hat]);
    expect(symbols.length).toBe(1);
    expect(symbols[0].strokes.length).toBe(2);
  });

  it("merges crossing strokes (the two legs of an 'x')", () => {
    const symbols = segmentSymbols([box(0, 0, 30, 40), [{ x: 30, y: 0 }, { x: 0, y: 40 }]]);
    expect(symbols.length).toBe(1);
  });

  it("keeps an exponent written just off the tip of an 'x's arm separate (regression: 'x²' was read as one '4')", () => {
    const xLegA = box(0, 20, 40, 40); // (0,20) -> (40,60)
    const xLegB = [{ x: 40, y: 20 }, { x: 0, y: 60 }]; // top-right arm ends at (40,20)
    // A "2" whose lower-left end comes within ~8px of that arm tip.
    const exponent = [{ x: 45, y: 4 }, { x: 59, y: 4 }, { x: 46, y: 25 }, { x: 62, y: 25 }];
    const symbols = segmentSymbols([xLegA, xLegB, exponent]);
    expect(symbols.map((s) => s.strokes.length)).toEqual([2, 1]);
  });

  it("doesn't let a big root sign swallow the digits written just under its bar (regression: √(23x/3) lost its '23')", () => {
    const pts = (...p: [number, number][]) => p.map(([x, y]) => ({ x, y }));
    const root = pts([90, 271], [102, 257], [116, 350], [132, 175], [430, 175]);
    const two = pts([183, 203], [187, 190], [195, 190], [206, 203], [183, 242], [207, 242]);
    const three = pts([225, 195], [245, 190], [250, 214], [235, 216], [252, 230], [240, 242], [225, 237]);
    const symbols = segmentSymbols([root, two, three]);
    expect(symbols.map((s) => s.strokes.length)).toEqual([1, 1, 1]);
  });

  it("keeps a '(' separate from the digit it encloses", () => {
    const paren = [{ x: 10, y: 0 }, { x: 0, y: 30 }, { x: 10, y: 60 }];
    const one = [{ x: 18, y: 10 }, { x: 18, y: 50 }]; // 8px right of the paren's tips
    expect(segmentSymbols([paren, one]).length).toBe(2);
  });

  it("does not merge a numerator and denominator just because they share a column (different rows)", () => {
    // Same horizontal span, but far apart vertically - should stay separate symbols.
    const strokes = [box(0, 0, 20, 10), box(0, 100, 20, 10)];
    const symbols = segmentSymbols(strokes);
    expect(symbols.length).toBe(2);
  });

  it("keeps a page of tightly-but-distinctly spaced symbols separate, while still merging each symbol's own strokes (regression: a whole '1/x^2=10' page was once merged into a single blob)", () => {
    const x = [box(0, 0, 40, 40), [{ x: 40, y: 0 }, { x: 0, y: 40 }]]; // two crossing strokes, one symbol
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

  it("keeps a small exponent written close to its base as its own symbol (regression: 'x²' merged into one blob)", () => {
    const x = [box(0, 20, 32, 40), box(32, 20, -32, 40)];
    const exponent = box(40, 0, 16, 24); // 8px to the right of the x, raised - the old summed margins (~12px) swallowed this
    expect(segmentSymbols([...x, exponent]).length).toBe(2);
  });

  it("keeps a denominator's exponent written just under a fraction bar separate from the bar", () => {
    const bar = box(0, 0, 120, 0);
    const exponent = box(70, 12, 16, 24); // 12px below the bar
    expect(segmentSymbols([bar, exponent]).length).toBe(2);
  });

  describe("crossed-out digits", () => {
    const zero: Stroke = Array.from({ length: 25 }, (_, i) => {
      const t = (i / 24) * 2 * Math.PI;
      return { x: 12 + 12 * Math.cos(t), y: 20 + 20 * Math.sin(t) };
    });

    it("pulls a diagonal strike out of a '0' and marks the 0 as struck, instead of merging them", () => {
      const strike = [{ x: -2, y: 44 }, { x: 26, y: -4 }];
      const symbols = segmentSymbols([zero, strike]);
      expect(symbols.length).toBe(1);
      expect(symbols[0].struck).toBe(true);
      expect(symbols[0].strokes).toEqual([zero]);
    });

    it("recognizes a struck '1' (straight and upright) too", () => {
      const one = [{ x: 10, y: 0 }, { x: 10, y: 40 }];
      const strike = [{ x: 0, y: 34 }, { x: 22, y: 6 }];
      const [symbol] = segmentSymbols([one, strike]);
      expect(symbol.struck).toBe(true);
    });

    it("lets one strike cross out a whole small note ('10' struck in one go)", () => {
      const one = [{ x: 4, y: 0 }, { x: 4, y: 18 }];
      const smallZero: Stroke = Array.from({ length: 21 }, (_, i) => {
        const t = (i / 20) * 2 * Math.PI;
        return { x: 16 + 5 * Math.cos(t), y: 9 + 9 * Math.sin(t) };
      });
      const strike = [{ x: -2, y: 16 }, { x: 24, y: 2 }];
      const symbols = segmentSymbols([one, smallZero, strike]);
      expect(symbols.length).toBe(2);
      expect(symbols.every((sym) => sym.struck)).toBe(true);
    });

    describe("flat strikes (a line drawn straight through a number)", () => {
      const smallOne: Stroke = [{ x: 4, y: 0 }, { x: 4, y: 18 }];
      const smallZero: Stroke = Array.from({ length: 21 }, (_, i) => {
        const t = (i / 20) * 2 * Math.PI;
        return { x: 16 + 5 * Math.cos(t), y: 9 + 9 * Math.sin(t) };
      });

      it("crosses out a borrowed '10' with a flat line through both digits", () => {
        const line = [{ x: -2, y: 9 }, { x: 24, y: 10 }];
        const symbols = segmentSymbols([smallOne, smallZero, line]);
        expect(symbols.length).toBe(2);
        expect(symbols.every((sym) => sym.struck)).toBe(true);
      });

      it("still counts a line passing exactly through the '0''s own sample points (regression: its '0' was missed, only the '1' got crossed out)", () => {
        const line = [{ x: -2, y: 9 }, { x: 24, y: 9 }]; // y = 9 is exactly the zero's leftmost/rightmost points
        const symbols = segmentSymbols([smallOne, smallZero, line]);
        expect(symbols.every((sym) => sym.struck)).toBe(true);
      });

      it("crosses out the whole '10' when a dash cuts the '0' but only nicks the top of the '1' (regression: only the '0' registered)", () => {
        // Slightly rising dash: through the 0's middle, but reaching the 1 only near its top.
        const dash = [{ x: 3, y: 1 }, { x: 24, y: 9 }]; // crosses the 1 at y≈1.4 of 0-18: above its middle band
        const symbols = segmentSymbols([smallOne, smallZero, dash]);
        expect(symbols.length).toBe(2);
        expect(symbols.every((sym) => sym.struck)).toBe(true);
      });

      it("crosses out a single curved digit ('0') with a flat line", () => {
        const [zero] = segmentSymbols([smallZero, [{ x: 9, y: 10 }, { x: 24, y: 9 }]]);
        expect(zero.struck).toBe(true);
      });

      it("crosses out a whole full-size number ('100') with one line", () => {
        const one: Stroke = [{ x: 10, y: 0 }, { x: 10, y: 40 }];
        const zeroAt = (cx: number): Stroke =>
          Array.from({ length: 25 }, (_, i) => {
            const t = (i / 24) * 2 * Math.PI;
            return { x: cx + 11 * Math.cos(t), y: 20 + 20 * Math.sin(t) };
          });
        const line = [{ x: 0, y: 21 }, { x: 100, y: 19 }];
        const symbols = segmentSymbols([one, zeroAt(40), zeroAt(75), line]);
        expect(symbols.length).toBe(3);
        expect(symbols.every((sym) => sym.struck)).toBe(true);
      });

      it("leaves a '+' alone (a flat line through one straight stroke)", () => {
        const [plus] = segmentSymbols([[{ x: 12, y: 0 }, { x: 12, y: 24 }], [{ x: 0, y: 12 }, { x: 24, y: 12 }]]);
        expect(plus.struck).toBeUndefined();
        expect(plus.strokes.length).toBe(2);
      });

      it("leaves a continental '7' alone (its crossbar is too short to be a strike)", () => {
        const seven: Stroke = [{ x: 0, y: 0 }, { x: 30, y: 0 }, { x: 22, y: 20 }, { x: 12, y: 45 }];
        const crossbar: Stroke = [{ x: 10, y: 22 }, { x: 28, y: 22 }];
        const [symbol] = segmentSymbols([seven, crossbar]);
        expect(symbol.struck).toBeUndefined();
      });

      it("doesn't treat the line under a column sum as a strike (it crosses nothing)", () => {
        const one: Stroke = [{ x: 10, y: 0 }, { x: 10, y: 40 }];
        const symbols = segmentSymbols([one, [{ x: 0, y: 55 }, { x: 60, y: 55 }]]);
        expect(symbols.some((sym) => sym.struck)).toBe(false);
      });
    });

    it("leaves an 'x' alone (two crossing diagonals)", () => {
      const symbols = segmentSymbols([box(0, 0, 30, 40), [{ x: 30, y: 0 }, { x: 0, y: 40 }]]);
      expect(symbols.length).toBe(1);
      expect(symbols[0].struck).toBeUndefined();
      expect(symbols[0].strokes.length).toBe(2);
    });

    it("leaves a two-stroke '4' alone (its upright crosses the other stroke at the bottom edge, not the middle)", () => {
      const corner = [{ x: 14, y: 0 }, { x: 0, y: 26 }, { x: 26, y: 26 }];
      const upright = [{ x: 20, y: 6 }, { x: 17, y: 42 }];
      const symbols = segmentSymbols([corner, upright]);
      expect(symbols.length).toBe(1);
      expect(symbols[0].struck).toBeUndefined();
    });

    it("leaves a '+' alone", () => {
      const symbols = segmentSymbols([[{ x: 12, y: 0 }, { x: 12, y: 24 }], [{ x: 0, y: 12 }, { x: 24, y: 12 }]]);
      expect(symbols.length).toBe(1);
      expect(symbols[0].struck).toBeUndefined();
    });
  });

  describe("pairing the two bars of '='", () => {
    it("merges two stacked bars too far apart for the proximity merge into one symbol (regression: '=' came out as two separate lines)", () => {
      const symbols = segmentSymbols([box(0, 0, 40, 0), box(0, 15, 40, 0)]);
      expect(symbols.length).toBe(1);
      expect(symbols[0].strokes.length).toBe(2);
    });

    it("tags a paired '=' as known, so a flat one isn't left to the classifier (regression: a wide, flat '=' was read as '4')", () => {
      const [equals] = segmentSymbols([box(0, 0, 50, 0), box(0, 10, 50, 0)]);
      expect(equals.knownChar).toBe("=");
      expect(segmentSymbols([box(0, 0, 20, 40)])[0].knownChar).toBeUndefined();
    });

    it("pairs a quick short bar over a long one (regression, from real handwriting: 10px over 25px read as two minus signs)", () => {
      const [equals, ...rest] = segmentSymbols([box(338, 29, 10, 1), box(333, 13, 25, 4)]);
      expect(rest).toHaveLength(0);
      expect(equals.knownChar).toBe("=");
    });

    it("pairs a slanted '=' whose bars only partly overlap (regression, from MathWriting's '1+3+5=9')", () => {
      const [equals, ...rest] = segmentSymbols([box(180, 34, 22, 5), box(191, 48, 35, 4)]);
      expect(rest).toHaveLength(0);
      expect(equals.knownChar).toBe("=");
    });

    it("pairs a tall, narrow '=' - bars about their own length apart (regression, from MathWriting's '0+0=0')", () => {
      const [equals, ...rest] = segmentSymbols([box(158, 48, 19, 2), box(160, 64, 17, 6)]);
      expect(rest).toHaveLength(0);
      expect(equals.knownChar).toBe("=");
    });

    it("tolerates a slightly shorter, slightly offset second bar", () => {
      const symbols = segmentSymbols([box(0, 0, 40, 0), box(6, 14, 30, 2)]);
      expect(symbols.length).toBe(1);
    });

    it("doesn't pair two stacked bars with a symbol between them (a nested fraction's bars, not an '=')", () => {
      const outerBar = box(0, 0, 80, 0);
      const digit = box(35, 15, 10, 20);
      const innerBar = box(0, 50, 80, 0);
      expect(segmentSymbols([outerBar, digit, innerBar]).length).toBe(3);
    });

    it("doesn't pair bars of very different lengths (e.g. a long fraction bar and a short minus sign near it)", () => {
      expect(segmentSymbols([box(0, 0, 80, 0), box(30, 15, 15, 0)]).length).toBe(2);
    });

    it("doesn't pair bars that are far apart relative to their length", () => {
      expect(segmentSymbols([box(0, 0, 30, 0), box(0, 40, 30, 0)]).length).toBe(2);
    });
  });
});

describe("digits-only shape tests", () => {
  const seg = (...pts: [number, number][]): Stroke => pts.map(([x, y]) => ({ x, y }));

  it("isCrossedDiagonalPair: an 'x' shape (a slanted '1' crossed out) - but not a '+', a two-stroke '4' or a '7'", () => {
    expect(isCrossedDiagonalPair([seg([14, 0], [6, 40]), seg([0, 30], [22, 8])])).toBe(true);
    expect(isCrossedDiagonalPair([seg([12, 0], [12, 24]), seg([0, 12], [24, 12])])).toBe(false); // +
    expect(isCrossedDiagonalPair([seg([14, 0], [0, 26], [26, 26]), seg([20, 6], [19, 42])])).toBe(false); // 4
    expect(isCrossedDiagonalPair([seg([0, 0], [30, 0]), seg([30, 0], [12, 45])])).toBe(false); // 7 (touching, not crossing)
  });

  it("isFlatDash: a minus sign or underline, however short - never a digit", () => {
    expect(isFlatDash([seg([0, 10], [12, 11])])).toBe(true);
    expect(isFlatDash([seg([0, 50], [140, 52])])).toBe(true);
    expect(isFlatDash([seg([10, 0], [10, 40])])).toBe(false); // 1
    expect(isFlatDash([seg([0, 0], [30, 0], [12, 45])])).toBe(false); // 7
    expect(isFlatDash([seg([0, 0], [4, 1])])).toBe(false); // a dot, too short to judge
  });
});

describe("crossing out in free writing", () => {
  const curve: Stroke = [{ x: 10, y: 0 }, { x: 18, y: 10 }, { x: 20, y: 20 }, { x: 18, y: 30 }, { x: 10, y: 40 }];
  const diagonal: Stroke = [{ x: 0, y: 5 }, { x: 30, y: 38 }];

  it("an x drawn as a curve and a line is an x - not a crossed-out digit - when there's no column (regression: '-x+x' read as struck 7s)", () => {
    const symbols = segmentSymbols([curve, diagonal], { strikes: "inColumns" });
    expect(symbols).toHaveLength(1);
    expect(symbols[0].struck).toBeUndefined();
    expect(symbols[0].strokes).toHaveLength(2);
  });

  it("the same strokes over a column calculation's line are a crossed-out digit", () => {
    const line: Stroke = [{ x: -20, y: 120 }, { x: 60, y: 120 }];
    const symbols = segmentSymbols([curve, diagonal, line], { strikes: "inColumns" });
    expect(symbols.some((s) => s.struck)).toBe(true);
  });

  it("in a template (strikes: always) a line through a digit is always crossing it out", () => {
    expect(segmentSymbols([curve, diagonal]).some((s) => s.struck)).toBe(true);
  });
});

describe("an '=' whose bar touches the next digit", () => {
  it("keeps the bar with its partner, not the digit (regression, from MathWriting's '0+0=0')", () => {
    const top: Stroke = [{ x: 170, y: 40 }, { x: 205, y: 40 }];
    const bottom: Stroke = [{ x: 172, y: 58 }, { x: 203, y: 58 }];
    // A "0" whose left edge the top bar runs into.
    const zero: Stroke = Array.from({ length: 25 }, (_, i) => {
      const a = (i / 24) * 2 * Math.PI;
      return { x: 222 + 17 * Math.cos(a), y: 45 + 25 * Math.sin(a) };
    });
    const symbols = segmentSymbols([top, bottom, zero]);
    expect(symbols).toHaveLength(2);
    expect(symbols[0].knownChar).toBe("=");
  });

  it("a '+' crossing a bar across its middle still merges (a plus over a minus stays one '+')", () => {
    const bar: Stroke = [{ x: 0, y: 20 }, { x: 30, y: 20 }];
    const upright: Stroke = [{ x: 15, y: 5 }, { x: 15, y: 35 }];
    const below: Stroke = [{ x: 2, y: 45 }, { x: 28, y: 45 }];
    const symbols = segmentSymbols([bar, upright, below]);
    expect(symbols.some((s) => s.strokes.includes(bar) && s.strokes.includes(upright))).toBe(true);
  });
});
