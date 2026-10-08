/**
 * Trains one of the two recognizer models (see src/recognition/labels.ts) - a
 * small CNN, one per model, not one per source - and exports it to
 * public/recognition/model-<basic|full>/:
 *   - basic: digits and arithmetic signs only, heavily augmented so it
 *     forgives messy handwriting (the game's boxes, the column templates)
 *   - full: every character in characters.json (free writing)
 * Each character class pools REAL
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
 *   node scripts/trainBootstrapModel.mjs --model basic   (npm run model:train:basic)
 *   node scripts/trainBootstrapModel.mjs --model full    (npm run model:train:full)
 * Pure-JS tfjs (tfjs-node has no prebuilt binary for this Node/Windows, and
 * the WASM backend can't train convolutions), so this is slow - basic takes
 * about an hour, full a few. The two can run at the same time.
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
import { CHARACTERS, labelsFor, MODEL_IDS } from "./labels.mjs";
import { augmentGrid, MILD_AUGMENT, randomAugment, rasterize, STRONG_AUGMENT } from "./rasterize.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Served at runtime from public/ (Vite only serves static, fetchable files
// from there); a copy of the same report also goes to src/recognition/model/
// so the documented source-of-truth location in the repo stays informative.
const MODEL_ID = (() => {
  const i = process.argv.indexOf("--model");
  const id = i >= 0 ? process.argv[i + 1] : undefined;
  if (!MODEL_IDS.includes(id)) {
    console.error(`Usage: node scripts/trainBootstrapModel.mjs --model <${MODEL_IDS.join("|")}>`);
    process.exit(1);
  }
  return id;
})();

/**
 * Per model: how many samples per class, the network's size, and how its
 * training images are varied. `reaugment` is the share of the training set
 * swapped each epoch for a fresh random variation of the same sample, so
 * the model sees a sample written many slightly different ways rather than
 * memorizing one - the basic model's tolerance comes mostly from this plus
 * STRONG_AUGMENT.
 */
const CONFIGS = {
  basic: { samplesPerChar: 400, epochs: 20, conv: [8, 16], dense: 64, augment: STRONG_AUGMENT, reaugment: 0.6 },
  full: { samplesPerChar: 250, epochs: 14, conv: [10, 20], dense: 96, augment: MILD_AUGMENT, reaugment: 0.3 },
};
/**
 * `--preset large`: a bigger network trained longer on more samples per
 * class - about 5x the training time (12 h or so for full on pure-JS tfjs).
 */
const LARGE = {
  basic: { samplesPerChar: 500, epochs: 25, conv: [12, 24], dense: 96, augment: STRONG_AUGMENT, reaugment: 0.6 },
  full: { samplesPerChar: 400, epochs: 20, conv: [16, 32], dense: 128, augment: MILD_AUGMENT, reaugment: 0.3 },
};
const argValue = (name) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const PRESET = argValue("--preset") === "large" ? LARGE[MODEL_ID] : CONFIGS[MODEL_ID];
/**
 * Overrides, for longer runs on more data: --samples <per class>,
 * --epochs <n>, --conv <a,b>, --dense <n>.
 */
const CONFIG = {
  ...PRESET,
  ...(argValue("--samples") ? { samplesPerChar: Number(argValue("--samples")) } : {}),
  ...(argValue("--epochs") ? { epochs: Number(argValue("--epochs")) } : {}),
  ...(argValue("--conv") ? { conv: argValue("--conv").split(",").map(Number) } : {}),
  ...(argValue("--dense") ? { dense: Number(argValue("--dense")) } : {}),
};

/**
 * `--out <folder>`: write the model to public/recognition/<folder>/ instead of
 * the live one - a candidate to benchmark against it before swapping it in
 * (npx jiti scripts/ts/benchmarkProfiles.ts --full-dir <folder>).
 */
const OUT_NAME = argValue("--out");
const OUT_DIR = path.join(__dirname, "..", "public", "recognition", OUT_NAME ?? `model-${MODEL_ID}`);
/** The live model's report is kept beside its source; a candidate's stays with the candidate only. */
const DOC_DIR = OUT_NAME ? null : path.join(__dirname, "..", "src", "recognition", `model-${MODEL_ID}`);
const REAL_DATA_CACHE_DIRS = [
  path.join(__dirname, "..", "data", "mathwriting", "cache"),
  path.join(__dirname, "..", "data", "emnist", "cache"),
  path.join(__dirname, "..", "data", "hasy", "cache"),
  // Synthetic but stroke-rendered, for gaps the real sets leave - see scripts/processStrokeTemplates.mjs.
  path.join(__dirname, "..", "data", "strokes", "cache"),
  // Symbols cut out of MathWriting's 230k handwritten expressions - see scripts/ts/extractMathWriting.ts.
  path.join(__dirname, "..", "data", "mwtrain", "cache"),
  // Symbols from MathWriting's expressions grouped by forced alignment - see scripts/ts/alignStrokes.ts --symbols.
  path.join(__dirname, "..", "data", "mwaligned", "cache"),
  // Our own samples, from Träningsverkstan - see scripts/importOwnSamples.mjs.
  path.join(__dirname, "..", "data", "own", "cache"),
];
const LABELS = labelsFor(MODEL_ID);
const SAMPLES_PER_CHAR = CONFIG.samplesPerChar;
const SIZE = 28;
const NUM_CLASSES = LABELS.length;

/** A 28x28 grid flipped left-right - a digit written backwards. */
function mirrorGrid(grid) {
  const out = new Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) out[y * SIZE + x] = grid[y * SIZE + (SIZE - 1 - x)];
  return out;
}

/** Real samples for a class: a mirrored digit's are its digit's own, flipped (characters.json "mirrorOf"). */
function samplesFor(char, rng) {
  const entry = CHARACTERS.find((e) => e.char === char);
  if (entry?.mirrorOf === undefined) return loadRealCache(char, rng);
  return loadRealCache(entry.mirrorOf, rng)?.map(mirrorGrid) ?? null;
}

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

/**
 * Splits each class 80/20 into train/test on its own (so every class, however
 * small, is represented in the hold-out set), then tops a class's TRAIN part
 * up to its share of SAMPLES_PER_CHAR with augmented copies of its own real
 * training samples if it has fewer than that. Without the top-up, a class with
 * ~30 real samples (e.g. "=") sits next to digits with 400 each and the model
 * learns to all but never predict it. Augmented copies are made only from
 * training samples and only go into training, so the hold-out accuracy is
 * still measured on untouched real samples.
 */
function buildDataset(rng) {
  const train = { images: [], labels: [] };
  const test = { images: [], labels: [] };
  const realClasses = [];
  const syntheticClasses = [];
  const toppedUp = {};
  const trainTarget = Math.round(SAMPLES_PER_CHAR * 0.8);
  LABELS.forEach((char, classIndex) => {
    const real = samplesFor(char, rng);
    if (real) {
      const samples = real.slice(0, SAMPLES_PER_CHAR).map((g) => Float32Array.from(g));
      const splitAt = Math.max(1, Math.round(samples.length * 0.8));
      const trainPart = samples.slice(0, splitAt);
      for (const g of trainPart) {
        train.images.push(g);
        train.labels.push(classIndex);
      }
      for (const g of samples.slice(splitAt)) {
        test.images.push(g);
        test.labels.push(classIndex);
      }
      if (trainPart.length < trainTarget) {
        const extra = trainTarget - trainPart.length;
        for (let i = 0; i < extra; i++) {
          train.images.push(augmentGrid(trainPart[Math.floor(rng() * trainPart.length)], rng, SIZE, CONFIG.augment));
          train.labels.push(classIndex);
        }
        toppedUp[char] = { real: samples.length, augmentedAdded: extra };
      }
      realClasses.push(char);
      return;
    }
    const template = CHAR_TEMPLATES[char];
    if (!template) throw new Error(`No bootstrap template for character ${JSON.stringify(char)}`);
    for (let i = 0; i < SAMPLES_PER_CHAR; i++) {
      const aug = randomAugment(rng);
      const target = i < trainTarget ? train : test;
      target.images.push(rasterize(template, { size: SIZE, ...aug }));
      target.labels.push(classIndex);
    }
    syntheticClasses.push(char);
  });
  console.log(`  ${realClasses.length} classes from real samples, ${syntheticClasses.length} classes still synthetic`);
  for (const [char, t] of Object.entries(toppedUp)) console.log(`  ${char}: only ${t.real} real samples - topped up with ${t.augmentedAdded} augmented copies (train only)`);
  return { train, test, realClasses, syntheticClasses, toppedUp };
}

function buildModel() {
  const model = tf.sequential();
  const [conv1, conv2] = CONFIG.conv;
  model.add(tf.layers.conv2d({ inputShape: [SIZE, SIZE, 1], filters: conv1, kernelSize: 3, activation: "relu", padding: "same" }));
  model.add(tf.layers.maxPooling2d({ poolSize: 2 }));
  model.add(tf.layers.conv2d({ filters: conv2, kernelSize: 3, activation: "relu", padding: "same" }));
  model.add(tf.layers.maxPooling2d({ poolSize: 2 }));
  model.add(tf.layers.flatten());
  model.add(tf.layers.dense({ units: CONFIG.dense, activation: "relu" }));
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
  console.log(`[${MODEL_ID}] Building dataset for ${NUM_CLASSES} classes (up to ${SAMPLES_PER_CHAR} samples each)...`);
  console.time("buildDataset");
  const dataset = buildDataset(rng);
  const { realClasses, syntheticClasses, toppedUp } = dataset;
  console.timeEnd("buildDataset");

  // The train/test split already happened per class in buildDataset (80/20,
  // matching the brief's ratio); training order still needs shuffling.
  const shuffled = (n) => {
    const order = Array.from({ length: n }, (_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    return order;
  };

  const toTensors = ({ images, labels }) => {
    // A preallocated typed array + set() avoids building a giant boxed JS
    // array via flatMap/Array.from first, which got dramatically slower once
    // the label set (and so the dataset) grew from 22 to 82 classes.
    const idx = shuffled(images.length);
    const pixelsPerImage = SIZE * SIZE;
    const flat = new Float32Array(idx.length * pixelsPerImage);
    idx.forEach((i, row) => flat.set(images[i], row * pixelsPerImage));
    const xs = tf.tensor4d(flat, [idx.length, SIZE, SIZE, 1]);
    const ys = tf.oneHot(tf.tensor1d(idx.map((i) => labels[i]), "int32"), NUM_CLASSES);
    return { xs, ys, labels: idx.map((i) => labels[i]) };
  };

  const test = toTensors(dataset.test);

  // A fresh variation of part of the training set every epoch (see CONFIG.reaugment).
  const trainEpoch = () => ({
    images: dataset.train.images.map((g) => (rng() < CONFIG.reaugment ? augmentGrid(g, rng, SIZE, CONFIG.augment) : g)),
    labels: dataset.train.labels,
  });

  const model = buildModel();
  console.log(`Training (${dataset.train.images.length} training samples, ${CONFIG.epochs} epochs)...`);
  for (let epoch = 0; epoch < CONFIG.epochs; epoch++) {
    const epochStart = Date.now();
    const train = toTensors(trainEpoch());
    const history = await model.fit(train.xs, train.ys, { epochs: 1, batchSize: 64, validationData: [test.xs, test.ys], verbose: 0 });
    train.xs.dispose();
    train.ys.dispose();
    const logs = Object.fromEntries(Object.entries(history.history).map(([k, v]) => [k, v[0]]));
    const elapsed = ((Date.now() - epochStart) / 1000).toFixed(1);
    console.log(`  epoch ${epoch + 1}/${CONFIG.epochs}: loss=${logs.loss.toFixed(3)} acc=${logs.acc.toFixed(3)} val_acc=${logs.val_acc.toFixed(3)} (${elapsed}s)`);
    // A candidate is saved after every epoch, so a long run cut short still leaves a model to benchmark.
    if (OUT_NAME && epoch < CONFIG.epochs - 1) await model.save(fileSaveHandler(OUT_DIR));
  }

  const evalResult = model.evaluate(test.xs, test.ys);
  const testAcc = (await evalResult[1].data())[0];
  console.log(`Final test accuracy on hold-out: ${(testAcc * 100).toFixed(1)}%`);

  // Per-class hold-out accuracy - the overall number hides a weak small class
  // (a few dozen samples) behind hundreds of well-learned digits.
  const predicted = await model.predict(test.xs).argMax(-1).data();
  const perClass = {};
  LABELS.forEach((char) => (perClass[char] = { correct: 0, total: 0 }));
  test.labels.forEach((label, i) => {
    const entry = perClass[LABELS[label]];
    entry.total++;
    if (predicted[i] === label) entry.correct++;
  });
  const perClassTestAccuracy = Object.fromEntries(
    Object.entries(perClass).map(([char, { correct, total }]) => [char, total === 0 ? null : Math.round((correct / total) * 1000) / 1000])
  );
  console.log(
    "  per class: " + Object.entries(perClass).map(([char, { correct, total }]) => `${char} ${correct}/${total}`).join("  ")
  );

  await model.save(fileSaveHandler(OUT_DIR));

  const report = {
    model: MODEL_ID,
    kind: realClasses.length > 0 ? "bootstrap-mixed" : "bootstrap-synthetic",
    trainedAt: new Date().toISOString(),
    numClasses: NUM_CLASSES,
    samplesPerChar: SAMPLES_PER_CHAR,
    config: CONFIG,
    testAccuracy: testAcc,
    perClassTestAccuracy,
    toppedUpClasses: toppedUp,
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
  if (DOC_DIR) {
    await mkdir(DOC_DIR, { recursive: true });
    await writeFile(path.join(DOC_DIR, "report.json"), JSON.stringify(report, null, 2));
    await writeFile(
      path.join(DOC_DIR, "README.md"),
      "The actual model files served at runtime live in `public/recognition/model-" + MODEL_ID + "/` " +
        "(Vite only serves static assets from `public/`). This directory keeps the " +
        "training report for reference. See `scripts/trainBootstrapModel.mjs`.\n"
    );
  }
  console.log(`Model written to ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
