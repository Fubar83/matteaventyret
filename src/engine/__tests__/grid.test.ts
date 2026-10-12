import { describe, expect, it } from "vitest";
import { checkCells, checkPoints, GRID_QUESTIONS, type GridCellsProblem, type GridPointsProblem, type GridStageId } from "../questions/grid";
import { makeRng } from "../rng";

const LEVELS = Object.keys(GRID_QUESTIONS.levels) as GridStageId[];
const all = (stage: GridStageId) => {
  const rng = makeRng(1);
  return Array.from({ length: 300 }, () => GRID_QUESTIONS.levels[stage](rng));
};
const key = (c: [number, number]) => `${c[0]},${c[1]}`;

describe("drawing on a grid", () => {
  it("the solution passes its own check; nothing at all doesn't", () => {
    for (const stage of LEVELS) {
      for (const p of all(stage)) {
        if (p.kind === "gridCells") {
          expect(checkCells(p, p.solution).ok, stage).toBe(true);
          expect(checkCells(p, []).ok, stage).toBe(false);
          for (const [c, r] of [...p.given, ...p.solution]) expect(c >= 0 && c < p.w && r >= 0 && r < p.h, stage).toBe(true);
        } else {
          expect(checkPoints(p, p.answer).ok, stage).toBe(true);
          expect(checkPoints(p, []).ok, stage).toBe(false);
          for (const [x, y] of [...p.answer, ...p.shown.flatMap((f) => f.points)]) expect(x >= p.x[0] && x <= p.x[1] && y >= p.y[0] && y <= p.y[1], stage).toBe(true);
        }
      }
    }
  });

  it("1.2.6: given and solution are mirror images across the line, apart from each other", () => {
    for (const p of all("1.2.6") as GridCellsProblem[]) {
      const { dir, at } = p.line!;
      const mirror = ([c, r]: [number, number]): [number, number] => (dir === "vertical" ? [2 * at - 1 - c, r] : [c, 2 * at - 1 - r]);
      expect(new Set(p.solution.map(key))).toEqual(new Set(p.given.map(mirror).map(key)));
      expect(p.solution.some((c) => p.given.some((g) => key(g) === key(c)))).toBe(false);
      // One square short is caught, and so is one too many.
      expect(checkCells(p, p.solution.slice(1)).ok).toBe(false);
    }
  });

  it("1.9.4, 2.6.9: the count is the fraction or percent of the squares", () => {
    for (const p of [...all("1.9.4"), ...all("2.6.9")] as GridCellsProblem[]) {
      const n = (p.rule as { n: number }).n;
      const share = p.display!.startsWith("\\dfrac") ? p.display!.match(/\{(\d+)\}\{(\d+)\}/)!.slice(1).map(Number).reduce((s, q) => s / q) : Number(p.display!.split("\\")[0]) / 100;
      expect(n).toBe(Math.round(p.w * p.h * share));
      expect(checkCells(p, p.solution.slice(1)).ok).toBe(false);
    }
  });

  it("2.4.5: a rectangle of the area (and perimeter) passes; an L-shape or the wrong perimeter doesn't", () => {
    for (const p of all("2.4.5") as GridCellsProblem[]) {
      const rule = p.rule as { area: number; perimeter?: number };
      expect(p.solution).toHaveLength(rule.area);
      // A rectangle turned round is just as right.
      expect(checkCells(p, p.solution.map(([c, r]) => [r, c])).ok).toBe(true);
      // One square moved to make an L: not a rectangle.
      const l = [...p.solution.slice(0, -1), [9, 7] as [number, number]];
      expect(checkCells(p, l).why?.key).toBe("grid.why.notRectangle");
      if (rule.perimeter !== undefined && rule.area > 2) {
        // A 1-wide strip of the same area has another perimeter.
        const strip = Array.from({ length: rule.area }, (_, i) => [i % 10, Math.floor(i / 10)] as [number, number]);
        if (rule.area <= 10) expect(checkCells(p, strip).ok).toBe(false);
      }
    }
  });

  it("2.13.2, 3.4.12: the slips are wrong, and caught as what they are", () => {
    for (const p of [...all("2.13.2"), ...all("3.4.12")] as GridPointsProblem[]) {
      for (const s of p.slips) {
        const verdict = checkPoints(p, s.points);
        expect(verdict.ok).toBe(false);
        expect(verdict.why).toEqual(s.why);
      }
    }
  });

  it("3.4.12: a reflection changes one sign; a move adds the same to every corner", () => {
    for (const p of all("3.4.12") as GridPointsProblem[]) {
      const from = p.shown[0].points;
      const to = p.answer;
      const d = from.map(([x, y], i) => [to[i][0] - x, to[i][1] - y]);
      if (p.prompt.key.endsWith("translate")) expect(new Set(d.map((v) => v.join(","))).size).toBe(1);
      else expect(from.every(([x, y], i) => (to[i][0] === -x && to[i][1] === y) || (to[i][0] === x && to[i][1] === -y))).toBe(true);
    }
  });
});
