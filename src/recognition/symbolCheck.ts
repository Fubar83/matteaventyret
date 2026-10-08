/**
 * The symbol checker: is this group of strokes one real symbol - or half of
 * one (one bar of an "="), or the end of one and the start of the next? The
 * picture model can't say: it has only ever seen whole symbols, so it names
 * a character for anything. Reading in writing order (orderDecode.ts) tries
 * every run of consecutive strokes as a symbol, most of them wrong on
 * purpose, and needs the wrong ones to lose - this is what tells them apart.
 *
 * A small model (scripts/trainSymbolChecker.mjs) over the group's picture
 * (the same 28x28 grid the picture model reads) and what the picture leaves
 * out: its size next to the page's typical symbol, and how many strokes it
 * is. Trained on real handwriting: the symbols MathWriting's expressions
 * were aligned into (scripts/ts/alignStrokes.ts) as yes, the other runs of
 * consecutive strokes as no.
 */
import * as tf from "@tensorflow/tfjs";
import { preprocessStrokes, RECOGNIZER_INPUT_SIZE, type Stroke } from "./preprocess";
import { InkMemo, inkKey } from "./inkMemo";
import { loadModelDir } from "./recognizer";

/** The numbers beside the picture, in order: the group's width and height in typical symbol sizes, its stroke count, its shape. */
export const CHECK_EXTRAS = 4;

const squash = (v: number) => Math.sign(v) * Math.log1p(Math.abs(v));

/** What the checker sees of a group of strokes, on a page whose typical symbol is `unit` big (strokePairs.ts's typicalSize). */
export function checkerInputs(strokes: readonly Stroke[], unit: number): { grid: Float32Array; extras: number[] } {
  const pts = strokes.flat();
  const w = Math.max(...pts.map((p) => p.x)) - Math.min(...pts.map((p) => p.x));
  const h = Math.max(...pts.map((p) => p.y)) - Math.min(...pts.map((p) => p.y));
  return {
    grid: preprocessStrokes([...strokes]),
    extras: [squash(w / unit), squash(h / unit), strokes.length, squash((h + 1) / (w + 1))],
  };
}

const MODEL_DIR = "model-symbolcheck";

/** Groups already checked - the page is read again after every pause, and mostly they're the same (inkMemo.ts). */
const checked = new InkMemo<number>();

/** How likely each group is one real symbol (0-1) - or null without a trained checker. */
export async function symbolProbabilities(groups: readonly (readonly Stroke[])[], unit: number): Promise<number[] | null> {
  if (groups.length === 0) return [];
  const model = await loadModelDir(MODEL_DIR);
  if (!model) return null;
  // The page's typical size, to a whole unit: it drifts a little as the page grows, not enough to check everything again.
  const keys = groups.map((g) => `${Math.round(unit)}|${inkKey(g)}`);
  const missing = groups.map((_, i) => i).filter((i) => !checked.has(keys[i]));
  if (missing.length > 0) {
    const S = RECOGNIZER_INPUT_SIZE;
    const grids = new Float32Array(missing.length * S * S);
    const extras = new Float32Array(missing.length * CHECK_EXTRAS);
    missing.forEach((g, i) => {
      const input = checkerInputs(groups[g], unit);
      grids.set(input.grid, i * S * S);
      extras.set(input.extras, i * CHECK_EXTRAS);
    });
    const out = tf.tidy(() => Array.from((model.predict([tf.tensor4d(grids, [missing.length, S, S, 1]), tf.tensor2d(extras, [missing.length, CHECK_EXTRAS])]) as tf.Tensor).dataSync()));
    missing.forEach((g, i) => checked.get(keys[g], () => out[i]));
  }
  return keys.map((key) => checked.peek(key) ?? 0.5);
}
