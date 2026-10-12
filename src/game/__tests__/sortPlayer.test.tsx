// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { SORT_QUESTIONS, type SortStageId } from "../../engine/questions/sort";
import type { SortProblem } from "../../engine/questions/sort/problem";
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

function render(problem: SortProblem, onSolved: (o: QuestionOutcome) => void) {
  const page = document.createElement("div");
  document.body.appendChild(page);
  root = createRoot(page);
  act(() => root!.render(<QuestionPlayer problem={problem} level={1} onSolved={onSolved} />));
  return page;
}
const click = (el: Element) => act(() => void el.dispatchEvent(new MouseEvent("click", { bubbles: true })));
const tray = (page: Element) => [...page.querySelectorAll(`[aria-label="${t("sort.tray")}"] button`)];
const button = (page: Element, label: string) => [...page.querySelectorAll("button")].find((b) => b.textContent?.includes(label))!;

/** The tray shows the things not yet placed, in their own order: the button for thing `i`. */
function trayButton(page: Element, placed: Set<number>, i: number) {
  const left = [...Array(tray(page).length + placed.size).keys()].filter((k) => !placed.has(k));
  return tray(page)[left.indexOf(i)];
}

/** Places each thing: into `groupOf(i)`, or (in order) the things in `order`. */
function place(page: Element, problem: SortProblem, choose: (i: number) => number, order: number[]) {
  const placed = new Set<number>();
  if (problem.kind === "sortGroups") {
    const boxes = [...page.querySelectorAll('div[role="button"]')];
    for (let i = 0; i < problem.items.length; i++) {
      click(trayButton(page, placed, i));
      click(boxes[choose(i)]);
      placed.add(i);
    }
  } else {
    for (const i of order) {
      click(trayButton(page, placed, i));
      placed.add(i);
    }
  }
}

const LEVELS = Object.keys(SORT_QUESTIONS.levels) as SortStageId[];

describe("sorting on screen", () => {
  it("sorted right at the first check, every level is solved with all the stars", () => {
    for (const stage of LEVELS) {
      for (const seed of [1, 2, 3]) {
        const problem = SORT_QUESTIONS.levels[stage](makeRng(seed));
        let outcome: QuestionOutcome | null = null;
        const page = render(problem, (o) => (outcome = o));
        // A key shown instead of its text would mean a missing translation.
        expect(page.textContent, `${stage} seed ${seed}`).not.toMatch(/\b(sort|choice|shape|color)\.[a-zA-Z0-9.-]+/);
        place(page, problem, (i) => (problem.kind === "sortGroups" ? problem.answer[i] : 0), problem.answer);
        click(button(page, t("sort.check")));
        expect(outcome, `${stage} seed ${seed}`).toEqual(expect.objectContaining({ helped: false, fullSetup: true }));
        act(() => root?.unmount());
        root = null;
        page.remove();
      }
    }
  });

  it("sorted wrong twice, the answer is shown, and Nästa moves on with help counted", () => {
    for (const stage of LEVELS) {
      const problem = SORT_QUESTIONS.levels[stage](makeRng(4));
      let outcome: QuestionOutcome | null = null;
      const page = render(problem, (o) => (outcome = o));
      // Everything in the first group - or the order backwards: never right.
      const wrongOnce = () => place(page, problem, () => 0, [...problem.answer].reverse());
      wrongOnce();
      click(button(page, t("sort.check")));
      expect(outcome, stage).toBeNull();
      // The wrong ones are back in the tray: put them wrong again (the right ones stay).
      const back = tray(page).length;
      expect(back, stage).toBeGreaterThan(0);
      if (problem.kind === "sortGroups") {
        const boxes = [...page.querySelectorAll('div[role="button"]')];
        while (tray(page).length > 0) {
          click(tray(page)[0]);
          click(boxes[0]);
        }
      } else {
        // Backwards, the first one is already wrong: everything came back, so backwards again.
        expect(back, stage).toBe(problem.items.length);
        wrongOnce();
      }
      click(button(page, t("sort.check")));
      click(button(document.body, t("ui.next")));
      expect(outcome, stage).toEqual(expect.objectContaining({ helped: true, fullSetup: false }));
      act(() => root?.unmount());
      root = null;
      page.remove();
    }
  });
});
