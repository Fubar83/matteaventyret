// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { DigitCanvas } from "../../game/DigitCanvas";
import { InkCanvas } from "../InkCanvas";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
afterEach(() => {
  act(() => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

function mount(node: React.ReactNode) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root!.render(node));
  return host;
}

/** Whether the browser would be kept from scrolling or zooming on this touch - the finger drawing instead. */
function claimed(el: Element, type: "touchstart" | "touchmove") {
  const e = new Event(type, { bubbles: true, cancelable: true });
  el.dispatchEvent(e);
  return e.defaultPrevented;
}

describe("drawing with a finger", () => {
  it("the board takes the touch for drawing, not for scrolling the page", () => {
    const host = mount(<InkCanvas onStrokesChange={() => {}} />);
    const svg = host.querySelector("svg")!;
    expect(claimed(svg, "touchstart")).toBe(true);
    expect(claimed(svg, "touchmove")).toBe(true);
  });

  it("a switched-off board leaves the page to scroll", () => {
    const host = mount(<InkCanvas onStrokesChange={() => {}} disabled />);
    expect(claimed(host.querySelector("svg")!, "touchmove")).toBe(false);
  });

  it("the small digit cells take the touch too", () => {
    const host = mount(<DigitCanvas onSettled={() => {}} />);
    expect(claimed(host.querySelector("canvas")!, "touchstart")).toBe(true);
  });
});
