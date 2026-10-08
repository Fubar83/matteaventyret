import { describe, expect, it } from "vitest";
import { CLOCK_GENERATORS, checkHands, hourAngle, minuteAngle, spokenTime, type ClockStageId } from "../clock";
import { generateRound } from "../generator";
import { makeRng } from "../rng";

describe("the clock", () => {
  it("knows where the hands point: half past five has the hour hand halfway between 5 and 6", () => {
    expect(minuteAngle(30)).toBe(180);
    expect(hourAngle(5, 30)).toBe(165);
    expect(hourAngle(17, 30)).toBe(165); // the same on a 12-hour face
    expect(hourAngle(12, 0)).toBe(0);
  });

  it("wants the minute hand exactly right", () => {
    expect(checkHands(165, 180, 5, 30)).toEqual({ ok: true });
    expect(checkHands(165, 174, 5, 30)).toEqual({ ok: false, minute: true, hour: false });
  });

  it("lets the hour hand be a little off - but not on the wrong number", () => {
    expect(checkHands(160, 180, 5, 30).ok).toBe(true);
    expect(checkHands(170, 180, 5, 30).ok).toBe(true);
    // Pointing straight at 5 at half past five is the usual mistake, and wrong.
    expect(checkHands(150, 180, 5, 30)).toEqual({ ok: false, minute: false, hour: true });
    expect(checkHands(180, 180, 5, 30).ok).toBe(false);
    expect(checkHands(357.5, 0, 12, 0).ok).toBe(true);
    expect(checkHands(5, 0, 12, 0).ok).toBe(true);
  });

  it("says the times the Swedish way: halv sex is 5.30, fem i halv tre is 2.25", () => {
    expect(spokenTime(5, 30)).toEqual({ key: "clock.at.30", hour: 5, next: 6 });
    expect(spokenTime(2, 25)).toEqual({ key: "clock.at.25", hour: 2, next: 3 });
    expect(spokenTime(12, 45)).toEqual({ key: "clock.at.45", hour: 12, next: 1 });
    expect(spokenTime(17, 0)).toEqual({ key: "clock.at.0", hour: 5, next: 6 });
  });
});

describe("the clock levels", () => {
  const sample = (stage: ClockStageId, n = 300) => {
    const rng = makeRng(5);
    return Array.from({ length: n }, () => CLOCK_GENERATORS[stage](rng));
  };
  const minutes = (p: ReturnType<(typeof CLOCK_GENERATORS)["1.5.1"]>) => (p.kind === "clock" ? p.m : p.clock!.m);

  it("moves one dial at a time: hel och halv, then kvart, then fives, then any minute", () => {
    expect(new Set(sample("1.5.1").map(minutes))).toEqual(new Set([0, 30]));
    expect(new Set(sample("1.5.3").map(minutes))).toEqual(new Set([0, 15, 30, 45]));
    expect(sample("1.5.4").every((p) => minutes(p) % 5 === 0)).toBe(true);
    expect(sample("1.5.7").every((p) => minutes(p) % 5 !== 0)).toBe(true);
  });

  it("keeps the first steps to faces with every number, and brings in Roman and numberless faces later", () => {
    const numerals = (stage: ClockStageId) => new Set(sample(stage).map((p) => (p.kind === "clock" ? p.face.numerals : p.clock!.kind === "analog" ? p.clock!.face.numerals : "digital")));
    expect(numerals("1.5.1")).toEqual(new Set(["arabic"]));
    expect(numerals("1.5.4").has("roman")).toBe(false);
    expect(numerals("1.5.6").has("roman")).toBe(true);
    expect(numerals("1.5.7").has("none")).toBe(true);
  });

  it("mixes reading the clock with setting it in every step", () => {
    for (const stage of Object.keys(CLOCK_GENERATORS) as ClockStageId[]) {
      const kinds = new Set(sample(stage).map((p) => p.kind));
      expect(kinds, stage).toEqual(new Set(["clock", "expression"]));
    }
  });

  it("asks the 24-hour clock on its own step: afternoons and evenings, from a digital clock", () => {
    for (const p of sample("1.5.6")) {
      if (p.kind === "clock") {
        expect(p.given).toBe("digital");
        expect(p.h).toBeGreaterThanOrEqual(13);
      } else if (p.answer.kind === "value") expect(p.answer.value).toBeGreaterThanOrEqual(13);
    }
  });

  it("puts a round's questions easiest first", () => {
    for (const stage of Object.keys(CLOCK_GENERATORS) as ClockStageId[]) {
      const round = generateRound(stage, 8, makeRng(9)).problems;
      const scores = round.map((p) => ("difficulty" in p ? p.difficulty! : NaN));
      expect(scores, stage).toEqual([...scores].sort((a, b) => a - b));
    }
  });

  it("lets beginners' hour hand stop only on whole and half hours", () => {
    const set = sample("1.5.1").find((p) => p.kind === "clock");
    expect(set?.kind === "clock" && set.hourSnap).toBe(15);
  });

  it("starts the hands somewhere else than the answer", () => {
    for (const stage of Object.keys(CLOCK_GENERATORS) as ClockStageId[]) {
      for (const p of sample(stage, 100)) {
        if (p.kind !== "clock") continue;
        expect(p.start.m).not.toBe(p.m);
        expect(p.start.h % 12).not.toBe(p.h % 12);
      }
    }
  });
});
