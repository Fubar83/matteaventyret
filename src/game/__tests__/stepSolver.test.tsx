// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AdvancedProblem } from "../../engine/advanced";
import { ADVANCED_GENERATORS } from "../../engine/advanced";
import { makeRng } from "../../engine/rng";
import type { QuestionOutcome } from "../questionOutcome";
import { StepSolver } from "../StepSolver";

// What the child writes is typed here instead of drawn: the pad reports it as the recognizer would, as LaTeX.
vi.mock("../draw/WorkPad", () => ({
  WorkPad: ({ onChange, resetToken }: { onChange: (latex: string) => void; resetToken?: number }) => (
    <input key={resetToken} aria-label="pad" onChange={(e) => onChange(e.target.value)} />
  ),
}));
vi.mock("../../audio/sound", () => ({ playEffect: () => {} }));
// KaTeX isn't needed to read what's shown.
vi.mock("../Tex", () => ({ Tex: ({ latex }: { latex: string }) => <span data-latex={latex}>{latex}</span> }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = "";
});

function mount(problem: AdvancedProblem, onSolved: (o: QuestionOutcome) => void) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root!.render(<StepSolver problem={problem} level={4} onSolved={onSolved} />));
  return host;
}

function write(host: HTMLElement, latex: string) {
  const input = host.querySelector<HTMLInputElement>("input[aria-label=pad]")!;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  act(() => {
    setter.call(input, latex);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function press(host: HTMLElement, label: RegExp) {
  const button = [...host.querySelectorAll("button")].find((b) => label.test(b.textContent ?? ""));
  if (!button) throw new Error(`no button ${label}`);
  act(() => button.click());
}

/** An equation 3.3.2 question: ax + b = c. */
function equation(): AdvancedProblem {
  const rng = makeRng(4);
  for (;;) {
    const p = ADVANCED_GENERATORS["3.3.2"](rng);
    if (p.steps && p.steps.length === 3) return p;
  }
}

describe("the step-by-step solver", () => {
  it("guides each step, checks it, and finishes on the answer", () => {
    const p = equation();
    const [first, second, third] = p.steps!;
    let outcome: QuestionOutcome | null = null;
    const host = mount(p, (o) => (outcome = o));
    expect(host.textContent).toContain("Steg 1");

    write(host, first.line);
    press(host, /Nästa steg/);
    expect(host.textContent).toContain("Rätt! Fortsätt med nästa steg.");
    expect(host.textContent).toContain("Steg 2");
    expect(host.textContent).toMatch(/Dividera båda leden/);

    write(host, second.line);
    press(host, /Nästa steg/);
    write(host, third.line);
    press(host, /Nästa steg/);
    // Solved: reported at once - the round celebrates and moves on.
    expect(outcome).not.toBeNull();
    expect(outcome!.fullSetup).toBe(true);
    expect(outcome!.helped).toBe(false);
  });

  it("marks a wrong step and keeps it open, without giving the answer", () => {
    const p = equation();
    const host = mount(p, () => {});
    write(host, "x = 1 0 0 0");
    press(host, /Nästa steg/);
    expect(host.textContent).toContain("Steg 1");
    expect(host.textContent).not.toContain("Steg 2");
    expect(host.textContent).not.toContain(p.steps![0].line);
  });

  it("shows how a step can look when asked - and that counts as help", () => {
    const p = equation();
    let outcome: QuestionOutcome | null = null;
    const host = mount(p, (o) => (outcome = o));
    press(host, /Visa hur/);
    expect(host.textContent).toContain(p.steps![0].line);
    for (const s of p.steps!) {
      write(host, s.line);
      press(host, /Nästa steg/);
    }
    expect(outcome!.helped).toBe(true);
  });

  it("sets up the calculation written in the step in a column - without it counting as help", () => {
    const p = equation();
    const host = mount(p, () => {});
    write(host, "A = 3 {,} 1 4 \\cdot 2 5");
    press(host, /Ställ upp/);
    const [first, second] = [...host.querySelectorAll<HTMLInputElement>("input[inputmode=decimal]")];
    expect([first.value, second.value]).toEqual(["3,14", "25"]);
    expect(host.textContent).not.toContain("Så kan steget se ut");
  });

  it("is strict: the answer straight away isn't the step asked for", () => {
    const p = equation();
    const host = mount(p, () => {});
    write(host, p.steps![2].line);
    press(host, /Nästa steg/);
    expect(host.textContent).toContain("ett steg i taget");
    expect(host.textContent).not.toContain("Steg 2");
  });

  it("can start with each step there to trace - and tracing counts as help", () => {
    const p = equation();
    let outcome: QuestionOutcome | null = null;
    const host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    act(() => root!.render(<StepSolver problem={p} level={4} onSolved={(o) => (outcome = o)} trace />));
    expect(host.textContent).toContain("Spåra: på");
    for (const s of p.steps!) {
      write(host, s.line);
      press(host, /Nästa steg/);
    }
    expect(outcome!.helped).toBe(true);
  });

  it("lets a done step be changed: it and the ones after it are written again", () => {
    const p = equation();
    const host = mount(p, () => {});
    write(host, p.steps![0].line);
    press(host, /Nästa steg/);
    expect(host.textContent).toContain("Steg 2");
    press(host, /Ändra/);
    expect(host.textContent).toContain("Steg 1");
    expect(host.textContent).not.toContain("Steg 2");
  });
});
