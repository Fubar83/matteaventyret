import { describe, expect, it } from "vitest";
import { makeRng } from "../../engine/rng";
import { decimalText, TRAPPAN_GENERATORS, walkOf, type TrappanProblem } from "../../engine/trappan";
import { revealedAt } from "../draw/boardTypes";
import { trappanPlan } from "../trappanPlan";

describe("the trappan board", () => {
  it("has a box for every step, each used once, and the quotient boxes spell the answer", () => {
    const rng = makeRng(23);
    for (const [stage, gen] of Object.entries(TRAPPAN_GENERATORS)) {
      for (let i = 0; i < 100; i++) {
        const p = gen(rng);
        const plan = trappanPlan(p);
        const ids = new Set(plan.layout.boxes.map((b) => b.id));
        expect(ids.size, stage).toBe(plan.layout.boxes.length);
        const stepIds = plan.steps.map((s) => s.boxId);
        expect(new Set(stepIds).size, stage).toBe(stepIds.length);
        for (const s of plan.steps) {
          expect(ids.has(s.boxId), `${stage}: ${s.boxId}`).toBe(true);
          for (const u of s.uses) expect(ids.has(u), `${stage}: ${s.boxId} uses ${u}`).toBe(true);
        }
        const quotient = plan.steps.filter((s) => s.boxId.startsWith("q:")).map((s) => s.expected).join("");
        expect(quotient, stage).toBe(walkOf(p).quotient.digits);
        // Boxes stay on the board.
        for (const b of plan.layout.boxes) {
          expect(b.x, stage).toBeGreaterThanOrEqual(0);
          expect(b.x + b.w, stage).toBeLessThanOrEqual(plan.layout.width);
        }
      }
    }
  });

  it("starts with just the division and adds each box, line, zero and comma at the step that needs it", () => {
    // 92 ÷ 5 = 18,4: a zero (and the comma) added after 92 once there is a rest.
    const p: TrappanProblem = { stageId: "2.5.3", kind: "trappan", dividend: { digits: "92", decimals: 0 }, divisor: { digits: "5", decimals: 0 }, shift: 0, answer: 18.4 };
    const plan = trappanPlan(p);
    const at = (step: number) => revealedAt(plan.layout, step);
    const ids = (step: number) => at(step).boxes.map((b) => b.id).sort();
    const commas = (step: number) => at(step).texts.filter((t) => t.text === ",").length;
    // Step 1: the divisor, the given 92 and the first answer box - no stairs, no zero, no comma.
    expect(ids(0)).toEqual(["D:0", "D:1", "d:0", "q:0"]);
    expect(at(0).texts).toEqual([]);
    expect(at(0).lines).toHaveLength(2); // the bracket
    // Every step's box is there when it's asked for - and not before.
    plan.steps.forEach((s, i) => {
      expect(ids(i), s.boxId).toContain(s.boxId);
      if (i > 0) expect(ids(i - 1), s.boxId).not.toContain(s.boxId);
    });
    // Multiplying back brings the minus sign; subtracting brings the line.
    const product = plan.steps.findIndex((s) => s.boxId === "p0:0");
    expect(at(product).texts.map((t) => t.text)).toEqual(["−"]);
    expect(at(product).lines).toHaveLength(2);
    expect(at(product + 1).lines).toHaveLength(3);
    // The added zero and the dividend's comma turn up together, as the zero is brought down.
    const zero = plan.steps.findIndex((s) => s.prompt.includes("nolla"));
    expect(ids(zero - 1)).not.toContain("D:2");
    expect(ids(zero)).toContain("D:2");
    expect(commas(zero - 1)).toBe(0);
    expect(commas(zero)).toBe(1);
    // The answer's comma comes with its first decimal.
    const decimal = plan.steps.findIndex((s) => s.prompt.startsWith("Nu är vi förbi"));
    expect(commas(decimal - 1)).toBe(1);
    expect(commas(decimal)).toBe(2);
    // Done: everything is there.
    expect(at(plan.steps.length).boxes).toHaveLength(plan.layout.boxes.length);
  });

  it("17 ÷ 5 = 3 rest 2: stops when there's nothing to bring down, and names the rest", () => {
    const p: TrappanProblem = { stageId: "2.5.8", kind: "trappan", dividend: { digits: "17", decimals: 0 }, divisor: { digits: "5", decimals: 0 }, shift: 0, answer: 3, withRest: true };
    const plan = trappanPlan(p);
    expect(plan.steps.map((s) => `${s.boxId}=${s.expected}`)).toEqual(["q:1=3", "p0:0=1", "p0:1=5", "r0:1=2"]);
    expect(plan.steps[3].prompt).toContain("det som blir kvar är resten");
    expect(plan.answerText).toBe("= 3 rest 2");
    expect(revealedAt(plan.layout, 2).texts.map((t) => t.text)).not.toContain("rest");
    expect(revealedAt(plan.layout, 3).texts.map((t) => t.text)).toContain("rest");
  });

  it("walks 764 ÷ 4 in the order it's done by hand", () => {
    const p: TrappanProblem = { stageId: "2.5.2", kind: "trappan", dividend: { digits: "764", decimals: 0 }, divisor: { digits: "4", decimals: 0 }, shift: 0, answer: 191 };
    const plan = trappanPlan(p);
    expect(plan.steps.map((s) => `${s.boxId}=${s.expected}`)).toEqual([
      "q:0=1", "p0:0=4", "r0:0=3", "b0=6",
      "q:1=9", "p1:0=3", "p1:1=6", "r1:1=0", "b1=4",
      "q:2=1", "p2:2=4", "r2:2=0",
    ]);
    expect(`${plan.title} ${plan.answerText}`).toBe("764 ÷ 4 = 191");
  });

  it("ends a question to round with the rounded answer", () => {
    const p: TrappanProblem = { stageId: "2.5.7", kind: "trappan", dividend: { digits: "12312", decimals: 2 }, divisor: { digits: "5288", decimals: 2 }, shift: 2, answer: 2.33, roundTo: 2 };
    const plan = trappanPlan(p);
    expect(plan.answerText).toBe("≈ 2,33");
    expect(plan.steps.filter((s) => s.boxId.startsWith("a:")).map((s) => s.expected)).toEqual([2, 3, 3]);
    expect(decimalText(walkOf(p).quotient)).toBe("2,328");
  });
});
