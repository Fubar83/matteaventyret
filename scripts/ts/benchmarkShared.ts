/**
 * What the benchmarks share: loading the models from disk, reading
 * MathWriting's InkML, and comparing LaTeX the way a reader would (notation
 * that means the same thing counts as the same).
 */
import * as tf from "@tensorflow/tfjs";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Stroke } from "../../src/recognition/preprocess";
import { setModelSource, setStrokeLabels } from "../../src/recognition/recognizer";

export const ROOT = path.join(__dirname, "..", "..");
export const BS = "\\";

export const arg = (name: string) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

/**
 * The recognizer reads its models from public/recognition/ on disk instead of
 * over HTTP. `--full-dir <folder>` / `--basic-dir <folder>` read a candidate
 * model (trainBootstrapModel.mjs --out) in place of the live one, and
 * `--strokes-dir <folder>` a candidate stroke model (trainStrokeModel.mjs
 * --out) with the labels saved beside it.
 */
export function loadModelsFromDisk() {
  const swap: Record<string, string | undefined> = { "model-full": arg("--full-dir"), "model-basic": arg("--basic-dir"), "model-strokes": arg("--strokes-dir") };
  const strokesDir = arg("--strokes-dir");
  if (strokesDir) setStrokeLabels(JSON.parse(readFileSync(path.join(ROOT, "public", "recognition", strokesDir, "strokeLabels.json"), "utf8")).labels);
  setModelSource(async (requested) => {
    const dir = swap[requested] ?? requested;
    const folder = path.join(ROOT, "public", "recognition", dir);
    if (!existsSync(path.join(folder, "model.json"))) throw new Error(`no model in ${folder}`);
    const json = JSON.parse(readFileSync(path.join(folder, "model.json"), "utf8"));
    const weights = readFileSync(path.join(folder, "weights.bin"));
    return tf.loadLayersModel(
      tf.io.fromMemory({
        modelTopology: json.modelTopology,
        weightSpecs: json.weightsManifest[0].weights,
        weightData: weights.buffer.slice(weights.byteOffset, weights.byteOffset + weights.byteLength),
      })
    );
  });
}

/** Letter runs that spell a function name become that command, as layout.ts writes them ("logn" -> \log n). */
export function markFunctions(label: string): string {
  return label.replace(/(?<![\\a-zA-Z])(sin|cos|tan|log|lim|ln|lg)/g, `${BS}$1`);
}

export function tokens(label: string): string[] {
  return label.match(/\\[a-zA-Z]+|\\%|\S/g) ?? [];
}

/** Notation that means the same written different ways - so only real misreadings count. */
export function normalize(latex: string): string {
  return latex
    .replace(/\\begin\{gathered\}|\\end\{gathered\}/g, "")
    .replace(/\{,\}/g, ",")
    .replace(/\\,/g, "")
    .replace(/\{\}\^\{\\circ\}/g, "^{\\circ}")
    .replace(/\\rightarrow/g, "\\to")
    .replace(/\\leq/g, "\\le")
    .replace(/\\geq/g, "\\ge")
    .replace(/\\neq/g, "\\ne")
    .replace(/\\left|\\right/g, "")
    .replace(/\s+/g, "")
    .replace(/([\^_])\{([^{}\\])\}/g, "$1$2")
    // A decimal point and the Swedish decimal comma the app writes are the same thing (STRICT_DECIMALS=1: count them as different, as before).
    .replace(/(\d)\.(?=\d)/g, process.env.STRICT_DECIMALS ? "$1." : "$1,");
}

export function parseInk(text: string): Stroke[] {
  const strokes: Stroke[] = [];
  for (const m of text.matchAll(/<trace[^>]*>([^<]*)<\/trace>/g)) {
    const pts = m[1]
      .split(",")
      .map((p) => p.trim().split(/\s+/).map(Number))
      .filter((p) => p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]))
      .map(([x, y]) => ({ x, y }));
    if (pts.length > 0) strokes.push(pts);
  }
  return strokes;
}

/** Scaled to tablet size: a line about 60px tall - a fraction or an integral stands taller. */
export function toTabletSize(strokes: Stroke[], label: string): Stroke[] {
  const xs = strokes.flat().map((p) => p.x);
  const ys = strokes.flat().map((p) => p.y);
  const target = label.includes(BS + "frac") ? 140 : label.includes(BS + "int") || label.includes("^") ? 90 : 60;
  const scale = target / Math.max(1, Math.max(...ys) - Math.min(...ys));
  return strokes.map((s) => s.map((p) => ({ x: (p.x - Math.min(...xs)) * scale + 20, y: (p.y - Math.min(...ys)) * scale + 20 })));
}

/** How much of `got` is right: 1 − edit distance / the longer length. */
export function similarity(expected: string, got: string): number {
  const a = [...expected];
  const b = [...got];
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return 1 - prev[b.length] / Math.max(a.length, b.length, 1);
}

/** An expression from an InkML file: its label (function names marked) and its ink, or null if it has no label. */
export function readExpression(text: string): { label: string; strokes: Stroke[] } | null {
  const raw = text.match(/<annotation type="normalizedLabel">([^<]*)<\/annotation>/)?.[1];
  if (!raw) return null;
  const label = markFunctions(raw.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&"));
  return { label, strokes: toTabletSize(parseInk(text), label) };
}
