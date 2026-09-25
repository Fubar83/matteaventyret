import { describe, expect, it } from "vitest";
import { buildGraph as buildAdd } from "../methods/columnAdd";
import { buildGraph as buildSub } from "../methods/columnSub";
import { makeRng, randInt } from "../rng";
import { assembleAnswer } from "./testHelpers";

const N = 100_000;

describe("randomized: 100,000 problems up to 4 digits per operator", () => {
  it("addition matches plain arithmetic", () => {
    const rng = makeRng(1234567);
    for (let i = 0; i < N; i++) {
      const top = randInt(rng, 0, 9999);
      const bottom = randInt(rng, 0, 9999);
      const graph = buildAdd({ top, bottom });
      expect(assembleAnswer(graph)).toBe(top + bottom);
    }
  });

  it("subtraction (top >= bottom) matches plain arithmetic", () => {
    const rng = makeRng(7654321);
    for (let i = 0; i < N; i++) {
      const a = randInt(rng, 0, 9999);
      const b = randInt(rng, 0, 9999);
      const top = Math.max(a, b);
      const bottom = Math.min(a, b);
      const graph = buildSub({ top, bottom });
      expect(assembleAnswer(graph)).toBe(top - bottom);
    }
  });
});
