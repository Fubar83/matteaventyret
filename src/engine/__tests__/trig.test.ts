import { describe, expect, it } from "vitest";
import { checkWrittenAnswer } from "../../mathinput/workCheck";
import { answerOf } from "../../mathinput/stepCheck";
import { CHOICE_QUESTIONS } from "../questions/choice";
import { ADVANCED_GENERATORS } from "../questions/written/advanced";
import { checkRatio, RATIO, RIGHT_TRIANGLE_QUESTIONS, roleOf, sideOf, SIDES, type RightTriangleStageId } from "../questions/rightTriangle";
import { cosOf, exact, norm, radians, sinOf, UNIT_CIRCLE_QUESTIONS, type UnitCircleStageId } from "../questions/unitCircle";
import { makeRng } from "../rng";

const many = <T>(make: (rng: ReturnType<typeof makeRng>) => T, n = 300) => {
  const rng = makeRng(3);
  return Array.from({ length: n }, () => make(rng));
};

/** The exact values as the options write them. */
const VALUE: Record<string, number> = {
  "0": 0,
  "1": 1,
  "2": 2,
  "\\dfrac{1}{2}": 0.5,
  "\\dfrac{\\sqrt{2}}{2}": Math.SQRT2 / 2,
  "\\dfrac{\\sqrt{3}}{2}": Math.sqrt(3) / 2,
  "\\sqrt{3}": Math.sqrt(3),
  "\\dfrac{1}{\\sqrt{3}}": 1 / Math.sqrt(3),
  "\\dfrac{1}{\\sqrt{2}}": 1 / Math.SQRT2,
  "\\sqrt{2}": Math.SQRT2,
  "\\dfrac{2}{\\sqrt{3}}": 2 / Math.sqrt(3),
};
const fn = { sin: (d: number) => Math.sin((d * Math.PI) / 180), cos: (d: number) => Math.cos((d * Math.PI) / 180), tan: (d: number) => Math.tan((d * Math.PI) / 180) };

describe("the right triangle", () => {
  it("each side has one role from v: the hypotenuse across from the right angle, the legs by whether they touch v", () => {
    for (const at of [0, 1] as const) {
      expect(new Set(SIDES.map((s) => roleOf(at, s))).size).toBe(3);
      expect(roleOf(at, "hyp")).toBe("hypotenuse");
    }
    expect(roleOf(0, "leg1")).toBe("adjacent");
    expect(roleOf(1, "leg1")).toBe("opposite");
  });

  it("4.2.5: the right fraction is accepted, upside down and the other ratios are named", () => {
    for (const p of many(RIGHT_TRIANGLE_QUESTIONS.levels["4.2.5"])) {
      const [top, bottom] = RATIO[p.fn!].map((r) => sideOf(p.shape.angleAt, r));
      expect(checkRatio(p, top, bottom)).toEqual({ ok: true });
      expect(checkRatio(p, bottom, top)).toMatchObject({ why: { key: "rt.why.upsideDown" } });
      const [a, b, c] = p.lengths!;
      expect(a * a + b * b).toBe(c * c);
    }
  });

  it("every level makes questions", () => {
    for (const stage of Object.keys(RIGHT_TRIANGLE_QUESTIONS.levels) as RightTriangleStageId[]) expect(new Set(many(RIGHT_TRIANGLE_QUESTIONS.levels[stage], 60).map(RIGHT_TRIANGLE_QUESTIONS.key)).size).toBeGreaterThan(30);
  });
});

describe("the unit circle", () => {
  it("the answers fit what's asked, and the point never starts on one", () => {
    for (const stage of Object.keys(UNIT_CIRCLE_QUESTIONS.levels) as UnitCircleStageId[]) {
      for (const p of many(UNIT_CIRCLE_QUESTIONS.levels[stage])) {
        expect(p.answers.length).toBeGreaterThan(0);
        expect(p.answers).not.toContain(p.start);
        for (const a of p.answers) expect(a % 15).toBe(0);
        const about = p.about;
        if (about.type === "angle") expect(p.answers).toEqual([norm(about.deg)]);
        if (about.type === "signs") for (const a of p.answers) expect([Math.sign(sinOf(a)), Math.sign(cosOf(a))]).toEqual([about.sin, about.cos]);
        if (about.type === "value") {
          // Only one angle has this value and the other sign.
          const f = about.fn === "sin" ? sinOf : cosOf;
          const g = about.fn === "sin" ? cosOf : sinOf;
          const fits = Array.from({ length: 24 }, (_, i) => i * 15).filter((d) => Math.abs(f(d) - f(about.deg)) < 1e-9 && Math.sign(g(d)) === Math.sign(g(about.deg)));
          expect(fits).toEqual([about.deg]);
        }
        if (about.type === "same") {
          const f = about.fn === "sin" ? sinOf : cosOf;
          expect(Math.abs(f(p.answers[0]) - f(about.deg))).toBeLessThan(1e-9);
          expect(p.answers[0]).not.toBe(norm(about.deg));
        }
      }
    }
  });

  it("writes exact values and radians", () => {
    expect(exact(Math.sqrt(3) / 2)).toBe("\\frac{\\sqrt{3}}{2}");
    expect(exact(-0.5)).toBe("-\\frac{1}{2}");
    expect(radians(135)).toBe("\\frac{3\\pi}{4}");
    expect(radians(-60)).toBe("-\\frac{\\pi}{3}");
    expect(radians(180)).toBe("\\pi");
    expect(radians(210, true)).toBe("7π/6");
    expect(radians(0, true)).toBe("0");
  });
});

describe("trigonometry as choices", () => {
  it("4.2.6: the right value is the function's value", () => {
    for (const p of many(CHOICE_QUESTIONS.levels["4.2.6"])) {
      const right = p.options[p.correct];
      if (p.prompt.key === "choice.trig.exact" && "latex" in right) {
        const [, f, d] = p.display!.match(/^\\(sin|cos|tan) (\d+)/)!;
        expect(VALUE[right.latex], p.display).toBeCloseTo(fn[f as "sin"](Number(d)), 9);
      }
      if (p.prompt.key === "choice.trig.fromTriangle" && "latex" in right) {
        const { fn: f, v } = p.prompt.vars as { fn: "sin"; v: number };
        expect(VALUE[right.latex], `${f} ${v}`).toBeCloseTo(fn[f](v), 9);
      }
      // No two options are the same number.
      const values = p.options.map((o) => ("latex" in o ? VALUE[o.latex] : "plain" in o ? Number(o.plain.replace("°", "")) : NaN));
      expect(new Set(values.map((v) => v.toFixed(9))).size).toBe(values.length);
    }
  });

  it("4.2.7: the triple's other leg, and tan as sin over cos", () => {
    for (const p of many(CHOICE_QUESTIONS.levels["4.2.7"]).filter((p) => p.prompt.key === "choice.trig.pythagoras")) {
      const [, g, c] = p.display!.match(/\\frac\{(\d+)\}\{(\d+)\}/)!.map(Number);
      const right = p.options[p.correct] as { latex: string };
      const [, w] = right.latex.match(/\\dfrac\{(\d+)\}/)!.map(Number);
      expect(g * g + w * w).toBe(c * c);
    }
  });
});

describe("trigonometry written", () => {
  it("4.2.8 and 4.2.12: the worked solution, written on the board, is right", () => {
    for (const stage of ["4.2.8", "4.2.12"] as const) {
      for (const p of many(ADVANCED_GENERATORS[stage], 100)) {
        const work = p.solution.join(" \\\\ ");
        expect(checkWrittenAnswer(work, answerOf(p)).correct, `${stage}: ${work}`).toBe(true);
      }
    }
  });

  it("4.2.12: both solutions are in 0°-360° and make the equation true", () => {
    for (const p of many(ADVANCED_GENERATORS["4.2.12"])) {
      const a = p.answer as { kind: "solutions"; values: number[] };
      expect(a.values).toHaveLength(2);
      const [, two, f] = p.display.match(/^(2)?\\(sin|cos|tan) v/)!;
      const values = a.values.map((v) => fn[f as "sin"](v) * (two ? 2 : 1));
      expect(values[0]).toBeCloseTo(values[1], 9);
      for (const v of a.values) expect(v >= 0 && v < 360).toBe(true);
    }
  });
});
