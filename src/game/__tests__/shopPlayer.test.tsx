// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeRng } from "../../engine/rng";
import { SHOP_QUESTIONS, type ShopProblem } from "../../engine/questions/shop";
import type { QuestionOutcome } from "../questions/questionOutcome";
import { ShopPlayer } from "../questions/shop/ShopPlayer";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = "";
});

function mount(problem: ShopProblem, onSolved: (o: QuestionOutcome) => void) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root!.render(<ShopPlayer problem={problem} onSolved={onSolved} />));
  return host;
}

const buttons = (host: HTMLElement, label: string) => [...host.querySelectorAll("button")].filter((b) => b.getAttribute("aria-label") === label || b.textContent?.trim() === label);
const click = (el: Element) => act(() => (el as HTMLElement).click());
const bubble = (host: HTMLElement) => host.querySelector('[role="status"]')?.textContent ?? "";

describe("the shop", () => {
  it("at the till: too little change gets a puzzled customer, the right change a thank-you and the question solved", () => {
    const problem: ShopProblem = { ...SHOP_QUESTIONS.levels["1.6.3"](makeRng(3)) };
    const onSolved = vi.fn();
    const host = mount(problem, onSolved);
    // The till holds every coin and note; give back one coin too few first.
    const change = problem.change;
    const pieces: number[] = [];
    for (const v of [50, 20, 10, 5, 2, 1]) while (pieces.reduce((a, b) => a + b, 0) + v <= change) pieces.push(v);
    const tillButton = (v: number) => host.querySelector(`.grid button[aria-label="${v} kr"]`)!;
    for (const v of pieces.slice(0, -1)) click(tillButton(v));
    click(buttons(host, "Ge tillbaka")[0]);
    expect(bubble(host)).toMatch(/mer/);
    expect(onSolved).not.toHaveBeenCalled();
    click(tillButton(pieces.at(-1)!));
    click(buttons(host, "Ge tillbaka")[0]);
    expect(bubble(host)).toMatch(/Tack/);
    expect(onSolved).toHaveBeenCalledWith(expect.objectContaining({ helped: false, wrongFirstAttempts: 1 }));
  });

  it("paying: too much is too much - and a coin tapped on the tray goes back to the wallet", () => {
    const problem = SHOP_QUESTIONS.levels["1.6.2"](makeRng(3));
    const onSolved = vi.fn();
    const host = mount(problem, onSolved);
    // Everything in the wallet is more than the price.
    const wallet = () => [...host.querySelectorAll("button")].filter((b) => !b.disabled && /^\d+ kr$/.test(b.getAttribute("aria-label") ?? "") && !b.closest('[aria-label="Brickan på disken"]'));
    for (const b of wallet()) click(b);
    click(buttons(host, "Betala")[0]);
    expect(bubble(host)).toMatch(/för mycket/);
    const onTray = () => [...host.querySelectorAll('[aria-label="Brickan på disken"] button')];
    const before = onTray().length;
    click(onTray()[0]);
    expect(onTray().length).toBe(before - 1);
  });

  it("from the shopping list: picking something not on it gets a word from the shopkeeper", () => {
    const problem = SHOP_QUESTIONS.levels["1.6.4"](makeRng(5));
    const host = mount(problem, vi.fn());
    const other = problem.shelf.find((x) => !problem.buy.includes(x.id))!;
    const shelfButton = [...host.querySelectorAll("button")].find((b) => b.getAttribute("aria-label")?.endsWith(`${other.price} kr`) && b.textContent?.includes(other.emoji))!;
    click(shelfButton);
    expect(bubble(host)).toMatch(/står inte på din lista/);
  });

  it("help to the end lays the answer out, and the question counts as helped", () => {
    const problem = SHOP_QUESTIONS.levels["1.6.2"](makeRng(7));
    const onSolved = vi.fn();
    const host = mount(problem, onSolved);
    for (let i = 0; i < 3; i++) {
      const help = [...host.querySelectorAll("button")].find((b) => /hjälp/i.test(b.textContent ?? ""));
      if (help) click(help);
    }
    // "Nästa" is in the sheet at the bottom of the screen, outside the question itself.
    const next = [...document.body.querySelectorAll("button")].find((b) => b.textContent?.trim().startsWith("Nästa"))!;
    expect(next).toBeTruthy();
    click(next);
    expect(onSolved).toHaveBeenCalledWith(expect.objectContaining({ helped: true, miniTutorialUsed: true }));
  });
});
