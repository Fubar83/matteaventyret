import { describe, expect, it } from "vitest";
import { isBlixtrundaUnlocked, isBossUnlocked, isStageUnlocked, missingRequirements, recommendNext } from "../unlocks";
import { STAGES } from "../stages";

describe("the path graph", () => {
  it("every requirement is a real stage that comes earlier - no cycles, nothing unreachable", () => {
    const seen = new Set<string>();
    for (const stage of STAGES) {
      for (const r of stage.requires) expect(seen.has(r)).toBe(true);
      seen.add(stage.id);
    }
  });

  it("only Positionssystemet is open from the start", () => {
    expect(STAGES.filter((s) => isStageUnlocked(s.id, {})).map((s) => s.id)).toEqual(["1.1.1"]);
  });

  it("paths branch: after Positionssystemet, addition, subtraction and diagrams all open at once", () => {
    const open = STAGES.filter((s) => isStageUnlocked(s.id, { "1.1.1": 1 })).map((s) => s.id);
    expect(open).toEqual(expect.arrayContaining(["1.1.2", "1.1.3", "2.8.1"]));
  });

  it("a stage with two requirements needs both", () => {
    expect(isStageUnlocked("1.1.6", { "1.1.4": 1 })).toBe(false);
    expect(isStageUnlocked("1.1.6", { "1.1.4": 1, "1.1.5": 2 })).toBe(true);
    expect(missingRequirements("1.1.6", { "1.1.4": 1 })).toEqual(["1.1.5"]);
  });

  it("stars on a challenged stage open what builds on it - jumping ahead", () => {
    // Beat 3.3.3 as a challenge without any of the early stages:
    expect(isStageUnlocked("4.1.1", { "3.3.3": 2 })).toBe(false); // still needs 3.4.1 too
    expect(isStageUnlocked("4.1.1", { "3.3.3": 2, "3.4.1": 1 })).toBe(true);
  });
});

describe("recommendNext", () => {
  const today = "2026-09-30";

  it("the very first time: Positionssystemet", () => {
    expect(recommendNext({}, {}, today)).toBe("1.1.1");
  });

  it("something new comes first - on the path the child is on", () => {
    // Just played subtraction: carry on with subtraction rather than jump to addition or diagrams.
    expect(recommendNext({ "1.1.1": 3, "1.1.3": 2 }, { "1.1.1": "2026-09-28", "1.1.3": "2026-09-30" }, today)).toBe("1.1.5");
  });

  it("when everything's been played, a stage without all stars that hasn't been played for days", () => {
    const stars = Object.fromEntries(STAGES.map((s) => [s.id, 3])) as Record<string, 1 | 2 | 3>;
    const played: Record<string, string> = Object.fromEntries(STAGES.map((s) => [s.id, "2026-09-29"]));
    stars["2.1.2"] = 1;
    stars["1.1.4"] = 2;
    played["1.1.4"] = "2026-09-10"; // longer ago, but more stars
    played["2.1.2"] = "2026-09-20";
    expect(recommendNext(stars, played, today)).toBe("2.1.2");
  });

  it("all stars everywhere: the one played longest ago", () => {
    const stars = Object.fromEntries(STAGES.map((s) => [s.id, 3])) as Record<string, 3>;
    const played: Record<string, string> = Object.fromEntries(STAGES.map((s) => [s.id, "2026-09-29"]));
    played["2.7.2"] = "2026-08-01";
    expect(recommendNext(stars, played, today)).toBe("2.7.2");
  });
});

describe("specials", () => {
  it("Blixtrundan needs stage 2 at 2 stars", () => {
    expect(isBlixtrundaUnlocked({ "1.1.2": 1 })).toBe(false);
    expect(isBlixtrundaUnlocked({ "1.1.2": 2 })).toBe(true);
  });

  it("the boss needs every stage of 1.1 at 1+ star", () => {
    expect(isBossUnlocked({ "1.1.1": 1, "1.1.2": 1, "1.1.3": 1, "1.1.4": 1, "1.1.5": 1, "1.1.6": 1 })).toBe(false);
    expect(isBossUnlocked({ "1.1.1": 1, "1.1.2": 1, "1.1.3": 1, "1.1.4": 1, "1.1.5": 1, "1.1.6": 1, "1.1.7": 1 })).toBe(true);
  });
});
