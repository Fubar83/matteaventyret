/**
 * The unit circle, moved by hand: drag the point round the circle, and see
 * cos v along the x-axis and sin v up the y-axis. Everything here is done
 * without a calculator - the exact values are marked on the axes.
 *
 *   gymnasiet 4.2.9  enhetscirkeln: vinklar - put the point at 135°, at −60°, at 420°;
 *                    or anywhere sin v > 0 and cos v < 0
 *   gymnasiet 4.2.10 exakta värden - where sin v = 1/2 and cos v < 0; the other
 *                    angle with the same sine (180° − v) or cosine (360° − v)
 *   gymnasiet 4.2.11 radianer - put the point at 3π/4, at 7π/6, at −π/3
 *
 * Angles are whole degrees, 0 ≤ v < 360, in steps of 15 - the point snaps to them.
 *
 * How it works, and what must stay true: docs/question-types/unitCircle.md.
 */
import { pick, randInt, type Rng } from "../../rng";
import { text, type ChoiceText } from "../choice/problem";
import { questionType, retry } from "../questionType";

export type UnitCircleStageId = "4.2.9" | "4.2.10" | "4.2.11";

export interface UnitCircleProblem {
  stageId: UnitCircleStageId;
  kind: "unitCircle";
  /** The labels round the circle: degrees or radians. */
  unit: "deg" | "rad";
  /** Whether the point's angle is written out as it moves - not where the angle is the task. */
  showAngle: boolean;
  /** Every angle that answers it (whole degrees, 0-359). */
  answers: number[];
  /** Where the point starts: never an answer. */
  start: number;
  /** What the question is about, for saying why a place is wrong. */
  about: { type: "angle"; deg: number } | { type: "signs"; sin: 1 | -1; cos: 1 | -1 } | { type: "value"; fn: "sin" | "cos"; deg: number } | { type: "same"; fn: "sin" | "cos"; deg: number };
  display: string;
  prompt: ChoiceText;
  tip: ChoiceText;
  explanation: ChoiceText;
}

export const SNAP = 15;
const rad = (deg: number) => (deg * Math.PI) / 180;
/** An angle as 0-359. */
export const norm = (deg: number) => ((Math.round(deg) % 360) + 360) % 360;

/** sin and cos at a multiple of 15°, rounded so the signs and equalities are exact. */
export const sinOf = (deg: number) => Math.round(Math.sin(rad(deg)) * 1e9) / 1e9;
export const cosOf = (deg: number) => Math.round(Math.cos(rad(deg)) * 1e9) / 1e9;

/** The exact values on the axes, as LaTeX: 0, ±1/2, ±√2/2, ±√3/2, ±1. */
export function exact(v: number): string {
  const s = v < 0 ? "-" : "";
  const a = Math.abs(v);
  if (a < 1e-9) return "0";
  if (Math.abs(a - 1) < 1e-9) return `${s}1`;
  if (Math.abs(a - 0.5) < 1e-9) return `${s}\\frac{1}{2}`;
  if (Math.abs(a - Math.SQRT2 / 2) < 1e-9) return `${s}\\frac{\\sqrt{2}}{2}`;
  if (Math.abs(a - Math.sqrt(3) / 2) < 1e-9) return `${s}\\frac{\\sqrt{3}}{2}`;
  throw new Error(`no exact value for ${v}`);
}

/** An exact value as plain text, for words: 1/2, √3/2, −√2/2. */
export const exactText = (v: number) =>
  exact(v)
    .replace(/^-/, "−")
    .replace(/\\frac\{(.+?)\}\{(.+?)\}/, "$1/$2")
    .replace(/\\sqrt\{(\d)\}/, "√$1");

/** An angle in radians, as LaTeX (3π/4, π, −π/3) - or as plain text. */
export function radians(deg: number, plain = false): string {
  if (deg === 0) return "0";
  const g = (a: number, b: number): number => (b === 0 ? a : g(b, a % b));
  const d = g(Math.abs(deg), 180);
  const [n, m] = [deg / d, 180 / d];
  const top = Math.abs(n) === 1 ? "\\pi" : `${Math.abs(n)}\\pi`;
  const sign = n < 0 ? "-" : "";
  if (plain) return `${n < 0 ? "−" : ""}${Math.abs(n) === 1 ? "" : Math.abs(n)}π${m === 1 ? "" : `/${m}`}`;
  return m === 1 ? `${sign}${top}` : `${sign}\\frac{${top}}{${m}}`;
}

/** Why a place on the circle isn't the answer. */
export function unitCircleWhy(p: UnitCircleProblem, at: number): ChoiceText {
  const a = p.about;
  if (a.type === "angle" || a.type === "same") {
    const target = p.answers[0];
    if (norm(360 - target) === at && at !== target) return text("uc.why.clockwise");
    if (a.type === "same" && at === norm(a.deg)) return text("uc.why.sameAngle");
    if (a.type === "same") return text(a.fn === "sin" ? "uc.why.sameSin" : "uc.why.sameCos");
    return text(Math.abs(norm(at - target + 180) - 180) <= 30 ? "uc.why.near" : "uc.why.count");
  }
  if (a.type === "signs") return text(Math.sign(sinOf(at)) !== a.sin ? "uc.why.sinSign" : "uc.why.cosSign");
  // A value: the right sin (cos), the other sign wrong - or not that value at all.
  const v = a.fn === "sin" ? sinOf(a.deg) : cosOf(a.deg);
  const here = a.fn === "sin" ? sinOf(at) : cosOf(at);
  if (Math.abs(here - v) < 1e-9) return text(a.fn === "sin" ? "uc.why.cosSign" : "uc.why.sinSign");
  return text(a.fn === "sin" ? "uc.why.sinIsY" : "uc.why.cosIsX");
}

/** A start for the point: on the positive x-axis unless that's an answer, then straight up. */
const startFor = (answers: number[]) => (answers.includes(0) ? 90 : 0);

/** 4.2.9: put the point at an angle - past 90°, below 0 or once round and more - or anywhere the signs fit. */
function angles(rng: Rng): UnitCircleProblem {
  if (rng() < 0.25) {
    const sin = pick(rng, [1, -1] as const);
    const cos = pick(rng, [1, -1] as const);
    const answers = Array.from({ length: 24 }, (_, i) => i * SNAP).filter((d) => Math.sign(sinOf(d)) === sin && Math.sign(cosOf(d)) === cos);
    const rel = (n: number) => (n > 0 ? ">" : "<");
    return {
      stageId: "4.2.9",
      kind: "unitCircle",
      unit: "deg",
      showAngle: true,
      answers,
      start: startFor(answers),
      about: { type: "signs", sin, cos },
      display: `\\sin v ${rel(sin)} 0,\\quad \\cos v ${rel(cos)} 0`,
      prompt: text("uc.prompt.signs"),
      tip: text("uc.tip.signs"),
      explanation: text("uc.explain.signs", { q: [1, 2, 4, 3][(sin > 0 ? 0 : 2) + (cos > 0 ? 0 : 1)] }),
    };
  }
  const kind = pick(rng, ["plain", "plain", "negative", "more"] as const);
  const target = retry("unitCircle 4.2.9", () => {
    const d = SNAP * randInt(rng, 1, 23);
    return d % 90 === 0 ? null : d;
  });
  const shown = kind === "negative" ? target - 360 : kind === "more" ? target + 360 : target;
  return {
    stageId: "4.2.9",
    kind: "unitCircle",
    unit: "deg",
    showAngle: false,
    answers: [target],
    start: startFor([target]),
    about: { type: "angle", deg: target },
    display: `v = ${shown < 0 ? "-" : ""}${Math.abs(shown)}^{\\circ}`,
    prompt: text("uc.prompt.angle"),
    tip: text(kind === "negative" ? "uc.tip.negative" : kind === "more" ? "uc.tip.more" : "uc.tip.angle"),
    explanation: text(kind === "plain" ? "uc.explain.angle" : "uc.explain.same", { v: shown, w: target }),
  };
}

/** The angles worth asking about: the exact values' angles, off the axes. */
const EXACT_ANGLES = [30, 45, 60, 120, 135, 150, 210, 225, 240, 300, 315, 330];

/** 4.2.10: where sin (cos) has an exact value and the other a sign; or the other angle with the same sine (cosine). */
function exactValues(rng: Rng): UnitCircleProblem {
  const fn = pick(rng, ["sin", "cos"] as const);
  if (rng() < 0.4) {
    const deg = pick(rng, [15, 30, 45, 60, 75, 105, 120, 135, 150, 165]);
    // For cosine, either half of the circle: the partner is its mirror in the x-axis.
    const given = fn === "sin" ? deg : pick(rng, [deg, deg + 180]);
    const answer = fn === "sin" ? norm(180 - given) : norm(360 - given);
    return {
      stageId: "4.2.10",
      kind: "unitCircle",
      unit: "deg",
      showAngle: true,
      answers: [answer],
      start: startFor([answer]),
      about: { type: "same", fn, deg: given },
      display: `\\${fn} v = \\${fn} ${given}^{\\circ},\\quad v \\neq ${given}^{\\circ}`,
      prompt: text("uc.prompt.same"),
      tip: text(fn === "sin" ? "uc.tip.sameSin" : "uc.tip.sameCos"),
      explanation: text(fn === "sin" ? "uc.explain.sameSin" : "uc.explain.sameCos", { v: given, w: answer }),
    };
  }
  const deg = pick(rng, EXACT_ANGLES);
  const value = fn === "sin" ? sinOf(deg) : cosOf(deg);
  // The other function's sign tells the two angles with this value apart.
  const other = fn === "sin" ? cosOf(deg) : sinOf(deg);
  const otherFn = fn === "sin" ? "cos" : "sin";
  return {
    stageId: "4.2.10",
    kind: "unitCircle",
    unit: "deg",
    showAngle: true,
    answers: [deg],
    start: startFor([deg]),
    about: { type: "value", fn, deg },
    display: `\\${fn} v = ${exact(value)},\\quad \\${otherFn} v ${other > 0 ? ">" : "<"} 0`,
    prompt: text("uc.prompt.value"),
    tip: text(fn === "sin" ? "uc.tip.sinIsY" : "uc.tip.cosIsX"),
    explanation: text("uc.explain.value", { fn, v: deg, val: exactText(value) }),
  };
}

/** 4.2.11: an angle in radians - a fraction of π, past π, or negative. */
function radianAngles(rng: Rng): UnitCircleProblem {
  const target = pick(rng, [30, 45, 60, 90, 120, 135, 150, 180, 210, 225, 240, 270, 300, 315, 330]);
  const negative = rng() < 0.25;
  const shown = negative ? target - 360 : target;
  return {
    stageId: "4.2.11",
    kind: "unitCircle",
    unit: "rad",
    showAngle: false,
    answers: [target],
    start: startFor([target]),
    about: { type: "angle", deg: target },
    display: `v = ${radians(shown)}`,
    prompt: text("uc.prompt.angle"),
    tip: text(negative ? "uc.tip.radNegative" : "uc.tip.rad"),
    explanation: text("uc.explain.rad", { r: radians(shown, true), v: target }),
  };
}

export const UNIT_CIRCLE_QUESTIONS = questionType<"unitCircle", UnitCircleProblem, UnitCircleStageId>({
  id: "unitCircle",
  kinds: ["unitCircle"],
  levels: {
    "4.2.9": angles,
    "4.2.10": exactValues,
    "4.2.11": radianAngles,
  },
  key: (p) => `unitCircle:${p.stageId}:${p.display}`,
});
