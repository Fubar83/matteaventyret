import { describe, expect, it } from "vitest";
import { isBlixtrundaUnlocked, isBossUnlocked, isStageUnlocked } from "../unlocks";

describe("isStageUnlocked", () => {
  it("stage 1 is always open", () => {
    expect(isStageUnlocked("1.1.1", {})).toBe(true);
  });

  it("a later stage needs the previous one to have at least 1 star", () => {
    expect(isStageUnlocked("1.1.2", {})).toBe(false);
    expect(isStageUnlocked("1.1.2", { "1.1.1": 1 })).toBe(true);
  });
});

describe("isBlixtrundaUnlocked", () => {
  it("needs stage 2 at 2 stars", () => {
    expect(isBlixtrundaUnlocked({ "1.1.2": 1 })).toBe(false);
    expect(isBlixtrundaUnlocked({ "1.1.2": 2 })).toBe(true);
  });
});

describe("isBossUnlocked", () => {
  it("needs every stage at 1+ star", () => {
    expect(isBossUnlocked({ "1.1.1": 1, "1.1.2": 1, "1.1.3": 1, "1.1.4": 1, "1.1.5": 1, "1.1.6": 1 })).toBe(false);
    expect(
      isBossUnlocked({ "1.1.1": 1, "1.1.2": 1, "1.1.3": 1, "1.1.4": 1, "1.1.5": 1, "1.1.6": 1, "1.1.7": 1 })
    ).toBe(true);
  });
});
