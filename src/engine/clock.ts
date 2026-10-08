/**
 * Klockan: the faces a clock can have, where its hands point, how a time is
 * said in words ("halv 6", "fem i halv 3"), and the clock questions - one
 * kind of clock to read or set at a time, never a written answer:
 *   read         a clock with hands; pick what it says ("halv 2", "fem i halv 6")
 *   setAnalog    drag the hands to a time in words ("Sätt klockan till halv 7"),
 *                or - later - to the time on a digital clock
 *   setDigital   a clock with hands is shown; set a digital clock to it,
 *                dragging its numbers up or down
 * The minute hand has to be right (it snaps to whole minutes, or to every
 * five); the hour hand only near enough - it moves on between the numbers as
 * the minutes go, and no one sets it to the degree.
 */
import { randInt, type Rng } from "./rng";

export type ClockNumerals = "arabic" | "roman" | "quarters" | "none";
export type ClockTicks = "minutes" | "hours" | "none";
export type ClockLook = "classic" | "kids" | "modern" | "station";

/** How a clock face looks - numbers, tick marks, colours and hands. */
export interface ClockFaceStyle {
  numerals: ClockNumerals;
  ticks: ClockTicks;
  look: ClockLook;
}

/**
 * A digital clock's display: seven-segment digits lit red or green (an LED
 * alarm clock), dark on grey-green (an LCD - a watch, an oven), number
 * cards (a flip clock), or a phone's lock screen.
 */
export type DigitalLook = "ledRed" | "ledGreen" | "lcd" | "flip" | "phone";
export const DIGITAL_LOOKS: readonly DigitalLook[] = ["ledRed", "ledGreen", "lcd", "flip", "phone"];

export function randomDigitalLook(rng: Rng): DigitalLook {
  return DIGITAL_LOOKS[randInt(rng, 0, DIGITAL_LOOKS.length - 1)];
}

/** A clock showing a time: analog with a face, or a digital display (24-hour). */
export type ClockSpec = ({ kind: "analog"; h: number; m: number; face: ClockFaceStyle } | { kind: "digital"; h: number; m: number; look: DigitalLook }) & {
  /** The time of day (0-24) the sky behind the clock shows - the sun up, the moon out. */
  sky?: number;
};

export const FACES: readonly ClockFaceStyle[] = [
  { numerals: "arabic", ticks: "minutes", look: "classic" },
  { numerals: "arabic", ticks: "hours", look: "kids" },
  { numerals: "roman", ticks: "minutes", look: "classic" },
  { numerals: "roman", ticks: "hours", look: "station" },
  { numerals: "quarters", ticks: "minutes", look: "modern" },
  { numerals: "quarters", ticks: "hours", look: "kids" },
  { numerals: "none", ticks: "minutes", look: "modern" },
  { numerals: "none", ticks: "hours", look: "station" },
];

/** A face to show: the easy ones (every number written) for the first clock levels, any for the rest. */
export function randomFace(rng: Rng, easy: boolean): ClockFaceStyle {
  const faces = easy ? FACES.filter((f) => f.numerals === "arabic" || f.numerals === "roman") : FACES;
  return faces[randInt(rng, 0, faces.length - 1)];
}

/** Degrees clockwise from 12. */
export const minuteAngle = (m: number) => m * 6;
export const hourAngle = (h: number, m: number) => ((h % 12) + m / 60) * 30;

/** The smallest angle between two directions, 0-180. */
export function angleBetween(a: number, b: number): number {
  const d = Math.abs((((a - b) % 360) + 360) % 360);
  return Math.min(d, 360 - d);
}

/**
 * How far the hour hand may be off: a quarter of the way between two
 * numbers (7,5°) - so at half past five it has to be between 5 and 6, but it
 * doesn't have to be exactly halfway.
 */
export const HOUR_TOLERANCE = 7.5;

export type ClockVerdict = { ok: true } | { ok: false; minute: boolean; hour: boolean };

/** Do the hands, at these angles, show h:m? (A 12-hour face: 17.30 is set as 5.30.) */
export function checkHands(hourDeg: number, minuteDeg: number, h: number, m: number): ClockVerdict {
  const minuteOk = angleBetween(minuteDeg, minuteAngle(m)) < 1;
  const hourOk = angleBetween(hourDeg, hourAngle(h, m)) <= HOUR_TOLERANCE;
  return minuteOk && hourOk ? { ok: true } : { ok: false, minute: !minuteOk, hour: !hourOk };
}

/** The time said in words, as an i18n key and its hours: "halv {next}" for 5.30. Five-minute times only. */
export function spokenTime(h: number, m: number): { key: string; hour: number; next: number } {
  const hour = ((h + 11) % 12) + 1;
  return { key: `clock.at.${m}`, hour, next: (hour % 12) + 1 };
}

// --- The clock levels -----------------------------------------------------------------

/**
 * The clock, a step at a time - each step moves one dial: the times (hel och
 * halv → kvart → fem minuter → minuten), the faces (every number → only
 * 12-3-6-9 → Roman → none), and digital and the 24-hour clock. Every step
 * mixes reading a clock ("Vad är klockan?", written) with setting one
 * (dragging the hands), and each round goes from its easiest question to its
 * hardest (see `difficulty`, generateRound).
 *
 *   1.5.1 hel och halv   1.5.3 kvart   1.5.4 fem minuter
 *   1.5.5 digital klocka (morning)   1.5.6 24-timmarsklockan   1.5.7 på minuten
 */
export type ClockStageId = "1.5.1" | "1.5.3" | "1.5.4" | "1.5.5" | "1.5.6" | "1.5.7";

/** A time on a 12-hour clock: 1-12 and its minutes. */
export interface ClockTime {
  h: number;
  m: number;
}

/** A clock question: read a clock with hands, set its hands, or set a digital clock - see the header. */
export interface ClockProblem {
  stageId: ClockStageId;
  kind: "clock";
  task: "read" | "setAnalog" | "setDigital";
  /** The time, 0-23 (a 12-hour face shows 17.30 as 5.30). */
  h: number;
  m: number;
  /** What the time is given as: a clock with hands (read, setDigital), in words or on a digital clock (setAnalog). */
  given: "analog" | "words" | "digital";
  /** Reading: the times to pick from (12-hour), and which is right. */
  options?: ClockTime[];
  correct?: number;
  face: ClockFaceStyle;
  /** How the digital clock looks, when the time is given on one. */
  digitalLook: DigitalLook;
  /** Where the minute hand snaps: every 5 minutes, or every minute. */
  snap: 1 | 5;
  /** Where the hour hand snaps, in degrees: 15 (whole and half hours) at first, 2,5 (five minutes) later. */
  hourSnap: number;
  /** Where the hands (or the digital clock's numbers) start - somewhere else than the answer. */
  start: { h: number; m: number };
  /** The time of day the sky behind the clock shows (0-24): morning, afternoon, night. */
  sky: number;
  /** How hard it is - a round's questions come easiest first. */
  difficulty: number;
}

const pick = <T>(rng: Rng, items: readonly T[]): T => items[randInt(rng, 0, items.length - 1)];

const ARABIC = FACES.filter((f) => f.numerals === "arabic");
const QUARTERS = FACES.filter((f) => f.numerals === "quarters");
const ROMAN = FACES.filter((f) => f.numerals === "roman");

/** How hard a time is to read or set: whole hour, half, quarter, five minutes, any minute. */
function timeScore(m: number): number {
  if (m === 0) return 0;
  if (m === 30) return 1;
  if (m === 15 || m === 45) return 2;
  return m % 5 === 0 ? 3 : 4;
}

/** How hard a face is: the kids' clock with every number, then classic, 12-3-6-9 only, Roman, none. */
function faceScore(f: ClockFaceStyle): number {
  const numerals = { arabic: 0, quarters: 2, roman: 2.5, none: 3.5 }[f.numerals];
  return numerals + (f.look === "kids" ? 0 : 0.5);
}

/** A 12-hour time placed in an ordinary day, for the sky: 7-12 in the morning, 1-6 in the afternoon. */
const dayHour = (h12: number) => (h12 < 7 ? h12 + 12 : h12);

function startFor(rng: Rng, h: number, m: number): { h: number; m: number } {
  for (;;) {
    const s = { h: randInt(rng, 1, 12), m: 5 * randInt(rng, 0, 11) };
    if (s.h % 12 !== h % 12 && s.m !== m) return s;
  }
}

interface ClockLevel {
  minutes: (rng: Rng) => number;
  /** Every minute the level asks - a reading question's wrong options stay among them (no quarters on the whole-and-half level). */
  allowed: (m: number) => boolean;
  faces: readonly ClockFaceStyle[];
  /** The hours asked: any in an ordinary day (12-hour), mornings, afternoons and evenings (24-hour), or any at all. */
  hours: "day" | "morning" | "afternoon" | "any";
  /** read: pick what a clock says. setWords: drag the hands to a time in words. digitalToAnalog / analogToDigital: from one kind of clock to the other. */
  kinds: readonly ("read" | "setWords" | "digitalToAnalog" | "analogToDigital")[];
  snap: 1 | 5;
  hourSnap: number;
}

const fiveMinutes = (rng: Rng) => 5 * randInt(rng, 0, 11);
const isFive = (m: number) => m % 5 === 0;

const LEVELS: Record<ClockStageId, ClockLevel> = {
  "1.5.1": { minutes: (rng) => pick(rng, [0, 30]), allowed: (m) => m === 0 || m === 30, faces: ARABIC, hours: "day", kinds: ["read", "setWords"], snap: 5, hourSnap: 15 },
  "1.5.3": { minutes: (rng) => pick(rng, [15, 45, 15, 45, 0, 30]), allowed: (m) => m % 15 === 0, faces: ARABIC, hours: "day", kinds: ["read", "setWords"], snap: 5, hourSnap: 7.5 },
  "1.5.4": { minutes: fiveMinutes, allowed: isFive, faces: [...ARABIC, ...QUARTERS], hours: "day", kinds: ["read", "setWords"], snap: 5, hourSnap: 2.5 },
  // From here on, digital clocks too - from digital to the hands, and from the hands to digital.
  "1.5.5": { minutes: fiveMinutes, allowed: isFive, faces: [...ARABIC, ...QUARTERS], hours: "morning", kinds: ["digitalToAnalog", "analogToDigital", "read", "setWords"], snap: 5, hourSnap: 2.5 },
  "1.5.6": { minutes: fiveMinutes, allowed: isFive, faces: [...ARABIC, ...QUARTERS, ...ROMAN], hours: "afternoon", kinds: ["digitalToAnalog", "analogToDigital"], snap: 5, hourSnap: 2.5 },
  "1.5.7": {
    // Any minute that isn't a five (and not the first few, so the long hand has passed a number).
    minutes: (rng) => {
      const m = randInt(rng, 6, 59);
      return m % 5 === 0 ? m + 1 : m;
    },
    allowed: () => true,
    faces: FACES,
    hours: "any",
    kinds: ["digitalToAnalog", "analogToDigital"],
    snap: 1,
    hourSnap: 2.5,
  },
};

/** The hour (0-23) a level asks: in an ordinary day, a morning, an afternoon or evening, or any. */
function hourFor(rng: Rng, hours: ClockLevel["hours"]): number {
  if (hours === "morning") return randInt(rng, 6, 11);
  if (hours === "afternoon") return randInt(rng, 13, 23);
  if (hours === "any") return randInt(rng, 0, 23);
  return dayHour(randInt(rng, 1, 12));
}

const twelve = (h: number) => ((h + 11) % 12) + 1;
const same = (a: ClockTime, b: ClockTime) => a.h === b.h && a.m === b.m;

/**
 * What a reading question offers besides the right time: the mistakes
 * children make. The hour one off - "halv 1" for halv 2, the hour that has
 * passed instead of the one coming (or the other way round); the minutes
 * mirrored - kvart över for kvart i, fem över halv for fem i halv; then the
 * neighbours. All among the level's own minutes; three of them.
 */
export function readOptions(time: ClockTime, allowed: (m: number) => boolean): ClockTime[] {
  const { h, m } = time;
  const at = (hh: number, mm: number): ClockTime => ({ h: twelve(hh), m: ((mm % 60) + 60) % 60 });
  // Times said with the next hour (halv, i halv, i) - the slip is the hour before; and the other way round.
  const saidWithNext = m >= 25;
  const candidates = [
    at(saidWithNext ? h - 1 : h + 1, m),
    at(h, 60 - m),
    at(h, m === 0 ? 30 : m === 30 ? 0 : m),
    // On the whole hour, "halv" the hour before: the hour hand is on 3, so it must be halv 3?
    at(m === 0 ? h - 1 : h + 1, m === 0 ? 30 : m),
    at(h, m + 15),
    at(h, m - 15),
    at(h, m + 5),
    at(h, m - 5),
    at(h + 1, m),
    at(h - 1, m),
    at(h + 2, m),
  ];
  const out: ClockTime[] = [];
  for (const c of candidates) {
    if (out.length === 3) break;
    if (!allowed(c.m) || same(c, time) || out.some((o) => same(o, c))) continue;
    out.push(c);
  }
  return out;
}

function levelQuestion(stageId: ClockStageId, rng: Rng): ClockProblem {
  const level = LEVELS[stageId];
  const kind = pick(rng, level.kinds);
  const h24 = hourFor(rng, level.hours);
  const m = level.minutes(rng);
  const face = pick(rng, level.faces);
  const base = { stageId, kind: "clock" as const, m, face, digitalLook: randomDigitalLook(rng), snap: level.snap, hourSnap: level.hourSnap, start: startFor(rng, h24, m), sky: h24 + m / 60 };
  if (kind === "read") {
    // Shuffled in among the mistakes.
    const time = { h: twelve(h24), m };
    const options = [time, ...readOptions(time, level.allowed)];
    for (let i = options.length - 1; i > 0; i--) {
      const j = randInt(rng, 0, i);
      [options[i], options[j]] = [options[j], options[i]];
    }
    return { ...base, task: "read", h: time.h, given: "analog", options, correct: options.findIndex((o) => same(o, time)), difficulty: timeScore(m) + faceScore(face) };
  }
  if (kind === "setWords")
    // In words a time is said the 12-hour way ("halv 6").
    return { ...base, task: "setAnalog", h: twelve(h24), given: "words", difficulty: timeScore(m) + faceScore(face) + 0.25 };
  if (kind === "digitalToAnalog") return { ...base, task: "setAnalog", h: h24, given: "digital", difficulty: timeScore(m) + faceScore(face) + 0.5 };
  // From the hands to a digital clock: the hours as the time of day has them (morning, or after 12).
  return { ...base, task: "setDigital", h: h24, given: "analog", difficulty: timeScore(m) + faceScore(face) + 0.75 };
}

export const CLOCK_GENERATORS: Record<ClockStageId, (rng: Rng) => ClockProblem> = {
  "1.5.1": (rng) => levelQuestion("1.5.1", rng),
  "1.5.3": (rng) => levelQuestion("1.5.3", rng),
  "1.5.4": (rng) => levelQuestion("1.5.4", rng),
  "1.5.5": (rng) => levelQuestion("1.5.5", rng),
  "1.5.6": (rng) => levelQuestion("1.5.6", rng),
  "1.5.7": (rng) => levelQuestion("1.5.7", rng),
};

