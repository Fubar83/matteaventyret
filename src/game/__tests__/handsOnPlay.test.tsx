// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GeneratedProblem } from "../../engine/generator";
import { PARAMS, GRAPH_SHAPE_QUESTIONS, type GraphShapeStageId } from "../../engine/questions/graphShape";
import { PYRAMID_QUESTIONS, type PyramidStageId } from "../../engine/questions/pyramid";
import { SHARE_OUT_QUESTIONS, type ShareOutStageId } from "../../engine/questions/shareOut";
import { TEN_FRAME_QUESTIONS, type TenFrameStageId } from "../../engine/questions/tenFrame";
import { branches, TREE_QUESTIONS, value, type TreeStageId } from "../../engine/questions/tree";
import { makeRng } from "../../engine/rng";
import { t } from "../../i18n";
import { QuestionPlayer } from "../questions/QuestionPlayer";
import type { QuestionOutcome } from "../questions/questionOutcome";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// The drawing board can't be written on here: a button stands in, "writing" whatever the test sets.
const written = vi.hoisted(() => ({ next: 0 }));
vi.mock("../draw/AnswerBoard", async () => {
  const { createElement } = await import("react");
  return { AnswerBoard: ({ onSubmit }: { onSubmit: (n: number) => void }) => createElement("button", { type: "button", "data-board": "", onClick: () => onSubmit(written.next) }) };
});

let root: Root | null = null;
afterEach(() => {
  act(() => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});
function render(problem: GeneratedProblem, onSolved: (o: QuestionOutcome) => void) {
  const page = document.createElement("div");
  document.body.appendChild(page);
  root = createRoot(page);
  act(() => root!.render(<QuestionPlayer problem={problem} level={1} onSolved={onSolved} />));
  return page;
}
const click = (el: Element) => act(() => void el.dispatchEvent(new MouseEvent("click", { bubbles: true })));
const byText = (page: Element, text: string) => [...page.querySelectorAll("button")].find((b) => b.textContent?.includes(text))!;
const check = (page: Element) => click(byText(page, t("sort.check")));
const q = (page: Element, sel: string) => page.querySelector(sel)!;

/** Right at once (★★★, no help), and wrong until the answer is shown (help counted). */
function playBoth(problem: GeneratedProblem, right: (page: Element) => void, wrong: (page: Element) => void, label: string) {
  let outcome: QuestionOutcome | null = null;
  let page = render(problem, (o) => (outcome = o));
  expect(page.textContent, label).not.toMatch(/\b(tf|share|pyr|tree|gs)\.[a-zA-Z.]+/);
  right(page);
  expect(outcome, label).toEqual(expect.objectContaining({ helped: false, fullSetup: true }));
  act(() => root?.unmount());
  page.remove();
  outcome = null;
  page = render(problem, (o) => (outcome = o));
  wrong(page);
  click(byText(document.body, t("ui.next")));
  expect(outcome, label).toEqual(expect.objectContaining({ helped: true }));
  act(() => root?.unmount());
  root = null;
  page.remove();
}

describe("the hands-on types on screen", () => {
  it("the ten frame", () => {
    for (const stage of Object.keys(TEN_FRAME_QUESTIONS.levels) as TenFrameStageId[]) {
      for (const seed of [1, 2, 3]) {
        const p = TEN_FRAME_QUESTIONS.levels[stage](makeRng(seed));
        const fillTo = (page: Element, n: number) => {
          for (let i = p.given[0]; i < n; i++) click(q(page, `[data-frame="first"] [data-cell="${i}"]`));
        };
        const moveAll = (page: Element) => {
          for (let i = p.given[0]; i < 10; i++) click(q(page, `[data-frame="second"] [data-cell="0"]`));
        };
        playBoth(
          p,
          (page) => {
            if (p.mode === "overTen") {
              moveAll(page);
              expect(q(page, "[data-equation]").textContent).toContain(`10 + ${p.target - 10}`);
              click(q(page, `[data-sum="${p.target}"]`));
            } else fillTo(page, p.target);
            if (p.mode === "toTen") expect(q(page, "[data-equation]").textContent).toContain(`${p.given[0]} + ${10 - p.given[0]} = 10`);
            check(page);
          },
          (page) => {
            if (p.mode === "overTen") {
              moveAll(page);
              click(q(page, `[data-sum="${p.target - 10}"]`));
            }
            check(page);
            check(page);
          },
          `${stage} seed ${seed}`
        );
      }
    }
  });

  it("sharing out", () => {
    for (const stage of Object.keys(SHARE_OUT_QUESTIONS.levels) as ShareOutStageId[]) {
      for (const seed of [1, 2, 3]) {
        const p = SHARE_OUT_QUESTIONS.levels[stage](makeRng(seed));
        playBoth(
          p,
          (page) => {
            for (let k = 0; k < p.each; k++) p.animals.forEach((_, i) => click(q(page, `[data-plate="${i}"]`)));
            check(page);
          },
          (page) => {
            click(q(page, `[data-plate="0"]`));
            check(page);
            check(page);
          },
          `${stage} seed ${seed}`
        );
      }
    }
  });

  it("number pyramids, written brick by brick", () => {
    for (const stage of Object.keys(PYRAMID_QUESTIONS.levels) as PyramidStageId[]) {
      for (const seed of [1, 2, 3]) {
        const p = PYRAMID_QUESTIONS.levels[stage](makeRng(seed));
        const open = p.values.flatMap((row, r) => row.map((v, i) => ({ r, i, v }))).filter(({ r, i }) => !p.shown[r][i]);
        playBoth(
          p,
          (page) => {
            for (const { r, i, v } of open) {
              click(q(page, `[data-brick="${r},${i}"]`));
              written.next = v;
              click(q(page, "[data-board]"));
            }
          },
          (page) => {
            written.next = open[0].v + 1;
            for (const _ of [1, 2, 3]) click(q(page, "[data-board]"));
          },
          `${stage} seed ${seed}`
        );
      }
    }
  });

  it("tree diagrams: cards onto branches, then the question", () => {
    for (const stage of Object.keys(TREE_QUESTIONS.levels) as TreeStageId[]) {
      for (const seed of [1, 2, 3, 4]) {
        const p = TREE_QUESTIONS.levels[stage](makeRng(seed));
        const { first, second } = branches(p);
        const expected = [...first, ...second.flat()];
        const cardFor = (k: number, right: boolean) => p.cards.findIndex((c) => (Math.abs(value(c) - value(expected[k])) < 1e-12) === right);
        const fill = (page: Element, right: boolean) =>
          expected.forEach((_, k) => {
            const branch = q(page, `[data-branch="${k}"]`);
            if (branch.textContent?.includes("?")) {
              click(q(page, `[data-card="${cardFor(k, right)}"]`));
              click(branch);
              click(q(page, `[data-card="${cardFor(k, right)}"]`));
            }
          });
        playBoth(
          p,
          (page) => {
            fill(page, true);
            check(page);
            click(q(page, `[data-after="${p.after.correct}"]`));
          },
          (page) => {
            for (const _ of [1, 2, 3]) {
              fill(page, false);
              check(page);
            }
          },
          `${stage} seed ${seed}`
        );
      }
    }
  });

  it("shaping graphs, number by number", () => {
    for (const stage of Object.keys(GRAPH_SHAPE_QUESTIONS.levels) as GraphShapeStageId[]) {
      for (const seed of [1, 2, 3, 4]) {
        const p = GRAPH_SHAPE_QUESTIONS.levels[stage](makeRng(seed));
        const { names, values } = PARAMS[p.family];
        playBoth(
          p,
          (page) => {
            names.forEach((n, i) => {
              const d = values[i].indexOf(p.target[i]) - values[i].indexOf(p.start[i]);
              for (let k = 0; k < Math.abs(d); k++) click(q(page, `[data-param="${n}"][data-dir="${d > 0 ? "up" : "down"}"]`));
            });
            check(page);
          },
          (page) => {
            check(page);
            check(page);
          },
          `${stage} seed ${seed}`
        );
      }
    }
  });
});
