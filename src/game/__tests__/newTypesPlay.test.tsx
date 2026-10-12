// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { GeneratedProblem } from "../../engine/generator";
import { applyStep, BALANCE_QUESTIONS, solvedValue, type BalanceStageId, type BalanceStep, type Pan } from "../../engine/questions/balance";
import { BLOCKS_QUESTIONS, blocksOf, type BlocksStageId } from "../../engine/questions/blocks";
import { CONSTRUCT_QUESTIONS, thirdCorner, type ConstructStageId } from "../../engine/questions/construct";
import { afterQuestion, EXPERIMENT_QUESTIONS, runExperiment, type ExperimentStageId } from "../../engine/questions/experiment";
import { MATCH_QUESTIONS, type MatchStageId } from "../../engine/questions/match";
import { makeRng } from "../../engine/rng";
import { t } from "../../i18n";
import { QuestionPlayer } from "../questions/QuestionPlayer";
import type { QuestionOutcome } from "../questions/questionOutcome";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// jsdom lays nothing out: a picture's box is its viewBox, so a tap at (x, y) lands at (x, y) in the drawing.
const realBox = Element.prototype.getBoundingClientRect;
beforeAll(() => {
  Element.prototype.getBoundingClientRect = function () {
    const [, , w, h] = (this.getAttribute("viewBox") ?? "0 0 100 100").split(" ").map(Number);
    return { left: 0, top: 0, width: w, height: h, right: w, bottom: h, x: 0, y: 0, toJSON: () => ({}) } as DOMRect;
  };
});
afterAll(() => {
  Element.prototype.getBoundingClientRect = realBox;
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
const click = (el: Element, x = 0, y = 0) => act(() => void el.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: x, clientY: y })));
const byText = (page: Element, text: string) => [...page.querySelectorAll("button")].find((b) => b.textContent?.includes(text))!;
const check = (page: Element) => click(byText(page, t("sort.check")));
const next = () => click(byText(document.body, t("ui.next")));
const unmount = (page: Element) => {
  act(() => root?.unmount());
  root = null;
  page.remove();
};

/** Plays a question twice: right at once (★★★), and wrong until the answer is shown (help counted). */
function playBoth(problem: GeneratedProblem, right: (page: Element) => void, wrong: (page: Element) => void, label: string) {
  let outcome: QuestionOutcome | null = null;
  let page = render(problem, (o) => (outcome = o));
  expect(page.textContent, label).not.toMatch(/\b(match|blocks|balance|exp|construct|sort)\.[a-zA-Z.]+/);
  right(page);
  expect(outcome, label).toEqual(expect.objectContaining({ helped: false, fullSetup: true }));
  unmount(page);
  outcome = null;
  page = render(problem, (o) => (outcome = o));
  wrong(page);
  next();
  expect(outcome, label).toEqual(expect.objectContaining({ helped: true }));
  unmount(page);
}

describe("the new types on screen", () => {
  it("matching pairs", () => {
    for (const stage of Object.keys(MATCH_QUESTIONS.levels) as MatchStageId[]) {
      const p = MATCH_QUESTIONS.levels[stage](makeRng(2));
      const cards = (page: Element) => [...page.querySelectorAll(`[aria-label="${t("match.cards")}"] button`)];
      playBoth(
        p,
        (page) => {
          for (let pair = 0; pair < p.cards.length / 2; pair++) {
            const [a, b] = p.cards.map((c, i) => (c.pair === pair ? i : -1)).filter((i) => i >= 0);
            click(cards(page)[a]);
            click(cards(page)[b]);
          }
        },
        (page) => {
          const other = p.cards.findIndex((c) => c.pair !== p.cards[0].pair);
          for (const _ of [1, 2, 3]) {
            click(cards(page)[0]);
            click(cards(page)[other]);
          }
        },
        stage
      );
    }
  });

  it("building with blocks", () => {
    for (const stage of Object.keys(BLOCKS_QUESTIONS.levels) as BlocksStageId[]) {
      for (const seed of [1, 2, 3]) {
        const p = BLOCKS_QUESTIONS.levels[stage](makeRng(seed));
        const target = blocksOf(p.places, p.target);
        const place = (page: Element, i: number) => page.querySelector(`[data-place="${p.places[i]}"]`)!;
        const button = (page: Element, i: number, label: string) => [...place(page, i).querySelectorAll("button")].find((b) => b.textContent?.trim() === label || b.getAttribute("aria-label")?.startsWith(label))!;
        playBoth(
          p,
          (page) => {
            const counts = [...p.start];
            if (p.mode === "build") target.forEach((n, i) => Array.from({ length: n }, () => click(button(page, i, t("blocks.add", { place: t(`blocks.place.${p.places[i]}`) })))));
            else {
              // From the biggest place down: what's too much is changed into ten of the next, and at the end taken away.
              for (let i = 0; i < counts.length; i++)
                while (counts[i] > target[i]) {
                  if (i < counts.length - 1) {
                    click(page.querySelector(`[data-break="${p.places[i]}"]`)!);
                    counts[i]--;
                    counts[i + 1] += 10;
                  } else {
                    click(button(page, i, t("blocks.remove", { place: t(`blocks.place.${p.places[i]}`) })));
                    counts[i]--;
                  }
                }
            }
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

  it("the equation balance", () => {
    const candidates: BalanceStep[] = [{ op: "takeX" }, { op: "take", n: 10 }, { op: "take", n: 5 }, { op: "take", n: 1 }, ...[2, 3, 4, 5, 6].map((by) => ({ op: "share" as const, by }))];
    const id = (s: BalanceStep) => (s.op === "takeX" ? "takeX" : s.op === "take" ? `take${s.n}` : `share${s.by}`);
    for (const stage of Object.keys(BALANCE_QUESTIONS.levels) as BalanceStageId[]) {
      for (const seed of [1, 2, 3]) {
        const p = BALANCE_QUESTIONS.levels[stage](makeRng(seed));
        playBoth(
          p,
          (page) => {
            let pans: [Pan, Pan] = [p.left, p.right];
            for (let i = 0; i < 60 && solvedValue(pans) === null; i++) {
              const [a, b] = pans;
              // x off both while both have some; then weights off the side with the x's; then share.
              const want: BalanceStep[] = a.x > 0 && b.x > 0 ? [{ op: "takeX" }] : (a.x > 0 ? a.n : b.n) > 0 ? [{ op: "take", n: 10 }, { op: "take", n: 5 }, { op: "take", n: 1 }] : [{ op: "share", by: Math.max(a.x, b.x) }];
              const step = want.find((s) => !("why" in applyStep(pans, s)))!;
              click(page.querySelector(`[data-step="${id(step)}"]`)!);
              pans = (applyStep(pans, step) as { pans: [Pan, Pan] }).pans;
            }
          },
          (page) => {
            const bad = candidates.find((s) => "why" in applyStep([p.left, p.right], s))!;
            for (const _ of [1, 2, 3]) click(page.querySelector(`[data-step="${id(bad)}"]`)!);
          },
          `${stage} seed ${seed}`
        );
      }
    }
  });

  it("the balance tips when something comes off one pan, and levels when the same comes off the other", () => {
    // A question with a 1-weight on both pans.
    const seed = [...Array(100).keys()].find((s) => {
      const q = BALANCE_QUESTIONS.levels["3.3.10"](makeRng(s + 1));
      return q.left.n % 5 > 0 && q.right.n % 5 > 0;
    })!;
    const p = BALANCE_QUESTIONS.levels["3.3.10"](makeRng(seed + 1));
    const page = render(p, () => {});
    const lines = () => page.querySelectorAll(`[aria-label="${t("balance.steps")}"] li`).length;
    // The pans' things, the left pan's first: lift a 1 off the side with the weights only.
    const weightsSide = p.left.x === 0 ? 0 : 1;
    const things = [...page.querySelectorAll("[data-thing]")];
    const leftCount = p.left.x + Math.floor(p.left.n / 10) + Math.floor((p.left.n % 10) / 5) + (p.left.n % 5);
    const side = (s: number) => (s === 0 ? things.slice(0, leftCount) : things.slice(leftCount));
    const one = (s: number) => side(s).find((el) => el.getAttribute("data-thing") === "1");
    expect(one(weightsSide) && one(1 - weightsSide)).toBeTruthy();
    {
      click(one(weightsSide)!);
      expect(page.textContent).toContain(t("balance.tipped"));
      expect(lines()).toBe(1);
      // The other pan's things, after the first changed.
      const again = [...page.querySelectorAll("[data-thing]")];
      const otherOne = (weightsSide === 0 ? again.slice(leftCount - 1) : again.slice(0, leftCount)).find((el) => el.getAttribute("data-thing") === "1")!;
      click(otherOne);
      expect(page.textContent).not.toContain(t("balance.tipped"));
      expect(lines()).toBe(2);
    }
    unmount(page);
  });

  it("experiments", () => {
    for (const stage of Object.keys(EXPERIMENT_QUESTIONS.levels) as ExperimentStageId[]) {
      const p = EXPERIMENT_QUESTIONS.levels[stage](makeRng(1));
      const after = afterQuestion(p, runExperiment(p));
      const pick = (page: Element, prompt: string, i: number) => click(page.querySelectorAll(`[role="group"][aria-label="${prompt}"] button`)[i]);
      const run = (page: Element) => {
        for (let k = 0; k < p.throws / 10; k++) click(byText(page, t(p.device.type === "spinner" ? "exp.spin" : "exp.throw", { n: 10 })));
      };
      const promptOf = (x: { prompt: { key: string; vars?: Record<string, string | number> } }) => t(x.prompt.key, x.prompt.vars);
      playBoth(
        p,
        (page) => {
          pick(page, promptOf(p.predict), p.predict.correct);
          run(page);
          pick(page, promptOf(after), after.correct);
        },
        (page) => {
          pick(page, promptOf(p.predict), (p.predict.correct + 1) % p.predict.options.length);
          run(page);
          pick(page, promptOf(after), (after.correct + 1) % after.options.length);
        },
        stage
      );
    }
  });

  it("constructions", () => {
    for (const stage of Object.keys(CONSTRUCT_QUESTIONS.levels) as ConstructStageId[]) {
      for (const seed of [1, 2, 3]) {
        const p = CONSTRUCT_QUESTIONS.levels[stage](makeRng(seed));
        const svg = (page: Element) => page.querySelector("svg.cursor-crosshair")!;
        /** Where in the drawing to tap for the right answer (and how far off for a wrong one). */
        const at = (off: number): [number, number] => {
          if (p.task === "line") return [16 + (p.start + p.length + off) * 26, 30];
          if (p.task === "angle") {
            const theta = (p.base === "right" ? p.degrees : 180 - p.degrees) + off * 30;
            return [180 + 100 * Math.cos((theta * Math.PI) / 180), 180 - 100 * Math.sin((theta * Math.PI) / 180)];
          }
          const [x, y] = thirdCorner(p);
          return [34 + (x + off) * 34, 9 * 34 - 20 - y * 34];
        };
        playBoth(
          p,
          (page) => {
            click(svg(page), ...at(0));
            check(page);
          },
          (page) => {
            click(svg(page), ...at(1));
            check(page);
            check(page);
          },
          `${stage} seed ${seed}`
        );
      }
    }
  });
});
