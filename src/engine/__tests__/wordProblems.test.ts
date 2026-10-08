import { describe, expect, it } from "vitest";
import { answerOf } from "../../mathinput/stepCheck";
import { checkWrittenAnswer, withoutUnits } from "../../mathinput/workCheck";
import { generateRound } from "../generator";
import { makeRng } from "../rng";
import { TEMPLATES, WORD_GENERATORS, wordTexts } from "../wordProblems";

describe("word problems", () => {
  it("has a hundred stories, each with a wording in both languages", () => {
    expect(TEMPLATES.length).toBeGreaterThanOrEqual(100);
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length);
    const [sv, en] = [wordTexts("sv"), wordTexts("en")];
    expect(Object.keys(sv).sort()).toEqual(Object.keys(en).sort());
  });

  it("fills in every blank of every story, and the worked steps solve it", () => {
    const rng = makeRng(21);
    for (const tpl of TEMPLATES) {
      for (let i = 0; i < 40; i++) {
        const made = tpl.make(rng);
        for (const text of [tpl.sv, tpl.en]) {
          const filled = text.replace(/\{(\w+)\}/g, (_, k: string) => (k in made.vars ? "_" : `{${k}}`));
          expect(filled, `${tpl.id}: ${text}`).not.toMatch(/\{\w+\}/);
        }
        const work = made.steps.map((s) => s.line).join(" \\\\ ");
        const answer = answerOf({ stageId: tpl.stage, kind: "expression", promptKey: "", display: "", answer: { kind: "value", value: made.answer }, tipKey: "", firstStep: "", solution: [] });
        const v = checkWrittenAnswer(made.unit ? withoutUnits(work) : work, answer);
        expect(v.correct, `${tpl.id}: ${work} = ${made.answer}`).toBe(true);
        expect(v.badLines, `${tpl.id}: ${work}`).toEqual([]);
      }
    }
  });

  it("fills a round of each level without repeats", () => {
    for (const stage of Object.keys(WORD_GENERATORS)) {
      expect(generateRound(stage as keyof typeof WORD_GENERATORS, 6, makeRng(2)).problems, stage).toHaveLength(6);
    }
  });
});
