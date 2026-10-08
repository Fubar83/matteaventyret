import { describe, expect, it } from "vitest";
import { parseExpression } from "../../mathinput/evaluate";
import { checkWrittenAnswer, type Answer } from "../../mathinput/workCheck";
import { ADVANCED_GENERATORS, tex, type AdvancedProblem, type AdvancedStageId } from "../advanced";
import { generateRound } from "../generator";
import { makeRng } from "../rng";

const N = 300;

/** The checker's form of a problem's answer. */
function toAnswer(p: AdvancedProblem): Answer {
  const a = p.answer;
  if (a.kind === "value") return a;
  if (a.kind === "solutions") return { kind: "solutions", variable: a.variable, values: a.values, given: [] };
  if (a.kind === "system") return a;
  const expected = parseExpression(a.latex);
  if (!expected) throw new Error(`${p.stageId}: answer doesn't parse: ${a.latex}`);
  return { kind: "expression", variable: a.variable, expected };
}

const asWritten = (lines: string[]) => (lines.length === 1 ? lines[0] : `\\begin{gathered} ${lines.join(" \\\\ ")} \\end{gathered}`);

describe("åk 7-9 and gymnasiet questions", () => {
  for (const stageId of Object.keys(ADVANCED_GENERATORS) as AdvancedStageId[]) {
    it(`${stageId}: the worked solution is checked right - generator, evaluator and checker agree`, () => {
      const rng = makeRng(stageId.split(".").reduce((a, b) => a * 31 + Number(b), 7));
      for (let i = 0; i < N; i++) {
        const p = ADVANCED_GENERATORS[stageId](rng);
        const verdict = checkWrittenAnswer(asWritten(p.solution), toAnswer(p));
        if (!verdict.correct) throw new Error(`${stageId}: solution not checked correct: ${p.display} | ${p.solution.join(" / ")} (${JSON.stringify(p.answer)})`);
        expect(verdict.badLines).toEqual([]);
      }
    });
  }

  it("answers come out as school exercises do: whole, or a few decimals (small numbers in grundpotensform: up to four)", () => {
    const rng = makeRng(99);
    for (const [stageId, gen] of Object.entries(ADVANCED_GENERATORS)) {
      const places = stageId === "3.1.3" ? 4 : 2;
      for (let i = 0; i < 100; i++) {
        const a = gen(rng).answer;
        const values = a.kind === "value" ? [a.value] : a.kind === "solutions" ? a.values : [];
        for (const v of values) expect(Math.round(v * 10 ** places) / 10 ** places).toBeCloseTo(v, 9);
      }
    }
  });

  it("the answer alone is right, but not a full setup", () => {
    const p = ADVANCED_GENERATORS["3.3.2"](makeRng(5));
    if (p.answer.kind !== "solutions") throw new Error("expected solutions");
    const verdict = checkWrittenAnswer(`x = ${tex(p.answer.values[0])}`, toAnswer(p));
    expect(verdict).toEqual({ correct: true, fullSetup: false, badLines: [] });
  });

  it("a round of any new stage has no repeats", () => {
    const { keys } = generateRound("4.3.1", 8, makeRng(3));
    expect(new Set(keys).size).toBe(8);
  });

  it("numbers are written the Swedish way", () => {
    expect(tex(3.5)).toBe("3{,}5");
    expect(tex(-4)).toBe("-4");
  });
});
