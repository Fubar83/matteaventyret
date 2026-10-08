/**
 * Generates stroke-rendered training samples for characters where the real
 * datasets leave a gap in the one style that matters most: ink rendered the
 * way the live recognizer renders it (thin strokes via preprocess.mjs).
 *
 * Why this exists: "1" has ~370 EMNIST samples, but those are scanned
 * bitmaps (thick, blurry), and only ~30 MathWriting ones rendered like live
 * input. Once "(" and ")" joined the character set - with ~300 thin,
 * stroke-rendered samples each - the model learned that a thin, tall, nearly
 * straight stroke is a parenthesis, and started reading real "1"s as ")".
 * These samples teach it what a thin "1" looks like: straight, optionally
 * slanted, with or without a flag at the top or a foot at the bottom.
 *
 * Declared per character in characters.json as { "dataset": "strokes" }.
 * Usage: node scripts/processStrokeTemplates.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CHARACTERS } from "./labels.mjs";
import { preprocessStrokes } from "./preprocess.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = path.join(__dirname, "..", "data", "strokes", "cache");
const SAMPLES_PER_CLASS = 200;

function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Densifies a polyline and adds a little hand jitter, like real pointer input. */
function inked(corners, rng, jitter) {
  const out = [];
  for (let i = 0; i < corners.length - 1; i++) {
    const [a, b] = [corners[i], corners[i + 1]];
    const n = Math.max(2, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 3));
    for (let k = 0; k < n; k++) {
      out.push({ x: a.x + ((b.x - a.x) * k) / n + (rng() - 0.5) * jitter, y: a.y + ((b.y - a.y) * k) / n + (rng() - 0.5) * jitter });
    }
  }
  out.push(corners[corners.length - 1]);
  return out;
}

/** Strokes for one random "1": a straight upright stem (slanted up to ~12 degrees), maybe a flag, maybe a foot (as part of the stem or its own stroke). */
function one(rng) {
  const h = 100;
  const slant = ((rng() - 0.5) * 24 * Math.PI) / 180;
  const top = { x: 50 + Math.tan(slant) * (h / 2), y: 0 };
  const bottom = { x: 50 - Math.tan(slant) * (h / 2), y: h };
  const corners = [];
  if (rng() < 0.65) {
    const flagLen = h * (0.12 + rng() * 0.2);
    const flagAngle = ((200 + rng() * 40) * Math.PI) / 180; // pointing down-left from the top
    corners.push({ x: top.x + Math.cos(flagAngle) * flagLen, y: top.y - Math.sin(flagAngle) * flagLen });
  }
  corners.push(top, bottom);
  const strokes = [];
  const foot = rng() < 0.25;
  const footHalf = h * (0.15 + rng() * 0.12);
  if (foot && rng() < 0.5) {
    corners.push({ x: bottom.x + footHalf, y: bottom.y });
  }
  strokes.push(inked(corners, rng, 1.2));
  if (foot && corners[corners.length - 1] === bottom) {
    strokes.push(inked([{ x: bottom.x - footHalf, y: bottom.y + 1 }, { x: bottom.x + footHalf, y: bottom.y + 1 }], rng, 1));
  }
  return strokes;
}

const GENERATORS = { 1: one };

function main() {
  mkdirSync(CACHE_DIR, { recursive: true });
  const rng = makeRng(7);
  for (const entry of CHARACTERS.filter((e) => e.sources.some((s) => s.dataset === "strokes"))) {
    const gen = GENERATORS[entry.char];
    if (!gen) {
      console.warn(`  ${entry.char}: no stroke generator defined in processStrokeTemplates.mjs - skipping`);
      continue;
    }
    const grids = Array.from({ length: SAMPLES_PER_CLASS }, () => Array.from(preprocessStrokes(gen(rng))));
    const hex = entry.char.charCodeAt(0).toString(16);
    writeFileSync(path.join(CACHE_DIR, `${hex}.json`), JSON.stringify({ char: entry.char, hex, count: grids.length, size: 28, grids }));
    console.log(`  ${entry.char}: generated ${grids.length} stroke-rendered samples`);
  }
}

main();
