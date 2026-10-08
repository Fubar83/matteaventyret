/**
 * This writer's own handwriting: symbols they've told us the meaning of
 * (answering "Menade du?"), kept on this device only - never sent anywhere,
 * and separate from the game's save. A child writes their own odd 4 or
 * backwards 3 the same way every time; once they've said what it is, the
 * recognizer leans towards that reading for ink that looks like it
 * (recognizer.ts compares them in the picture model's own feature space).
 *
 * Stored as the same 28x28 grid the models read, and the pen's path (how
 * it was drawn - pathMatch.ts compares new writing with it), at most
 * PER_CHAR per character (oldest go first) and TOTAL overall.
 */
import { preprocessStrokes, type Stroke } from "./preprocess";
import { resampleStrokes } from "./strokeFeatures";

const STORAGE_KEY = "matteaventyret-handwriting-v1";
const PER_CHAR = 20;
const TOTAL = 300;

export interface PersonalSample {
  char: string;
  /** The 28x28 grid, row-major, rounded to two decimals. */
  grid: number[];
  /** The pen's path (strokeFeatures.ts: points of x, y, pen down) - how it was drawn, for pathMatch.ts. Missing in samples saved before paths were. */
  path?: number[];
}

let cache: PersonalSample[] | null = null;
/** Bumped on every change, so anything derived from the samples (their features) knows to recompute. */
let version = 0;

function read(): PersonalSample[] {
  if (cache) return cache;
  try {
    const raw = typeof localStorage === "undefined" ? null : localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as PersonalSample[]) : [];
    cache = Array.isArray(parsed) ? parsed.filter((s) => typeof s.char === "string" && Array.isArray(s.grid)) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(samples: PersonalSample[]) {
  cache = samples;
  version++;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(samples));
  } catch {
    // Storage full or blocked (private window): the samples still help for this session.
  }
}

export function personalSamples(): readonly PersonalSample[] {
  return read();
}

export function personalVersion(): number {
  return version;
}

/** Remembers that this ink means `char` - the writer said so. */
export function rememberInk(strokes: readonly Stroke[], char: string): void {
  const ink = strokes.filter((s) => s.length > 0);
  if (ink.length === 0) return;
  const grid = Array.from(preprocessStrokes([...ink]), (v) => Math.round(v * 100) / 100);
  const path = Array.from(resampleStrokes(ink), (v) => Math.round(v * 1000) / 1000);
  const samples = [...read()];
  const same = samples.filter((s) => s.char === char);
  if (same.length >= PER_CHAR) samples.splice(samples.indexOf(same[0]), 1);
  samples.push({ char, grid, path });
  while (samples.length > TOTAL) samples.shift();
  write(samples);
}

/** Forgets everything learned about this writer's handwriting. */
export function forgetHandwriting(): void {
  write([]);
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing stored.
  }
}
