import { describe, expect, it } from "vitest";
import { questionStars } from "../../engine/scoring";
import { guidedOutcome, triedOutcome } from "../questions/questionOutcome";

// The same star rules for every type of question (questionOutcome.ts).
describe("a question's stars", () => {
  describe("answered in tries", () => {
    it("nothing to set up: ★★★ right the first time, ★★ after one wrong try, ★ after two", () => {
      expect(questionStars(triedOutcome({ wrong: 0 }))).toBe(3);
      expect(questionStars(triedOutcome({ wrong: 1 }))).toBe(2);
      expect(questionStars(triedOutcome({ wrong: 2 }))).toBe(1);
    });

    it("with a written setup: the setup makes ★★★, even after a wrong answer", () => {
      expect(questionStars(triedOutcome({ wrong: 1, setup: true }))).toBe(3);
      expect(questionStars(triedOutcome({ wrong: 0, setup: false }))).toBe(2);
    });

    it("any help, or the answer shown, is ★", () => {
      expect(questionStars(triedOutcome({ wrong: 0, helpUsed: 1 }))).toBe(1);
      expect(questionStars(triedOutcome({ wrong: 0, helpUsed: 1, setup: true }))).toBe(1);
      expect(questionStars(triedOutcome({ wrong: 3, shown: true }))).toBe(1);
    });
  });

  describe("on a guided board", () => {
    it("every box right the first time is ★★★; a wrong box ★★", () => {
      expect(questionStars(guidedOutcome({ wrong: 0, shown: 0, traced: 0 }))).toBe(3);
      expect(questionStars(guidedOutcome({ wrong: 2, shown: 0, traced: 0 }))).toBe(2);
    });

    it("a digit shown or traced is help: ★", () => {
      expect(questionStars(guidedOutcome({ wrong: 0, shown: 1, traced: 0 }))).toBe(1);
      expect(questionStars(guidedOutcome({ wrong: 0, shown: 0, traced: 4 }))).toBe(1);
    });
  });
});
