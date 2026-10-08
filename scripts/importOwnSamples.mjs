/**
 * Turns our own handwriting samples - exported from Träningsverkstan with
 * "Exportera streck (JSON)", collected with a guardian's consent - into
 * training data. These are the only samples written by children: every public
 * dataset is adults' writing, so they're what teaches the recognizer how the
 * youngest actually write.
 *
 * Put the exported .json files in data/own/, then:
 *   node scripts/importOwnSamples.mjs      (npm run own:import)
 * and retrain (npm run model:train:basic / model:train:full) - the training
 * script pools data/own/cache/ with the other sources.
 *
 * Each sample runs through the recognizer's own preprocessing at the canvas
 * size it was drawn on. Labels are mapped to the model's classes: C, P, V are
 * one class with c, p, v (layout.ts decides the case), and anything neither
 * model knows (an "l", an "o") is skipped and reported.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { CHARACTERS } from "./labels.mjs";
import { preprocessStrokes } from "./preprocess.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(__dirname, "..", "data", "own");
const CACHE_DIR = path.join(DIR, "cache");
const KNOWN = new Set(CHARACTERS.map((c) => c.char));
const CASE_MERGED = { C: "c", P: "p", V: "v", "×": "x", "·": "." };

if (!existsSync(DIR)) {
  console.error(`No ${DIR} - export samples from Träningsverkstan ("Exportera streck (JSON)") and put the files there.`);
  process.exit(1);
}
const files = readdirSync(DIR).filter((f) => f.endsWith(".json"));
const byClass = new Map();
const skipped = new Map();
for (const file of files) {
  const data = JSON.parse(readFileSync(path.join(DIR, file), "utf8"));
  if (data.format !== "matteaventyret-samples/1") {
    console.warn(`  ${file}: not a Träningsverkstan stroke export, skipped`);
    continue;
  }
  for (const sample of data.samples) {
    const label = CASE_MERGED[sample.label] ?? sample.label;
    if (!KNOWN.has(label)) {
      skipped.set(sample.label, (skipped.get(sample.label) ?? 0) + 1);
      continue;
    }
    const grid = Array.from(preprocessStrokes(sample.strokes, data.canvasSize), (v) => Math.round(v * 100) / 100);
    byClass.set(label, [...(byClass.get(label) ?? []), grid]);
  }
}
mkdirSync(CACHE_DIR, { recursive: true });
for (const [char, grids] of byClass) {
  writeFileSync(path.join(CACHE_DIR, `${char.charCodeAt(0).toString(16)}.json`), JSON.stringify({ char, source: "own (Träningsverkstan)", grids }));
}
console.log(`${files.length} file(s): ${[...byClass].map(([c, g]) => `${c}:${g.length}`).join("  ") || "no samples"}`);
if (skipped.size > 0) console.log(`skipped (no such class): ${[...skipped].map(([c, n]) => `${c}:${n}`).join("  ")}`);
