import { describe, expect, it } from "vitest";
import type { Stroke } from "../../recognition/preprocess";
import { isPlusSign } from "../draw/readBox";

/** A straight stroke from (x1, y1) to (x2, y2). */
const line = (x1: number, y1: number, x2: number, y2: number): Stroke =>
  Array.from({ length: 9 }, (_, i) => ({ x: x1 + ((x2 - x1) * i) / 8, y: y1 + ((y2 - y1) * i) / 8 }));

describe("a written plus sign", () => {
  it("two strokes crossing in the middle, one across and one up and down, in either order", () => {
    expect(isPlusSign([line(10, 30, 50, 30), line(30, 10, 30, 50)])).toBe(true);
    expect(isPlusSign([line(30, 50, 30, 10), line(50, 30, 10, 30)])).toBe(true);
  });

  it("drawn quickly: a little tilted, crossing a bit off-centre, arms of different lengths", () => {
    expect(isPlusSign([line(8, 34, 52, 26), line(26, 8, 34, 54)])).toBe(true);
    expect(isPlusSign([line(10, 22, 44, 24), line(20, 6, 22, 48)])).toBe(true);
  });

  it("not an x, a minus, a 1, a T or two strokes that don't meet", () => {
    expect(isPlusSign([line(10, 10, 50, 50), line(50, 10, 10, 50)])).toBe(false); // x
    expect(isPlusSign([line(10, 30, 50, 30)])).toBe(false); // -
    expect(isPlusSign([line(30, 10, 30, 50)])).toBe(false); // 1
    expect(isPlusSign([line(10, 10, 50, 10), line(30, 10, 30, 50)])).toBe(false); // T: crosses at the end
    expect(isPlusSign([line(10, 30, 25, 30), line(40, 10, 40, 50)])).toBe(false); // apart
  });
});
