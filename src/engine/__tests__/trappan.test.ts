import { describe, expect, it } from "vitest";
import { makeRng } from "../rng";
import { decimalText, roundTo, shifted, TRAPPAN_GENERATORS, valueOf, walk, walkOf, type TrappanProblem } from "../trappan";

const whole = (n: number) => ({ digits: String(n), decimals: 0 });

describe("trappan", () => {
  it("works 764 ÷ 4 stair by stair", () => {
    const w = walk(whole(764), 4, 4);
    expect(w.steps.map((s) => [s.col, s.part, s.quotientDigit, s.product, s.rest, s.broughtDown])).toEqual([
      [0, 7, 1, 4, 3, 6],
      [1, 36, 9, 36, 0, 4],
      [2, 4, 1, 4, 0, null],
    ]);
    expect(decimalText(w.quotient)).toBe("191");
    expect(w.rest).toBe(0);
  });

  it("starts with as many digits as the divisor goes into, and writes the 0s in the answer (412 ÷ 4 = 103)", () => {
    const w = walk(whole(412), 4, 4);
    expect(decimalText(w.quotient)).toBe("103");
    expect(w.steps[1]).toMatchObject({ part: 1, quotientDigit: 0, rest: 1, broughtDown: 2 });
    expect(walk(whole(672), 12, 4).steps[0]).toMatchObject({ col: 1, part: 67, quotientDigit: 5 });
  });

  it("goes on past the comma with zeros: 7 ÷ 4 = 1,75", () => {
    const w = walk(whole(7), 4, 4);
    expect(decimalText(w.quotient)).toBe("1,75");
    expect(w.steps.filter((s) => s.addedZero)).toHaveLength(2);
    expect(decimalText(w.dividend)).toBe("7,00");
  });

  it("moves both commas until the divisor is whole: 13,2 ÷ 5,28 = 1320 ÷ 528", () => {
    const p: TrappanProblem = { stageId: "2.5.6", kind: "trappan", dividend: { digits: "132", decimals: 1 }, divisor: { digits: "528", decimals: 2 }, shift: 2, answer: 2.5 };
    const s = shifted(p);
    expect([decimalText(s.dividend), s.divisor]).toEqual(["1320", 528]);
    expect(decimalText(walkOf(p).quotient)).toBe("2,5");
  });

  it("works one decimal more and rounds: 123,12 ÷ 52,88 ≈ 2,33", () => {
    const p: TrappanProblem = { stageId: "2.5.7", kind: "trappan", dividend: { digits: "12312", decimals: 2 }, divisor: { digits: "5288", decimals: 2 }, shift: 2, answer: 0, roundTo: 2 };
    expect(decimalText(walkOf(p).quotient)).toBe("2,328");
  });

  it("125,25 ÷ 12,7 never ends: worked to two decimals, a rest left, rounded to 9,9", () => {
    const p: TrappanProblem = { stageId: "2.5.7", kind: "trappan", dividend: { digits: "12525", decimals: 2 }, divisor: { digits: "127", decimals: 1 }, shift: 1, answer: 0, roundTo: 1 };
    const s = shifted(p);
    expect([decimalText(s.dividend), s.divisor]).toEqual(["1252,5", 127]);
    const w = walkOf(p);
    expect(decimalText(w.quotient)).toBe("9,86");
    expect(w.rest).toBeGreaterThan(0);
    expect(roundTo(valueOf(w.quotient), 1)).toBe(9.9);
  });

  it("every question ends in a result: it comes out even, or the rest left is rounded away", () => {
    const rng = makeRng(29);
    for (const [stage, gen] of Object.entries(TRAPPAN_GENERATORS)) {
      for (let i = 0; i < 500; i++) {
        const p = gen(rng);
        const w = walkOf(p);
        const where = `${stage}: ${decimalText(p.dividend)} ÷ ${decimalText(p.divisor)}`;
        if (p.withRest) {
          // Whole numbers: the rest left at the end, smaller than the divisor - and it adds back up.
          expect(w.quotient.decimals, where).toBe(0);
          expect(w.rest, where).toBeGreaterThan(0);
          expect(w.rest, where).toBeLessThan(w.divisor);
          expect(p.answer * w.divisor + w.rest, where).toBe(valueOf(p.dividend));
        } else if (p.roundTo === undefined) expect(w.rest, where).toBe(0);
        else expect(w.quotient.decimals, where).toBe(p.roundTo + 1);
        expect(Number.isFinite(p.answer) && p.answer > 0, where).toBe(true);
      }
    }
  });

  it("every level's questions work out: the answer is the division, exact where it should be", () => {
    const rng = makeRng(17);
    for (const [stage, gen] of Object.entries(TRAPPAN_GENERATORS)) {
      for (let i = 0; i < 300; i++) {
        const p = gen(rng);
        const w = walkOf(p);
        const exact = valueOf(p.dividend) / valueOf(p.divisor);
        const where = `${stage}: ${decimalText(p.dividend)} ÷ ${decimalText(p.divisor)}`;
        expect(w.divisor, where).toBe(Math.round(w.divisor));
        expect(w.steps[0].quotientDigit, where).toBeGreaterThan(0);
        if (p.withRest) {
          expect(p.answer, where).toBe(Math.floor(exact));
        } else if (p.roundTo === undefined) {
          expect(w.rest, where).toBe(0);
          expect(p.answer, where).toBeCloseTo(exact, 9);
          expect(w.quotient.decimals, where).toBeLessThanOrEqual(3);
        } else {
          const f = 10 ** p.roundTo;
          expect(p.answer, where).toBeCloseTo(Math.round(exact * f) / f, 9);
        }
      }
    }
  });

  it("keeps each level to its kind of numbers", () => {
    const rng = makeRng(3);
    for (let i = 0; i < 100; i++) {
      const p1 = TRAPPAN_GENERATORS["2.5.1"](rng);
      expect(p1.dividend.digits).toHaveLength(2);
      expect(p1.divisor.digits).toHaveLength(1);
      expect(TRAPPAN_GENERATORS["2.5.2"](rng).dividend.digits).toHaveLength(3);
      expect(TRAPPAN_GENERATORS["2.5.3"](rng).answer % 1).not.toBe(0);
      expect(TRAPPAN_GENERATORS["2.5.4"](rng).divisor.digits).toHaveLength(2);
      expect(TRAPPAN_GENERATORS["2.5.5"](rng).dividend.decimals).toBeGreaterThan(0);
      expect(TRAPPAN_GENERATORS["2.5.6"](rng).divisor.decimals).toBeGreaterThan(0);
      const p7 = TRAPPAN_GENERATORS["2.5.7"](rng);
      expect(p7.roundTo).toBe(1);
      expect(p7.dividend.decimals).toBeGreaterThan(0);
      expect(p7.divisor.decimals).toBe(1);
      expect(shifted(p7).divisor).toBeLessThanOrEqual(299);
    }
  });
});
