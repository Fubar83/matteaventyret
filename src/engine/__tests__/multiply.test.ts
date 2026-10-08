import { describe, expect, it } from "vitest";
import { MUL_GUIDED_GENERATORS, productOf } from "../multiply";
import { makeRng } from "../rng";
import { planGuided } from "../../mathinput/guidedPlan";
import { decimalText } from "../trappan";

describe("the bigger multiplications", () => {
  it("every level's question is worked out right on the board, decimals and all", () => {
    const rng = makeRng(41);
    for (const [stage, gen] of Object.entries(MUL_GUIDED_GENERATORS)) {
      for (let i = 0; i < 300; i++) {
        const p = gen(rng);
        const where = `${stage}: ${decimalText(p.top)} · ${decimalText(p.bottom)}`;
        expect(p.answer, where).toBeCloseTo(productOf(p), 9);
        const plan = planGuided("×", Number(p.top.digits), Number(p.bottom.digits), { top: p.top.decimals, bottom: p.bottom.decimals });
        // The board's answer, comma and all, is the product.
        expect(Number(plan.answerText.replace("= ", "").split(" = ")[0].replace(/\s/g, "").replace(",", ".")), where).toBeCloseTo(p.answer, 9);
        // Never 3,00 - an answer that ends in a zero decimal.
        expect(plan.answerText, where).not.toMatch(/,\d*0$/);
      }
    }
  });

  it("keeps each level to its kind of numbers", () => {
    const rng = makeRng(5);
    for (let i = 0; i < 100; i++) {
      const a = MUL_GUIDED_GENERATORS["2.1.4"](rng);
      expect([a.top.digits.length, a.bottom.digits.length, a.top.decimals + a.bottom.decimals]).toEqual([2, 2, 0]);
      const b = MUL_GUIDED_GENERATORS["2.1.5"](rng);
      expect(b.top.decimals).toBeGreaterThan(0);
      expect(b.bottom.decimals).toBe(0);
      const c = MUL_GUIDED_GENERATORS["2.1.6"](rng);
      expect(c.top.decimals).toBeGreaterThan(0);
      expect(c.bottom.decimals).toBeGreaterThan(0);
      expect(c.top.decimals + c.bottom.decimals).toBeLessThanOrEqual(3);
    }
  });
});
