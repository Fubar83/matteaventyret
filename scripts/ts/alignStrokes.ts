/**
 * Training data for the learned segmenter (src/mathinput/strokePairs.ts):
 * which strokes of real handwritten expressions belong to the same symbol.
 *
 * MathWriting labels each expression with its LaTeX but not which strokes
 * make which symbol, so this works it out - a forced alignment: the strokes
 * in the order they were drawn are cut into exactly as many consecutive
 * groups as the label has glyphs, choosing the cut where the picture model
 * (public/recognition/model-full) finds each group most like its glyph
 * (dynamic programming over every cut, groups of 1-4 strokes). Glyphs the
 * model doesn't know (\sum, Greek letters beyond its few...) fit any group
 * at a flat score. Alignments the model isn't sure of are dropped, and the
 * agreement with MathWriting's own hand-marked symbols (symbols.jsonl, about
 * 3,400 train expressions) is reported, so the labels can be trusted.
 *
 * Each kept expression's stroke pairs (strokePairs.ts) are written with
 * whether they're one symbol to data/segpairs/<split>.bin: Float32 rows of
 * the features, then the label (0/1), then the expression's number.
 *
 * With --symbols it writes the aligned symbols instead, as training samples
 * for the picture model and the stroke model: up to SYMBOLS_PER_CLASS per
 * character, in data/mwaligned/cache/<hex>.json (28x28 grids, the
 * recognizer's own preprocessing - trainBootstrapModel.mjs pools them) and
 * data/mwalignedstrokes/cache/<hex>.json (pen paths, trainStrokeModel.mjs).
 * Symbols written in real expressions, at their natural size and slant -
 * the "1"s, "("s and ","s the models mix up there. --shard k/n does every
 * n-th expression (run n at once), --merge then combines the shards.
 *
 * Run: npx jiti scripts/ts/alignStrokes.ts [--split train] [--limit N] [--annotated] [--symbols] [--shard k/n] [--merge] (npm run segmenter:align)
 */
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { segmentSymbols } from "../../src/mathinput/segmentation";
import { PAIR_FEATURES, strokePairs, typicalSize } from "../../src/mathinput/strokePairs";
import { strokeBox } from "../../src/mathinput/strokeGeometry";
import { CHECK_EXTRAS, checkerInputs } from "../../src/recognition/symbolCheck";
import { preprocessStrokes, type Stroke } from "../../src/recognition/preprocess";
import { resampleStrokes, STROKE_POINTS } from "../../src/recognition/strokeFeatures";
import { alignLabel, loadModel } from "./alignShared";
import { arg, parseInk, ROOT } from "./benchmarkShared";

const SPLIT = arg("--split") ?? "train";
const LIMIT = Number(arg("--limit") ?? Infinity);
/** Only the expressions MathWriting marked symbols in - to check the alignment against. */
const ANNOTATED_ONLY = process.argv.includes("--annotated");
const MW = path.join(ROOT, "data", "mathwriting", "mathwriting-2024");
const OUT_DIR = path.join(ROOT, "data", "segpairs");
const OUT_FILE = path.join(OUT_DIR, `${SPLIT}${ANNOTATED_ONLY ? "-annotated" : ""}.bin`);
const SYMBOLS = process.argv.includes("--symbols");
/**
 * --checker: examples for the symbol checker (symbolCheck.ts) - each aligned
 * symbol as yes, runs of consecutive strokes that aren't one as no - to
 * data/symcheck/shard-<k>.bin: rows of the 28x28 grid (bytes, 0-255), the
 * checker's extras (Float32) and the answer (a byte).
 */
const CHECKER = process.argv.includes("--checker");
const CHECKER_DIR = path.join(ROOT, "data", "symcheck");
const [SHARD, SHARDS] = (arg("--shard") ?? "0/1").split("/").map(Number);
const SYMBOL_DIR = path.join(ROOT, "data", "mwaligned");
const GRID_DIR = path.join(SYMBOL_DIR, "cache");
const STROKE_DIR = path.join(ROOT, "data", "mwalignedstrokes", "cache");
/** Per character, kept at random from all aligned ones - more than any model trains on, so each run can draw differently. */
const SYMBOLS_PER_CLASS = 2000;

/** Also align expressions with glyphs the model doesn't know (they fit any group, so they're aligned less reliably). */
const ALLOW_UNKNOWN = process.argv.includes("--allow-unknown");

/** Combines the shards' samples: per character, a random SYMBOLS_PER_CLASS of all of them (each shard's weighted by how many it saw). */
function merge() {
  const shards = readdirSync(SYMBOL_DIR).filter((d) => d.startsWith("shard-"));
  const byChar = new Map<string, { seen: number; grids: number[][]; paths: number[][] }[]>();
  for (const shard of shards) {
    for (const file of readdirSync(path.join(SYMBOL_DIR, shard))) {
      const r = JSON.parse(readFileSync(path.join(SYMBOL_DIR, shard, file), "utf8"));
      byChar.set(r.char, [...(byChar.get(r.char) ?? []), r]);
    }
  }
  mkdirSync(GRID_DIR, { recursive: true });
  mkdirSync(STROKE_DIR, { recursive: true });
  let seed = 7;
  const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const counts: string[] = [];
  for (const [char, parts] of byChar) {
    const seen = parts.reduce((a, p) => a + p.seen, 0);
    const grids: number[][] = [];
    const paths: number[][] = [];
    // Each sample stands for seen/kept of its shard's symbols - drawn in proportion, so no shard is over-represented.
    const pool = parts.flatMap((p) => p.grids.map((g, i) => ({ g, s: p.paths[i], w: p.seen / p.grids.length })));
    const order = pool.map((x, i) => ({ i, key: Math.pow(random(), 1 / x.w) })).sort((a, b) => b.key - a.key);
    for (const { i } of order.slice(0, SYMBOLS_PER_CLASS)) {
      grids.push(pool[i].g);
      paths.push(pool[i].s);
    }
    const hex = char.codePointAt(0)!.toString(16);
    const source = `mathwriting train, aligned (${seen} found)`;
    writeFileSync(path.join(GRID_DIR, `${hex}.json`), JSON.stringify({ char, source, grids }));
    writeFileSync(path.join(STROKE_DIR, `${hex}.json`), JSON.stringify({ char, points: STROKE_POINTS, source, sequences: paths }));
    counts.push(`${char} ${grids.length}/${seen}`);
  }
  console.log(`Merged ${shards.length} shards: ${counts.join(", ")}`);
}

async function main() {
  if (process.argv.includes("--merge")) return merge();
  await loadModel();
  const annotations = new Map<string, number[][]>();
  for (const line of readFileSync(path.join(MW, "symbols.jsonl"), "utf8").trim().split("\n")) {
    const { sourceSampleId, strokeIndices } = JSON.parse(line) as { sourceSampleId: string; strokeIndices: number[] };
    annotations.set(sourceSampleId, [...(annotations.get(sourceSampleId) ?? []), strokeIndices]);
  }
  let files = readdirSync(path.join(MW, SPLIT)).filter((f) => f.endsWith(".inkml"));
  if (ANNOTATED_ONLY) files = files.filter((f) => annotations.has(f.replace(".inkml", "")));
  files = files.slice(0, LIMIT).filter((_, i) => i % SHARDS === SHARD);
  mkdirSync(OUT_DIR, { recursive: true });
  if (!SYMBOLS) writeFileSync(OUT_FILE, Buffer.alloc(0));
  /** Per character: a uniform random sample (reservoir) of its aligned symbols' grids and pen paths. */
  const reservoir = new Map<string, { seen: number; grids: number[][]; paths: number[][] }>();
  let seed = 1 + SHARD;
  const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const keepSymbol = (char: string, group: Stroke[]) => {
    const r = reservoir.get(char) ?? { seen: 0, grids: [], paths: [] };
    reservoir.set(char, r);
    r.seen++;
    const slot = r.grids.length < SYMBOLS_PER_CLASS ? r.grids.length : Math.floor(random() * r.seen);
    if (slot >= SYMBOLS_PER_CLASS) return;
    r.grids[slot] = Array.from(preprocessStrokes(group), (v) => Math.round(v * 100) / 100);
    r.paths[slot] = Array.from(resampleStrokes(group), (v) => Math.round(v * 1000) / 1000);
  };

  const stats = { files: 0, usable: 0, kept: 0, pairs: 0, positives: 0 };
  const checkerFile = path.join(CHECKER_DIR, `shard-${SHARD}.bin`);
  if (CHECKER) {
    mkdirSync(CHECKER_DIR, { recursive: true });
    writeFileSync(checkerFile, Buffer.alloc(0));
  }
  let checkerRows: Buffer[] = [];
  const flushChecker = () => {
    if (checkerRows.length) appendFileSync(checkerFile, Buffer.concat(checkerRows));
    checkerRows = [];
  };
  /** Hand-marked symbols the alignment grouped exactly the same - for kept alignments, dropped ones, and the rules (segmentation.ts) on the same expressions. */
  const agree = { kept: [0, 0], dropped: [0, 0], rules: [0, 0], rulesKept: [0, 0] };
  const started = Date.now();
  let buffer: number[] = [];
  const flush = () => {
    if (buffer.length) appendFileSync(OUT_FILE, Buffer.from(new Float32Array(buffer).buffer));
    buffer = [];
  };

  for (const [n, file] of files.entries()) {
    if (n % 2000 === 0) {
      console.log(`  ${n}/${files.length} (${Math.round((Date.now() - started) / 1000)}s): ${stats.kept} kept of ${stats.usable} usable, ${stats.pairs} pairs`);
      flush();
    }
    stats.files++;
    const text = readFileSync(path.join(MW, SPLIT, file), "utf8");
    const label = text.match(/<annotation type="normalizedLabel">([^<]*)<\/annotation>/)?.[1];
    if (!label) continue;
    const plain = label.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
    const traceCount = (text.match(/<trace[ >]/g) ?? []).length;
    const strokes = parseInk(text);
    // Stroke numbers must match MathWriting's (symbols.jsonl counts every trace).
    if (strokes.length !== traceCount) continue;
    const aligned = alignLabel(plain, strokes, ALLOW_UNKNOWN);
    if (!aligned) continue;
    stats.usable++;
    const { result, keep } = aligned;
    const gl = result.glyphs;

    const marked = annotations.get(file.replace(".inkml", ""));
    if (marked) {
      const segmented = segmentSymbols(strokes);
      const ruleGroup = new Map<Stroke, number>();
      segmented.forEach((s, gi) => s.strokes.forEach((st) => ruleGroup.set(st, gi)));
      for (const symbol of marked) {
        const same = (groupOf: (i: number) => number | undefined) => {
          const g = groupOf(symbol[0]);
          const members = strokes.map((_, i) => i).filter((i) => groupOf(i) === g);
          return members.length === symbol.length && symbol.every((i) => members.includes(i));
        };
        const ok = same((i) => result.groupOf[i]);
        if (!ok && keep && process.argv.includes("--show")) console.log(`    MISS ${label}  marked [${symbol}] (${JSON.stringify(marked.length)} marked)  aligned groups: ${result.groupOf.join("")}  glyphs: ${gl.map((g) => g ?? "?").join(" ")}`);
        const bucket = keep ? agree.kept : agree.dropped;
        bucket[0] += ok ? 1 : 0;
        bucket[1]++;
        const rulesOk = same((i) => ruleGroup.get(strokes[i]));
        agree.rules[0] += rulesOk ? 1 : 0;
        agree.rules[1]++;
        if (keep) {
          agree.rulesKept[0] += rulesOk ? 1 : 0;
          agree.rulesKept[1]++;
        }
      }
    }
    if (!keep) continue;
    stats.kept++;
    if (CHECKER) {
      const unit = typicalSize(strokes.map(strokeBox));
      const real = new Set(result.glyphs.map((_, k) => strokes.map((_, i) => i).filter((i) => result.groupOf[i] === k).join(",")));
      const examples: { strokes: Stroke[]; yes: boolean }[] = [];
      // Every run of up to 4 consecutive strokes compact enough to be read as one (as orderDecode.ts tries them).
      for (let t = 0; t < strokes.length; t++) {
        for (let m = 1; m <= 4 && t + m <= strokes.length; m++) {
          const run = strokes.slice(t, t + m);
          const pts = run.flat();
          const size = Math.max(Math.max(...pts.map((p) => p.x)) - Math.min(...pts.map((p) => p.x)), Math.max(...pts.map((p) => p.y)) - Math.min(...pts.map((p) => p.y)));
          if (m > 1 && size > unit * 2.5) break;
          examples.push({ strokes: run, yes: real.has(Array.from({ length: m }, (_, k) => t + k).join(",")) });
        }
      }
      // As many no's as yes's, drawn at random from this expression's.
      const yes = examples.filter((e) => e.yes);
      const no = examples.filter((e) => !e.yes).sort(() => random() - 0.5).slice(0, yes.length);
      for (const e of [...yes, ...no]) {
        const { grid, extras } = checkerInputs(e.strokes, unit);
        const row = Buffer.alloc(784 + CHECK_EXTRAS * 4 + 1);
        grid.forEach((v, i) => row.writeUInt8(Math.round(v * 255), i));
        extras.forEach((v, i) => row.writeFloatLE(v, 784 + i * 4));
        row.writeUInt8(e.yes ? 1 : 0, 784 + CHECK_EXTRAS * 4);
        checkerRows.push(row);
      }
      if (checkerRows.length > 2000) flushChecker();
      continue;
    }
    if (SYMBOLS) {
      result.glyphs.forEach((char, k) => {
        if (char !== null) keepSymbol(char, strokes.filter((_, i) => result.groupOf[i] === k));
      });
      continue;
    }
    for (const p of strokePairs(strokes)) {
      const same = result.groupOf[p.a] === result.groupOf[p.b] ? 1 : 0;
      buffer.push(...p.features, same, n);
      stats.pairs++;
      stats.positives += same;
    }
  }
  flush();
  if (CHECKER) {
    flushChecker();
    console.log(`${SPLIT} shard ${SHARD}/${SHARDS}: ${stats.kept} expressions aligned -> ${checkerFile}`);
    return;
  }
  if (SYMBOLS) {
    const dir = path.join(SYMBOL_DIR, `shard-${SHARD}`);
    mkdirSync(dir, { recursive: true });
    for (const [char, r] of reservoir) writeFileSync(path.join(dir, `${char.codePointAt(0)!.toString(16)}.json`), JSON.stringify({ char, ...r }));
    console.log(`${SPLIT} shard ${SHARD}/${SHARDS}: ${stats.kept} expressions aligned, symbols per character: ${[...reservoir].map(([c, r]) => `${c} ${r.seen}`).join(", ")}`);
    return;
  }
  const pct = ([a, b]: number[]) => (b ? `${((a / b) * 100).toFixed(1)}% of ${b}` : "-");
  console.log(`\n${SPLIT}: ${stats.files} expressions, ${stats.usable} usable, ${stats.kept} aligned confidently (${((stats.kept / Math.max(1, stats.usable)) * 100).toFixed(0)}%)`);
  console.log(`  ${stats.pairs} stroke pairs, ${stats.positives} of them one symbol; ${PAIR_FEATURES.length} features + label + expression per row -> ${OUT_FILE}`);
  console.log(`Hand-marked symbols grouped the same:`);
  console.log(`  kept alignments    ${pct(agree.kept)}   (the rules on the same: ${pct(agree.rulesKept)})`);
  console.log(`  dropped alignments ${pct(agree.dropped)}`);
  console.log(`  rules, all         ${pct(agree.rules)}`);
  console.log(`Took ${Math.round((Date.now() - started) / 1000)}s`);
  if (!existsSync(OUT_FILE)) throw new Error("nothing written");
}

main();
