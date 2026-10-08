import { describe, expect, it } from "vitest";
import { ADVANCED_GENERATORS } from "../../engine/advanced";
import { GEOMETRY_GENERATORS } from "../../engine/geometry";
import { makeRng } from "../../engine/rng";
import en from "../../i18n/en.json";
import sv from "../../i18n/sv.json";
import { PATHS, STAGES } from "../stages";
import { TEORI_SLIDES, topicForStage } from "../teoriContent";

const dicts = { sv: sv as Record<string, string>, en: en as Record<string, string> };
const missingIn = (key: string) => Object.entries(dicts).filter(([, d]) => !(key in d)).map(([lang]) => lang);

describe("every text the game shows exists in Swedish and English", () => {
  it("both languages have exactly the same keys", () => {
    expect(Object.keys(sv).sort()).toEqual(Object.keys(en).sort());
  });

  it("every stage: its title, its theory topic, and each slide's text", () => {
    for (const stage of STAGES) {
      expect(missingIn(stage.titleKey), stage.titleKey).toEqual([]);
      const slides = TEORI_SLIDES[topicForStage(stage.id)];
      expect(slides?.length, `theory for ${stage.id}`).toBeGreaterThan(1);
      for (const slide of slides) expect(missingIn(slide.textKey), slide.textKey).toEqual([]);
    }
  });

  it("every stage has its own theory - only 1.1.2 is plain addition (what an unknown stage falls back to)", () => {
    const fallback = topicForStage("no-such-stage");
    const onFallback = STAGES.filter((s) => topicForStage(s.id) === fallback).map((s) => s.id);
    expect(onFallback).toEqual(["1.1.2"]);
  });

  it("every topic ends with a common mistake and a check whose right answer is one of its choices", () => {
    for (const [topic, slides] of Object.entries(TEORI_SLIDES)) {
      expect(slides.some((s) => s.kind === "mistake"), `${topic} has a mistake`).toBe(true);
      const checks = slides.filter((s) => s.kind === "check");
      expect(checks.length, `${topic} has a check`).toBeGreaterThan(0);
      for (const c of checks) expect(c.check!.correct).toBeLessThan(c.check!.options.length);
    }
  });

  it("every path's name", () => {
    for (const p of PATHS) expect(missingIn(p.nameKey), p.nameKey).toEqual([]);
  });

  it("every åk 7+ question's prompt and tip", () => {
    const rng = makeRng(11);
    for (const gen of [...Object.values(ADVANCED_GENERATORS), ...Object.values(GEOMETRY_GENERATORS)]) {
      for (let i = 0; i < 30; i++) {
        const p = gen(rng);
        expect(missingIn(p.promptKey), p.promptKey).toEqual([]);
        expect(missingIn(p.tipKey), p.tipKey).toEqual([]);
        // Every {placeholder} in the prompt gets a value.
        const placeholders = [...(dicts.sv[p.promptKey].matchAll(/\{(\w+)\}/g) ?? [])].map((m) => m[1]);
        for (const name of placeholders) expect(p.promptVars ?? {}, `${p.promptKey} {${name}}`).toHaveProperty(name);
      }
    }
  });
});
