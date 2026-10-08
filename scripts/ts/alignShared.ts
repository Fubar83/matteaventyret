/**
 * Forced alignment, shared by alignStrokes.ts (training data) and the
 * writing-order benchmark: which consecutive strokes of a handwritten
 * expression make which glyph of its known label, by the picture model.
 * See alignStrokes.ts for how and why.
 */
import * as tf from "@tensorflow/tfjs";
import { readFileSync } from "node:fs";
import path from "node:path";
import { labelsFor } from "../../src/recognition/labels";
import { preprocessStrokes, RECOGNIZER_INPUT_SIZE, type Stroke } from "../../src/recognition/preprocess";
import { ROOT } from "./benchmarkShared";

export const MAX_GROUP = 4;
export const MAX_STROKES = 48;
/** What a glyph the picture model doesn't know scores, for any group - about what a known glyph scores when the model is unsure. */
const UNKNOWN_GLYPH_LOGP = Math.log(0.08);
/** Dropped unless every known glyph's group looks at least this much like it... */
export const MIN_GLYPH_P = 0.03;
/** ...and the known glyphs look like themselves this much on average (geometric mean). */
export const MIN_MEAN_P = 0.35;

const LABELS = labelsFor("full");
const INDEX = new Map(LABELS.map((c, i) => [c, i]));
const CASE_MERGED: Record<string, string> = { C: "c", P: "p", V: "v", O: "0", X: "x", S: "s", Z: "z", U: "u" };

/** How many strokes a glyph can be drawn with, where it's clear - a lone bar is never an "=", nor a bar with a digit a "-". */
const STROKE_RANGE: Record<string, [number, number]> = {
  "=": [2, 2], "+": [2, 2], "≠": [2, 3], "≈": [2, 2], "±": [2, 3], "%": [2, 3], ":": [2, 2], "÷": [3, 3], "⇒": [2, 3], "⇔": [2, 4],
  "-": [1, 1], ".": [1, 1], ",": [1, 1], "(": [1, 1], ")": [1, 1], "|": [1, 1], "/": [1, 1], "<": [1, 1], ">": [1, 1],
  "0": [1, 2], "1": [1, 2], "2": [1, 1], "3": [1, 1], "6": [1, 1], "8": [1, 2], "9": [1, 2], "√": [1, 2], "∫": [1, 1],
};

/** Commands that are one written glyph the model knows. */
const GLYPH_COMMANDS: Record<string, string> = {
  cdot: ".", times: "x", le: "≤", leq: "≤", ge: "≥", geq: "≥", ne: "≠", neq: "≠", approx: "≈", pm: "±",
  to: "→", rightarrow: "→", Rightarrow: "⇒", Leftrightarrow: "⇔", iff: "⇔", infty: "∞", int: "∫",
  Delta: "Δ", alpha: "α", beta: "β", theta: "θ", pi: "π", frac: "-", sqrt: "√", circ: "°", mid: "|",
};
/** Commands that are written as their letters. */
const SPELLED = new Set(["sin", "cos", "tan", "cot", "log", "lim", "ln", "lg", "exp", "max", "min", "det"]);
/** Commands that are no glyph of their own. */
const SILENT = new Set(["left", "right", "mathrm", "mathbf", "mathit", "mathcal", "mathbb", "operatorname", "displaystyle"]);
/** Commands whose glyph is drawn at a time the label's order says nothing about (an accent, a matrix) - such expressions are skipped. */
const UNORDERED = /\\(begin|overline|underline|hat|bar|vec|widehat|widetilde|tilde|dot|ddot|overrightarrow|not|binom|stackrel|overset|underset|boxed|xrightarrow)\b|\\\\|&|\\sqrt\[/;

/**
 * The label's glyphs in the order they were likely drawn: each the model's
 * character, or null for one it doesn't know. A fraction's bar comes first in
 * LaTeX (\frac{a}{b}) but is as often drawn after its numerator, so there are
 * two readings: bars first, and bars after their numerators. Null if the
 * label can't be aligned this way.
 */
export function glyphs(label: string, barAfterNumerator: boolean): (string | null)[] | null {
  if (UNORDERED.test(label)) return null;
  const tokens = [...label.matchAll(/\\([a-zA-Z]+)|\\(.)|(\S)/g)].map((m) => ({ cmd: m[1], escaped: m[2], ch: m[3] }));
  let pos = 0;
  let bad = false;
  /** One argument: a {...} group, or a single token. */
  const argument = (): (string | null)[] => {
    if (tokens[pos]?.ch === "{") {
      pos++;
      return sequence(true);
    }
    return pos < tokens.length ? one() : [];
  };
  const sequence = (inGroup: boolean): (string | null)[] => {
    const out: (string | null)[] = [];
    while (pos < tokens.length) {
      if (tokens[pos].ch === "}") {
        pos++;
        if (inGroup) return out;
        continue;
      }
      out.push(...one());
    }
    return out;
  };
  const one = (): (string | null)[] => {
    const { cmd, escaped, ch } = tokens[pos++];
    if (cmd !== undefined) {
      if (cmd === "frac") {
        const num = argument();
        const den = argument();
        return barAfterNumerator ? [...num, "-", ...den] : ["-", ...num, ...den];
      }
      if (SILENT.has(cmd) || cmd === "quad" || cmd === "qquad") return [];
      if (cmd in GLYPH_COMMANDS) return [GLYPH_COMMANDS[cmd]];
      if (SPELLED.has(cmd)) return [...cmd].map((c) => (INDEX.has(c) ? c : null));
      if (cmd === "ldots" || cmd === "cdots" || cmd === "dots") return [".", ".", "."];
      return [null];
    }
    if (escaped !== undefined) {
      if (escaped === "%") return ["%"];
      if (escaped === "{" || escaped === "}" || escaped === "|") return [null];
      if (escaped === "," || escaped === ";" || escaped === "!" || escaped === " ") return [];
      bad = true;
      return [];
    }
    if (ch === "{") return sequence(true);
    if (ch === "^" || ch === "_") return [];
    const c = CASE_MERGED[ch] ?? ch;
    return [INDEX.has(c) ? c : null];
  };
  const out = sequence(false);
  return bad || out.length === 0 ? null : out;
}

let model: tf.LayersModel;
export async function loadModel() {
  const folder = path.join(ROOT, "public", "recognition", "model-full");
  const json = JSON.parse(readFileSync(path.join(folder, "model.json"), "utf8"));
  const weights = readFileSync(path.join(folder, "weights.bin"));
  model = await tf.loadLayersModel(
    tf.io.fromMemory({ modelTopology: json.modelTopology, weightSpecs: json.weightsManifest[0].weights, weightData: weights.buffer.slice(weights.byteOffset, weights.byteOffset + weights.byteLength) })
  );
}

/** The model's probabilities for many stroke groups at once. */
export function classifyAll(groups: Stroke[][]): Float32Array[] {
  const S = RECOGNIZER_INPUT_SIZE;
  const out: Float32Array[] = [];
  for (let start = 0; start < groups.length; start += 512) {
    const chunk = groups.slice(start, start + 512);
    const flat = new Float32Array(chunk.length * S * S);
    chunk.forEach((g, i) => flat.set(preprocessStrokes(g), i * S * S));
    const probs = tf.tidy(() => (model.predict(tf.tensor4d(flat, [chunk.length, S, S, 1])) as tf.Tensor).dataSync() as Float32Array);
    const k = probs.length / chunk.length;
    for (let i = 0; i < chunk.length; i++) out.push(probs.slice(i * k, (i + 1) * k));
  }
  return out;
}

export interface Alignment {
  /** For each stroke, which glyph (group) it belongs to. */
  groupOf: number[];
  /** The glyphs, in the order aligned. */
  glyphs: (string | null)[];
  minP: number;
  meanP: number;
}

/** The best cut of `strokes` (in drawing order) into one consecutive group per glyph, by the model's probabilities `probOf(start, size)`. */
export function align(nStrokes: number, gl: (string | null)[], probOf: (start: number, size: number) => Float32Array | null): Alignment | null {
  const N = gl.length;
  if (N > nStrokes) return null;
  // best[k][t]: best total log-probability with the first k glyphs using the first t strokes.
  const best = Array.from({ length: N + 1 }, () => new Array(nStrokes + 1).fill(-Infinity));
  const from = Array.from({ length: N + 1 }, () => new Array(nStrokes + 1).fill(0));
  best[0][0] = 0;
  const score = (k: number, start: number, size: number) => {
    const g = gl[k];
    const probs = probOf(start, size);
    if (!probs) return -Infinity;
    if (g === null) return UNKNOWN_GLYPH_LOGP - 0.3 * (size - 1);
    const range = STROKE_RANGE[g];
    if (range && (size < range[0] || size > range[1])) return -Infinity;
    return Math.log(probs[INDEX.get(g)!] + 1e-5);
  };
  for (let k = 0; k < N; k++) {
    for (let t = k; t < nStrokes; t++) {
      if (best[k][t] === -Infinity) continue;
      for (let m = 1; m <= MAX_GROUP && t + m <= nStrokes; m++) {
        // Leave at least one stroke for each glyph still to come.
        if (nStrokes - (t + m) < N - k - 1) break;
        const v = best[k][t] + score(k, t, m);
        if (v > best[k + 1][t + m]) {
          best[k + 1][t + m] = v;
          from[k + 1][t + m] = m;
        }
      }
    }
  }
  if (best[N][nStrokes] === -Infinity) return null;
  const groupOf = new Array(nStrokes).fill(0);
  const known: number[] = [];
  let t = nStrokes;
  for (let k = N; k > 0; k--) {
    const m = from[k][t];
    for (let s = t - m; s < t; s++) groupOf[s] = k - 1;
    const g = gl[k - 1];
    if (g !== null) known.push(probOf(t - m, m)![INDEX.get(g)!]);
    t -= m;
  }
  if (known.length === 0) return null;
  return {
    groupOf,
    glyphs: gl,
    minP: Math.min(...known),
    meanP: Math.exp(known.reduce((a, p) => a + Math.log(p + 1e-5), 0) / known.length),
  };
}

export function boxOf(strokes: Stroke[]) {
  const xs = strokes.flat().map((p) => p.x);
  const ys = strokes.flat().map((p) => p.y);
  return { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
}


/**
 * The best alignment of an expression's strokes to its label (bars first or
 * after their numerators, whichever fits better), and whether it's sure
 * enough to trust - or null if the label can't be aligned.
 */
export function alignLabel(label: string, strokes: Stroke[], allowUnknown = false): { result: Alignment; keep: boolean } | null {
  const readings = [glyphs(label, false), glyphs(label, true)].filter((g): g is (string | null)[] => g !== null && (allowUnknown || !g.includes(null)));
  if (readings.length === 0 || strokes.length > MAX_STROKES || strokes.length < 2) return null;
  // Every group of 1-4 consecutive strokes that's compact enough to be one glyph, classified in one batch.
  const unit = Math.max(...strokes.map((s) => Math.max(boxOf([s]).w, boxOf([s]).h))) || 1;
  const index = new Map<string, number>();
  const groups: Stroke[][] = [];
  for (let t = 0; t < strokes.length; t++) {
    for (let m = 1; m <= MAX_GROUP && t + m <= strokes.length; m++) {
      const g = strokes.slice(t, t + m);
      const b = boxOf(g);
      if (m > 1 && (b.w > unit * 1.6 || b.h > unit * 1.6)) continue;
      index.set(`${t}:${m}`, groups.length);
      groups.push(g);
    }
  }
  const probs = classifyAll(groups);
  const probOf = (t: number, m: number) => {
    const i = index.get(`${t}:${m}`);
    return i === undefined ? null : probs[i];
  };
  const result = readings
    .map((g) => align(strokes.length, g, probOf))
    .reduce<Alignment | null>((best, r) => (r && (!best || r.meanP > best.meanP) ? r : best), null);
  if (!result) return null;
  return { result, keep: result.minP >= MIN_GLYPH_P && result.meanP >= MIN_MEAN_P };
}
