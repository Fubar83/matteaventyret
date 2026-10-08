import { describe, expect, it } from "vitest";
import { evaluate, freeVariables, nearlyEqual, parseExpression, parseLatex } from "../evaluate";

const value = (latex: string, vars: Record<string, number> = {}) => {
  const e = parseExpression(latex);
  if (!e) throw new Error(`didn't parse: ${latex}`);
  return evaluate(e, vars);
};

describe("numbers the Swedish way", () => {
  it("digits laid out one by one are one number", () => {
    expect(value("1 2")).toBe(12);
    expect(value("1 0 0")).toBe(100);
  });

  it("decimal comma (or a point between digits)", () => {
    expect(value("3 {,} 5")).toBe(3.5);
    expect(value("0 . 2 5")).toBe(0.25);
  });

  it("thousands spaced: 12 500", () => {
    expect(value("1 2 \\, 5 0 0")).toBe(12500);
  });

  it("percent", () => {
    expect(value("2 5 \\%")).toBe(0.25);
  });
});

describe("operations", () => {
  it("+ − · × / : with the usual precedence", () => {
    expect(value("2 + 3 \\cdot 4")).toBe(14);
    expect(value("1 2 \\times 3 - 6")).toBe(30);
    expect(value("1 2 / 4 + 1")).toBe(4);
    expect(value("1 : 5 0 0")).toBe(1 / 500);
    expect(value("- 3 + 5")).toBe(2);
    expect(value("4 - ( - 2 )")).toBe(6);
  });

  it("implicit multiplication: 2x, 3(x+1), 2π", () => {
    expect(value("2 x", { x: 5 })).toBe(10);
    expect(value("3 ( x + 1 )", { x: 2 })).toBe(9);
    expect(nearlyEqual(value("2 \\pi"), 2 * Math.PI)).toBe(true);
    expect(value("( 2 + 1 ) ( 4 - 1 )")).toBe(9);
  });

  it("fractions, powers, roots", () => {
    expect(value("\\frac{6}{2} + 1")).toBe(4);
    expect(value("x^{2} + 1", { x: 3 })).toBe(10);
    expect(value("2^{1 0}")).toBe(1024);
    expect(value("3 {,} 2 \\cdot 1 0^{4}")).toBe(32000);
    expect(value("\\sqrt{1 4 4}")).toBe(12);
    expect(value("\\sqrt[3]{2 7}")).toBeCloseTo(3);
    expect(value("| - 5 |")).toBe(5);
  });
});

describe("gymnasiet", () => {
  it("trigonometry in degrees, as school writes it", () => {
    expect(value("\\sin 3 0^{\\circ}")).toBeCloseTo(0.5);
    expect(value("\\cos ( 6 0^{\\circ} )")).toBeCloseTo(0.5);
    expect(value("\\sin 3 0")).toBeCloseTo(0.5);
    expect(value("\\sin \\frac{\\pi}{6}")).toBeCloseTo(0.5);
    expect(value("1 0 \\sin 3 0^{\\circ}")).toBeCloseTo(5);
  });

  it("logarithms and e", () => {
    expect(value("\\lg 1 0 0 0")).toBeCloseTo(3);
    expect(value("\\ln e")).toBeCloseTo(1);
    expect(value("e^{0}")).toBe(1);
  });

  it("an integral with bounds", () => {
    expect(value("\\int_{0}^{2} 3 x^{2} d x")).toBeCloseTo(8, 6);
    expect(value("\\int_{1}^{3} ( 2 x + 1 ) d x")).toBeCloseTo(10, 6);
  });

  it("f′(x) = … reads as a function applied, and its right side as the answer", () => {
    const [line] = parseLatex("f' ( x ) = 6 x + 2")!;
    expect(line.sides[0].kind).toBe("call");
    expect(evaluate(line.sides[1], { x: 1 })).toBe(8);
  });

  it("subscripts are part of the name: x_1", () => {
    const [line] = parseLatex("x_{1} = 2")!;
    expect(freeVariables(line.sides[0])).toEqual(new Set(["x_1"]));
  });
});

describe("lines and relations", () => {
  it("a line of work: sides joined by relations", () => {
    const [line] = parseLatex("1 2 + 7 = 1 9")!;
    expect(line.relations).toEqual(["="]);
    expect(line.sides.map((s) => evaluate(s))).toEqual([19, 19]);
  });

  it("several lines, one per row", () => {
    const lines = parseLatex("\\begin{gathered} 2 x + 3 = 1 1 \\\\ 2 x = 8 \\\\ x = 4 \\end{gathered}")!;
    expect(lines).toHaveLength(3);
    expect(lines.map((l) => evaluate(l.sides[1], { x: 4 }))).toEqual([11, 8, 4]);
  });

  it("≈, ≤ and friends", () => {
    expect(parseLatex("x \\approx 3 {,} 2")![0].relations).toEqual(["≈"]);
    expect(parseLatex("0 < x \\le 5")![0].relations).toEqual(["<", "≤"]);
  });

  it("crossed-out writing is a correction, not read", () => {
    expect(value("\\cancel{7} 8")).toBe(8);
  });

  it("what doesn't read as maths is null, not a guess", () => {
    expect(parseLatex("1 + ) 2")).toBeNull();
    expect(parseLatex("\\begin{array}{rcc} & 1 \\end{array}")).toBeNull();
    expect(parseLatex("")).toBeNull();
  });
});

describe("nearlyEqual", () => {
  it("exact for =, rounding for ≈", () => {
    expect(nearlyEqual(0.1 + 0.2, 0.3)).toBe(true);
    expect(nearlyEqual(3.14, Math.PI)).toBe(false);
    expect(nearlyEqual(3.14, Math.PI, true)).toBe(true);
  });
});
