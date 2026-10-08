import { describe, expect, it } from "vitest";
import { INITIAL_STREAK_STATE, playerLevel, questionStars, questionXp, recordRoundCompleted, roundStars } from "../scoring";

describe("questionStars", () => {
  it("★ with help - whatever else", () => {
    expect(questionStars({ helped: true, fullSetup: true })).toBe(1);
    expect(questionStars({ helped: true, fullSetup: false })).toBe(1);
  });

  it("★★ right without help, ★★★ with the full setup too", () => {
    expect(questionStars({ helped: false, fullSetup: false })).toBe(2);
    expect(questionStars({ helped: false, fullSetup: true })).toBe(3);
  });
});

describe("roundStars: what at least half the questions reached", () => {
  it("one slip doesn't cost the round", () => {
    expect(roundStars([3, 3, 3, 3, 3, 1])).toBe(3);
    expect(roundStars([3, 3, 3, 1, 1, 1])).toBe(3);
  });

  it("one lucky question doesn't win it", () => {
    expect(roundStars([3, 1, 1, 1, 1, 1])).toBe(1);
    expect(roundStars([3, 2, 1, 1, 1, 1])).toBe(1);
  });

  it("★★★ and ★★ questions together make ★★", () => {
    expect(roundStars([3, 3, 2, 2, 1, 1])).toBe(2);
  });

  it("never fewer than ★ - every question is solved in the end", () => {
    expect(roundStars([1, 1, 1])).toBe(1);
    expect(roundStars([])).toBe(1);
  });
});

describe("XP and level", () => {
  it("awards more XP without help, and more for the full setup", () => {
    expect(questionXp(1)).toBe(10);
    expect(questionXp(2)).toBe(15);
    expect(questionXp(3)).toBe(20);
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
