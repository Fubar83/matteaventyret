import { describe, expect, it } from "vitest";
import { pickBossStage, BOSS_STAGES } from "../boss";
import { makeRng } from "../../engine/rng";

describe("pickBossStage", () => {
  it("always returns one of the boss stages", () => {
    const rng = makeRng(1);
    for (let i = 0; i < 200; i++) {
      expect(BOSS_STAGES).toContain(pickBossStage(rng, {}));
    }
  });

  it("never picks a stage with full stars when others have none", () => {
    const rng = makeRng(2);
    const stars: Partial<Record<(typeof BOSS_STAGES)[number], 1 | 2 | 3>> = {
      "1.1.2": 3,
      "1.1.3": 3,
      "1.1.4": 3,
      "1.1.5": 3,
      "1.1.6": 3,
    };
    const counts: Record<string, number> = {};
    for (let i = 0; i < 500; i++) {
      const s = pickBossStage(rng, stars);
      counts[s] = (counts[s] ?? 0) + 1;
    }
    expect(counts["1.1.7"]).toBeGreaterThan(counts["1.1.2"] ?? 0);
  });
});
