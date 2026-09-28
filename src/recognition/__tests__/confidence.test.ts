import { describe, expect, it } from "vitest";
import { isConfident, topTwo } from "../confidence";
import { charToIndex, DIGIT_INDICES, LABELS } from "../labels";

// "x" stands in here for "some non-digit class" (the label set is a minimal
// starting set for now, see labels.ts) - it exercises the same
// candidate-restriction logic without hardcoding a currently-inactive character.
const NON_DIGIT = charToIndex("x");

function probsFor(index: number, top: number, secondIndex: number, second: number): number[] {
  const p = new Array(LABELS.length).fill((1 - top - second) / (LABELS.length - 2));
  p[index] = top;
  p[secondIndex] = second;
  return p;
}

const d = (digit: number) => digit; // digit value === its class index

describe("topTwo", () => {
  it("finds the top two classes by probability", () => {
    const { first, second } = topTwo(probsFor(d(3), 0.9, d(8), 0.05));
    expect(first.index).toBe(d(3));
    expect(second.index).toBe(d(8));
  });

  it("restricts the search to given candidate indices", () => {
    // Top overall is "x", but among digit candidates only 0 and 6 matter.
    const p = probsFor(NON_DIGIT, 0.9, d(0), 0.05);
    p[d(6)] = 0.03;
    const { first, second } = topTwo(p, DIGIT_INDICES);
    expect(first.index).toBe(d(0));
    expect(second.index).toBe(d(6));
  });
});

describe("isConfident", () => {
  it("is confident when top >= 0.85 and margin >= 0.30 for a non-confusable pair", () => {
    expect(isConfident(probsFor(d(2), 0.9, d(4), 0.05))).toBe(true);
  });

  it("is not confident when the top probability is below 0.85", () => {
    expect(isConfident(probsFor(d(2), 0.7, d(4), 0.05))).toBe(false);
  });

  it("is not confident when the margin is below 0.30 for a non-confusable pair", () => {
    expect(isConfident(probsFor(d(2), 0.86, d(4), 0.6))).toBe(false);
  });

  it("requires a stricter 0.40 margin for known confusable digit pairs", () => {
    // top=0.86, second=0.5: margin 0.36 - enough generally, not for a confusable pair.
    expect(isConfident(probsFor(d(1), 0.86, d(7), 0.5))).toBe(false);
    expect(isConfident(probsFor(d(1), 0.9, d(7), 0.4))).toBe(true);
  });

  it("treats every listed confusable digit pair symmetrically", () => {
    for (const [a, b] of [
      [1, 7],
      [4, 9],
      [5, 6],
      [3, 8],
      [0, 6],
    ]) {
      expect(isConfident(probsFor(d(a), 0.86, d(b), 0.5))).toBe(false);
      expect(isConfident(probsFor(d(b), 0.86, d(a), 0.5))).toBe(false);
    }
  });

  it("can restrict confidence to digit-only candidates, ignoring a stronger non-digit guess", () => {
    const p = probsFor(NON_DIGIT, 0.9, d(0), 0.06);
    expect(isConfident(p)).toBe(true); // globally, "x" wins comfortably
    expect(isConfident(p, DIGIT_INDICES)).toBe(false); // among digits only, 0 doesn't clear the bar
  });

  it("skips confusable-pair entries for characters outside the currently active label set", () => {
    // These pairs are defined in confidence.ts for when letters are re-enabled; while
    // disabled, charToIndex would throw if the pair-building code didn't skip them.
    expect(() => isConfident(probsFor(d(0), 0.9, d(6), 0.05))).not.toThrow();
  });
});
