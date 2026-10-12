// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { generateProblem, type StageId } from "../../engine/generator";
import { CHOICE_QUESTIONS } from "../../engine/questions/choice";
import { makeRng } from "../../engine/rng";
import { QuestionPlayer } from "../questions/QuestionPlayer";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
afterEach(() => {
  act(() => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

function render(stage: StageId, seed: number) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(<QuestionPlayer problem={generateProblem(stage, makeRng(seed))} level={1} onSolved={() => {}} />));
  return container;
}

/** Every single-choice level, förskoleklass to åk 9. */
const CHOICE_LEVELS = Object.keys(CHOICE_QUESTIONS.levels) as StageId[];

describe("the new questions on screen", () => {
  it("every single-choice level shows its options as buttons, with no text left untranslated", () => {
    for (const stage of CHOICE_LEVELS) {
      for (let seed = 1; seed <= 8; seed++) {
        const page = render(stage, seed);
        const options = page.querySelectorAll('[role="group"] button');
        expect(options.length, `${stage} seed ${seed}`).toBeGreaterThanOrEqual(2);
        // A key shown instead of its text ("choice.compare.tip") would mean a missing translation.
        expect(page.textContent, `${stage} seed ${seed}`).not.toMatch(/\b(choice|shape|scene|weekday|month|color|fraction|decimalPlace|code|countThing|animal|thing|ordinal|where|fruit|sport|graph)\.[a-zA-Z0-9.-]+/);
        act(() => root?.unmount());
        root = null;
        page.remove();
      }
    }
  });

  it("the pictures draw: a number line, a ruler, a thermometer, a robot grid with its program", () => {
    const has = (stage: StageId, seed: number, selector: string) => {
      const page = render(stage, seed);
      const found = page.querySelector(selector) !== null;
      act(() => root?.unmount());
      root = null;
      page.remove();
      return found;
    };
    expect(has("1.8.1", 1, 'svg[role="img"] path[fill="#e11d48"]')).toBe(true); // the arrow
    expect(has("1.10.1", 1, 'svg[role="img"] rect[fill="#fef9c3"]')).toBe(true); // the ruler
    expect(has("1.12.1", 1, 'svg[role="img"]')).toBe(true);
    expect(has("2.8.4", 1, ".tracking-wide")).toBe(true); // the pictogram's rows
    expect(has("2.8.5", 1, "polyline")).toBe(true); // the line chart's line
  });
});
