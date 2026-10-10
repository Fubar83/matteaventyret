import { describe, expect, it } from "vitest";
import { digitAt, digitsOf } from "../digits";
import { generateProblem, generateRound, type GeneratedProblem } from "../generator";
import { computeShortDivisionPlan } from "../methods/shortDiv";
import { makeRng } from "../rng";
import { classifyAdditionCarries, classifyMultiplicationCarries, classifySubtractionBorrows } from "../verifier";

const N = 10_000;

function zeroCount(n: number): number {
  return n
    .toString()
    .split("")
    .filter((d) => d === "0").length;
}

function checkCommonRules(p: GeneratedProblem, allowExtraZeros: boolean) {
  // Only the column calculations have a top and a bottom number.
  if (p.kind !== "columnAdd" && p.kind !== "columnSub" && p.kind !== "columnMul") return;
  expect(p.top).toBeGreaterThan(1);
  expect(p.bottom).toBeGreaterThan(1);
  expect(p.top).not.toBe(p.bottom);
  if (p.kind === "columnSub") {
    expect(p.top).toBeGreaterThanOrEqual(p.bottom);
    expect(p.top - p.bottom).not.toBe(0);
  }
  if (!allowExtraZeros) {
    expect(zeroCount(p.top)).toBeLessThanOrEqual(1);
    expect(zeroCount(p.bottom)).toBeLessThanOrEqual(1);
  }
}

describe("generator: stage 1.1.1 (place value)", () => {
  it("asks about a real digit of a 4-digit number, never a leading zero", () => {
    const rng = makeRng(1);
    for (let i = 0; i < N; i++) {
      const p = generateProblem("1.1.1", rng);
      if (p.kind !== "placeValue") throw new Error("expected placeValue");
      expect(p.number).toBeGreaterThanOrEqual(1000);
      expect(p.number).toBeLessThanOrEqual(9999);
      expect(digitsOf(p.number).length).toBe(4);
      const digit = digitAt(p.number, p.columnAsked);
      expect(p.answer).toBe(digit * 10 ** p.columnAsked);
      // Never what a 0 is worth.
      expect(digit).not.toBe(0);
    }
  });
});

describe("generator: stage 1.1.2 (addition, no minnessiffra)", () => {
  it("never carries, result <= 999", () => {
    const rng = makeRng(2);
    for (let i = 0; i < N; i++) {
      const p = generateProblem("1.1.2", rng);
      if (p.kind !== "columnAdd") throw new Error("expected columnAdd");
      checkCommonRules(p, false);
      expect(p.answer).toBeLessThanOrEqual(999);
      expect(classifyAdditionCarries(p.top, p.bottom).columnsWithCarry).toHaveLength(0);
    }
  });
});

describe("generator: stage 1.1.3 (subtraction, no växling)", () => {
  it("never borrows, result >= 10", () => {
    const rng = makeRng(3);
    for (let i = 0; i < N; i++) {
      const p = generateProblem("1.1.3", rng);
      if (p.kind !== "columnSub") throw new Error("expected columnSub");
      checkCommonRules(p, false);
      expect(p.answer).toBeGreaterThanOrEqual(10);
      expect(classifySubtractionBorrows(p.top, p.bottom).columnsWithBorrow).toHaveLength(0);
    }
  });
});

describe("generator: stage 1.1.4 (2-digit, one minnessiffra)", () => {
  it("carries in the ones column only, result 20-99", () => {
    const rng = makeRng(4);
    for (let i = 0; i < N; i++) {
      const p = generateProblem("1.1.4", rng);
      if (p.kind !== "columnAdd") throw new Error("expected columnAdd");
      checkCommonRules(p, false);
      expect(p.answer).toBeGreaterThanOrEqual(20);
      expect(p.answer).toBeLessThanOrEqual(99);
      expect(classifyAdditionCarries(p.top, p.bottom).columnsWithCarry).toEqual([0]);
    }
  });
});

describe("generator: stage 1.1.5 (2-digit, one växling)", () => {
  it("borrows in the ones column only, result 10-89", () => {
    const rng = makeRng(5);
    for (let i = 0; i < N; i++) {
      const p = generateProblem("1.1.5", rng);
      if (p.kind !== "columnSub") throw new Error("expected columnSub");
      checkCommonRules(p, false);
      expect(p.answer).toBeGreaterThanOrEqual(10);
      expect(p.answer).toBeLessThanOrEqual(89);
      expect(classifySubtractionBorrows(p.top, p.bottom).columnsWithBorrow).toEqual([0]);
    }
  });
});

describe("generator: stage 1.1.6 (3 digits, several carries/växlingar)", () => {
  it("at least 2 columns carry or borrow; add <= 1998, sub result >= 10", () => {
    const rng = makeRng(6);
    for (let i = 0; i < N; i++) {
      const p = generateProblem("1.1.6", rng);
      checkCommonRules(p, false);
      if (p.kind === "columnAdd") {
        expect(p.answer).toBeLessThanOrEqual(1998);
        expect(classifyAdditionCarries(p.top, p.bottom).columnsWithCarry.length).toBeGreaterThanOrEqual(2);
      } else if (p.kind === "columnSub") {
        expect(p.answer).toBeGreaterThanOrEqual(10);
        const pattern = classifySubtractionBorrows(p.top, p.bottom);
        expect(pattern.columnsWithBorrow.length + pattern.zeroColumnsCrossed).toBeGreaterThanOrEqual(2);
      }
    }
  });
});

describe("generator: stage 1.1.7 (4 digits, växling across zeros)", () => {
  it("at least 2 columns carry or borrow; add <= 19998, sub result >= 10; most subtractions cross zeros (the level is named for it)", () => {
    const rng = makeRng(7);
    let subCount = 0;
    let zeroCrossCount = 0;
    for (let i = 0; i < N; i++) {
      const p = generateProblem("1.1.7", rng);
      if (p.kind === "columnAdd") {
        checkCommonRules(p, false);
        expect(p.answer).toBeLessThanOrEqual(19998);
        expect(classifyAdditionCarries(p.top, p.bottom).columnsWithCarry.length).toBeGreaterThanOrEqual(2);
      } else if (p.kind === "columnSub") {
        subCount++;
        expect(p.top).toBeGreaterThanOrEqual(p.bottom);
        expect(p.answer).toBeGreaterThanOrEqual(10);
        const pattern = classifySubtractionBorrows(p.top, p.bottom);
        expect(pattern.columnsWithBorrow.length + pattern.zeroColumnsCrossed).toBeGreaterThanOrEqual(2);
        if (pattern.zeroColumnsCrossed > 0) zeroCrossCount++;
      }
    }
    const proportion = zeroCrossCount / subCount;
    expect(proportion).toBeGreaterThan(0.7);
    expect(proportion).toBeLessThan(0.95);
  });
});

describe("generator: stage 2.1.1 (2-digit x 1-digit, no minnessiffra)", () => {
  it("multiplier is a single digit 2-9, no column carries", () => {
    const rng = makeRng(201);
    for (let i = 0; i < N; i++) {
      const p = generateProblem("2.1.1", rng);
      if (p.kind !== "columnMul") throw new Error("expected columnMul");
      expect(p.top).toBeGreaterThanOrEqual(10);
      expect(p.top).toBeLessThanOrEqual(99);
      expect(p.bottom).toBeGreaterThanOrEqual(2);
      expect(p.bottom).toBeLessThanOrEqual(9);
      expect(p.answer).toBe(p.top * p.bottom);
      expect(classifyMultiplicationCarries(p.top, p.bottom).columnsWithCarry).toHaveLength(0);
    }
  });
});

describe("generator: stage 2.1.2 (2-digit x 1-digit, with minnessiffra)", () => {
  it("always carries out of the ones column", () => {
    const rng = makeRng(202);
    for (let i = 0; i < N; i++) {
      const p = generateProblem("2.1.2", rng);
      if (p.kind !== "columnMul") throw new Error("expected columnMul");
      expect(p.top).toBeGreaterThanOrEqual(10);
      expect(p.top).toBeLessThanOrEqual(99);
      expect(p.answer).toBe(p.top * p.bottom);
      expect(classifyMultiplicationCarries(p.top, p.bottom).columnsWithCarry).toContain(0);
    }
  });
});

describe("generator: stage 2.1.3 (3-digit x 1-digit, several carries)", () => {
  it("3-digit top, carries in 1-2 of the first two columns", () => {
    const rng = makeRng(203);
    for (let i = 0; i < N; i++) {
      const p = generateProblem("2.1.3", rng);
      if (p.kind !== "columnMul") throw new Error("expected columnMul");
      expect(p.top).toBeGreaterThanOrEqual(100);
      expect(p.top).toBeLessThanOrEqual(999);
      expect(p.answer).toBe(p.top * p.bottom);
      const carries = classifyMultiplicationCarries(p.top, p.bottom).columnsWithCarry;
      expect(carries.length).toBeGreaterThanOrEqual(1);
      for (const c of carries) expect(c).toBeLessThanOrEqual(1);
    }
  });
});

const DIV_N = 2000;

describe("generator: stage 2.2.1 (kort division, no minnesrest)", () => {
  it("3-digit dividend, single-digit divisor, exact and no column ever carries", () => {
    const rng = makeRng(221);
    for (let i = 0; i < DIV_N; i++) {
      const p = generateProblem("2.2.1", rng);
      if (p.kind !== "shortDiv") throw new Error("expected shortDiv");
      expect(p.dividend).toBeGreaterThanOrEqual(100);
      expect(p.dividend).toBeLessThanOrEqual(999);
      expect(p.divisor).toBeGreaterThanOrEqual(2);
      expect(p.divisor).toBeLessThanOrEqual(9);
      expect(p.remainder).toBe(0);
      expect(p.answer).toBe(Math.floor(p.dividend / p.divisor));
      const { columns } = computeShortDivisionPlan(p.dividend, p.divisor);
      expect(columns.every((c) => c.col === 0 || c.remainderOut === 0)).toBe(true);
    }
  });
});

describe("generator: stage 2.2.2 (kort division, with minnesrest)", () => {
  it("exact overall, but at least one column carries a remainder", () => {
    const rng = makeRng(222);
    for (let i = 0; i < DIV_N; i++) {
      const p = generateProblem("2.2.2", rng);
      if (p.kind !== "shortDiv") throw new Error("expected shortDiv");
      expect(p.remainder).toBe(0);
      const { columns } = computeShortDivisionPlan(p.dividend, p.divisor);
      expect(columns.some((c) => c.col > 0 && c.remainderOut > 0)).toBe(true);
    }
  });
});

describe("generator: stage 2.2.3 (zero in the quotient)", () => {
  it("an internal (non-leading) quotient digit is 0", () => {
    const rng = makeRng(223);
    for (let i = 0; i < DIV_N; i++) {
      const p = generateProblem("2.2.3", rng);
      if (p.kind !== "shortDiv") throw new Error("expected shortDiv");
      expect(p.remainder).toBe(0);
      const { columns } = computeShortDivisionPlan(p.dividend, p.divisor);
      expect(columns[0].quotientDigit).toBeGreaterThan(0); // no leading zero
      expect(columns.slice(1).some((c) => c.quotientDigit === 0)).toBe(true);
    }
  });
});

describe("generator: stage 2.2.4 (division with remainder)", () => {
  it("leaves a genuine nonzero remainder", () => {
    const rng = makeRng(224);
    for (let i = 0; i < DIV_N; i++) {
      const p = generateProblem("2.2.4", rng);
      if (p.kind !== "shortDiv") throw new Error("expected shortDiv");
      expect(p.remainder).toBeGreaterThan(0);
      expect(p.remainder).toBeLessThan(p.divisor);
      expect(p.dividend).toBe(p.answer * p.divisor + p.remainder);
    }
  });
});

describe("generator: stage 2.3.3 (decimal add/sub, tenths)", () => {
  it("tenths (47 = 4,7, 125 = 12,5), tagged decimalPlaces: 1 - and with a minnessiffra or a växling across the comma now and then", () => {
    const rng = makeRng(233);
    let crossings = 0;
    for (let i = 0; i < N; i++) {
      const p = generateProblem("2.3.3", rng);
      if (p.kind !== "columnAdd" && p.kind !== "columnSub") throw new Error("expected columnAdd/columnSub");
      expect(p.decimalPlaces).toBe(1);
      expect(p.top).toBeGreaterThanOrEqual(10);
      expect(p.top).toBeLessThanOrEqual(999);
      if (p.kind === "columnAdd") {
        expect(p.answer).toBe(p.top + p.bottom);
        if (classifyAdditionCarries(p.top, p.bottom).columnsWithCarry.includes(0)) crossings++;
      } else {
        expect(p.top).toBeGreaterThanOrEqual(p.bottom);
        expect(p.answer).toBe(p.top - p.bottom);
        if (classifySubtractionBorrows(p.top, p.bottom).columnsWithBorrow.includes(0)) crossings++;
      }
    }
    expect(crossings / N).toBeGreaterThan(0.2);
  });
});

describe("generator: stage 2.3.4 (olika antal decimaler)", () => {
  it("one number with hundredths, the other with tenths only (3,5 + 1,25) - its missing hundredth a 0", () => {
    const rng = makeRng(234);
    let tenthsOnTop = 0;
    for (let i = 0; i < N; i++) {
      const p = generateProblem("2.3.4", rng);
      if (p.kind !== "columnAdd" && p.kind !== "columnSub") throw new Error("expected columnAdd/columnSub");
      expect(p.decimalPlaces).toBe(2);
      expect(p.top).toBeGreaterThanOrEqual(100);
      expect(p.top).toBeLessThanOrEqual(9999);
      // Exactly one of them has tenths only, and its hundredths digit is the 0 that pads it.
      const decimals = [p.topDecimals ?? 2, p.bottomDecimals ?? 2].sort();
      expect(decimals).toEqual([1, 2]);
      const [short, long] = p.topDecimals === 1 ? [p.top, p.bottom] : [p.bottom, p.top];
      expect(digitAt(short, 0)).toBe(0);
      expect(digitAt(long, 0)).not.toBe(0);
      if (p.topDecimals === 1) tenthsOnTop++;
      if (p.kind === "columnAdd") expect(p.answer).toBe(p.top + p.bottom);
      else {
        expect(p.top).toBeGreaterThanOrEqual(p.bottom);
        expect(p.answer).toBe(p.top - p.bottom);
      }
    }
    // Both ways round - on top, a subtraction has to borrow from the padded 0.
    expect(tenthsOnTop).toBeGreaterThan(N / 5);
    expect(tenthsOnTop).toBeLessThan((N * 4) / 5);
  });
});

describe("generator: stage 2.7.1 (medelvärde)", () => {
  it("mean of 4 values divides evenly and isn't trivially all-equal", () => {
    const rng = makeRng(271);
    for (let i = 0; i < N; i++) {
      const p = generateProblem("2.7.1", rng);
      if (p.kind !== "statistics") throw new Error("expected statistics");
      expect(p.measure).toBe("mean");
      expect(p.values.length).toBe(4);
      const sum = p.values.reduce((a, b) => a + b, 0);
      expect(sum % p.values.length).toBe(0);
      expect(p.answer).toBe(sum / p.values.length);
      expect(p.values.every((v) => v === p.answer)).toBe(false);
    }
  });
});

describe("generator: stage 2.7.2 (median)", () => {
  it("median of 5 values is the middle value once sorted", () => {
    const rng = makeRng(272);
    for (let i = 0; i < N; i++) {
      const p = generateProblem("2.7.2", rng);
      if (p.kind !== "statistics") throw new Error("expected statistics");
      expect(p.measure).toBe("median");
      expect(p.values.length).toBe(5);
      const sorted = [...p.values].sort((a, b) => a - b);
      expect(p.answer).toBe(sorted[2]);
    }
  });
});

describe("generator: stage 2.7.3 (typvärde)", () => {
  it("mode is the value repeated 3 times among 4 distinct others", () => {
    const rng = makeRng(273);
    for (let i = 0; i < N; i++) {
      const p = generateProblem("2.7.3", rng);
      if (p.kind !== "statistics") throw new Error("expected statistics");
      expect(p.measure).toBe("mode");
      expect(p.values.length).toBe(7);
      const counts = new Map<number, number>();
      for (const v of p.values) counts.set(v, (counts.get(v) ?? 0) + 1);
      expect(counts.get(p.answer)).toBe(3);
      for (const [v, c] of counts) if (v !== p.answer) expect(c).toBe(1);
    }
  });
});

describe("generator: stage 2.8.1 (chart lookup)", () => {
  it("answer matches the value at the asked category", () => {
    const rng = makeRng(281);
    for (let i = 0; i < N; i++) {
      const p = generateProblem("2.8.1", rng);
      if (p.kind !== "chart") throw new Error("expected chart");
      expect(p.questionType).toBe("lookup");
      expect(p.values.length).toBe(4);
      expect(p.askIndex).toBeGreaterThanOrEqual(0);
      expect(p.askIndex).toBeLessThan(4);
      expect(p.answer).toBe(p.values[p.askIndex!]);
    }
  });
});

describe("generator: stage 2.8.2 (chart difference)", () => {
  it("answer is the absolute difference between two distinct-valued bars", () => {
    const rng = makeRng(282);
    for (let i = 0; i < N; i++) {
      const p = generateProblem("2.8.2", rng);
      if (p.kind !== "chart") throw new Error("expected chart");
      expect(p.questionType).toBe("difference");
      const [a, b] = p.compareIndices!;
      expect(a).not.toBe(b);
      expect(p.values[a]).not.toBe(p.values[b]);
      expect(p.answer).toBe(Math.abs(p.values[a] - p.values[b]));
      expect(p.answer).toBeGreaterThan(0);
    }
  });
});

describe("generator: stage 2.8.3 (chart sum)", () => {
  it("answer is the total across every bar", () => {
    const rng = makeRng(283);
    for (let i = 0; i < N; i++) {
      const p = generateProblem("2.8.3", rng);
      if (p.kind !== "chart") throw new Error("expected chart");
      expect(p.questionType).toBe("sum");
      expect(p.answer).toBe(p.values.reduce((a, b) => a + b, 0));
    }
  });
});

describe("generateRound", () => {
  it("never repeats a problem within a round or from recent rounds", () => {
    const rng = makeRng(42);
    const { problems: round1, keys: keys1 } = generateRound("1.1.6", 8, rng);
    expect(new Set(keys1).size).toBe(8);

    const recent = new Set(keys1);
    const { problems: round2, keys: keys2 } = generateRound("1.1.6", 8, rng, recent);
    expect(new Set(keys2).size).toBe(8);
    for (const k of keys2) expect(recent.has(k)).toBe(false);

    expect(round1.length).toBe(8);
    expect(round2.length).toBe(8);
  });
});
