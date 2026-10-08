import { beforeEach, describe, expect, it } from "vitest";
import { bestStageStars, createDefaultSave, loadSave, totalStars, writeSave } from "../save";

beforeEach(() => {
  localStorage.clear();
});

describe("save/load", () => {
  it("returns a fresh default save when nothing is stored", () => {
    const save = loadSave();
    expect(save.version).toBe(1);
    expect(save.totalXp).toBe(0);
    expect(save.avatarsUnlocked).toContain("rav");
  });

  it("round-trips a written save", () => {
    const save = createDefaultSave();
    save.totalXp = 250;
    save.stageStars["1.1.4"] = 3;
    writeSave(save);
    const loaded = loadSave();
    expect(loaded.totalXp).toBe(250);
    expect(loaded.stageStars["1.1.4"]).toBe(3);
  });

  it("starts fresh instead of crashing on corrupt data", () => {
    localStorage.setItem("matteaventyret-save", "{not json");
    const save = loadSave();
    expect(save.version).toBe(1);
  });

  it("starts fresh on a recognisable-but-wrong shape", () => {
    localStorage.setItem("matteaventyret-save", JSON.stringify({ hello: "world" }));
    const save = loadSave();
    expect(save.version).toBe(1);
  });

  it("merges missing settings fields from an older save onto current defaults", () => {
    localStorage.setItem("matteaventyret-save", JSON.stringify({ version: 1, settings: {} }));
    const save = loadSave();
    expect(save.settings.locale).toBe("sv");
    expect(save.settings.muted).toBe(false);
  });
});

describe("star helpers", () => {
  it("bestStageStars defaults to 0 for an unplayed stage", () => {
    expect(bestStageStars(createDefaultSave(), "1.1.2")).toBe(0);
  });

  it("totalStars sums every stage", () => {
    const save = createDefaultSave();
    save.stageStars["1.1.1"] = 2;
    save.stageStars["1.1.2"] = 3;
    expect(totalStars(save)).toBe(5);
  });
});
