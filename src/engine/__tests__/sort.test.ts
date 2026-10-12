import { describe, expect, it } from "vitest";
import type { ChoiceOption } from "../questions/choice/problem";
import { PLANE_SHAPES } from "../questions/scene";
import { SORT_QUESTIONS, type SortStageId } from "../questions/sort";
import type { SortGroupsProblem, SortOrderProblem } from "../questions/sort/problem";
import { makeRng } from "../rng";

const N = 300;
const all = <P>(stage: SortStageId) => {
  const rng = makeRng(1);
  return Array.from({ length: N }, () => SORT_QUESTIONS.levels[stage](rng) as P);
};
const groupLevels = Object.keys(SORT_QUESTIONS.levels).filter((id) => SORT_QUESTIONS.levels[id as SortStageId](makeRng(1)).kind === "sortGroups") as SortStageId[];
const orderLevels = Object.keys(SORT_QUESTIONS.levels).filter((id) => !groupLevels.includes(id as SortStageId)) as SortStageId[];

/** What a thing is worth: 3{,}5, -7, \dfrac{3}{4}, 35\,\%, 2{,}5 \cdot 10^{5}, 40\,000, "1,2 m", or a group of things. */
function valueOf(o: ChoiceOption): number {
  if ("scene" in o) {
    if (o.scene.kind !== "count") throw new Error("not a count");
    return o.scene.groups[0].n;
  }
  if ("plain" in o) {
    // "1 300 mm": the unit last, the number before it (thousands spaced).
    const unit = o.plain.split(" ").at(-1)!;
    const n = o.plain.slice(0, -unit.length).replace(/\s/g, "");
    return Number(n.replace(",", ".")) * { m: 1000, dm: 100, cm: 10, mm: 1 }[unit as "m"]!;
  }
  if (!("latex" in o)) throw new Error("words have no value");
  const l = o.latex;
  const frac = l.match(/^\\dfrac\{(\d+)\}\{(\d+)\}$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  const pct = l.match(/^(.+)\\,\\%$/);
  if (pct) return Number(pct[1].replace("{,}", ".")) / 100;
  const power = l.match(/^(.+) \\cdot 10\^\{(\d+)\}$/);
  if (power) return Number(power[1].replace("{,}", ".")) * 10 ** Number(power[2]);
  return Number(l.replace(/\\,/g, "").replace("{,}", "."));
}
const isPrime = (n: number) => n > 1 && Array.from({ length: n - 2 }, (_, i) => i + 2).every((d) => n % d !== 0);

describe("sorting into groups", () => {
  it("every thing has a group, every group gets something, and each thing has its reason", () => {
    for (const stage of groupLevels) {
      for (const p of all<SortGroupsProblem>(stage)) {
        expect(p.answer, stage).toHaveLength(p.items.length);
        expect(p.why, stage).toHaveLength(p.items.length);
        for (let g = 0; g < p.groups.length; g++) expect(p.answer.includes(g), `${stage}: group ${g} empty`).toBe(true);
      }
    }
  });

  it("1.8.5: odd and even by the number itself - with a three-digit one among them", () => {
    for (const p of all<SortGroupsProblem>("1.8.5")) {
      p.items.forEach((o, i) => expect(p.answer[i]).toBe(valueOf(o) % 2 === 1 ? 0 : 1));
      expect(p.items.some((o) => valueOf(o) >= 100)).toBe(true);
    }
  });

  it("2.15.2: primes where they belong - and an odd number that isn't one", () => {
    for (const p of all<SortGroupsProblem>("2.15.2")) {
      p.items.forEach((o, i) => expect(p.answer[i], String(valueOf(o))).toBe(isPrime(valueOf(o)) ? 0 : 1));
      expect(p.items.some((o) => valueOf(o) % 2 === 1 && valueOf(o) > 1 && !isPrime(valueOf(o)))).toBe(true);
    }
  });

  it("2.6.7: less than, equal to, more than a half - with a half among them", () => {
    for (const p of all<SortGroupsProblem>("2.6.7")) {
      p.items.forEach((o, i) => expect(p.answer[i]).toBe(valueOf(o) < 0.5 ? 0 : valueOf(o) === 0.5 ? 1 : 2));
    }
  });

  it("0.4.1 and 1.2.5: shapes by shape or colour; plane figures and solids", () => {
    for (const p of all<SortGroupsProblem>("0.4.1")) {
      const byShape = p.prompt.key.endsWith("byShape");
      p.items.forEach((o, i) => {
        const item = ("scene" in o && o.scene.kind === "pattern" ? o.scene.items[0] : null)!;
        const group = (p.groups[p.answer[i]] as { text: { key: string } }).text.key;
        expect(group.endsWith(`.${byShape ? item.shape : item.color}`)).toBe(true);
      });
    }
    for (const p of all<SortGroupsProblem>("1.2.5")) {
      p.items.forEach((o, i) => {
        const shape = "scene" in o && o.scene.kind === "shape" ? o.scene.shape : null;
        expect(p.answer[i]).toBe(PLANE_SHAPES.includes(shape as never) ? 0 : 1);
      });
    }
  });

  it("3.1.5: rational or irrational - roots of squares and 3,14 are rational, other roots and π aren't", () => {
    for (const p of all<SortGroupsProblem>("3.1.5")) {
      p.items.forEach((o, i) => {
        const l = (o as { latex: string }).latex;
        const root = l.match(/^\\sqrt\{(\d+)\}$/);
        const irrational = l.includes("\\pi") || (root !== null && !Number.isInteger(Math.sqrt(Number(root[1]))));
        expect(p.answer[i], l).toBe(irrational ? 1 : 0);
      });
    }
  });
});

describe("putting in order", () => {
  it("the answer is every thing once, strictly in order of value - up or down as asked", () => {
    for (const stage of orderLevels) {
      for (const p of all<SortOrderProblem>(stage)) {
        expect([...p.answer].sort((a, b) => a - b), stage).toEqual(p.items.map((_, i) => i));
        const values = p.answer.map((i) => valueOf(p.items[i]));
        const down = p.ends[0].key.endsWith("biggest");
        for (let k = 1; k < values.length; k++) expect(down ? values[k] < values[k - 1] : values[k] > values[k - 1], `${stage}: ${values}`).toBe(true);
      }
    }
  });

  it("2.9.8: every length in a unit of its own", () => {
    for (const p of all<SortOrderProblem>("2.9.8")) {
      const units = p.items.map((o) => (o as { plain: string }).plain.split(" ").at(-1));
      expect(new Set(units).size).toBe(units.length);
    }
  });
});
