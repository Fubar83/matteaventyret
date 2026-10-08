import { describe, expect, it } from "vitest";
import { checkGlyph, looksLikeOne, middleBulge } from "../glyphChecks";
import { LABELS } from "../../recognition/labels";
import type { Stroke } from "../../recognition/preprocess";

function poly(...pts: [number, number][]): Stroke {
  const out: Stroke = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[i + 1];
    for (let k = 0; k < 10; k++) out.push({ x: x1 + ((x2 - x1) * k) / 10, y: y1 + ((y2 - y1) * k) / 10 });
  }
  const [x, y] = pts[pts.length - 1];
  out.push({ x, y });
  return out;
}

/** Probabilities where `top` wins and `runnerUp` comes second. */
function probsFavoring(top: string, runnerUp: string, third?: string): number[] {
  const p = LABELS.map(() => 0.001);
  p[LABELS.indexOf(top)] = 0.7;
  p[LABELS.indexOf(runnerUp)] = 0.2;
  if (third) p[LABELS.indexOf(third)] = 0.1;
  return p;
}

const closeParen = poly([5, 0], [17, 10], [20, 25], [17, 40], [5, 50]);
const openParen = poly([20, 0], [8, 10], [5, 25], [8, 40], [20, 50]);
const flaggedOne = poly([8, 7], [13, 0], [13, 45]);
const oneWithFoot = poly([13, 0], [13, 40], [20, 45]);

describe("middleBulge", () => {
  it("is positive for ')', negative for '(', about zero for a '1' - flag or foot included", () => {
    expect(middleBulge([closeParen])!).toBeGreaterThan(0.1);
    expect(middleBulge([openParen])!).toBeLessThan(-0.1);
    expect(Math.abs(middleBulge([flaggedOne])!)).toBeLessThan(0.03);
    expect(Math.abs(middleBulge([oneWithFoot])!)).toBeLessThan(0.03);
  });
});

describe("checkGlyph", () => {
  it("turns a straight stroke the model called ')' into its best non-parenthesis guess (regression: '1' read as ')')", () => {
    expect(checkGlyph(")", [flaggedOne], probsFavoring(")", "1"))).toBe("1");
  });

  it("never falls back to '.' for a tall straight stroke", () => {
    expect(checkGlyph(")", [flaggedOne], probsFavoring(")", ".", "1"))).toBe("1");
  });

  it("keeps real parentheses, and fixes their direction from the bulge", () => {
    expect(checkGlyph(")", [closeParen], probsFavoring(")", "1"))).toBe(")");
    expect(checkGlyph(")", [openParen], probsFavoring(")", "1"))).toBe("(");
  });

  it("reads a straight upright stroke as '1' whatever non-digit the model said (regression: a flagged '1' came out as '+')", () => {
    expect(checkGlyph("+", [flaggedOne], probsFavoring("+", ")"))).toBe("1");
    expect(checkGlyph(".", [oneWithFoot], probsFavoring(".", ")"))).toBe("1");
  });

  it("doesn't turn a diagonal '/' into a '1'", () => {
    expect(checkGlyph("/", [poly([30, 0], [0, 50])], probsFavoring("/", "1"))).toBe("/");
  });

  it("reads a narrow closed loop the model called '8' as '0' (regression: the '0' of a squeezed borrowed '10' read as '8')", () => {
    const narrowZero: Stroke = Array.from({ length: 25 }, (_, i) => {
      const a = -Math.PI / 2 + (i / 24) * 2 * Math.PI;
      return { x: 11 + 9 * Math.cos(a), y: 23 + 23 * Math.sin(a) };
    });
    expect(checkGlyph("8", [narrowZero], probsFavoring("8", "0"))).toBe("0");
  });

  it("keeps a real one-stroke '8' (it crosses itself in the middle)", () => {
    // A smoothly drawn figure-eight (a Lissajous curve), starting and ending at the top.
    const eight: Stroke = Array.from({ length: 31 }, (_, i) => {
      const t = (i / 30) * 2 * Math.PI;
      return { x: 10 + 8 * Math.sin(2 * t), y: 20 - 18 * Math.cos(t) };
    });
    expect(checkGlyph("8", [eight], probsFavoring("8", "0"))).toBe("8");
  });

  it("reads a '1' as 1 even when the digits-only model says '7' or '4'", () => {
    expect(checkGlyph("7", [flaggedOne], probsFavoring("7", "1"))).toBe("1");
    expect(checkGlyph("4", [poly([13, 0], [12, 45])], probsFavoring("4", "1"))).toBe("1");
  });

  it("leaves a real one-stroke '7' a 7 (its top bar makes it too wide to be a '1')", () => {
    const seven = poly([0, 0], [30, 0], [14, 45]);
    expect(checkGlyph("7", [seven], probsFavoring("7", "1"))).toBe("7");
  });

  it("leaves every other character alone", () => {
    const two = poly([0, 10], [10, 0], [22, 4], [24, 16], [0, 40], [26, 40]);
    expect(checkGlyph("2", [two], probsFavoring("2", "7"))).toBe("2");
  });
});

describe("dotless i and j", () => {
  const hook = poly([18, 0], [18, 32], [12, 46], [2, 46], [-4, 36]);

  it("one stroke can't be an 'i' or 'j' - it's the model's next guess", () => {
    expect(checkGlyph("j", [hook], probsFavoring("j", "y"))).toBe("y");
    expect(checkGlyph("i", [oneWithFoot], probsFavoring("i", "j", "l"))).toBe("1"); // a dotless straight "i" is a 1
  });

  it("with its dot, it stays", () => {
    expect(checkGlyph("j", [hook, poly([15, -12], [16, -11])], probsFavoring("j", "y"))).toBe("j");
  });
});

describe("looksLikeOne", () => {
  it("a 1 - plain, flagged, with a foot, or leaning back under its flag", () => {
    expect(looksLikeOne([poly([13, 0], [13, 45])])).toBe(true);
    expect(looksLikeOne([flaggedOne])).toBe(true);
    expect(looksLikeOne([oneWithFoot])).toBe(true);
    expect(looksLikeOne([poly([6, 8], [14, 0], [10, 45])])).toBe(true);
  });

  it("not a narrow Z-shaped 2 - straight and upright through its middle, but it zigzags", () => {
    const zTwo = poly([0, 0], [8, 0], [0, 45], [8, 45]);
    expect(middleBulge([zTwo])!).toBeLessThan(0.06); // passes the straightness test...
    expect(looksLikeOne([zTwo])).toBe(false); // ...but turns back twice
  });
});

describe("a bracket that's only slightly bowed", () => {
  const sure = (char: string) => {
    const p = LABELS.map(() => 0.001);
    p[LABELS.indexOf(char)] = 0.94;
    p[LABELS.indexOf("1")] = 0.04; // the runner-up a real model gives a bracket-shaped stroke
    return p;
  };
  const slightOpen = poly([20, 0], [16.5, 25], [20, 50]);

  it("stays a bracket when the classifier is sure of it (regression: '(x − 2)(x − 3)' read as 1s)", () => {
    const bulge = Math.abs(middleBulge([slightOpen])!);
    expect(bulge).toBeLessThan(0.06); // under the "clearly bowed" line...
    expect(bulge).toBeGreaterThan(0.03); // ...but more than a 1 ever bows
    expect(checkGlyph("(", [slightOpen], sure("("))).toBe("(");
  });

  it("but a straight 1 the classifier took for ')' is still a 1", () => {
    expect(checkGlyph(")", [flaggedOne], sure(")"))).toBe("1");
  });
});
