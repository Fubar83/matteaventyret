import { describe, expect, it } from "vitest";
import { generateRound } from "../generator";
import { makeRng } from "../rng";
import { canPay, fewestPieces, SHOP_QUESTIONS, sum, type ShopStageId } from "../questions/shop";

const sample = (stage: ShopStageId, n = 300) => {
  const rng = makeRng(2);
  return Array.from({ length: n }, () => SHOP_QUESTIONS.levels[stage](rng));
};

describe("the shop", () => {
  it("counts money out largest first", () => {
    expect(fewestPieces(37)).toEqual([20, 10, 5, 2]);
    expect(fewestPieces(13, [50, 20, 10, 5, 2, 1])).toEqual([10, 2, 1]);
    expect(fewestPieces(0)).toEqual([]);
  });

  it("always gives a wallet that can pay exactly - with some money left over to count past", () => {
    for (const stage of ["1.6.2", "1.6.4"] as const) {
      for (const p of sample(stage)) {
        expect(canPay(p.total, p.wallet), `${p.total} from ${p.wallet}`).toBe(true);
        expect(sum(p.wallet)).toBeGreaterThan(p.total);
      }
    }
  });

  it("has the customer pay with a note that covers the price, and the change is the difference", () => {
    for (const stage of ["1.6.3", "2.9.6"] as const) {
      for (const p of sample(stage)) {
        const [note] = p.paidWith;
        expect(note).toBeGreaterThan(p.total);
        expect(p.change).toBe(note - p.total);
        expect(fewestPieces(p.change, p.till).length).toBeGreaterThan(0);
      }
    }
  });

  it("keeps the shopping list on the shelf, and its total under a hundred", () => {
    for (const p of sample("1.6.4")) {
      expect(p.buy.length).toBeGreaterThanOrEqual(2);
      for (const id of p.buy) expect(p.shelf.some((x) => x.id === id)).toBe(true);
      expect(p.total).toBeLessThanOrEqual(100);
      expect(p.total).toBe(p.shelf.filter((x) => p.buy.includes(x.id)).reduce((s, x) => s + x.price, 0));
    }
  });

  it("puts a round's questions easiest first", () => {
    for (const stage of Object.keys(SHOP_QUESTIONS.levels) as ShopStageId[]) {
      const scores = generateRound(stage, 6, makeRng(4)).problems.map((p) => ("difficulty" in p ? p.difficulty! : NaN));
      expect(scores, stage).toEqual([...scores].sort((a, b) => a - b));
    }
  });
});
