import { describe, expect, it } from "vitest";
import { WRITTEN_QUESTIONS } from "../../engine/questions/written";
import { makeRng } from "../../engine/rng";
import { textIn } from "../../i18n";
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

  it("every written question's prompt and tip - word problems' stories included - with every {placeholder} filled", () => {
    const rng = makeRng(11);
    for (const [stage, gen] of Object.entries(WRITTEN_QUESTIONS.levels)) {
      for (let i = 0; i < 30; i++) {
        const p = gen(rng);
        for (const key of [p.promptKey, p.tipKey]) {
          const missing = (["sv", "en"] as const).filter((lang) => textIn(lang, key) === undefined);
          expect(missing, `${stage}: ${key}`).toEqual([]);
        }
        const placeholders = [...textIn("sv", p.promptKey)!.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
        for (const name of placeholders) expect(p.promptVars ?? {}, `${stage}: ${p.promptKey} {${name}}`).toHaveProperty(name);
      }
    }
  });
});
