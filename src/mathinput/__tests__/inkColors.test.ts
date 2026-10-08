import { describe, expect, it } from "vitest";
import { colorStrokesByChecks } from "../inkColors";
import type { Stroke } from "../../recognition/preprocess";
import type { BoundingBox } from "../segmentation";
import type { CheckMark, WorkCheck } from "../verify";

const COLORS = { correct: "green", wrong: "red", followOnError: "amber" };

function box(minX: number, minY: number, maxX: number, maxY: number): BoundingBox {
  return { minX, minY, maxX, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, width: maxX - minX, height: maxY - minY };
}
const check = (marks: CheckMark[]): WorkCheck => ({ title: "", answer: "", allCorrect: false, errors: 0, followOnErrors: 0, missing: 0, marks });
const line = (x1: number, y1: number, x2: number, y2: number): Stroke => [
  { x: x1, y: y1 },
  { x: x2, y: y2 },
];

describe("colorStrokesByChecks", () => {
  it("colors each stroke by the verdict of the digit it belongs to", () => {
    const one = line(10, 0, 10, 40);
    const seven = line(60, 0, 50, 40);
    const colors = colorStrokesByChecks([one, seven], [check([{ status: "correct", box: box(8, 0, 12, 40) }, { status: "wrong", box: box(48, 0, 62, 40) }])], COLORS);
    expect(colors.get(one)).toBe("green");
    expect(colors.get(seven)).toBe("red");
  });

  it("colors a strike-through with the digit it crosses out", () => {
    const zero = line(0, 0, 20, 40);
    const strike = line(-4, 34, 24, 6); // pokes out of the digit's box, but its center is on it
    const colors = colorStrokesByChecks([zero, strike], [check([{ status: "correct", box: box(0, 0, 20, 40) }])], COLORS);
    expect(colors.get(strike)).toBe("green");
  });

  it("uses the smallest mark when marks nest (a note's part inside the whole note)", () => {
    const zeroOfTen = line(20, 0, 28, 18);
    const marks: CheckMark[] = [
      { status: "correct", box: box(0, 0, 30, 20) }, // the whole "10"
      { status: "wrong", box: box(18, 0, 30, 20) }, // just its "0"
    ];
    expect(colorStrokesByChecks([zeroOfTen], [check(marks)], COLORS).get(zeroOfTen)).toBe("red");
  });

  it("leaves ink no mark covers uncolored, and never colors for a 'missing' mark", () => {
    const stray = line(200, 200, 210, 240);
    const inMissingSlot = line(10, 0, 10, 40);
    const colors = colorStrokesByChecks([stray, inMissingSlot], [check([{ status: "missing", box: box(0, 0, 20, 40) }])], COLORS);
    expect(colors.size).toBe(0);
  });
});
