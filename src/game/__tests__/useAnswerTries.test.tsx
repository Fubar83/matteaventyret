// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { questionStars } from "../../engine/scoring";
import type { QuestionOutcome } from "../questions/questionOutcome";
import { useAnswerTries } from "../questions/useAnswerTries";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
afterEach(() => {
  act(() => root?.unmount());
  root = null;
  document.body.innerHTML = "";
});

/** The hook in a component, its latest value handed out to the test. */
function mount(options: { setup?: () => boolean; helpUsed?: number }) {
  const onSolved = vi.fn<(o: QuestionOutcome) => void>();
  const onRetry = vi.fn();
  let tries!: ReturnType<typeof useAnswerTries>;
  function Probe() {
    tries = useAnswerTries({ answer: 30, hint: "the hint", helpUsed: options.helpUsed ?? 0, setup: options.setup, onRetry, onSolved });
    return null;
  }
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(<Probe />));
  return { onSolved, onRetry, now: () => tries, answer: (n: number) => act(() => tries.submit(n)) };
}

describe("a question answered with one number, in tries", () => {
  it("right the first time: solved, ★★★ with nothing to set up", () => {
    const q = mount({});
    q.answer(30);
    expect(q.now().solved).toBe(true);
    expect(questionStars(q.onSolved.mock.calls[0][0])).toBe(3);
  });

  it("a wrong answer: try again, the boxes cleared; the second brings the hint; then right is ★", () => {
    const q = mount({});
    q.answer(3);
    expect(q.now().message).toBe("Försök igen.");
    expect(q.now().resetToken).toBe(1);
    expect(q.onRetry).toHaveBeenCalledTimes(1);
    q.answer(300);
    expect(q.now().message).toBe("the hint");
    q.answer(30);
    expect(questionStars(q.onSolved.mock.calls[0][0])).toBe(1);
  });

  it("one wrong answer, then right: ★★ - unless the written setup was there", () => {
    const plain = mount({});
    plain.answer(3);
    plain.answer(30);
    expect(questionStars(plain.onSolved.mock.calls[0][0])).toBe(2);
    act(() => root?.unmount());

    const withSetup = mount({ setup: () => true });
    withSetup.answer(3);
    withSetup.answer(30);
    expect(questionStars(withSetup.onSolved.mock.calls[0][0])).toBe(3);
  });

  it("the third wrong answer shows the answer, and moving on reports it as help", () => {
    const q = mount({});
    q.answer(1);
    q.answer(2);
    q.answer(4);
    expect(q.now().revealed).toBe(true);
    expect(q.now().message).toBe("Svaret är 30.");
    expect(q.onSolved).not.toHaveBeenCalled();
    act(() => q.now().moveOn());
    expect(q.onSolved.mock.calls[0][0]).toMatchObject({ helped: true, miniTutorialUsed: true });
  });
});
