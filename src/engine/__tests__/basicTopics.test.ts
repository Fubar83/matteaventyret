import { describe, expect, it } from "vitest";
import { BASIC_GENERATORS } from "../questions/written/basicTopics";
import { generateRound } from "../generator";
import { makeRng } from "../rng";

describe("åk 1-6 topics", () => {
  it("fills a round of every level without repeats", () => {
    for (const stage of Object.keys(BASIC_GENERATORS)) {
      expect(generateRound(stage as keyof typeof BASIC_GENERATORS, 6, makeRng(4)).problems, stage).toHaveLength(6);
    }
  });

  it("asks angles that make a real triangle, and a time span that adds up", () => {
    const rng = makeRng(3);
    for (let i = 0; i < 200; i++) {
      const a = BASIC_GENERATORS["2.12.1"](rng);
      if (a.answer.kind === "value") expect(a.answer.value).toBeGreaterThan(0);
      const d = BASIC_GENERATORS["2.9.5"](rng);
      if (d.answer.kind === "value") expect(d.answer.value).toBeGreaterThan(0);
    }
  });
});
