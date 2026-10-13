import { describe, expect, it } from "vitest";
import { generateProblem, STAGE_IDS } from "../../engine/generator";
import { makeRng } from "../../engine/rng";
import { t } from "../../i18n";

/** Every text in a question - anything shaped { key, vars } - wherever it sits in the problem. */
function textsIn(x: unknown, out: { key: string; vars?: Record<string, string | number> }[] = []) {
  if (Array.isArray(x)) x.forEach((y) => textsIn(y, out));
  else if (x && typeof x === "object") {
    const o = x as Record<string, unknown>;
    if (typeof o.key === "string" && o.key.includes(".") && (o.vars === undefined || typeof o.vars === "object")) out.push(o as { key: string; vars?: Record<string, string | number> });
    else Object.values(o).forEach((y) => textsIn(y, out));
  }
  return out;
}

describe("texts in questions", () => {
  it("every text a question holds is translated with all its {placeholders} filled", () => {
    for (const stage of STAGE_IDS) {
      for (let seed = 1; seed <= 12; seed++) {
        const p = generateProblem(stage, makeRng(seed));
        for (const x of textsIn(p)) {
          const shown = t(x.key, x.vars);
          expect(shown, `${stage}: ${x.key}`).not.toBe(x.key);
          expect(shown, `${stage}: ${x.key}`).not.toMatch(/\{[a-zA-Z]+\}/);
        }
      }
    }
  });
});
