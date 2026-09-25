import { describe, expect, it } from "vitest";
import { applyOutcome, INITIAL_METHOD_PROGRESS, demoteToEgenOrdning, type MethodProgress } from "../phaseProgress";

const clean = { hintUsed: false, miniTutorialUsed: false, nudgeUsed: false, hadOriginalError: false };

describe("phaseProgress: Guidat -> Egen ordning", () => {
  it("promotes after 4 clean problems in a row", () => {
    let progress = INITIAL_METHOD_PROGRESS;
    for (let i = 0; i < 3; i++) {
      progress = applyOutcome(progress, clean).progress;
      expect(progress.phase).toBe("guidat");
    }
    progress = applyOutcome(progress, clean).progress;
    expect(progress.phase).toBe("egenOrdning");
  });

  it("allows exactly one hint within the streak of 4", () => {
    let progress = INITIAL_METHOD_PROGRESS;
    progress = applyOutcome(progress, { ...clean, hintUsed: true }).progress;
    progress = applyOutcome(progress, clean).progress;
    progress = applyOutcome(progress, clean).progress;
    progress = applyOutcome(progress, clean).progress;
    expect(progress.phase).toBe("egenOrdning");
  });

  it("resets the streak on a second hint before reaching 4", () => {
    let progress = INITIAL_METHOD_PROGRESS;
    progress = applyOutcome(progress, { ...clean, hintUsed: true }).progress;
    progress = applyOutcome(progress, { ...clean, hintUsed: true }).progress;
    expect(progress.phase).toBe("guidat");
    expect(progress.upStreakCount).toBe(0);
  });

  it("resets the streak on any mini-tutorial", () => {
    let progress = INITIAL_METHOD_PROGRESS;
    progress = applyOutcome(progress, clean).progress;
    progress = applyOutcome(progress, clean).progress;
    progress = applyOutcome(progress, { ...clean, miniTutorialUsed: true }).progress;
    expect(progress.phase).toBe("guidat");
    expect(progress.upStreakCount).toBe(0);
  });
});

describe("phaseProgress: Egen ordning -> Fritt", () => {
  const egenOrdning: MethodProgress = { ...INITIAL_METHOD_PROGRESS, phase: "egenOrdning" };

  it("promotes after 4 problems with every cell picked ready", () => {
    let progress: MethodProgress = egenOrdning;
    for (let i = 0; i < 4; i++) progress = applyOutcome(progress, clean).progress;
    expect(progress.phase).toBe("fritt");
  });

  it("allows exactly one nudge within the streak", () => {
    let progress: MethodProgress = egenOrdning;
    progress = applyOutcome(progress, { ...clean, nudgeUsed: true }).progress;
    progress = applyOutcome(progress, clean).progress;
    progress = applyOutcome(progress, clean).progress;
    progress = applyOutcome(progress, clean).progress;
    expect(progress.phase).toBe("fritt");
  });
});

describe("phaseProgress: Fritt demotion suggestion", () => {
  const fritt: MethodProgress = { ...INITIAL_METHOD_PROGRESS, phase: "fritt" };

  it("suggests demotion after 3 error-having problems in a row", () => {
    let progress: MethodProgress = fritt;
    let suggested = false;
    for (let i = 0; i < 3; i++) {
      const result = applyOutcome(progress, { ...clean, hadOriginalError: true });
      progress = result.progress;
      suggested = result.suggestDemotion;
    }
    expect(suggested).toBe(true);
    expect(progress.phase).toBe("fritt"); // demotion is a suggestion, not automatic
  });

  it("resets the error streak on a clean problem", () => {
    let progress: MethodProgress = fritt;
    progress = applyOutcome(progress, { ...clean, hadOriginalError: true }).progress;
    progress = applyOutcome(progress, { ...clean, hadOriginalError: true }).progress;
    progress = applyOutcome(progress, clean).progress;
    expect(progress.downStreakCount).toBe(0);
  });

  it("demoteToEgenOrdning resets streaks", () => {
    const demoted = demoteToEgenOrdning();
    expect(demoted.phase).toBe("egenOrdning");
    expect(demoted.upStreakCount).toBe(0);
    expect(demoted.downStreakCount).toBe(0);
  });
});
