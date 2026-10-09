import { describe, expect, it } from "vitest";
import { ADVANCED_GENERATORS } from "../../engine/questions/written/advanced";
import { GEOMETRY_GENERATORS } from "../../engine/questions/written/geometry";
import { makeRng } from "../../engine/rng";
import en from "../../i18n/en.json";
import sv from "../../i18n/sv.json";
import { PATHS, STAGES } from "../stages";

const dicts = { sv: sv as Record<string, string>, en: en as Record<string, string> };
const missingIn = (key: string) => Object.entries(dicts).filter(([, d]) => !(key in d)).map(([lang]) => lang);

describe("every text the game shows exists in Swedish and English", () => {
  it("both languages have exactly the same keys", () => {
    expect(Object.keys(sv).sort()).toEqual(Object.keys(en).sort());
  });

  it("every stage's title", () => {
    for (const stage of STAGES) expect(missingIn(stage.titleKey), stage.titleKey).toEqual([]);
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
