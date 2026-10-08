import { describe, expect, it } from "vitest";
import { givenNumbers } from "../../engine/advanced";
import { GEOMETRY_GENERATORS } from "../../engine/geometry";
import { makeRng } from "../../engine/rng";
import { highlightInLatex, inkNumbers } from "../highlightNumbers";
import type { BoundingBox } from "../segmentation";
import { checkWrittenAnswer, type Answer } from "../workCheck";

/** The triangle from the screenshot: base 8 m, height 6 m. */
const triangle: Answer = { kind: "value", value: 24, givens: [8, 6, 2, 48, 24] };

describe("a number that came from nowhere", () => {
  it("8 · 5 / 2 = 20 when the height is 6: the 5 - not the 20, which is what 8 · 5 / 2 makes", () => {
    const v = checkWrittenAnswer("\\frac{8 \\cdot 5}{2} = 2 0", triangle);
    expect(v.correct).toBe(false);
    expect(v.badLines).toEqual([]);
    expect(v.unknownNumbers).toEqual([5]);
  });

  it("carried on over several lines: still only the 5 (40 and 20 are worked out from it)", () => {
    const v = checkWrittenAnswer("8 \\cdot 5 = 4 0 \\\\ \\frac{4 0}{2} = 2 0", triangle);
    expect(v.unknownNumbers).toEqual([5]);
  });

  it("a slip in the arithmetic: the wrong result is the number pointed at", () => {
    const v = checkWrittenAnswer("\\frac{8 \\cdot 6}{2} = 2 5", triangle);
    expect(v.unknownNumbers).toEqual([25]);
    expect(v.badLines).toEqual([0]);
  });

  it("nothing is pointed at when the answer is right, or when the question gives no numbers to go by", () => {
    expect(checkWrittenAnswer("\\frac{8 \\cdot 6}{2} = 2 4", triangle).unknownNumbers).toBeUndefined();
    expect(checkWrittenAnswer("\\frac{8 \\cdot 5}{2} = 2 0", { kind: "value", value: 24 }).unknownNumbers).toBeUndefined();
  });

  it("an exponent is notation, not a number from the question - and π ≈ 3,14 is fine", () => {
    const circle: Answer = { kind: "value", value: 78.5, approx: true, givens: [5, 25, 78.5, 3.14] };
    expect(checkWrittenAnswer("3{,}14 \\cdot 4^{2} = 5 0{,}2 4", circle).unknownNumbers).toEqual([4]);
  });

  it("every geometry question's own numbers include each measurement in its figure", () => {
    const rng = makeRng(3);
    for (const gen of Object.values(GEOMETRY_GENERATORS)) {
      for (let i = 0; i < 50; i++) {
        const p = gen(rng);
        const given = givenNumbers(p);
        for (const label of p.figure!.labels) {
          const m = /\d+(?:,\d+)?/.exec(label.text);
          if (m) expect(given, `${p.stageId} ${label.text}`).toContain(Number(m[0].replace(",", ".")));
        }
      }
    }
  });
});

describe("marking the number in the reading", () => {
  it("colours the number, its digits spaced as the reader writes them", () => {
    expect(highlightInLatex("\\frac{8 \\cdot 5}{2} = 2 0", [5])).toBe("\\frac{8 \\cdot \\textcolor{#dc2626}{5}}{2} = 2 0");
    expect(highlightInLatex("\\frac{8 \\cdot 5}{2} = 2 0", [20])).toBe("\\frac{8 \\cdot 5}{2} = \\textcolor{#dc2626}{2 0}");
    expect(highlightInLatex("7 8 {,} 5", [78.5])).toBe("\\textcolor{#dc2626}{7 8 {,} 5}");
  });

  it("leaves exponents and subscripts alone", () => {
    expect(highlightInLatex("r^{2} + x_{2} = 2", [2])).toBe("r^{2} + x_{2} = \\textcolor{#dc2626}{2}");
  });
});

describe("finding the number in the ink", () => {
  const sym = (char: string, cx: number, cy: number, w = 20, h = 36) => {
    const box: BoundingBox = { cx, cy, width: w, height: h, minX: cx - w / 2, maxX: cx + w / 2, minY: cy - h / 2, maxY: cy + h / 2 };
    return { char, box, strokes: [[{ x: cx, y: cy }]] };
  };

  it("digits side by side are one number; an operator between them splits them", () => {
    const values = inkNumbers([sym("8", 20, 50), sym("·", 45, 50, 6, 6), sym("5", 70, 50), sym("=", 110, 50), sym("2", 150, 50), sym("0", 175, 50)]).map((n) => n.value);
    expect(values).toEqual([8, 5, 20]);
  });

  it("a fraction's numerator and denominator are different numbers", () => {
    const values = inkNumbers([sym("4", 20, 30), sym("8", 45, 30), sym("-", 35, 60, 50, 3), sym("2", 35, 90)]).map((n) => n.value);
    expect(values.sort((a, b) => a - b)).toEqual([2, 48]);
  });

  it("a decimal comma stays inside the number", () => {
    expect(inkNumbers([sym("7", 20, 50), sym("8", 45, 50), sym(",", 60, 66, 5, 10), sym("5", 75, 50)]).map((n) => n.value)).toEqual([78.5]);
  });
});
