import { describe, expect, it } from "vitest";
import { buildGraph as buildAdd, checkAll as checkAddAll } from "../methods/columnAdd";
import { buildGraph as buildSub, checkAll as checkSubAll } from "../methods/columnSub";
import { assembleAnswer } from "./testHelpers";
import type { WrittenMap } from "../types";

describe("exhaustive: every pair of 2-digit operands (0-99)", () => {
  it("addition always assembles to top + bottom, and checkAll accepts the true digits", () => {
    for (let top = 0; top <= 99; top++) {
      for (let bottom = 0; bottom <= 99; bottom++) {
        const graph = buildAdd({ top, bottom });
        expect(assembleAnswer(graph)).toBe(top + bottom);

        const written: WrittenMap = {};
        for (const cell of graph.cells) {
          if (cell.expected !== null) written[cell.id] = cell.expected;
        }
        const report = checkAddAll({ top, bottom }, written);
        expect(report.allCorrect, `add ${top}+${bottom}`).toBe(true);
        expect(report.errorCount).toBe(0);
      }
    }
  });

  it("subtraction (top >= bottom) always assembles to top - bottom, and checkAll accepts the true digits", () => {
    for (let top = 0; top <= 99; top++) {
      for (let bottom = 0; bottom <= top; bottom++) {
        const graph = buildSub({ top, bottom });
        expect(assembleAnswer(graph)).toBe(top - bottom);

        const written: WrittenMap = {};
        for (const cell of graph.cells) {
          if (cell.expected !== null) written[cell.id] = cell.expected;
        }
        const report = checkSubAll({ top, bottom }, written);
        expect(report.allCorrect, `sub ${top}-${bottom}`).toBe(true);
        expect(report.errorCount).toBe(0);
      }
    }
  });
});
