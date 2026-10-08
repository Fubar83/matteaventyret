/**
 * Turns HASYv2 (real handwritten LaTeX symbols, crowdsourced via Detexify -
 * see https://zenodo.org/records/259444 and the paper at
 * arxiv.org/abs/1701.08380) into per-class cache files trainBootstrapModel.mjs
 * can pick up automatically, the same way scripts/processEmnist.mjs does for
 * digits/letters - for whichever characters src/recognition/characters.json
 * declares a "hasy" source for (using that entry's "latex" field to look the
 * symbol up in HASYv2's own data). "=" and "(", ")" have no real samples in
 * HASYv2 at all - nobody looks up how to draw those on Detexify - so they can
 * never get a "hasy" source no matter what's added to characters.json.
 *
 * Known-good latex values if you're adding a new character's source (checked
 * directly against HASYv2's symbols.csv): π "\pi", × "\times", ÷ "\div",
 * √ "\sqrt{}", + "+", - "-", < "<", > ">", / "/".
 *
 * Usage: node scripts/processHasy.mjs [char ...]
 *   No args: processes every character characters.json declares a "hasy"
 *   source for.
 *   With args: just those, e.g.: node scripts/processHasy.mjs + -
 *   (still must already have a "hasy" source in characters.json).
 *
 * Requires data/hasy/ to already contain the extracted HASYv2.tar.bz2
 * (download from https://zenodo.org/records/259444/files/HASYv2.tar.bz2,
 * ~34.6MB, then `tar -xjf HASYv2.tar.bz2` inside data/hasy/).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";
import { CHARACTERS } from "./labels.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data", "hasy");
const CACHE_DIR = path.join(DATA_DIR, "cache");
const SIZE = 28;
const SAMPLES_PER_CLASS = 500;

// char -> every HASYv2 "latex" column value characters.json declares a "hasy"
// source for (e.g. "⇒" pools both \Rightarrow and \Longrightarrow).
const CHAR_TO_LATEX = new Map(
  CHARACTERS.filter((entry) => entry.sources.some((s) => s.dataset === "hasy")).map((entry) => [
    entry.char,
    entry.sources.filter((s) => s.dataset === "hasy").map((s) => s.latex),
  ])
);

// charCodeAt (not codePointAt) to exactly match trainBootstrapModel.mjs's own
// lookup and processEmnist.mjs's convention - equivalent here since every
// character below sits in the Basic Multilingual Plane (one UTF-16 unit).
function hexClassFor(char) {
  return char.charCodeAt(0).toString(16);
}

function cachePathFor(char) {
  return path.join(CACHE_DIR, `${hexClassFor(char)}.json`);
}

function parseCsv(text) {
  const lines = text.trim().split("\n");
  const header = lines[0].split(",");
  return lines.slice(1).map((line) => {
    // None of our columns' values contain commas, so a plain split is safe here.
    const cells = line.split(",");
    const row = {};
    header.forEach((key, i) => (row[key] = cells[i]));
    return row;
  });
}

/** Nearest-neighbour resize to SIZE x SIZE, grayscale, inverted to our white-ink-on-black convention (HASYv2 is dark ink on a white canvas, like a scanned page - the opposite of what preprocessStrokes produces). */
function pngToGrid(png) {
  const { width, height, data } = png;
  const grid = new Float32Array(SIZE * SIZE);
  for (let gy = 0; gy < SIZE; gy++) {
    for (let gx = 0; gx < SIZE; gx++) {
      const sx = Math.min(width - 1, Math.floor((gx / SIZE) * width));
      const sy = Math.min(height - 1, Math.floor((gy / SIZE) * height));
      const idx = (sy * width + sx) * 4;
      const gray = (data[idx] + data[idx + 1] + data[idx + 2]) / 3 / 255;
      grid[gy * SIZE + gx] = 1 - gray;
    }
  }
  return grid;
}

function pickSample(items, n) {
  if (items.length <= n) return items;
  const step = items.length / n;
  const picked = [];
  for (let i = 0; i < n; i++) picked.push(items[Math.floor(i * step)]);
  return picked;
}

function main() {
  const labelsCsvPath = path.join(DATA_DIR, "hasy-data-labels.csv");
  if (!existsSync(labelsCsvPath)) {
    console.error(`Missing ${labelsCsvPath} - extract HASYv2.tar.bz2 into data/hasy/ first.`);
    process.exit(1);
  }

  const requested = process.argv.slice(2);
  const chars = requested.length > 0 ? requested : Array.from(CHAR_TO_LATEX.keys());

  console.log("Reading hasy-data-labels.csv...");
  const rows = parseCsv(readFileSync(labelsCsvPath, "utf8"));
  const pathsByLatex = new Map();
  for (const row of rows) {
    const list = pathsByLatex.get(row.latex) ?? [];
    list.push(row.path);
    pathsByLatex.set(row.latex, list);
  }

  mkdirSync(CACHE_DIR, { recursive: true });
  for (const char of chars) {
    const latexes = CHAR_TO_LATEX.get(char);
    if (!latexes) {
      console.warn(`Skipping "${char}": characters.json doesn't declare a "hasy" source for it - add one there first (see this file's header for known-good latex values).`);
      continue;
    }
    const outPath = cachePathFor(char);
    if (existsSync(outPath)) {
      console.log(`  ${char}: already cached, skipping`);
      continue;
    }
    const allPaths = latexes.flatMap((latex) => pathsByLatex.get(latex) ?? []);
    if (allPaths.length === 0) {
      console.warn(`  ${char} (${latexes.join(", ")}): no images found - skipping`);
      continue;
    }
    const samplePaths = pickSample(allPaths, SAMPLES_PER_CLASS);
    const grids = samplePaths.map((p) => Array.from(pngToGrid(PNG.sync.read(readFileSync(path.join(DATA_DIR, p))))));
    writeFileSync(outPath, JSON.stringify({ char, hex: hexClassFor(char), count: grids.length, size: SIZE, grids }));
    console.log(`  ${char} (${latexes.join(", ")}): cached ${grids.length} samples (of ${allPaths.length} available)`);
  }
  console.log("Done.");
}

main();
