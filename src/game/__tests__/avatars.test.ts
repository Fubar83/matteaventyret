import { describe, expect, it } from "vitest";
import { AVATARS, isAvatarUnlocked, unlockedAvatarIds } from "../avatars";

describe("avatars", () => {
  it("has exactly 2 free avatars", () => {
    const free = AVATARS.filter((a) => a.unlock.type === "free");
    expect(free).toHaveLength(2);
  });

  it("unlocks star-gated avatars only once the threshold is met", () => {
    const uggla = AVATARS.find((a) => a.id === "uggla")!;
    expect(isAvatarUnlocked(uggla, 4, false)).toBe(false);
    expect(isAvatarUnlocked(uggla, 5, false)).toBe(true);
  });

  it("unlocks the boss avatar only once the boss is defeated", () => {
    const bjorn = AVATARS.find((a) => a.id === "bjorn")!;
    expect(isAvatarUnlocked(bjorn, 999, false)).toBe(false);
    expect(isAvatarUnlocked(bjorn, 0, true)).toBe(true);
  });

  it("unlockedAvatarIds always includes the free ones", () => {
    const ids = unlockedAvatarIds(0, false);
    expect(ids).toContain("rav");
    expect(ids).toContain("igelkott");
    expect(ids).toHaveLength(2);
  });
});
