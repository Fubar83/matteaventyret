/**
 * Loads the on-device handwriting models and classifies preprocessed strokes
 * into a character (digits, letters, math signs). Two models (see labels.ts):
 * "basic" for number-only input, "full" for free writing. Deliberately
 * never receives the expected answer - see build brief "Correctness rule:
 * the recognizer must never know the expected answer."
 */
import * as tf from "@tensorflow/tfjs";
import { isConfident, topTwo } from "./confidence";
import { DIGIT_INDICES, labelsFor, MIRRORED_DIGIT, type ModelId } from "./labels";
import { preprocessStrokes, RECOGNIZER_INPUT_SIZE, type Stroke } from "./preprocess";
import { forgetAllReadings, InkMemo, inkKey } from "./inkMemo";
import { personalPathFactors } from "./pathMatch";
import { personalSamples, personalVersion } from "./personal";
import { resampleStrokes, STROKE_POINTS } from "./strokeFeatures";
import strokeLabels from "./strokeLabels.json";

/** The stroke model's classes, in its output order (written by scripts/trainStrokeModel.mjs; empty until it has run). */
let STROKE_LABELS: readonly string[] = strokeLabels.labels;

/** A candidate stroke model's classes (its own strokeLabels.json) - for benchmarking it before it's swapped in. */
export function setStrokeLabels(labels: readonly string[]): void {
  STROKE_LABELS = labels;
  strokeModelPromise = null;
  forgetReadings();
}

const modelUrl = (dir: string) => `${import.meta.env.BASE_URL}recognition/${dir}/model.json`;

/**
 * The single model every character used to share, from before the split -
 * standing in for a model that hasn't been trained yet (npm run
 * model:train:basic / model:train:full). Its own classes, in its own order.
 */
const LEGACY_MODEL_DIR = "model";
const LEGACY_LABELS: readonly string[] = [..."0123456789.+-/=x()", "π", "√", "⇒"];

interface LoadedModel {
  model: tf.LayersModel;
  /** The classes `model`'s outputs stand for, in order. */
  labels: readonly string[];
}

const loaded = new Map<ModelId, Promise<LoadedModel>>();
let legacyPromise: Promise<LoadedModel> | null = null;

/**
 * Recognition runs on tfjs's plain CPU backend, not the default WebGL: the
 * models are tiny, and on WebGL every prediction waits for the graphics card
 * to hand its result back. Measured in the browser, reading a page as it's
 * written: 174 ms a read on WebGL (the page froze after every character),
 * 13 ms on the CPU. A page that trains in the browser (the trainer), where
 * the graphics card does help, keeps its backend - keepCurrentBackend().
 */
let keepBackend = false;
let backendChosen: Promise<unknown> | null = null;

export function keepCurrentBackend(): void {
  keepBackend = true;
}

function chooseBackend(): Promise<unknown> {
  if (!backendChosen) backendChosen = keepBackend || tf.getBackend() === "cpu" ? Promise.resolve() : tf.setBackend("cpu").then(() => tf.ready());
  return backendChosen;
}

/** Where model files come from: the app's own server, by default - on the backend recognition runs on. */
let loadFrom: (dir: string) => Promise<tf.LayersModel> = (dir) => chooseBackend().then(() => tf.loadLayersModel(modelUrl(dir)));

/**
 * Loads models some other way - e.g. from disk, to run the recognizer outside
 * the browser (scripts/ts/benchmark.ts). `dir` is the model's folder under
 * public/recognition/ ("model-basic", "model-full", "model").
 */
export function setModelSource(load: (dir: string) => Promise<tf.LayersModel>): void {
  loadFrom = load;
  loaded.clear();
  legacyPromise = null;
  strokeModelPromise = null;
  extraModels.clear();
  forgetReadings();
}

function loadLegacy(): Promise<LoadedModel> {
  if (!legacyPromise) legacyPromise = loadFrom(LEGACY_MODEL_DIR).then((model) => ({ model, labels: LEGACY_LABELS }));
  return legacyPromise;
}

let strokeModelPromise: Promise<tf.LayersModel | null> | null = null;
const extraModels = new Map<string, Promise<tf.LayersModel | null>>();

/** Another model from public/recognition/<dir>/ (the symbol checker), loaded once - or null if there is none. */
export function loadModelDir(dir: string): Promise<tf.LayersModel | null> {
  let p = extraModels.get(dir);
  if (!p) {
    p = loadFrom(dir).catch(() => null);
    extraModels.set(dir, p);
  }
  return p;
}

/** The stroke model (scripts/trainStrokeModel.mjs), or null if none has been trained. */
function loadStrokeModel(): Promise<tf.LayersModel | null> {
  if (!strokeModelPromise) strokeModelPromise = STROKE_LABELS.length === 0 ? Promise.resolve(null) : loadFrom("model-strokes").catch(() => null);
  return strokeModelPromise;
}

/** How strongly the stroke model's opinion counts next to the picture model's (an exponent on its probabilities). */
const STROKE_WEIGHT = 0.5;

/**
 * The stroke model's view of a symbol - how it was drawn, not how it looks -
 * as a factor per character: above 1 where the drawing fits that character
 * better than average, below where worse. Characters it wasn't trained on
 * aren't in the map (neutral). Null without a stroke model.
 */
export function strokeFactors(strokes: Stroke[]): Promise<Map<string, number> | null> {
  return strokeOpinions.get(inkKey(strokes), () => strokeFactorsNow(strokes));
}

async function strokeFactorsNow(strokes: Stroke[]): Promise<Map<string, number> | null> {
  const model = await loadStrokeModel();
  if (!model) return null;
  const input = resampleStrokes(strokes);
  const probs = tf.tidy(() => Array.from((model.predict(tf.tensor3d(input, [1, STROKE_POINTS, 3])) as tf.Tensor).dataSync()));
  const k = STROKE_LABELS.length;
  // Scaled so an even spread (1/k each) is a factor of 1 - only a real preference moves anything.
  return new Map(STROKE_LABELS.map((c, i) => [c, Math.max(probs[i] * k, 1e-3) ** STROKE_WEIGHT]));
}

function loadModel(id: ModelId): Promise<LoadedModel> {
  let p = loaded.get(id);
  if (!p) {
    p = loadFrom(`model-${id}`)
      .then((model) => ({ model, labels: labelsFor(id) }))
      .catch(() => loadLegacy());
    loaded.set(id, p);
  }
  return p;
}

/** Warms up the model(s) so the first real recognition isn't slower than the rest. */
export function preloadRecognizer(models: readonly ModelId[] = ["basic", "full"]): void {
  for (const id of models) void loadModel(id);
}

export interface CharGuess {
  char: string;
  prob: number;
}

export interface RecognitionResult {
  char: string;
  probs: number[];
  /** What each entry of `probs` stands for. */
  labels: readonly string[];
  /** The label indices that were allowed (the level's characters), if restricted. */
  candidates?: number[];
  /** A digit written backwards (basic model only). */
  mirrored: boolean;
  confident: boolean;
  topTwo: { first: CharGuess; second: CharGuess };
}

interface Classified {
  probs: number[];
  labels: readonly string[];
  /** Per digit: how much of its probability came from its mirrored (backwards) class. */
  mirroredShare: number[];
}

/**
 * The model's output probabilities, and the labels they stand for. Only the
 * outputs that still name a label are returned - an installed model can
 * briefly have more output units than its current label set right after a
 * label-set change, until the next retrain; a stale trailing unit must never
 * be chosen as a guess. A backwards digit's class is folded into its digit
 * (they come last - see labels.ts), and only flagged in `mirroredShare`.
 */
/** What the models made of each group of strokes - the page is read again after every pause, mostly the same ink (inkMemo.ts). */
const classified = new InkMemo<Promise<Classified>>();
const strokeOpinions = new InkMemo<Promise<Map<string, number> | null>>();

/** Forgets every remembered reading - when the models change (setModelSource), or this writer's own samples do. */
export function forgetReadings(): void {
  forgetAllReadings();
}

function classify(strokes: Stroke[], canvasSize: number | undefined, id: ModelId): Promise<Classified> {
  // The writer's own samples count in the reading, so a change to them is a different reading.
  return classified.get(`${id}|${canvasSize ?? ""}|${personalVersion()}|${inkKey(strokes)}`, () => classifyNow(strokes, canvasSize, id));
}

async function classifyNow(strokes: Stroke[], canvasSize: number | undefined, id: ModelId): Promise<Classified> {
  const grid = preprocessStrokes(strokes, canvasSize);
  const { model, labels } = await loadModel(id);
  const probs = tf.tidy(() => {
    const input = tf.tensor4d(grid, [1, RECOGNIZER_INPUT_SIZE, RECOGNIZER_INPUT_SIZE, 1]);
    const output = model.predict(input) as tf.Tensor;
    return Array.from(output.dataSync());
  });
  const known = labels.slice(0, probs.length);
  const firstMirrored = known.findIndex((c) => MIRRORED_DIGIT.has(c));
  const plain = firstMirrored < 0 ? known.length : firstMirrored;
  let folded = probs.slice(0, plain);
  const mirrored = new Array(10).fill(0);
  known.slice(plain).forEach((c, k) => {
    const digit = MIRRORED_DIGIT.get(c)!;
    mirrored[digit] += probs[plain + k];
    folded[digit] += probs[plain + k];
  });
  const plainLabels = known.slice(0, plain);
  // This writer's own handwriting: ink like a symbol they've said the meaning of leans towards that meaning.
  // By the picture, and by the pen's path (pathMatch.ts) - whichever finds the closer match.
  const byPicture = await personalFactors(grid, id, model, plainLabels);
  const byPath = personalPathFactors(strokes, plainLabels, personalSamples());
  const personal = byPicture && byPath ? byPicture.map((f, i) => Math.max(f, byPath[i])) : (byPicture ?? byPath);
  if (personal) {
    const weighted = folded.map((p, i) => p * personal[i]);
    const sum = weighted.reduce((a, b) => a + b, 0);
    if (sum > 0) folded = weighted.map((p) => p / sum);
  }
  return { probs: folded, labels: plainLabels, mirroredShare: mirrored.map((m, d) => (folded[d] > 0 ? m / folded[d] : 0)) };
}

/** Per model: the layer the picture model sees a symbol through just before deciding - where "looks alike" is measured. */
const featureModels = new Map<tf.LayersModel, tf.LayersModel | null>();
/** The stored samples' features, per model, for the samples as they were at a version. */
const sampleFeatures = new Map<tf.LayersModel, { version: number; samples: { char: string; features: Float32Array }[] }>();

function featureModel(model: tf.LayersModel): tf.LayersModel | null {
  if (!featureModels.has(model)) {
    const dense = model.layers.filter((l) => l.getClassName() === "Dense");
    const hidden = dense.length >= 2 ? dense[dense.length - 2] : null;
    featureModels.set(model, hidden ? tf.model({ inputs: model.inputs, outputs: hidden.output as tf.SymbolicTensor }) : null);
  }
  return featureModels.get(model)!;
}

function featuresOf(fm: tf.LayersModel, grids: readonly ArrayLike<number>[]): Float32Array[] {
  return tf.tidy(() => {
    const flat = new Float32Array(grids.length * RECOGNIZER_INPUT_SIZE * RECOGNIZER_INPUT_SIZE);
    grids.forEach((g, i) => flat.set(Array.from(g), i * RECOGNIZER_INPUT_SIZE * RECOGNIZER_INPUT_SIZE));
    const out = fm.predict(tf.tensor4d(flat, [grids.length, RECOGNIZER_INPUT_SIZE, RECOGNIZER_INPUT_SIZE, 1])) as tf.Tensor;
    const data = out.dataSync() as Float32Array;
    const size = data.length / grids.length;
    return grids.map((_, i) => data.slice(i * size, (i + 1) * size));
  });
}

function cosine(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na > 0 && nb > 0 ? dot / Math.sqrt(na * nb) : 0;
}

/**
 * How alike (cosine, in the model's own features) ink must be to one of the
 * writer's samples to count, and how much it then counts. Measured on
 * MathWriting (scripts/ts/checkPersonalThresholds.ts), across different
 * writers: 0.85 is passed by 18-28% of same-character pairs and 0.15-0.4% of
 * different ones; one writer's own repeats are far more alike than that.
 */
const PERSONAL_MATCHES = [
  { similarity: 0.92, factor: 3 },
  { similarity: 0.85, factor: 1.8 },
];

/**
 * A factor per label from this writer's own samples (personal.ts): the
 * characters of samples the ink closely resembles count up to a few times
 * more. Null when there are no samples for this model's characters.
 */
async function personalFactors(grid: Float32Array, _id: ModelId, model: tf.LayersModel, labels: readonly string[]): Promise<number[] | null> {
  const samples = personalSamples().filter((s) => labels.includes(s.char));
  if (samples.length === 0) return null;
  const fm = featureModel(model);
  if (!fm) return null;
  let stored = sampleFeatures.get(model);
  if (!stored || stored.version !== personalVersion()) {
    const features = featuresOf(fm, samples.map((s) => s.grid));
    stored = { version: personalVersion(), samples: samples.map((s, i) => ({ char: s.char, features: features[i] })) };
    sampleFeatures.set(model, stored);
  }
  const [mine] = featuresOf(fm, [grid]);
  const best = new Map<string, number>();
  for (const s of stored.samples) best.set(s.char, Math.max(best.get(s.char) ?? 0, cosine(mine, s.features)));
  return labels.map((c) => PERSONAL_MATCHES.find((m) => (best.get(c) ?? 0) >= m.similarity)?.factor ?? 1);
}

/**
 * General recognizer: any character `model` knows - by default the full
 * model's digits, letters and math signs. `probs` is indexed by that model's
 * labels (`labels`).
 */
export async function recognizeStrokes(
  strokes: Stroke[],
  canvasSize?: number,
  model: ModelId = "full",
  allowed?: ReadonlySet<string>,
  /**
   * Evidence the picture can't give, per label (e.g. sizePrior.ts: how usual
   * this symbol's size and height on its line are for each character) - the
   * probabilities are multiplied by it and renormalized before choosing.
   */
  weightsFor?: (labels: readonly string[]) => readonly number[]
): Promise<RecognitionResult> {
  const classified = await classify(strokes, canvasSize, model);
  const { labels, mirroredShare } = classified;
  let probs = classified.probs;
  if (weightsFor) {
    const w = weightsFor(labels);
    const weighted = probs.map((p, i) => p * (w[i] ?? 1));
    const sum = weighted.reduce((a, b) => a + b, 0);
    if (sum > 0) probs = weighted.map((p) => p / sum);
  }
  // A level's own characters only (levels.ts): the rest can't be the answer, so the choice - and the confidence - is among these.
  const candidates = allowed ? labels.flatMap((c, i) => (allowed.has(c) ? [i] : [])) : undefined;
  const tt = topTwo(probs, candidates);
  const char = labels[tt.first.index];
  return {
    char,
    probs,
    labels,
    candidates,
    mirrored: /^[0-9]$/.test(char) && mirroredShare[Number(char)] > 0.5,
    confident: isConfident(probs, candidates, labels),
    topTwo: {
      first: { char: labels[tt.first.index], prob: tt.first.prob },
      second: { char: labels[tt.second.index], prob: tt.second.prob },
    },
  };
}

export interface DigitGuess {
  digit: number;
  prob: number;
}

export interface DigitRecognitionResult {
  digit: number;
  probs: number[];
  /** What each entry of `probs` stands for. */
  labels: readonly string[];
  /** Written backwards (a mirrored "3") - still that digit. */
  mirrored: boolean;
  confident: boolean;
  topTwo: { first: DigitGuess; second: DigitGuess };
}

/**
 * Digit-only recognizer for the game's math cells: the answer domain is
 * closed to 0-9, so top two and confidence are computed among digit classes
 * only, ignoring any sign the model might also see in the ink. Uses the
 * forgiving basic model unless told otherwise.
 */
export async function recognizeDigitStrokes(strokes: Stroke[], canvasSize?: number, model: ModelId = "basic"): Promise<DigitRecognitionResult> {
  const { probs, labels, mirroredShare } = await classify(strokes, canvasSize, model);
  const tt = topTwo(probs, DIGIT_INDICES);
  return {
    digit: tt.first.index,
    probs,
    labels,
    mirrored: mirroredShare[tt.first.index] > 0.5,
    confident: isConfident(probs, DIGIT_INDICES, labels),
    topTwo: {
      first: { digit: tt.first.index, prob: tt.first.prob },
      second: { digit: tt.second.index, prob: tt.second.prob },
    },
  };
}
