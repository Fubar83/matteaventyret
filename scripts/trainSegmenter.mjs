/**
 * Trains the learned segmenter: for a pair of strokes, are they one symbol?
 * A small neural net over the pair's geometry (src/mathinput/strokePairs.ts
 * computes the features), trained on real handwriting whose stroke groups
 * were worked out by scripts/ts/alignStrokes.ts (data/segpairs/train.bin,
 * checked on valid.bin).
 *
 * Pure-JS tfjs like the other models, but the net is tiny - minutes, not
 * hours. Written as plain numbers to src/recognition/segmenter.json, which
 * the app evaluates itself (no tfjs needed to use it).
 *
 * Run: node scripts/trainSegmenter.mjs   (npm run segmenter:train)
 */
import * as tf from "@tensorflow/tfjs";
import { existsSync, readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data", "segpairs");
const OUT_FILE = path.join(__dirname, "..", "src", "recognition", "segmenter.json");
/**
 * The threshold pairs are joined at. Not the one with fewest wrong pairs
 * (printed below, about 0.35): one wrong join merges two whole symbols, so
 * what counts is whole expressions cut right - best around 0.45-0.65
 * (scripts/ts/benchmarkSegmentation.ts).
 */
const THRESHOLD = 0.5;
/** Must match PAIR_FEATURES in src/mathinput/strokePairs.ts (checked when the app loads the net). */
const FEATURES = [
  "inkDist", "endAtoB", "endBtoA", "dx", "dy", "gapX", "gapY", "overlapX", "overlapY", "aW", "aH", "bW", "bH",
  "aAspect", "bAspect", "aLength", "bLength", "aCurl", "bCurl", "crossings", "strokesBetween", "consecutive",
  "unionW", "unionH", "aRank", "bRank", "aTiny", "bTiny", "spatialBetween",
];
const F = FEATURES.length;
const ROW = F + 2;
const EPOCHS = Number(process.argv[process.argv.indexOf("--epochs") + 1]) || 12;
const HIDDEN = [64, 32];

function load(name) {
  const file = path.join(DATA_DIR, `${name}.bin`);
  if (!existsSync(file)) throw new Error(`no ${file} - run npm run segmenter:align first`);
  const buf = readFileSync(file);
  const all = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
  const n = all.length / ROW;
  if (!Number.isInteger(n)) throw new Error(`${file}: not whole rows of ${ROW} - features changed since it was made?`);
  const x = new Float32Array(n * F);
  const y = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    x.set(all.subarray(i * ROW, i * ROW + F), i * F);
    y[i] = all[i * ROW + F];
  }
  return { x, y, n };
}

function stats({ x, n }) {
  const mean = new Array(F).fill(0);
  const std = new Array(F).fill(0);
  for (let i = 0; i < n; i++) for (let k = 0; k < F; k++) mean[k] += x[i * F + k] / n;
  for (let i = 0; i < n; i++) for (let k = 0; k < F; k++) std[k] += (x[i * F + k] - mean[k]) ** 2 / n;
  return { mean, std: std.map((v) => Math.max(Math.sqrt(v), 1e-3)) };
}

function normalized({ x, n }, { mean, std }) {
  const out = new Float32Array(x.length);
  for (let i = 0; i < n; i++) for (let k = 0; k < F; k++) out[i * F + k] = (x[i * F + k] - mean[k]) / std[k];
  return tf.tensor2d(out, [n, F]);
}

/** Share of pairs called right, and of the same-symbol pairs found / of the joins made that were right, at a threshold. */
function scores(p, y, threshold) {
  let tp = 0, fp = 0, fn = 0, ok = 0;
  for (let i = 0; i < y.length; i++) {
    const join = p[i] >= threshold;
    if (join && y[i] === 1) tp++;
    else if (join) fp++;
    else if (y[i] === 1) fn++;
    if (join === (y[i] === 1)) ok++;
  }
  return { accuracy: ok / y.length, recall: tp / Math.max(1, tp + fn), precision: tp / Math.max(1, tp + fp), errors: fp + fn };
}

const round = (v) => Number(v.toPrecision(6));

async function main() {
  const train = load("train");
  const valid = load("valid");
  const positives = train.y.reduce((a, b) => a + b, 0);
  console.log(`[segmenter] ${train.n} training pairs (${positives} one symbol), ${valid.n} validation pairs`);
  const norm = stats(train);
  const xTrain = normalized(train, norm);
  const yTrain = tf.tensor2d(train.y, [train.n, 1]);
  const xValid = normalized(valid, norm);
  const yValid = tf.tensor2d(valid.y, [valid.n, 1]);

  const model = tf.sequential();
  HIDDEN.forEach((units, i) => model.add(tf.layers.dense({ units, activation: "relu", ...(i === 0 ? { inputShape: [F] } : {}) })));
  model.add(tf.layers.dense({ units: 1, activation: "sigmoid" }));
  model.compile({ optimizer: tf.train.adam(0.003), loss: "binaryCrossentropy", metrics: ["accuracy"] });
  for (let epoch = 1; epoch <= EPOCHS; epoch++) {
    if (epoch === Math.ceil(EPOCHS * 0.7)) model.compile({ optimizer: tf.train.adam(0.0007), loss: "binaryCrossentropy", metrics: ["accuracy"] });
    const started = Date.now();
    const h = await model.fit(xTrain, yTrain, { epochs: 1, batchSize: 512, shuffle: true, validationData: [xValid, yValid], verbose: 0 });
    console.log(`  epoch ${epoch}/${EPOCHS}: loss ${h.history.loss[0].toFixed(4)}  valid loss ${h.history.val_loss[0].toFixed(4)}  valid acc ${(h.history.val_acc[0] * 100).toFixed(2)}%  (${Math.round((Date.now() - started) / 1000)}s)`);
  }

  const p = await model.predict(xValid).data();
  for (let t = 0.2; t <= 0.81; t += 0.05) {
    const s = scores(p, valid.y, t);
    console.log(`  threshold ${t.toFixed(2)}: accuracy ${(s.accuracy * 100).toFixed(2)}%  found ${(s.recall * 100).toFixed(1)}% of same-symbol pairs, ${(s.precision * 100).toFixed(1)}% of joins right`);
  }

  const layers = model.layers.map((layer) => {
    const [w, b] = layer.getWeights();
    const W = w.arraySync().map((row) => row.map(round));
    return { w: W, b: Array.from(b.dataSync()).map(round) };
  });
  const net = { features: FEATURES, mean: norm.mean.map(round), std: norm.std.map(round), layers, threshold: THRESHOLD, trainedAt: new Date().toISOString(), trainingPairs: train.n };
  await writeFile(OUT_FILE, JSON.stringify(net) + "\n");
  console.log(`Saved to ${OUT_FILE} (joining at ${THRESHOLD})`);
}

main();
