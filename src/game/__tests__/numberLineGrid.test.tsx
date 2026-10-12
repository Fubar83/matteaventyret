// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { GRID_QUESTIONS, type GridProblem, type GridStageId } from "../../engine/questions/grid";
import { NUMBER_LINE_QUESTIONS, type NumberLineProblem, type NumberLineStageId } from "../../engine/questions/numberLine";
import { makeRng } from "../../engine/rng";
import { t } from "../../i18n";
import { QuestionPlayer } from "../questions/QuestionPlayer";
import type { QuestionOutcome } from "../questions/questionOutcome";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
afterEach(() => {
  act(() => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

function render(problem: NumberLineProblem | GridProblem, onSolved: (o: QuestionOutcome) => void) {
  const page = document.createElement("div");
  document.body.appendChild(page);
  root = createRoot(page);
  act(() => root!.render(<QuestionPlayer problem={problem} level={1} onSolved={onSolved} />));
  return page;
}
const click = (el: Element) => act(() => void el.dispatchEvent(new MouseEvent("click", { bubbles: true })));
const check = (page: Element) => click([...page.querySelectorAll("button")].find((b) => b.textContent === t("sort.check"))!);
const next = () => click([...document.body.querySelectorAll("button")].find((b) => b.textContent?.includes(t("ui.next")))!);
const unmount = (page: Element) => {
  act(() => root?.unmount());
  root = null;
  page.remove();
};
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
/** The tap target nearest a value on the line. */
const lineTarget = (page: Element, v: number) =>
  [...page.querySelectorAll("[data-at]")].reduce((best, el) => (Math.abs(Number(el.getAttribute("data-at")) - v) < Math.abs(Number(best.getAttribute("data-at")) - v) ? el : best));

/** Answers a grid question: these squares or points tapped. */
function tapGrid(page: Element, p: GridProblem, answer: [number, number][]) {
  for (const c of answer) click(page.querySelector(p.kind === "gridCells" ? `[data-cell="${c[0]},${c[1]}"]` : `[data-point="${c[0]},${c[1]}"]`)!);
}

describe("the number line on screen", () => {
  it("tapped at the number, every level is solved with all the stars; tapped wrong twice, the place is shown", () => {
    for (const stage of Object.keys(NUMBER_LINE_QUESTIONS.levels) as NumberLineStageId[]) {
      for (const seed of [1, 2, 3]) {
        const p = NUMBER_LINE_QUESTIONS.levels[stage](makeRng(seed));
        let outcome: QuestionOutcome | null = null;
        let page = render(p, (o) => (outcome = o));
        expect(page.textContent, stage).not.toMatch(/\b(line|sort)\.[a-zA-Z.]+/);
        click(lineTarget(page, p.value));
        check(page);
        expect(outcome, `${stage} seed ${seed}`).toEqual(expect.objectContaining({ helped: false, fullSetup: true }));
        unmount(page);

        // The far end of the line, twice - too far one way.
        outcome = null;
        page = render(p, (o) => (outcome = o));
        const far = near(p.value, p.from) || p.value - p.from < p.to - p.value ? p.to : p.from;
        for (const _ of [1, 2]) {
          click(lineTarget(page, far));
          check(page);
        }
        next();
        expect(outcome, `${stage} seed ${seed}`).toEqual(expect.objectContaining({ helped: true }));
        unmount(page);
      }
    }
  });
});

describe("the grid on screen", () => {
  it("drawn right, every level is solved with all the stars; drawn wrong twice, the answer is shown", () => {
    for (const stage of Object.keys(GRID_QUESTIONS.levels) as GridStageId[]) {
      for (const seed of [1, 2, 3]) {
        const p = GRID_QUESTIONS.levels[stage](makeRng(seed));
        let outcome: QuestionOutcome | null = null;
        let page = render(p, (o) => (outcome = o));
        expect(page.textContent, stage).not.toMatch(/\b(grid|sort)\.[a-zA-Z.]+/);
        tapGrid(page, p, p.kind === "gridCells" ? p.solution : p.answer);
        check(page);
        expect(outcome, `${stage} seed ${seed}`).toEqual(expect.objectContaining({ helped: false, fullSetup: true }));
        unmount(page);

        // One square or point short - wrong, and still wrong at the second check.
        outcome = null;
        page = render(p, (o) => (outcome = o));
        tapGrid(page, p, (p.kind === "gridCells" ? p.solution : p.answer).slice(1));
        if ((p.kind === "gridCells" ? p.solution : p.answer).length === 1) tapGrid(page, p, [p.kind === "gridCells" ? [p.w - 1, p.h - 1] : [p.x[1], p.y[1]]]);
        check(page);
        expect(outcome, `${stage} seed ${seed}`).toBeNull();
        check(page);
        next();
        expect(outcome, `${stage} seed ${seed}`).toEqual(expect.objectContaining({ helped: true }));
        unmount(page);
      }
    }
  });
});
