/**
 * How often the ink is cut into the right number of symbols - the rules in
 * segmentation.ts against the learned segmenter (strokePairs.ts) at several
 * thresholds. No classifier, so it's quick: for tuning the threshold the
 * learned segmenter joins pairs at (segmenter.json's "threshold").
 * MathWriting expressions using only characters the app reads.
 *
 * Run: npx jiti scripts/ts/benchmarkSegmentation.ts [split, default valid] [thresholds, e.g. 0.4,0.5,0.6]   (npm run benchmark:segmentation)
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { segmentSymbols } from "../../src/mathinput/segmentation";
import type { Stroke } from "../../src/recognition/preprocess";
import segmenter from "../../src/recognition/segmenter.json";
import { readExpression, ROOT, tokens } from "./benchmarkShared";

const SPLIT = process.argv[2] ?? "valid";
const THRESHOLDS = (process.argv[3] ?? String(segmenter.threshold)).split(",").map(Number);
const KNOWN = /^(\\(frac|cdot|times|pi|sqrt|approx|pm|%|circ|Delta|int|sin|cos|tan|lg|log|ln|le|ge|ne|infty|alpha|beta|theta|to)|[0-9a-zA-Z+\-=().,/<>|:{}^_!'])$/;

/** How many glyphs a label is written with, or null if it uses one the app doesn't read. */
function glyphCount(label: string): number | null {
  let n = 0;
  for (const t of tokens(label)) {
    if (!KNOWN.test(t)) return null;
    if ("{}^_".includes(t)) continue;
    n += /^\\(sin|cos|tan|log|ln|lg)$/.test(t) ? t.length - 1 : 1;
  }
  return n;
}

const dir = path.join(ROOT, "data", "mathwriting", "mathwriting-2024", SPLIT);
const expressions: { strokes: Stroke[]; want: number }[] = [];
for (const file of readdirSync(dir).filter((f) => f.endsWith(".inkml"))) {
  const e = readExpression(readFileSync(path.join(dir, file), "utf8"));
  const want = e && glyphCount(e.label);
  if (e && want && want >= 2 && e.strokes.length <= 48) expressions.push({ strokes: e.strokes, want });
}

function run(name: string, learned: boolean) {
  let ok = 0;
  let over = 0;
  let under = 0;
  for (const e of expressions) {
    const n = segmentSymbols(e.strokes, { learned }).length;
    if (n === e.want) ok++;
    else if (n > e.want) over++;
    else under++;
  }
  const pct = (k: number) => `${((k / expressions.length) * 100).toFixed(1)}%`;
  console.log(`${name.padEnd(16)} right ${pct(ok)}   too many ${pct(over)}   too few ${pct(under)}`);
}

console.log(`${SPLIT}: ${expressions.length} expressions`);
run("rules", false);
for (const t of THRESHOLDS) {
  segmenter.threshold = t;
  run(`learned at ${t}`, true);
}
