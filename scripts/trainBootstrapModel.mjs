/**
 * Trains a small CNN on synthetic, geometrically-generated digit images and
 * exports it to src/recognition/model/. This is a bootstrap model only - it
 * exists so the recognizer pipeline is real and testable end to end before
 * any actual children's handwriting has been collected via Träningsverkstan
 * (see build brief: real samples need parental consent). Run with:
 *   node scripts/trainBootstrapModel.mjs
 */
import * as tf from "@tensorflow/tfjs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CHAR_TEMPLATES } from "./charTemplates.mjs";
import { LABELS } from "./labels.mjs";
import { randomAugment, rasterize } from "./rasterize.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Served at runtime from public/ (Vite only serves static, fetchable files
// from there); a copy of the same report also goes to src/recognition/model/
// so the documented source-of-truth location in the repo stays informative.
const OUT_DIR = path.join(__dirname, "..", "public", "recognition", "model");
const DOC_DIR = path.join(__dirname, "..", "src", "recognition", "model");
const SAMPLES_PER_CHAR = 400;
const SIZE = 28;
const NUM_CLASSES = LABELS.length;

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

function buildDataset(rng) {
  const images = [];
  const labels = [];
  LABELS.forEach((char, classIndex) => {
    const template = CHAR_TEMPLATES[char];
    if (!template) throw new Error(`No bootstrap template for character ${JSON.stringify(char)}`);
    for (let i = 0; i < SAMPLES_PER_CHAR; i++) {
      const aug = randomAugment(rng);
      const grid = rasterize(template, { size: SIZE, ...aug });
      images.push(grid);
      labels.push(classIndex);
    }
  });
  return { images, labels };
}

function buildModel() {
  const model = tf.sequential();
  model.add(tf.layers.conv2d({ inputShape: [SIZE, SIZE, 1], filters: 8, kernelSize: 3, activation: "relu", padding: "same" }));
  model.add(tf.layers.maxPooling2d({ poolSize: 2 }));
  model.add(tf.layers.conv2d({ filters: 16, kernelSize: 3, activation: "relu", padding: "same" }));
  model.add(tf.layers.maxPooling2d({ poolSize: 2 }));
  model.add(tf.layers.flatten());
  model.add(tf.layers.dense({ units: 32, activation: "relu" }));
  model.add(tf.layers.dropout({ rate: 0.2 }));
  model.add(tf.layers.dense({ units: NUM_CLASSES, activation: "softmax" }));
  model.compile({ optimizer: tf.train.adam(0.001), loss: "categoricalCrossentropy", metrics: ["accuracy"] });
  return model;
}

/** A minimal file-writing IOHandler, since plain @tensorflow/tfjs has no file:// scheme in Node (that needs tfjs-node). */
function fileSaveHandler(dir) {
  return tf.io.withSaveHandler(async (artifacts) => {
    await mkdir(dir, { recursive: true });
    const weightsFileName = "weights.bin";
    await writeFile(path.join(dir, weightsFileName), Buffer.from(artifacts.weightData));
    const modelJson = {
      modelTopology: artifacts.modelTopology,
      format: artifacts.format,
      generatedBy: artifacts.generatedBy,
      convertedBy: artifacts.convertedBy,
      weightsManifest: [{ paths: [weightsFileName], weights: artifacts.weightSpecs }],
    };
    await writeFile(path.join(dir, "model.json"), JSON.stringify(modelJson));
    return { modelArtifactsInfo: { dateSaved: new Date(), modelTopologyType: "JSON" } };
  });
}

async function main() {
  const rng = makeRng(42);
  console.log(`Generating ${SAMPLES_PER_CHAR * NUM_CLASSES} synthetic samples across ${NUM_CLASSES} classes...`);
  console.time("buildDataset");
  const { images, labels } = buildDataset(rng);
  console.timeEnd("buildDataset");

  // Shuffle then split 80/20, matching the brief's train/test split ratio.
  console.time("shuffle");
  const order = images.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const splitAt = Math.floor(order.length * 0.8);
  const trainIdx = order.slice(0, splitAt);
  const testIdx = order.slice(splitAt);
  console.timeEnd("shuffle");

  const toTensors = (idx) => {
    // A preallocated typed array + set() avoids building a giant boxed JS
    // array via flatMap/Array.from first, which got dramatically slower once
    // the label set (and so the dataset) grew from 22 to 82 classes.
    const pixelsPerImage = SIZE * SIZE;
    const flat = new Float32Array(idx.length * pixelsPerImage);
    idx.forEach((i, row) => flat.set(images[i], row * pixelsPerImage));
    const xs = tf.tensor4d(flat, [idx.length, SIZE, SIZE, 1]);
    const ys = tf.oneHot(tf.tensor1d(idx.map((i) => labels[i]), "int32"), NUM_CLASSES);
    return { xs, ys };
  };

  console.time("toTensors");
  const train = toTensors(trainIdx);
  const test = toTensors(testIdx);
  console.timeEnd("toTensors");

  const model = buildModel();
  console.log("Training...");
  let epochStart = Date.now();
  await model.fit(train.xs, train.ys, {
    epochs: 14,
    batchSize: 64,
    validationData: [test.xs, test.ys],
    verbose: 0,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        const elapsed = ((Date.now() - epochStart) / 1000).toFixed(1);
        epochStart = Date.now();
        console.log(`  epoch ${epoch + 1}: loss=${logs.loss.toFixed(3)} acc=${logs.acc.toFixed(3)} val_acc=${logs.val_acc.toFixed(3)} (${elapsed}s)`);
      },
    },
  });

  const evalResult = model.evaluate(test.xs, test.ys);
  const testAcc = (await evalResult[1].data())[0];
  console.log(`Final test accuracy on synthetic hold-out: ${(testAcc * 100).toFixed(1)}%`);

  await model.save(fileSaveHandler(OUT_DIR));

  const report = {
    kind: "bootstrap-synthetic",
    trainedAt: new Date().toISOString(),
    numClasses: NUM_CLASSES,
    samplesPerChar: SAMPLES_PER_CHAR,
    testAccuracy: testAcc,
    note: "Trained on geometric synthetic digits/letters/signs, NOT real handwriting. Replace via Träningsverkstan once real, consented samples are collected (see build brief). Look-alike case pairs (e.g. C/c, O/o, S/s) are especially undertrained here and need real samples to tell apart.",
  };
  await writeFile(path.join(OUT_DIR, "report.json"), JSON.stringify(report, null, 2));
  await mkdir(DOC_DIR, { recursive: true });
  await writeFile(path.join(DOC_DIR, "report.json"), JSON.stringify(report, null, 2));
  await writeFile(
    path.join(DOC_DIR, "README.md"),
    "The actual model files served at runtime live in `public/recognition/model/` " +
      "(Vite only serves static assets from `public/`). This directory keeps the " +
      "training report for reference. See `scripts/trainBootstrapModel.mjs`.\n"
  );
  console.log(`Model written to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
