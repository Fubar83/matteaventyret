// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Celebration, CELEBRATION_MS } from "../Celebration";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
afterEach(() => {
  act(() => root?.unmount());
  root = null;
  document.body.innerHTML = "";
  vi.useRealTimers();
});

function mount(onNext: () => void) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root!.render(<Celebration stars={2} xp={10} onNext={onNext} />));
}

describe("the celebration after a right answer", () => {
  it("shows the praise and stars at the bottom, and goes on by itself after a moment", () => {
    vi.useFakeTimers();
    const onNext = vi.fn();
    mount(onNext);
    const sheet = document.querySelector("[role=dialog]")!;
    expect(sheet.textContent).toMatch(/Rätt!|Snyggt!|Bra jobbat!|Helt rätt!|Toppen!/);
    expect(sheet.textContent).toContain("+10 XP");
    act(() => vi.advanceTimersByTime(CELEBRATION_MS - 100));
    expect(onNext).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(200));
    expect(onNext).toHaveBeenCalledTimes(1);
  });

  it("goes on at once on Nästa - and only once", () => {
    vi.useFakeTimers();
    const onNext = vi.fn();
    mount(onNext);
    const next = [...document.querySelectorAll("button")].find((b) => b.textContent?.includes("Nästa"))!;
    act(() => next.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(onNext).toHaveBeenCalledTimes(1);
    act(() => root!.unmount());
    root = null;
    act(() => vi.advanceTimersByTime(CELEBRATION_MS * 2));
    expect(onNext).toHaveBeenCalledTimes(1);
  });
});
