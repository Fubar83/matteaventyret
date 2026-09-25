import { describe, expect, it } from "vitest";
import {
  computeProblemXp,
  computeStars,
  INITIAL_STREAK_STATE,
  playerLevel,
  recordRoundCompleted,
} from "../scoring";

describe("computeStars", () => {
  it("gives 3 stars for a clean round", () => {
    expect(computeStars({ wrongFirstAttempts: 0, problemsWithHint: 0, miniTutorialsUsed: 0 })).toBe(3);
    expect(computeStars({ wrongFirstAttempts: 2, problemsWithHint: 0, miniTutorialsUsed: 0 })).toBe(3);
  });

  it("gives 2 stars for a few hints", () => {
    expect(computeStars({ wrongFirstAttempts: 3, problemsWithHint: 2, miniTutorialsUsed: 1 })).toBe(2);
  });

  it("gives 1 star for merely completing the round", () => {
    expect(computeStars({ wrongFirstAttempts: 10, problemsWithHint: 5, miniTutorialsUsed: 4 })).toBe(1);
  });

  it("never gives fewer than 1 star", () => {
    const stars = computeStars({ wrongFirstAttempts: 999, problemsWithHint: 999, miniTutorialsUsed: 999 });
    expect(stars).toBeGreaterThanOrEqual(1);
  });
});

describe("XP and level", () => {
  it("awards more XP for an unhinted problem", () => {
    expect(computeProblemXp(false)).toBe(15);
    expect(computeProblemXp(true)).toBe(10);
  });

  it("levels up every 200 XP", () => {
    expect(playerLevel(0)).toBe(1);
    expect(playerLevel(199)).toBe(1);
    expect(playerLevel(200)).toBe(2);
    expect(playerLevel(999)).toBe(5);
  });
});

describe("streak", () => {
  it("starts at 1 on the first completed round", () => {
    const s = recordRoundCompleted(INITIAL_STREAK_STATE, "2026-01-01");
    expect(s.current).toBe(1);
  });

  it("increments on consecutive days", () => {
    let s = recordRoundCompleted(INITIAL_STREAK_STATE, "2026-01-01");
    s = recordRoundCompleted(s, "2026-01-02");
    s = recordRoundCompleted(s, "2026-01-03");
    expect(s.current).toBe(3);
  });

  it("does not double-count completing two rounds the same day", () => {
    let s = recordRoundCompleted(INITIAL_STREAK_STATE, "2026-01-01");
    s = recordRoundCompleted(s, "2026-01-01");
    expect(s.current).toBe(1);
  });

  it("uses the free vilodag to bridge exactly one missed day", () => {
    let s = recordRoundCompleted(INITIAL_STREAK_STATE, "2026-01-01");
    s = recordRoundCompleted(s, "2026-01-03"); // skipped Jan 2
    expect(s.current).toBe(2);
    expect(s.restDaysUsedThisWeek).toBe(1);
  });

  it("only allows one free vilodag per week", () => {
    let s = recordRoundCompleted(INITIAL_STREAK_STATE, "2026-01-01");
    s = recordRoundCompleted(s, "2026-01-03"); // vilodag used
    s = recordRoundCompleted(s, "2026-01-05"); // another gap, same week -> streak resets
    expect(s.current).toBe(1);
  });

  it("resets after a gap of more than one day with no vilodag available", () => {
    let s = recordRoundCompleted(INITIAL_STREAK_STATE, "2026-01-01");
    s = recordRoundCompleted(s, "2026-01-10");
    expect(s.current).toBe(1);
  });
});
