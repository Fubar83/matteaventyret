import { describe, expect, it } from "vitest";
import { questionTypeOf } from "../../engine/generator";
import { STAGES } from "../../game/stages";
import { layoutSymbols, type ClassifiedSymbol } from "../../mathinput/layout";
import { WRITING_LEVELS } from "../levels";
import { PROFILES, profileForStage } from "../profiles";

const s = (char: string, cx: number, cy: number, h = 40, w = 24): ClassifiedSymbol => ({
  char,
  box: { cx, cy, width: w, height: h, minX: cx - w / 2, maxX: cx + w / 2, minY: cy - h / 2, maxY: cy + h / 2 },
});

describe("recognition profiles", () => {
  it("every stage written freely has one, on its own level's model - or, for a young level that needs letters (units, %), the full model read in any order", () => {
    for (const stage of STAGES.filter((st) => ["written", "statistics", "chart"].includes(questionTypeOf(st.id).id))) {
      const profile = profileForStage(stage.id);
      expect(profile, stage.id).toBeDefined();
      const ownModel = profile!.model === WRITING_LEVELS[stage.writingLevel].model;
      const youngWithLetters = stage.writingLevel <= 2 && profile!.model === "full" && !profile!.strictOrder;
      expect(ownModel || youngWithLetters, stage.id).toBe(true);
    }
  });

  it("only questions with powers in them read powers", () => {
    expect(PROFILES.areaBasic.scripts).toBe(false);
    expect(PROFILES.percent.scripts).toBe(false);
    expect(PROFILES.powers.scripts).toBe(true);
    expect(PROFILES.circles.scripts).toBe(true);
  });

  it("are much narrower than the level they're used at", () => {
    expect(PROFILES.areaBasic.chars.size).toBeLessThan(WRITING_LEVELS[2].chars.size);
    expect(PROFILES.circles.chars.size).toBeLessThan(WRITING_LEVELS[3].chars.size);
    expect(PROFILES.pq.chars.size).toBeLessThan(WRITING_LEVELS[4].chars.size / 2);
  });
});

describe("layout without superscripts and subscripts", () => {
  // "8 + 6 = 14" with the 6 written small and a little high - an exponent, if powers are read at all.
  const raised = [s("8", 20, 50), s("+", 45, 50, 16, 16), s("6", 66, 38, 22, 14), s("=", 100, 50, 14), s("1", 130, 50), s("4", 156, 50)];

  it("powers on: the small high 6 becomes an exponent", () => {
    expect(layoutSymbols(raised)).toContain("^{6}");
  });

  it("powers off: it's just a 6 on the line", () => {
    const latex = layoutSymbols(raised, { scripts: false });
    expect(latex).not.toContain("^");
    expect(latex.replace(/\s+/g, " ")).toBe("8 + 6 = 1 4");
  });
});
