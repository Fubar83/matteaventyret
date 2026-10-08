import { describe, expect, it } from "vitest";
import { checkWrittenAnswer, type Answer } from "../workCheck";

/** A circle's area, r = 5: π · 25 = 78,539… */
const area: Answer = { kind: "value", value: 78.5, approx: true, exact: Math.PI * 25 };
/** π · 45 = 141,371… - where 3,14 · 45 = 141,3 rounds differently. */
const big: Answer = { kind: "value", value: 141.4, approx: true, exact: Math.PI * 45 };

const right = (work: string, answer: Answer) => checkWrittenAnswer(work, answer).correct;

describe("an answer with π has to be really worked out", () => {
  it("takes the answer rounded right, with π or with 3,14", () => {
    expect(right("\\pi \\cdot 5^{2} \\approx 7 8 {,} 5", area)).toBe(true);
    expect(right("3 {,} 1 4 \\cdot 2 5 = 7 8 {,} 5", area)).toBe(true);
    expect(right("\\pi \\cdot 2 5 \\approx 7 8 {,} 5 4", area)).toBe(true);
    expect(right("3 {,} 1 4 \\cdot 4 5 = 1 4 1 {,} 3", big)).toBe(true);
    expect(right("\\pi \\cdot 4 5 \\approx 1 4 1 {,} 4", big)).toBe(true);
  });

  it("doesn't take a guess near it", () => {
    expect(right("\\pi \\cdot 2 5 \\approx 7 8 {,} 4", area)).toBe(false);
    expect(right("\\pi \\cdot 2 5 \\approx 7 9", area)).toBe(false);
    expect(right("\\pi \\cdot 2 5 \\approx 7 8", area)).toBe(false);
    expect(right("3 {,} 1 4 \\cdot 4 5 = 1 4 1 {,} 2", big)).toBe(false);
  });

  it("holds each step to the decimals it's written with", () => {
    expect(checkWrittenAnswer("3 {,} 1 4 \\cdot 2 5 = 7 8 {,} 4 \\\\ 7 8 {,} 5", area).badLines).toEqual([0]);
    expect(checkWrittenAnswer("3 {,} 1 4 \\cdot 2 5 = 7 8 {,} 5", area).badLines).toEqual([]);
  });

  it("allows numbers rounded along the way - by their own last decimal, no more", () => {
    const corner: Answer = { kind: "value", value: 1.9, approx: true, exact: 9 - (Math.PI * 9) / 4 };
    expect(checkWrittenAnswer("3^{2} - \\frac{\\pi \\cdot 3^{2}}{4} \\approx 9 - 7 {,} 1 \\approx 1 {,} 9", corner).badLines).toEqual([]);
    expect(checkWrittenAnswer("3^{2} - \\frac{\\pi \\cdot 3^{2}}{4} \\approx 9 - 7 {,} 2 \\approx 1 {,} 8", corner).badLines).toEqual([0]);
  });
});
