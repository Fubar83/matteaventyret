// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import type { QuestionScene as Scene } from "../../engine/questionScene";
import { BaseTenBlocks } from "../scenes/BaseTenBlocks";
import { QuestionScene } from "../scenes/QuestionScene";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = "";
});

function mount(node: React.ReactNode) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root!.render(node));
  return host;
}
const click = (el: Element | null | undefined) => act(() => (el as HTMLElement).dispatchEvent(new MouseEvent("click", { bubbles: true })));
const button = (host: HTMLElement, text: string) => [...host.querySelectorAll("button")].find((b) => b.textContent?.includes(text) || b.getAttribute("aria-label") === text);
const text = (host: HTMLElement) => host.textContent ?? "";

describe("the pictures to try with", () => {
  it("balance: taking 7 off both sides of □ + 7 = 15 leaves □ = 8", () => {
    const scene: Scene = { kind: "balance", left: [{ kind: "unknown", label: "?" }, { kind: "weight", value: 7 }], right: [{ kind: "weight", value: 15 }] };
    const host = mount(<QuestionScene scene={scene} />);
    expect(text(host)).toContain("? + 7 = 15");
    click(host.querySelector('[aria-label="Ta bort 7 från båda sidorna"]'));
    expect(text(host)).toContain("? = 8");
    expect(text(host)).toContain("borttaget från båda sidorna");
  });

  it("balance: 3x = 24 split into three equal parts shows x = 8", () => {
    const x = { kind: "unknown" as const, label: "x" };
    const host = mount(<QuestionScene scene={{ kind: "balance", left: [x, x, x], right: [{ kind: "weight", value: 24 }] }} />);
    expect(text(host)).toContain("3x = 24");
    click(button(host, "Dela i 3 lika delar"));
    expect(text(host)).toContain("x = 8");
  });

  it("sharing: a round at a time until the pile is empty, the same on every plate", () => {
    const host = mount(<QuestionScene scene={{ kind: "share", total: 12, among: 3, thing: "cookies" }} />);
    for (let i = 0; i < 4; i++) click(button(host, "Ge en till var"));
    expect(text(host)).toContain("Allt är utdelat");
    expect(button(host, "Ge en till var")).toBeUndefined();
  });

  it("groups: tapping them counts on - 4, 8, 12", () => {
    const host = mount(<QuestionScene scene={{ kind: "groups", groups: 3, each: 4, thing: "eggs" }} />);
    click(button(host, "Räkna grupp 1"));
    click(button(host, "Räkna grupp 2"));
    expect(text(host)).toContain("8");
    click(button(host, "Räkna grupp 3"));
    expect(text(host)).toContain("Alla 3 grupperna räknade");
  });

  it("rounding: picking the nearer ten is right, the farther one asks to look again", () => {
    const host = mount(<QuestionScene scene={{ kind: "rounding", numbers: [{ value: 47, step: 10 }] }} />);
    click(button(host, "40"));
    expect(text(host)).toContain("Titta igen");
    click(button(host, "50"));
    expect(text(host)).toContain("47 ligger närmast 50");
  });

  it("base-ten blocks: the asked place is lit, and a pile says what it is", () => {
    const host = mount(<BaseTenBlocks number={3742} highlight={2} />);
    click(button(host, "7 hundratal"));
    expect(text(host)).toContain("7 hundratal: 7 · 100");
  });
});

describe("the unit staircase", () => {
  const walk = (family: "length" | "mass" | "volume" | "area" | "time", from: string, to: string) => {
    const host = mount(<QuestionScene scene={{ kind: "units", family, from, to, value: 3 }} />);
    for (let i = 0; i < 10; i++) {
      const hop = [...host.querySelectorAll("button")].find((b) => /Hoppa ett steg/.test(b.textContent ?? ""));
      if (!hop) break;
      click(hop);
    }
    const out = text(host);
    act(() => root?.unmount());
    root = null;
    document.body.innerHTML = "";
    return out;
  };

  it("m to cm is two steps down: multiply by 100 - and shows a metre of ten decimetres", () => {
    const out = walk("length", "m", "cm");
    expect(out).toContain("2 steg ner – multiplicera 3 med 100");
    expect(out).toContain("1 m = 10 dm");
  });

  it("ton to kg is one step of 1 000: 1 ton = 1 000 kg", () => {
    const out = walk("mass", "ton", "kg");
    expect(out).toContain("1 steg ner – multiplicera 3 med 1000");
    expect(out).toContain("1 ton = 1000 kg");
  });

  it("going up divides: g to kg is two steps up (hg on the way)", () => {
    expect(walk("mass", "g", "kg")).toContain("2 steg upp – dividera 3 med 1000");
  });

  it("a litre is a cubic decimetre - the same step, the same number", () => {
    const out = walk("volume", "dm³", "l");
    expect(out).toContain("samma steg");
    expect(out).toContain("1 dm³ = 1 l");
  });

  it("m³ to litres is 1 000, shown as a cube", () => {
    const out = walk("volume", "m³", "l");
    expect(out).toContain("multiplicera 3 med 1000");
    expect(out).toContain("1 m³ = 1 000 l");
  });

  it("area steps are a hundred each: dm² to cm², with the 10 by 10 grid", () => {
    const out = walk("area", "dm²", "cm²");
    expect(out).toContain("multiplicera 3 med 100");
    expect(out).toContain("1 dm² = 100 cm²");
  });

  it("time steps are 24 and 60: h to s is × 3 600", () => {
    expect(walk("time", "h", "s")).toContain("2 steg ner – multiplicera 3 med 3600");
  });
});
