/**
 * In-browser fine-tuning on collected samples (see build brief "Train a new
 * model"). Scope note: this trains a fresh small CNN on the collected
 * samples only (no bundled base dataset is shipped), and skips the fuller
 * per-style/per-age/confusion-matrix evaluation from the brief - a
 * reasonable v1 cut, to be extended once real sample volume justifies it.
 */
import * as tf from "@tensorflow/tfjs";
import { DEFAULT_CANVAS_SIZE } from "../game/DigitCanvas";
import { charToIndex, LABELS, NUM_CLASSES } from "../recognition/labels";
import { preprocessStrokes, RECOGNIZER_INPUT_SIZE } from "../recognition/preprocess";
import type { StoredSample } from "./sampleStore";

const MIN_SAMPLES_TO_TRAIN = 20;

function buildModel() {
  const model = tf.sequential();
  const size = RECOGNIZER_INPUT_SIZE;
  model.add(tf.layers.conv2d({ inputShape: [size, size, 1], filters: 8, kernelSize: 3, activation: "relu", padding: "same" }));
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

/** Trains on the given samples and triggers a browser download of model.json + weights. Returns test-set accuracy. */
export async function trainAndDownload(allSamples: StoredSample[]): Promise<number> {
  // Drop samples for characters outside the currently active label set (e.g. leftover
  // letter samples while letters are disabled) rather than failing on them.
  const samples = allSamples.filter((s) => LABELS.includes(s.label));
  if (samples.length < MIN_SAMPLES_TO_TRAIN) {
    throw new Error(`Behöver minst ${MIN_SAMPLES_TO_TRAIN} samples (har ${samples.length}).`);
  }

  const size = RECOGNIZER_INPUT_SIZE;
  const shuffled = [...samples].sort(() => Math.random() - 0.5);
  const splitAt = Math.floor(shuffled.length * 0.8);
  const trainSamples = shuffled.slice(0, splitAt);
  const testSamples = shuffled.slice(splitAt);

  const toTensors = (list: StoredSample[]) => {
    // Every Träningsverkstan sample (collect and test tabs) is drawn on the standalone
    // default-size canvas, past and present, so this is exact, not a guess.
    const grids = list.map((s) => preprocessStrokes(s.strokes, DEFAULT_CANVAS_SIZE));
    const xs = tf.tensor4d(
      grids.flatMap((g) => Array.from(g)),
      [list.length, size, size, 1]
    );
    const ys = tf.oneHot(
      tf.tensor1d(
        list.map((s) => charToIndex(s.label)),
        "int32"
      ),
      NUM_CLASSES
    );
    return { xs, ys };
  };

  const train = toTensors(trainSamples);
  const test = toTensors(testSamples.length > 0 ? testSamples : trainSamples);

  const model = buildModel();
  await model.fit(train.xs, train.ys, { epochs: 15, batchSize: 16, validationData: [test.xs, test.ys], verbose: 0 });

  const evalResult = model.evaluate(test.xs, test.ys) as tf.Scalar[];
  const acc = (await evalResult[1].data())[0];

  await model.save("downloads://matteaventyret-handwriting-model");
  return acc;
}
