import { describe, expect, it } from "vitest";
import { CLOCK_QUESTIONS, checkHands, dayDegNear, hourAngle, minuteAngle, readOptions, spokenTime, turnDay, type ClockStageId } from "../questions/clock";
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
    return Array.from({ length: n }, () => CLOCK_QUESTIONS.levels[stage](rng));
  };
  const tasks = (stage: ClockStageId) => new Set(sample(stage).map((p) => `${p.task}:${p.given}`));

  it("moves one dial at a time: hel och halv, then kvart, then fives, then any minute", () => {
    expect(new Set(sample("1.5.1").map((p) => p.m))).toEqual(new Set([0, 30]));
    expect(new Set(sample("1.5.3").map((p) => p.m))).toEqual(new Set([0, 15, 30, 45]));
    expect(sample("1.5.4").every((p) => p.m % 5 === 0)).toBe(true);
    expect(sample("1.5.7").every((p) => p.m % 5 !== 0)).toBe(true);
  });

  it("keeps the first steps to faces with every number, and brings in Roman and numberless faces later", () => {
    const numerals = (stage: ClockStageId) => new Set(sample(stage).map((p) => p.face.numerals));
    expect(numerals("1.5.1")).toEqual(new Set(["arabic"]));
    expect(numerals("1.5.4").has("roman")).toBe(false);
    expect(numerals("1.5.6").has("roman")).toBe(true);
    expect(numerals("1.5.7").has("none")).toBe(true);
  });

  it("one kind of clock at a time: reading and setting the hands first, digital only from 1.5.5", () => {
    for (const stage of ["1.5.1", "1.5.3", "1.5.4"] as const) expect(tasks(stage), stage).toEqual(new Set(["read:analog", "setAnalog:words"]));
    expect(tasks("1.5.5")).toEqual(new Set(["read:analog", "setAnalog:words", "setAnalog:digital", "setDigital:analog"]));
    for (const stage of ["1.5.6", "1.5.7"] as const) expect(tasks(stage), stage).toEqual(new Set(["setAnalog:digital", "setDigital:analog"]));
  });

  it("a reading question offers the right time and three of the usual mistakes, all of the level's kind", () => {
    for (const [stage, ok] of [["1.5.1", (m: number) => m === 0 || m === 30], ["1.5.3", (m: number) => m % 15 === 0], ["1.5.4", (m: number) => m % 5 === 0]] as const) {
      for (const p of sample(stage).filter((q) => q.task === "read")) {
        const options = p.options!;
        expect(options, stage).toHaveLength(4);
        expect(new Set(options.map((o) => `${o.h}:${o.m}`)).size).toBe(4);
        expect(options[p.correct!]).toEqual({ h: p.h, m: p.m });
        expect(options.every((o) => ok(o.m) && o.h >= 1 && o.h <= 12), stage).toBe(true);
      }
    }
  });

  it("the mistakes are the classic ones: halv 1 for halv 2, kvart i for kvart över, halv 3 for 3", () => {
    const five = (m: number) => m % 5 === 0;
    expect(readOptions({ h: 1, m: 30 }, five)[0]).toEqual({ h: 12, m: 30 });
    expect(readOptions({ h: 3, m: 15 }, five)).toContainEqual({ h: 3, m: 45 });
    expect(readOptions({ h: 5, m: 25 }, five)).toEqual(expect.arrayContaining([{ h: 4, m: 25 }, { h: 5, m: 35 }]));
    expect(readOptions({ h: 3, m: 0 }, (m) => m === 0 || m === 30)).toContainEqual({ h: 2, m: 30 });
  });

  it("asks the 24-hour clock on its own step: afternoons and evenings", () => {
    for (const p of sample("1.5.6")) expect(p.h).toBeGreaterThanOrEqual(13);
  });

  it("puts a round's questions easiest first", () => {
    for (const stage of Object.keys(CLOCK_QUESTIONS.levels) as ClockStageId[]) {
      const round = generateRound(stage, 8, makeRng(9)).problems;
      const scores = round.map((p) => ("difficulty" in p ? p.difficulty! : NaN));
      expect(scores, stage).toEqual([...scores].sort((a, b) => a - b));
    }
  });

  it("lets beginners' hour hand stop only on whole and half hours", () => {
    const set = sample("1.5.1").find((p) => p.task === "setAnalog");
    expect(set?.hourSnap).toBe(15);
  });

  it("starts the hands somewhere else than the answer", () => {
    for (const stage of Object.keys(CLOCK_QUESTIONS.levels) as ClockStageId[]) {
      for (const p of sample(stage, 100)) {
        expect(p.start.m).not.toBe(p.m);
        expect(p.start.h % 12).not.toBe(p.h % 12);
      }
    }
  });
});

describe("the hour hand's two laps a day (the sky behind a clock being set)", () => {
  const hours = (dayDeg: number) => dayDeg / 30;
  /** Turns the hand step by step from `fromDeg` (over both laps) by `byDeg`, as a drag does. */
  const drag = (fromDeg: number, byDeg: number) => {
    let day = fromDeg;
    const step = Math.sign(byDeg) * 2.5;
    for (let turned = 0; Math.abs(turned) < Math.abs(byDeg); turned += step) day = turnDay(day, (day + step) % 360);
    return day;
  };

  it("goes on past 12 into the afternoon - not back to midnight", () => {
    expect(hours(drag(11 * 30, 60))).toBe(13);
  });

  it("goes on past 12 at night into the next morning", () => {
    expect(hours(drag(23 * 30, 60))).toBe(1);
  });

  it("goes back past 12 the same way", () => {
    expect(hours(drag(13 * 30, -60))).toBe(11);
    expect(hours(drag(1 * 30, -60))).toBe(23);
  });

  it("a whole turn of the hand is half a day", () => {
    expect(hours(drag(9 * 30, 360))).toBe(21);
  });

  it("starts in the lap nearer the question's time", () => {
    expect(hours(dayDegNear(hourAngle(9, 0), 13))).toBe(9);
    expect(hours(dayDegNear(hourAngle(3, 0), 17.5))).toBe(15);
    expect(hours(dayDegNear(hourAngle(11, 0), 0.5))).toBe(23);
  });
});
