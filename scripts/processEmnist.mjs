/**
 * Turns EMNIST's ByClass split (real handwritten digits and letters, derived
 * from NIST Special Database 19 but already normalized to 28x28 grayscale in
 * the classic MNIST binary format - see
 * https://www.nist.gov/itl/products-and-services/emnist-dataset) into
 * per-class cache files trainBootstrapModel.mjs can pick up automatically.
 *
 * Unlike raw NIST SD19 (hundreds of thousands of individual PNGs spread
 * across per-writer folders inside a ~1GB zip), EMNIST's images are already
 * decoded-size, single fixed-size binary files - no image-decoding library,
 * no per-class zip extraction, no resizing needed. The only real gotcha:
 * EMNIST's raw images are stored rotated 90° and flipped relative to how
 * they're meant to look (a well-known, widely-documented quirk of how NIST's
 * own conversion script wrote them) - transposing each 28x28 image (swap row
 * and column) is the standard fix.
 *
 * Usage: node scripts/processEmnist.mjs [char ...]
 *   No args: processes every character src/recognition/characters.json
 *   declares an "emnist" source for.
 *   With args: just those characters, e.g.: node scripts/processEmnist.mjs 0 1 a
 *   (still must be declared with an emnist source in characters.json - add
 *   it there first if it's a new character, so that file stays the one
 *   place that says where every character's data comes from).
 *
 * Requires data/emnist/gzip.zip (download from
 * https://biometrics.nist.gov/cs_links/EMNIST/gzip.zip, ~536MB) to already
 * be in place.
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import { CHARACTERS } from "./labels.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data", "emnist");
const ZIP_PATH = path.join(DATA_DIR, "gzip.zip");
const EXTRACT_DIR = path.join(DATA_DIR, "_extract");
const CACHE_DIR = path.join(DATA_DIR, "cache");
const SIZE = 28;
const SAMPLES_PER_CLASS = 500;

const EMNIST_CHARS = CHARACTERS.filter((entry) => entry.sources.some((s) => s.dataset === "emnist")).map((entry) => entry.char);

function hexClassFor(char) {
  return char.charCodeAt(0).toString(16);
}

function cachePathFor(char) {
  return path.join(CACHE_DIR, `${hexClassFor(char)}.json`);
}

/** The zip's inner gzip'd IDX files are only extracted once, then decompressed and kept as plain .ubyte files for fast re-reads across multiple runs of this script. */
function ensureExtracted() {
  const marker = path.join(EXTRACT_DIR, "gzip", "emnist-byclass-mapping.txt");
  if (existsSync(marker)) return;
  if (!existsSync(ZIP_PATH)) {
    console.error(`Missing ${ZIP_PATH} - download it from https://biometrics.nist.gov/cs_links/EMNIST/gzip.zip first.`);
    process.exit(1);
  }
  mkdirSync(EXTRACT_DIR, { recursive: true });
  console.log("Extracting gzip.zip (one-time)...");
  execSync(`unzip -q -o "${ZIP_PATH}" -d "${EXTRACT_DIR}"`, { stdio: "inherit" });
}

function readGz(name) {
  const gzPath = path.join(EXTRACT_DIR, "gzip", name);
  return gunzipSync(readFileSync(gzPath));
}

/** classIndex -> character, from EMNIST's own mapping file (index, ASCII code pairs) - NOT assumed, since ByClass's index order doesn't have to match ASCII order. */
function loadMapping() {
  const text = readFileSync(path.join(EXTRACT_DIR, "gzip", "emnist-byclass-mapping.txt"), "utf8");
  const map = new Map(); // classIndex -> char
  for (const line of text.trim().split("\n")) {
    const [indexStr, asciiStr] = line.trim().split(/\s+/);
    map.set(Number(indexStr), String.fromCharCode(Number(asciiStr)));
  }
  return map;
}

/** Parses a classic MNIST-format idx3-ubyte (images) buffer into {count, rows, cols, images}, where images[i] is a Uint8Array view into the raw pixel data for image i. */
function parseIdx3(buf) {
  const count = buf.readUInt32BE(4);
  const rows = buf.readUInt32BE(8);
  const cols = buf.readUInt32BE(12);
  const headerSize = 16;
  const imageSize = rows * cols;
  const images = [];
  for (let i = 0; i < count; i++) {
    const start = headerSize + i * imageSize;
    images.push(buf.subarray(start, start + imageSize));
  }
  return { count, rows, cols, images };
}

function parseIdx1(buf) {
  const count = buf.readUInt32BE(4);
  const headerSize = 8;
  return Array.from(buf.subarray(headerSize, headerSize + count));
}

/** Undoes EMNIST's well-known rotate+flip quirk (see module header) and normalizes to [0,1] float - already white-ink-on-black like our own pipeline expects, so no inversion needed (unlike raw NIST SD19 scans). */
function toGrid(rawImage, rows, cols) {
  const grid = new Float32Array(SIZE * SIZE);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      // Transpose: EMNIST stores (x, y) where we want (y, x).
      grid[y * cols + x] = rawImage[x * rows + y] / 255;
    }
  }
  return grid;
}

function pickIndices(total, n) {
  if (total <= n) return Array.from({ length: total }, (_, i) => i);
  const step = total / n;
  const picked = [];
  for (let i = 0; i < n; i++) picked.push(Math.floor(i * step));
  return picked;
}

function main() {
  ensureExtracted();
  const mapping = loadMapping();
  const charToClassIndex = new Map(Array.from(mapping.entries()).map(([idx, char]) => [char, idx]));

  console.log("Loading EMNIST ByClass (train split)...");
  console.time("load");
  const { rows, cols, images } = parseIdx3(readGz("emnist-byclass-train-images-idx3-ubyte.gz"));
  const labels = parseIdx1(readGz("emnist-byclass-train-labels-idx1-ubyte.gz"));
  console.timeEnd("load");

  // Group image indices by class index once, up front, instead of scanning
  // all 814,255 labels again for every character we process.
  console.time("group");
  const byClassIndex = new Map();
  labels.forEach((classIndex, i) => {
    const list = byClassIndex.get(classIndex) ?? [];
    list.push(i);
    byClassIndex.set(classIndex, list);
  });
  console.timeEnd("group");

  const requested = process.argv.slice(2);
  const chars = requested.length > 0 ? requested : EMNIST_CHARS;
  mkdirSync(CACHE_DIR, { recursive: true });

  for (const char of chars) {
    if (!EMNIST_CHARS.includes(char)) {
      console.warn(`Skipping "${char}": characters.json doesn't declare an "emnist" source for it - add one there first.`);
      continue;
    }
    const outPath = cachePathFor(char);
    if (existsSync(outPath)) {
      console.log(`  ${char}: already cached, skipping`);
      continue;
    }
    const classIndex = charToClassIndex.get(char);
    if (classIndex === undefined) {
      console.warn(`  ${char}: not found in EMNIST's mapping - skipping`);
      continue;
    }
    const allIndices = byClassIndex.get(classIndex) ?? [];
    const sampleIndices = pickIndices(allIndices.length, SAMPLES_PER_CLASS).map((i) => allIndices[i]);
    const grids = sampleIndices.map((i) => Array.from(toGrid(images[i], rows, cols)));
    writeFileSync(outPath, JSON.stringify({ char, hex: hexClassFor(char), count: grids.length, size: SIZE, grids }));
    console.log(`  ${char}: cached ${grids.length} samples (of ${allIndices.length} available)`);
  }
  console.log("Done.");
}

main();
