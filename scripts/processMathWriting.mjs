/**
 * Turns MathWriting (real handwritten math, Google Research 2024 -
 * https://github.com/google-research/google-research/blob/master/mathwriting/README.md,
 * CC BY-NC-SA 4.0) into per-class cache files trainBootstrapModel.mjs can
 * pick up automatically, for whichever characters
 * src/recognition/characters.json declares a "mathwriting" source for.
 *
 * Unlike EMNIST (pre-decoded fixed-size binary) or HASYv2 (pre-rendered PNG
 * bitmaps), MathWriting ships raw pen strokes (x/y/t per point) - the same
 * shape our own recognizer already works with. So instead of writing yet
 * another resize/normalize implementation, this script runs the extracted
 * strokes through preprocess.mjs, the exact plain-JS mirror of
 * src/recognition/preprocess.ts that the live recognizer uses at inference
 * time - real ink in, model-ready grids out, with no separate preprocessing
 * path that could quietly drift from what recognition.ts actually does.
 *
 * MathWriting's symbols aren't stored pre-isolated like the other two
 * sources: symbols.jsonl says WHICH strokes (by index) of WHICH full
 * expression (by sample id, always in train/) make up one labeled symbol
 * instance - this script parses the referenced expression's InkML, slices
 * out just those strokes, and treats that as one training sample.
 *
 * Usage: node scripts/processMathWriting.mjs [char ...]
 *   No args: processes every character characters.json declares a
 *   "mathwriting" source for.
 *   With args: just those, e.g.: node scripts/processMathWriting.mjs 0 1 x
 *   (still must already have a "mathwriting" source in characters.json).
 *
 * Requires data/mathwriting/mathwriting-2024.tgz (download from
 * https://storage.googleapis.com/mathwriting_data/mathwriting-2024.tgz,
 * ~2.9GB) or the excerpt (mathwriting-2024-excerpt.tgz, ~1.5MB, for quick
 * testing) to already be extracted into data/mathwriting/.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CHARACTERS } from "./labels.mjs";
import { preprocessStrokes } from "./preprocess.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_ROOT = path.join(__dirname, "..", "data", "mathwriting");
const CACHE_DIR = path.join(DATA_ROOT, "cache");
const SAMPLES_PER_CLASS = 500;

// The full dataset extracts to mathwriting-2024/, the small test bundle to
// mathwriting-2024-excerpt/ - whichever is actually present wins, so this
// script works unmodified against either while you're still waiting on the
// full ~2.9GB download.
function findDataDir() {
  for (const name of ["mathwriting-2024", "mathwriting-2024-excerpt"]) {
    const p = path.join(DATA_ROOT, name);
    if (existsSync(path.join(p, "symbols.jsonl"))) return p;
  }
  console.error(`No extracted MathWriting data found under ${DATA_ROOT} - download and \`tar -xzf\` mathwriting-2024.tgz (or the excerpt) first.`);
  process.exit(1);
}

// char -> every "mathwriting" source characters.json declares for it. A
// character can pull from more than one MathWriting label (e.g. "(" takes
// real "(" samples plus ")" samples mirrored - see TRANSFORMS), all pooled
// into the one cache file for that character.
const CHAR_TO_SOURCES = new Map(
  CHARACTERS.filter((entry) => entry.sources.some((s) => s.dataset === "mathwriting")).map((entry) => [
    entry.char,
    entry.sources.filter((s) => s.dataset === "mathwriting"),
  ])
);

/** Optional per-source stroke transforms, applied to the raw ink before preprocessing. */
const TRANSFORMS = {
  mirrorX: (strokes) => strokes.map((s) => s.map((p) => ({ x: -p.x, y: p.y }))),
};

function hexClassFor(char) {
  return char.charCodeAt(0).toString(16);
}

function cachePathFor(char) {
  return path.join(CACHE_DIR, `${hexClassFor(char)}.json`);
}

function pickSample(items, n) {
  if (items.length <= n) return items;
  const step = items.length / n;
  const picked = [];
  for (let i = 0; i < n; i++) picked.push(items[Math.floor(i * step)]);
  return picked;
}

/** Parses every <trace id="N">x y t,x y t,...</trace> in an InkML file into {id -> Stroke}. Simple regex parsing is fine here - MathWriting's InkML is a fixed, uncomplicated shape (checked directly), and pulling in a real XML parser dependency isn't worth it for one tag. */
function parseTraces(inkml) {
  const traces = new Map();
  const traceRe = /<trace id="(\d+)">([^<]*)<\/trace>/g;
  let m;
  while ((m = traceRe.exec(inkml))) {
    const id = Number(m[1]);
    const points = m[2]
      .trim()
      .split(",")
      .map((triplet) => {
        const [x, y] = triplet.trim().split(/\s+/).map(Number);
        return { x, y };
      });
    traces.set(id, points);
  }
  return traces;
}

function main() {
  const dataDir = findDataDir();
  const requested = process.argv.slice(2);
  const chars = requested.length > 0 ? requested : Array.from(CHAR_TO_SOURCES.keys());

  console.log(`Reading symbols.jsonl from ${dataDir}...`);
  const entriesByLabel = new Map();
  for (const line of readFileSync(path.join(dataDir, "symbols.jsonl"), "utf8").trim().split("\n")) {
    const entry = JSON.parse(line);
    const list = entriesByLabel.get(entry.label) ?? [];
    list.push(entry);
    entriesByLabel.set(entry.label, list);
  }

  mkdirSync(CACHE_DIR, { recursive: true });
  const trainDir = path.join(dataDir, "train");

  for (const char of chars) {
    const sources = CHAR_TO_SOURCES.get(char);
    if (!sources) {
      console.warn(`Skipping "${char}": characters.json doesn't declare a "mathwriting" source for it - add one there first.`);
      continue;
    }
    const outPath = cachePathFor(char);
    if (existsSync(outPath)) {
      console.log(`  ${char}: already cached, skipping`);
      continue;
    }

    const grids = [];
    const summary = [];
    for (const source of sources) {
      const transform = source.transform ? TRANSFORMS[source.transform] : (strokes) => strokes;
      if (!transform) throw new Error(`characters.json: unknown transform ${JSON.stringify(source.transform)} for ${JSON.stringify(char)}`);
      const entries = entriesByLabel.get(source.latex) ?? [];
      if (entries.length === 0) {
        console.warn(`  ${char} (${source.latex}): no instances found in symbols.jsonl`);
        continue;
      }
      const sampled = pickSample(entries, SAMPLES_PER_CLASS);

      // Group by source file so each expression's InkML is only parsed once,
      // even if we need several different symbol instances out of it.
      const bySource = new Map();
      for (const entry of sampled) {
        const list = bySource.get(entry.sourceSampleId) ?? [];
        list.push(entry.strokeIndices);
        bySource.set(entry.sourceSampleId, list);
      }

      let count = 0;
      for (const [sourceId, strokeIndexLists] of bySource) {
        const inkmlPath = path.join(trainDir, `${sourceId}.inkml`);
        if (!existsSync(inkmlPath)) continue; // symbols.jsonl entries always reference train/, but stay defensive
        const traces = parseTraces(readFileSync(inkmlPath, "utf8"));
        for (const indices of strokeIndexLists) {
          const strokes = indices.map((i) => traces.get(i)).filter(Boolean);
          if (strokes.length === 0) continue;
          grids.push(Array.from(preprocessStrokes(transform(strokes))));
          count++;
        }
      }
      summary.push(`${count} from ${source.latex}${source.transform ? ` (${source.transform})` : ""}`);
    }
    if (grids.length === 0) continue;

    writeFileSync(outPath, JSON.stringify({ char, hex: hexClassFor(char), count: grids.length, size: 28, grids }));
    console.log(`  ${char}: cached ${grids.length} samples (${summary.join(", ")})`);
  }
  console.log("Done.");
}

main();
