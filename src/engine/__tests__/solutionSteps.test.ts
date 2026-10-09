import { describe, expect, it } from "vitest";
import { answerOf, checkStep } from "../../mathinput/stepCheck";
import { ADVANCED_GENERATORS } from "../questions/written/advanced";
import { stepsOf } from "../questions/written/problem";
import { EXAM_GENERATORS } from "../questions/written/examTopics";
import { WORD_GENERATORS } from "../questions/written/wordProblems";
import { GEOMETRY_GENERATORS } from "../questions/written/geometry";
import { BASIC_GENERATORS } from "../questions/written/basicTopics";
import { makeRng } from "../rng";

const GENERATORS = { ...ADVANCED_GENERATORS, ...GEOMETRY_GENERATORS, ...EXAM_GENERATORS, ...WORD_GENERATORS, ...BASIC_GENERATORS };

describe("guided solution steps", () => {
  it("every question's steps, written in order, each check out - and the last one solves it", () => {
    const rng = makeRng(11);
    for (const [stage, gen] of Object.entries(GENERATORS)) {
      for (let i = 0; i < 150; i++) {
        const p = gen(rng);
        const steps = stepsOf(p);
        const answer = answerOf(p);
        expect(steps.length, stage).toBeGreaterThan(0);
        const lines = steps.map((s) => s.line);
        lines.forEach((_, k) => {
          const v = checkStep(lines.slice(0, k + 1), answer, !!p.unit);
          const where = `${stage} step ${k + 1}/${lines.length}: ${lines.slice(0, k + 1).join(" | ")}`;
          if (k < lines.length - 1) expect(["ok", "more", "notFinished"], where).toContain(v.kind);
          else expect(v.kind, where).toBe("solved");
        });
      }
    }
  });

  it("every step has guiding text", () => {
    const rng = makeRng(5);
    for (const gen of Object.values(GENERATORS)) for (const s of stepsOf(gen(rng))) expect(s.guideKey).toMatch(/^step\./);
  });

  it("catches a wrong step where it happens", () => {
    // 3x + 4 = 19: subtracting gives 3x = 15, not 3x = 13.
    const answer = { kind: "solutions" as const, variable: "x", values: [5], given: [] };
    expect(checkStep(["3x = 15"], answer).kind).toBe("ok");
    expect(checkStep(["3x = 13"], answer).kind).toBe("wrong");
    expect(checkStep(["3x = 15", "x = 5"], answer).kind).toBe("solved");
  });

  it("points out a number that came from nowhere", () => {
    // 8 · 6 / 2, written with a 5.
    const answer = { kind: "value" as const, value: 24, givens: [8, 6, 2, 48] };
    const v = checkStep(["8 \\cdot 5 = 4 0"], answer); // digits as the reader writes them
    expect(v).toEqual({ kind: "wrong", suspects: [5] });
  });

  it("asks for a step that can't be read again", () => {
    expect(checkStep([""], { kind: "value", value: 1 }).kind).toBe("unread");
  });
});

describe("guided step texts", () => {
  it("every step's guiding text exists, in Swedish and English", async () => {
    const sv = (await import("../../i18n/sv.json")).default as Record<string, string>;
    const en = (await import("../../i18n/en.json")).default as Record<string, string>;
    const rng = makeRng(13);
    for (const [stage, gen] of Object.entries(GENERATORS)) {
      for (let i = 0; i < 60; i++) {
        for (const s of stepsOf(gen(rng))) {
          expect(sv[s.guideKey], `${stage}: ${s.guideKey}`).toBeTruthy();
          expect(en[s.guideKey], `${stage}: ${s.guideKey}`).toBeTruthy();
        }
      }
    }
  });
});
