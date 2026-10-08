/**
 * Klockan: the faces a clock can have, where its hands point, how a time is
 * said in words ("halv sex", "fem i halv tre"), and the "ställ klockan"
 * questions - the child drags the hands to a time given in words or on a
 * digital clock. The minute hand has to be right (it snaps to whole minutes,
 * or to every five); the hour hand only near enough - it moves on between
 * the numbers as the minutes go, and no one sets it to the degree.
 */
import { st, type AdvancedProblem, type SolutionStep } from "./advanced";
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

/** Ställ klockan: drag the hands to a time given in words or on a digital clock. */
export interface ClockProblem {
  stageId: ClockStageId;
  kind: "clock";
  /** The time, 0-23 (a 12-hour face shows 17.30 as 5.30). */
  h: number;
  m: number;
  /** How the time is given: in words ("halv sex") or on a digital clock (17.30). */
  given: "words" | "digital";
  face: ClockFaceStyle;
  /** How the digital clock looks, when the time is given on one. */
  digitalLook: DigitalLook;
  /** Where the minute hand snaps: every 5 minutes, or every minute. */
  snap: 1 | 5;
  /** Where the hour hand snaps, in degrees: 15 (whole and half hours) at first, 2,5 (five minutes) later. */
  hourSnap: number;
  /** Where the hands start - somewhere else than the answer. */
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
  faces: readonly ClockFaceStyle[];
  /** The hours asked: any in an ordinary day (12-hour), mornings, afternoons and evenings (24-hour), or any at all. */
  hours: "day" | "morning" | "afternoon" | "any";
  kinds: readonly ("read" | "setWords" | "setDigital")[];
  snap: 1 | 5;
  hourSnap: number;
}

const fiveMinutes = (rng: Rng) => 5 * randInt(rng, 0, 11);

const LEVELS: Record<ClockStageId, ClockLevel> = {
  "1.5.1": { minutes: (rng) => pick(rng, [0, 30]), faces: ARABIC, hours: "day", kinds: ["read", "setWords"], snap: 5, hourSnap: 15 },
  "1.5.3": { minutes: (rng) => pick(rng, [15, 45, 15, 45, 0, 30]), faces: ARABIC, hours: "day", kinds: ["read", "setWords"], snap: 5, hourSnap: 7.5 },
  "1.5.4": { minutes: fiveMinutes, faces: [...ARABIC, ...QUARTERS], hours: "day", kinds: ["read", "setWords"], snap: 5, hourSnap: 2.5 },
  "1.5.5": { minutes: fiveMinutes, faces: [...ARABIC, ...QUARTERS], hours: "morning", kinds: ["setDigital", "setDigital", "read", "setWords"], snap: 5, hourSnap: 2.5 },
  "1.5.6": { minutes: fiveMinutes, faces: [...ARABIC, ...QUARTERS, ...ROMAN], hours: "afternoon", kinds: ["setDigital", "read"], snap: 5, hourSnap: 2.5 },
  "1.5.7": {
    // Any minute that isn't a five (and not the first few, so the long hand has passed a number).
    minutes: (rng) => {
      const m = randInt(rng, 6, 59);
      return m % 5 === 0 ? m + 1 : m;
    },
    faces: FACES,
    hours: "any",
    kinds: ["setDigital", "read"],
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

/** Vad är klockan? An analog clock, read and written the way a digital one shows it - 3.30, or on the 24-hour level 15.30. */
function readQuestion(stageId: ClockStageId, h24: number, m: number, face: ClockFaceStyle, twentyFour: boolean): AdvancedProblem {
  const h = ((h24 + 11) % 12) + 1;
  const pm = twentyFour && h24 >= 13;
  const H = pm ? h24 : h;
  const clock = (hh: number, mm: number) => `${hh}.${String(mm).padStart(2, "0")}`;
  const steps: SolutionStep[] = [];
  if (m === 0) steps.push(st("step.basic.clockWhole", clock(h, 0), { h }));
  else if (m % 5 === 0) steps.push(st("step.basic.clockMinutes", `${m / 5} \\cdot 5 = ${m}`, { n: m / 5 }));
  else steps.push(st("step.clock.minutesExact", `${Math.floor(m / 5)} \\cdot 5 + ${m % 5} = ${m}`, { n: Math.floor(m / 5), k: m % 5 }));
  if (pm) steps.push(st("step.basic.clock24", `${h} + 12 = ${h24}`, { h }));
  // A whole hour in the afternoon is already written by "7 + 12 = 19".
  if (m !== 0) steps.push(st(pm ? "step.basic.clock24Write" : "step.basic.clockHour", clock(H, m), { h, m }));
  return {
    stageId,
    kind: "expression",
    promptKey: pm ? "basic.prompt.clock24" : "basic.prompt.clock",
    display: "",
    answer: { kind: "value", value: Math.round((H + m / 100) * 1e6) / 1e6 },
    tipKey: `clock.tip.${stageId}`,
    firstStep: steps[0].line,
    solution: steps.map((x) => x.line),
    steps,
    clock: { kind: "analog", h, m, face, sky: h24 + m / 60 },
    difficulty: timeScore(m) + faceScore(face) + (pm ? 0.5 : 0),
  };
}

function levelQuestion(stageId: ClockStageId, rng: Rng): ClockProblem | AdvancedProblem {
  const level = LEVELS[stageId];
  const kind = pick(rng, level.kinds);
  const h24 = hourFor(rng, level.hours);
  const m = level.minutes(rng);
  const face = pick(rng, level.faces);
  if (kind === "read") return readQuestion(stageId, h24, m, face, level.hours === "afternoon");
  const given = kind === "setWords" ? "words" : "digital";
  return {
    stageId,
    kind: "clock",
    // In words a time is said the 12-hour way ("halv sex").
    h: given === "words" ? ((h24 + 11) % 12) + 1 : h24,
    m,
    given,
    face,
    digitalLook: randomDigitalLook(rng),
    snap: level.snap,
    hourSnap: level.hourSnap,
    start: startFor(rng, h24, m),
    sky: h24 + m / 60,
    difficulty: timeScore(m) + faceScore(face) + (given === "digital" ? 0.5 : 0) + 0.25,
  };
}

export const CLOCK_GENERATORS: Record<ClockStageId, (rng: Rng) => ClockProblem | AdvancedProblem> = {
  "1.5.1": (rng) => levelQuestion("1.5.1", rng),
  "1.5.3": (rng) => levelQuestion("1.5.3", rng),
  "1.5.4": (rng) => levelQuestion("1.5.4", rng),
  "1.5.5": (rng) => levelQuestion("1.5.5", rng),
  "1.5.6": (rng) => levelQuestion("1.5.6", rng),
  "1.5.7": (rng) => levelQuestion("1.5.7", rng),
};

