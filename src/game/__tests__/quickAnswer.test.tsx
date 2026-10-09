// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BASIC_GENERATORS, tableChoices } from "../../engine/questions/written/basicTopics";
import { makeRng } from "../../engine/rng";
import { QuickAnswer } from "../questions/written/QuickAnswer";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
afterEach(() => {
  act(() => root?.unmount());
  root = null;
  document.body.innerHTML = "";
  localStorage.clear();
});

function mount(answer: number, choices: number[], onSolved: (o: unknown) => void) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root!.render(<QuickAnswer answer={answer} choices={choices} level={1} onSolved={onSolved} />));
  return host;
}
// Buttons in the question - or in the sheet at the bottom of the screen ("Nästa →").
const press = (_host: HTMLElement, text: string) =>
  act(() => [...document.body.querySelectorAll("button")].find((b) => b.textContent?.trim() === text || b.textContent?.trim() === `${text} →`)!.dispatchEvent(new MouseEvent("click", { bubbles: true })));

describe("the times tables: just the answer", () => {
  it("every question offers the answer and three slips - all different", () => {
    const rng = makeRng(7);
    for (let i = 0; i < 300; i++) {
      const p = BASIC_GENERATORS["1.4.1"](rng);
      expect(p.answerOnly).toBeDefined();
      const choices = p.answerOnly!.choices;
      expect(choices).toHaveLength(4);
      expect(new Set(choices).size).toBe(4);
      expect(p.answer.kind === "value" && choices.includes(p.answer.value)).toBe(true);
    }
  });

  it("the slips are the neighbouring facts: 7 · 9, 8 · 8 and 7 · 7 for 7 · 8", () => {
    expect(tableChoices(makeRng(1), 7, 8).sort((a, b) => a - b)).toEqual([49, 56, 63, 64]);
  });

  it("picking the right one reports it at once", () => {
    const onSolved = vi.fn();
    const host = mount(56, [49, 56, 63, 64], onSolved);
    press(host, "56");
    expect(onSolved).toHaveBeenCalledTimes(1);
    expect(onSolved.mock.calls[0][0]).toMatchObject({ helped: false, wrongFirstAttempts: 0 });
  });

  it("two wrong picks show the answer - and that counts as help", () => {
    const onSolved = vi.fn();
    const host = mount(56, [49, 56, 63, 64], onSolved);
    press(host, "49");
    expect(host.textContent).toContain("försök igen");
    press(host, "63");
    expect(host.textContent).toContain("Svaret är 56");
    press(host, "Nästa");
    expect(onSolved.mock.calls[0][0]).toMatchObject({ helped: true });
  });

  it("can be answered by writing instead - and remembers the choice", () => {
    const host = mount(56, [49, 56, 63, 64], () => {});
    press(host, "Skriv svaret");
    expect(host.querySelector("svg")).not.toBeNull();
    expect(localStorage.getItem("matteaventyret-quickmode")).toBe("write");
  });
});
