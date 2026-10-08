import { describe, expect, it } from "vitest";
import { isConfident } from "../confidence";
import { charToIndex, DIGIT_INDICES, indexToChar, LABELS, labelsFor, MIRRORED_DIGIT } from "../labels";
import { WRITING_LEVELS } from "../levels";

describe("the two models", () => {
  it("basic (åk 1-6) is digits, the arithmetic signs, and each digit written backwards - at the end", () => {
    const basic = labelsFor("basic");
    expect(basic.slice(0, 24)).toEqual([..."0123456789.+-/=x,()<>%", "≈", ":"]);
    expect(basic.slice(24).map((c) => MIRRORED_DIGIT.get(c))).toEqual([2, 3, 4, 5, 6, 7, 9]);
  });

  it("full (åk 7 - gymnasiet) has the signs and letters older students write - and no l or o, a 1's and a 0's twins", () => {
    const full = labelsFor("full");
    expect(full).toBe(LABELS);
    for (const c of ["<", ">", "≤", "≥", "≠", "≈", "%", "°", ":", "±", "→", "⇔", "∞", "∫", "|", "Δ", "α", "β", "θ", "(", ")", "π", "√", "⇒"]) expect(full).toContain(c);
    for (const c of "abcdefghikmnpqrstuvxyzAB") expect(full).toContain(c);
    for (const c of ["l", "o", "·", "×", "÷"]) expect(full).not.toContain(c);
    expect([...full].some((c) => MIRRORED_DIGIT.has(c))).toBe(false);
    expect(new Set(full).size).toBe(full.length);
  });

  it("digits are indices 0-9 in both", () => {
    expect(DIGIT_INDICES).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (let d = 0; d <= 9; d++) {
      expect(charToIndex(String(d), "basic")).toBe(d);
      expect(indexToChar(d, "full")).toBe(String(d));
    }
  });

  it("indexes each model by its own labels", () => {
    expect(indexToChar(charToIndex("π", "full"), "full")).toBe("π");
    expect(() => charToIndex("a", "basic")).toThrow();
    expect(() => charToIndex(String.fromCharCode(0xe003), "full")).toThrow();
  });
});

describe("writing levels", () => {
  it("åk 1-3 and 4-6 use the forgiving basic model, åk 7-9 and gymnasiet the full one", () => {
    expect([1, 2, 3, 4].map((l) => WRITING_LEVELS[l as 1 | 2 | 3 | 4].model)).toEqual(["basic", "basic", "full", "full"]);
  });

  it("each level only adds to the one before", () => {
    for (const l of [2, 3, 4] as const) for (const c of WRITING_LEVELS[(l - 1) as 1 | 2 | 3].chars) expect(WRITING_LEVELS[l].chars).toContain(c);
  });

  it("the letters that are a digit's twin - s, t, g, q - only at gymnasiet", () => {
    for (const c of "stgq") {
      expect(WRITING_LEVELS[3].chars.has(c)).toBe(false);
      expect(WRITING_LEVELS[4].chars.has(c)).toBe(true);
    }
    expect(WRITING_LEVELS[1].chars.has("(")).toBe(false);
    expect(WRITING_LEVELS[2].chars.has(":")).toBe(true);
  });
});

describe("confidence with a model's own labels", () => {
  /** Top 0.9, runner-up 0.55: a 0.35 gap - enough for an ordinary pair (0.3), not a confusable one (0.4). */
  function gap(model: "basic" | "full", top: string, runnerUp: string): number[] {
    const probs = labelsFor(model).map(() => 0);
    probs[charToIndex(top, model)] = 0.9;
    probs[charToIndex(runnerUp, model)] = 0.55;
    return probs;
  }

  it("looks confusable pairs up by character, whichever index each model gives it", () => {
    for (const model of ["basic", "full"] as const) {
      const labels = labelsFor(model);
      expect(isConfident(gap(model, "5", "6"), undefined, labels)).toBe(false); // confusable
      expect(isConfident(gap(model, ",", "."), undefined, labels)).toBe(false); // confusable
      expect(isConfident(gap(model, "5", "2"), undefined, labels)).toBe(true); // ordinary
    }
  });

});
