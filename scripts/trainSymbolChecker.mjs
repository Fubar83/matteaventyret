/**
 * Trains the symbol checker (src/recognition/symbolCheck.ts): is this group
 * of strokes one real symbol, or a wrong cut (half of a "+", the end of one
 * digit and the start of the next)? From real handwriting - MathWriting's
 * expressions aligned to their labels (npx jiti scripts/ts/alignStrokes.ts
 * --checker, 12 shards in data/symcheck/): each aligned symbol is a yes, the
 * other runs of consecutive strokes are no's.
 *
 * Two inputs: the group's 28x28 picture (as the picture model sees it), and
 * what the picture can't show - its size next to the page's typical symbol,
 * its stroke count. A small network: pure-JS tfjs, trained a chunk at a time
 * so the half a million examples needn't all be in memory. The last shard
 * is held out to measure it.
 *
 * Run: node scripts/trainSymbolChecker.mjs [--epochs N] [--max rows]   (npm run checker:train)
 */
import * as tf from "@tensorflow/tfjs";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data", "symcheck");
const OUT_DIR = path.join(__dirname, "..", "public", "recognition", "model-symbolcheck");
const argValue = (name) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const EPOCHS = Number(argValue("--epochs") ?? 4);
const MAX_ROWS = Number(argValue("--max") ?? 400000);
const CHUNK = 16000;
const SIZE = 28;
const PIXELS = SIZE * SIZE;
/** Must match CHECK_EXTRAS in src/recognition/symbolCheck.ts. */
const EXTRAS = 4;
const ROW = PIXELS + EXTRAS * 4 + 1;

function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** All rows of these shard files, as one buffer. */
function load(files) {
  const parts = files.map((f) => readFileSync(path.join(DATA_DIR, f)));
  return Buffer.concat(parts);
}

/** Rows `idx` of `buf` as model inputs and answers. */
function tensors(buf, idx) {
  const grids = new Float32Array(idx.length * PIXELS);
  const extras = new Float32Array(idx.length * EXTRAS);
  const ys = new Float32Array(idx.length);
  idx.forEach((r, i) => {
    const o = r * ROW;
    for (let p = 0; p < PIXELS; p++) grids[i * PIXELS + p] = buf[o + p] / 255;
    for (let k = 0; k < EXTRAS; k++) extras[i * EXTRAS + k] = buf.readFloatLE(o + PIXELS + k * 4);
    ys[i] = buf[o + ROW - 1];
  });
  return { x: [tf.tensor4d(grids, [idx.length, SIZE, SIZE, 1]), tf.tensor2d(extras, [idx.length, EXTRAS])], y: tf.tensor2d(ys, [idx.length, 1]), ys };
}

function buildModel() {
  const picture = tf.input({ shape: [SIZE, SIZE, 1] });
  const extras = tf.input({ shape: [EXTRAS] });
  let p = tf.layers.conv2d({ filters: 8, kernelSize: 3, activation: "relu", padding: "same" }).apply(picture);
  p = tf.layers.maxPooling2d({ poolSize: 2 }).apply(p);
  p = tf.layers.conv2d({ filters: 16, kernelSize: 3, activation: "relu", padding: "same" }).apply(p);
  p = tf.layers.maxPooling2d({ poolSize: 2 }).apply(p);
  p = tf.layers.flatten().apply(p);
  p = tf.layers.dense({ units: 48, activation: "relu" }).apply(p);
  const e = tf.layers.dense({ units: 8, activation: "relu" }).apply(extras);
  let h = tf.layers.concatenate().apply([p, e]);
  h = tf.layers.dense({ units: 32, activation: "relu" }).apply(h);
  h = tf.layers.dropout({ rate: 0.2 }).apply(h);
  const out = tf.layers.dense({ units: 1, activation: "sigmoid" }).apply(h);
  const model = tf.model({ inputs: [picture, extras], outputs: out });
  model.compile({ optimizer: tf.train.adam(0.002), loss: "binaryCrossentropy", metrics: ["accuracy"] });
  return model;
}

function fileSaveHandler(dir) {
  return tf.io.withSaveHandler(async (artifacts) => {
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "weights.bin"), Buffer.from(artifacts.weightData));
    const modelJson = {
      modelTopology: artifacts.modelTopology,
      format: artifacts.format,
      generatedBy: artifacts.generatedBy,
      convertedBy: artifacts.convertedBy,
      weightsManifest: [{ paths: ["weights.bin"], weights: artifacts.weightSpecs }],
    };
    await writeFile(path.join(dir, "model.json"), JSON.stringify(modelJson));
    return { modelArtifactsInfo: { dateSaved: new Date(), modelTopologyType: "JSON" } };
  });
}

async function main() {
  if (!existsSync(DATA_DIR)) throw new Error(`no examples in ${DATA_DIR} - run npx jiti scripts/ts/alignStrokes.ts --checker first`);
  const shards = readdirSync(DATA_DIR).filter((f) => f.endsWith(".bin")).sort();
  const train = load(shards.slice(0, -1));
  const held = load(shards.slice(-1));
  const rng = makeRng(5);
  const trainRows = Array.from({ length: train.length / ROW }, (_, i) => i).sort(() => rng() - 0.5).slice(0, MAX_ROWS);
  const heldRows = Array.from({ length: held.length / ROW }, (_, i) => i).slice(0, 20000);
  console.log(`[checker] ${trainRows.length} training examples, ${heldRows.length} held out (${shards[shards.length - 1]})`);
  const test = tensors(held, heldRows);
  const model = buildModel();
  for (let epoch = 1; epoch <= EPOCHS; epoch++) {
    const started = Date.now();
    const order = [...trainRows].sort(() => rng() - 0.5);
    for (let start = 0; start < order.length; start += CHUNK) {
      const chunk = tensors(train, order.slice(start, start + CHUNK));
      await model.fit(chunk.x, chunk.y, { epochs: 1, batchSize: 128, verbose: 0 });
      chunk.x.forEach((t) => t.dispose());
      chunk.y.dispose();
    }
    const [loss, acc] = model.evaluate(test.x, test.y).map((t) => t.dataSync()[0]);
    console.log(`  epoch ${epoch}/${EPOCHS}: held-out loss ${loss.toFixed(4)}, accuracy ${(acc * 100).toFixed(2)}% (${Math.round((Date.now() - started) / 1000)}s)`);
    await model.save(fileSaveHandler(OUT_DIR));
  }
  const p = await model.predict(test.x).data();
  const ys = test.ys;
  let tp = 0, fp = 0, fn = 0, tn = 0;
  p.forEach((v, i) => {
    if (v >= 0.5 && ys[i] === 1) tp++;
    else if (v >= 0.5) fp++;
    else if (ys[i] === 1) fn++;
    else tn++;
  });
  const report = {
    model: "symbolcheck",
    trainedAt: new Date().toISOString(),
    trainingExamples: trainRows.length,
    heldOutExamples: heldRows.length,
    heldOutAccuracy: (tp + tn) / ys.length,
    realSymbolsKept: tp / Math.max(1, tp + fn),
    wrongCutsRejected: tn / Math.max(1, tn + fp),
  };
  await writeFile(path.join(OUT_DIR, "report.json"), JSON.stringify(report, null, 2));
  console.log(`Real symbols called real: ${(report.realSymbolsKept * 100).toFixed(1)}%, wrong cuts called wrong: ${(report.wrongCutsRejected * 100).toFixed(1)}%`);
  console.log(`Saved to ${OUT_DIR}`);
}

main();
