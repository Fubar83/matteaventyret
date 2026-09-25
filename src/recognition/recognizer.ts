/**
 * Loads the on-device handwriting model and classifies preprocessed strokes
 * into a character from `LABELS` (digits, letters, math signs). Deliberately
 * never receives the expected answer - see build brief "Correctness rule:
 * the recognizer must never know the expected answer."
 */
import * as tf from "@tensorflow/tfjs";
import { isConfident, topTwo } from "./confidence";
import { DIGIT_INDICES, indexToChar, LABELS } from "./labels";
import { preprocessStrokes, RECOGNIZER_INPUT_SIZE, type Stroke } from "./preprocess";

const MODEL_URL = `${import.meta.env.BASE_URL}recognition/model/model.json`;

let modelPromise: Promise<tf.LayersModel> | null = null;

function loadModel(): Promise<tf.LayersModel> {
  if (!modelPromise) modelPromise = tf.loadLayersModel(MODEL_URL);
  return modelPromise;
}

/** Warms up the model so the first real recognition isn't slower than the rest. */
export function preloadRecognizer(): void {
  void loadModel();
}

export interface CharGuess {
  char: string;
  prob: number;
}

export interface RecognitionResult {
  char: string;
  probs: number[];
  confident: boolean;
  topTwo: { first: CharGuess; second: CharGuess };
}

async function classify(strokes: Stroke[], canvasSize?: number): Promise<number[]> {
  const grid = preprocessStrokes(strokes, canvasSize);
  const model = await loadModel();
  return tf.tidy(() => {
    const input = tf.tensor4d(grid, [1, RECOGNIZER_INPUT_SIZE, RECOGNIZER_INPUT_SIZE, 1]);
    const output = model.predict(input) as tf.Tensor;
    return Array.from(output.dataSync());
  });
}

/**
 * General recognizer: any character in `LABELS` (digits, letters, math signs).
 * Used by the trainer's test tab. Candidates are clamped to indices that are
 * still valid class labels - a currently-installed model can briefly have
 * more (or differently-ordered) output units than the current LABELS set
 * right after a label-set change, until the next retrain/export; without
 * this clamp, a stale trailing output unit could be chosen as the top guess
 * and indexToChar would throw instead of just ignoring it.
 */
export async function recognizeStrokes(strokes: Stroke[], canvasSize?: number): Promise<RecognitionResult> {
  const probs = await classify(strokes, canvasSize);
  const validIndices = probs.length <= LABELS.length ? undefined : probs.map((_, i) => i).filter((i) => i < LABELS.length);
  const tt = topTwo(probs, validIndices);
  return {
    char: indexToChar(tt.first.index),
    probs,
    confident: isConfident(probs, validIndices),
    topTwo: {
      first: { char: indexToChar(tt.first.index), prob: tt.first.prob },
      second: { char: indexToChar(tt.second.index), prob: tt.second.prob },
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
  confident: boolean;
  topTwo: { first: DigitGuess; second: DigitGuess };
}

/**
 * Digit-only recognizer for the game's math cells: the answer domain is
 * closed to 0-9, so top two and confidence are computed among digit classes
 * only, ignoring any letter/sign the general model might also see in the ink.
 */
export async function recognizeDigitStrokes(strokes: Stroke[], canvasSize?: number): Promise<DigitRecognitionResult> {
  const probs = await classify(strokes, canvasSize);
  const tt = topTwo(probs, DIGIT_INDICES);
  return {
    digit: tt.first.index,
    probs,
    confident: isConfident(probs, DIGIT_INDICES),
    topTwo: {
      first: { digit: tt.first.index, prob: tt.first.prob },
      second: { digit: tt.second.index, prob: tt.second.prob },
    },
  };
}
