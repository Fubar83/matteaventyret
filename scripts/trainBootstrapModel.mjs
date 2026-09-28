/**
 * Trains a single small CNN - one combined model, not one per source - and
 * exports it to src/recognition/model/. Each character class pools REAL
 * handwriting samples from every source that has a cache file for it:
 *   - MathWriting (Google Research, 2024 - see scripts/processMathWriting.mjs),
 *     the primary source: real pen strokes, run through the exact same
 *     preprocessing the live recognizer uses
 *   - EMNIST's ByClass split (digits/letters - see scripts/processEmnist.mjs)
 *   - HASYv2 (math signs crowdsourced via Detexify - see scripts/processHasy.mjs)
 * A character present in more than one source gets samples from all of them,
 * shuffled together (see loadRealCache) rather than just the first source
 * found. Anything with no real samples anywhere falls back to a geometric
 * synthetic shape (charTemplates.mjs) instead. Run with:
 *   node scripts/trainBootstrapModel.mjs
 * Populate whichever of data/{mathwriting,emnist,hasy}/cache/ you want first
 * (the process*.mjs scripts don't touch each other's files, so they can run
 * at the same time); with none populated, this falls back to fully
 * synthetic, exactly like the original bootstrap.
 */
import * as tf from "@tensorflow/tfjs";
import { existsSync, readFileSync } from "node:fs";
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
const REAL_DATA_CACHE_DIRS = [
  path.join(__dirname, "..", "data", "mathwriting", "cache"),
  path.join(__dirname, "..", "data", "emnist", "cache"),
  path.join(__dirname, "..", "data", "hasy", "cache"),
];
const SAMPLES_PER_CHAR = 400;
const SIZE = 28;
const NUM_CLASSES = LABELS.length;

/** Combines every source that has real samples for this character (not just the first match), shuffled together so a later, smaller source's samples aren't all truncated away if the combined pool gets capped to SAMPLES_PER_CHAR. */
function loadRealCache(char, rng) {
  const hex = char.charCodeAt(0).toString(16);
  const combined = [];
  for (const dir of REAL_DATA_CACHE_DIRS) {
    const p = path.join(dir, `${hex}.json`);
    if (existsSync(p)) combined.push(...JSON.parse(readFileSync(p, "utf8")).grids);
  }
  if (combined.length === 0) return null;
  for (let i = combined.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [combined[i], combined[j]] = [combined[j], combined[i]];
  }
  return combined;
}

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
  const realClasses = [];
  const syntheticClasses = [];
  LABELS.forEach((char, classIndex) => {
    const real = loadRealCache(char, rng);
    if (real) {
      const n = Math.min(real.length, SAMPLES_PER_CHAR);
      for (let i = 0; i < n; i++) {
        images.push(Float32Array.from(real[i]));
        labels.push(classIndex);
      }
      realClasses.push(char);
      return;
    }
    const template = CHAR_TEMPLATES[char];
    if (!template) throw new Error(`No bootstrap template for character ${JSON.stringify(char)}`);
    for (let i = 0; i < SAMPLES_PER_CHAR; i++) {
      const aug = randomAugment(rng);
      const grid = rasterize(template, { size: SIZE, ...aug });
      images.push(grid);
      labels.push(classIndex);
    }
    syntheticClasses.push(char);
  });
  console.log(`  ${realClasses.length} classes from real (EMNIST/HASYv2) samples, ${syntheticClasses.length} classes still synthetic`);
  return { images, labels, realClasses, syntheticClasses };
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
  console.log(`Building dataset for ${NUM_CLASSES} classes (up to ${SAMPLES_PER_CHAR} samples each)...`);
  console.time("buildDataset");
  const { images, labels, realClasses, syntheticClasses } = buildDataset(rng);
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
  console.log(`Final test accuracy on hold-out: ${(testAcc * 100).toFixed(1)}%`);

  await model.save(fileSaveHandler(OUT_DIR));

  const report = {
    kind: realClasses.length > 0 ? "bootstrap-mixed" : "bootstrap-synthetic",
    trainedAt: new Date().toISOString(),
    numClasses: NUM_CLASSES,
    samplesPerChar: SAMPLES_PER_CHAR,
    testAccuracy: testAcc,
    realDataClasses: realClasses,
    syntheticDataClasses: syntheticClasses,
    note:
      realClasses.length === 0
        ? "Trained on geometric synthetic digits/letters/signs, NOT real handwriting. Replace via Träningsverkstan once real, consented samples are collected (see build brief). Look-alike case pairs (e.g. C/c, O/o, S/s) are especially undertrained here and need real samples to tell apart."
        : syntheticClasses.length === 0
          ? `All ${realClasses.length} classes trained on real handwriting, pooled from every source characters.json declares for each (see realDataClasses and characters.json's own "sources" per character for exactly which).`
          : `${realClasses.length} classes trained on real handwriting (see realDataClasses and characters.json's own "sources" per character for exactly which datasets); ${syntheticClasses.length} classes (${syntheticClasses.map((c) => JSON.stringify(c)).join(", ")}) have no real samples in any configured source and are still geometric synthetic shapes. Replace those via Träningsverkstan once real, consented samples are collected.`,
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
