/**
 * Trains the stroke model: how a symbol was DRAWN rather than how it looks -
 * its pen path as 48 points (x, y, pen just came down), from real handwriting
 * (data/mwstrokes/cache, made by scripts/ts/extractContext.ts). A "1" and a
 * "7", a "5" and an "s", a "(" and a "1" can make near-identical pictures
 * but are drawn differently; the recognizer combines this model's guess with
 * the picture model's (src/recognition/recognizer.ts).
 *
 * A small 1-D convolution over the points. Pure-JS tfjs like the picture
 * models, so it runs in the background - but it's far smaller (a few
 * minutes to tens of minutes). Exported to public/recognition/model-strokes/
 * with its labels in report.json - only the characters there were samples for.
 *
 * Run: node scripts/trainStrokeModel.mjs   (npm run model:train:strokes)
 */
import * as tf from "@tensorflow/tfjs";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Pen paths per character: from expressions cut by the rules (extractContext.ts) and by forced alignment (alignStrokes.ts --symbols). */
const DATA_DIRS = [path.join(__dirname, "..", "data", "mwstrokes", "cache"), path.join(__dirname, "..", "data", "mwalignedstrokes", "cache")];
const argValue = (name) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
/** --out <folder>: a candidate in public/recognition/<folder>/, its labels beside it, instead of the live model. */
const OUT_NAME = argValue("--out");
const OUT_DIR = path.join(__dirname, "..", "public", "recognition", OUT_NAME ?? "model-strokes");
const POINTS = 48;
/** A class needs at least this many samples to be learned at all. */
const MIN_SAMPLES = 40;
const EPOCHS = Number(argValue("--epochs") ?? 15);
/** At most this many real paths per character (the rest of a big class isn't needed). */
const MAX_PER_CLASS = Number(argValue("--max") ?? 3000);

function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The same pen path slightly rotated, stretched and wobbled - so the model learns the drawing, not one writer's exact hand. */
function vary(seq, rng) {
  const angle = (rng() - 0.5) * 0.35;
  const sx = 1 + (rng() - 0.5) * 0.25;
  const sy = 1 + (rng() - 0.5) * 0.25;
  const shear = (rng() - 0.5) * 0.3;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const out = new Float32Array(seq.length);
  for (let k = 0; k < POINTS; k++) {
    const x = seq[k * 3] * sx + seq[k * 3 + 1] * shear;
    const y = seq[k * 3 + 1] * sy;
    out[k * 3] = (x * cos - y * sin + (rng() - 0.5) * 0.04);
    out[k * 3 + 1] = (x * sin + y * cos + (rng() - 0.5) * 0.04);
    out[k * 3 + 2] = seq[k * 3 + 2];
  }
  return out;
}

function loadData(rng) {
  const pooled = new Map();
  for (const dir of DATA_DIRS.filter(existsSync)) {
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
      const { char, sequences } = JSON.parse(readFileSync(path.join(dir, file), "utf8"));
      pooled.set(char, [...(pooled.get(char) ?? []), ...sequences]);
    }
  }
  const byClass = [];
  for (const [char, sequences] of pooled) {
    if (sequences.length < MIN_SAMPLES) continue;
    const shuffled = [...sequences];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    byClass.push({ char, sequences: shuffled.slice(0, MAX_PER_CLASS).map((s) => Float32Array.from(s)) });
  }
  byClass.sort((a, b) => (a.char < b.char ? -1 : 1));
  const labels = byClass.map((c) => c.char);
  const train = { xs: [], ys: [] };
  const test = { xs: [], ys: [] };
  byClass.forEach(({ sequences }, ci) => {
    const shuffled = [...sequences];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const cut = Math.round(shuffled.length * 0.8);
    shuffled.forEach((s, i) => {
      const target = i < cut ? train : test;
      target.xs.push(s);
      target.ys.push(ci);
    });
    // Small classes topped up with varied copies (train only), like the picture models.
    for (let extra = cut; extra < 250; extra++) {
      train.xs.push(vary(shuffled[Math.floor(rng() * cut)], rng));
      train.ys.push(ci);
    }
  });
  return { labels, train, test };
}

function toTensors({ xs, ys }, numClasses) {
  const flat = new Float32Array(xs.length * POINTS * 3);
  xs.forEach((x, i) => flat.set(x, i * POINTS * 3));
  return { x: tf.tensor3d(flat, [xs.length, POINTS, 3]), y: tf.oneHot(tf.tensor1d(ys, "int32"), numClasses), labels: ys };
}

function buildModel(numClasses) {
  const model = tf.sequential();
  model.add(tf.layers.conv1d({ inputShape: [POINTS, 3], filters: 16, kernelSize: 5, padding: "same", activation: "relu" }));
  model.add(tf.layers.maxPooling1d({ poolSize: 2 }));
  model.add(tf.layers.conv1d({ filters: 32, kernelSize: 5, padding: "same", activation: "relu" }));
  model.add(tf.layers.maxPooling1d({ poolSize: 2 }));
  model.add(tf.layers.conv1d({ filters: 32, kernelSize: 3, padding: "same", activation: "relu" }));
  model.add(tf.layers.flatten());
  model.add(tf.layers.dense({ units: 64, activation: "relu" }));
  model.add(tf.layers.dropout({ rate: 0.3 }));
  model.add(tf.layers.dense({ units: numClasses, activation: "softmax" }));
  model.compile({ optimizer: tf.train.adam(0.002), loss: "categoricalCrossentropy", metrics: ["accuracy"] });
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
  if (!DATA_DIRS.some(existsSync)) throw new Error(`no stroke data in ${DATA_DIRS.join(" or ")} - run npm run context:extract first`);
  const rng = makeRng(7);
  const { labels, train, test } = loadData(rng);
  console.log(`[strokes] ${labels.length} classes, ${train.xs.length} train / ${test.xs.length} test`);
  const testT = toTensors(test, labels.length);
  const model = buildModel(labels.length);
  for (let epoch = 1; epoch <= EPOCHS; epoch++) {
    // A fresh variation of half the training set each epoch.
    const epochData = { xs: train.xs.map((s) => (rng() < 0.5 ? vary(s, rng) : s)), ys: train.ys };
    const order = epochData.xs.map((_, i) => i).sort(() => rng() - 0.5);
    const t = toTensors({ xs: order.map((i) => epochData.xs[i]), ys: order.map((i) => epochData.ys[i]) }, labels.length);
    const h = await model.fit(t.x, t.y, { epochs: 1, batchSize: 128, validationData: [testT.x, testT.y], verbose: 0 });
    t.x.dispose();
    t.y.dispose();
    console.log(`  epoch ${epoch}/${EPOCHS}: acc ${(h.history.acc[0] * 100).toFixed(1)}%  test ${(h.history.val_acc[0] * 100).toFixed(1)}%`);
  }
  const predicted = await model.predict(testT.x).argMax(-1).data();
  const perClass = {};
  labels.forEach((c, ci) => {
    const idx = testT.labels.flatMap((l, i) => (l === ci ? [i] : []));
    perClass[c] = idx.length ? idx.filter((i) => predicted[i] === ci).length / idx.length : null;
  });
  const acc = testT.labels.filter((l, i) => predicted[i] === l).length / testT.labels.length;
  console.log(`Test accuracy: ${(acc * 100).toFixed(1)}%`);
  await model.save(fileSaveHandler(OUT_DIR));
  await writeFile(
    path.join(OUT_DIR, "report.json"),
    JSON.stringify({ model: "strokes", trainedAt: new Date().toISOString(), points: POINTS, labels, testAccuracy: acc, perClassTestAccuracy: perClass }, null, 2)
  );
  // The app imports the labels at build time (the model itself is fetched at runtime).
  // A candidate's labels stay beside it until it's swapped in.
  const labelsFile = OUT_NAME ? path.join(OUT_DIR, "strokeLabels.json") : path.join(__dirname, "..", "src", "recognition", "strokeLabels.json");
  await writeFile(labelsFile, JSON.stringify({ labels }) + "\n");
  console.log(`Saved to ${OUT_DIR}`);
}

main();
