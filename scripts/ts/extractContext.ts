/**
 * What a symbol's picture alone can't tell, learned from MathWriting's real
 * handwritten one-line expressions (the same pairing as extractMathWriting.ts:
 * segment the line with the app's own segmenter, keep it only when it splits
 * into exactly as many symbols as its label has):
 *
 *  1. A size prior (src/recognition/sizePrior.json): per character, how tall
 *     it is next to the rest of its line and how high it sits - a "." is a
 *     fraction of a digit's height and sits on the line, a "-" sits halfway
 *     up, a "1" is full height. Scaled to the classifier's 28x28 grid they
 *     can all look alike; next to their line they don't (sizePrior.ts).
 *  2. Pen strokes (data/mwstrokes/cache/<hex>.json): each symbol's strokes,
 *     resampled to a fixed number of points with where the pen lifted - how
 *     it was drawn, for the stroke model (trainStrokeModel.mjs) that tells a
 *     "1" from a "7" or a "5" from an "s" by the order and direction of its
 *     strokes rather than their picture.
 *
 * Run: npx jiti scripts/ts/extractContext.ts [--split train] [--limit N]   (npm run context:extract)
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Stroke } from "../../src/recognition/preprocess";
import { segmentSymbols } from "../../src/mathinput/segmentation";
import characters from "../../src/recognition/characters.json";
import { DY_EDGES, REL_H_EDGES, binOf, symbolContext } from "../../src/recognition/sizePrior";
import { resampleStrokes, STROKE_POINTS } from "../../src/recognition/strokeFeatures";

const ROOT = path.join(__dirname, "..", "..");
const arg = (name: string) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const SPLIT = arg("--split") ?? "train";
const LIMIT = Number(arg("--limit") ?? Infinity);
const INK_DIR = path.join(ROOT, "data", "mathwriting", "mathwriting-2024", SPLIT);
const STROKE_DIR = path.join(ROOT, "data", "mwstrokes", "cache");
const PRIOR_FILE = path.join(ROOT, "src", "recognition", "sizePrior.json");
const MAX_STROKES_PER_CLASS = 800;
const LINE_HEIGHT = 60;
const BS = "\\";

const COMMANDS: Record<string, string | null> = {
  cdot: ".", times: "x", le: "≤", leq: "≤", ge: "≥", geq: "≥", ne: "≠", neq: "≠", approx: "≈", pm: "±",
  to: "→", rightarrow: "→", longrightarrow: "→", Rightarrow: "⇒", Leftrightarrow: "⇔", iff: "⇔",
  infty: "∞", int: "∫", Delta: "Δ", alpha: "α", beta: "β", theta: "θ", pi: "π", "%": "%",
};
const KNOWN = new Set(characters.map((c) => c.char));
const CASE_MERGED: Record<string, string> = { C: "c", P: "p", V: "v" };

/** The label as one class per written glyph (null: a glyph, but not one of ours), or null if it isn't a flat row of glyphs. */
function tokenize(label: string): (string | null)[] | null {
  if (/[{}^_&]/.test(label) || label.includes(BS + BS)) return null;
  const tokens: (string | null)[] = [];
  for (const m of label.matchAll(/\\([a-zA-Z]+|%)|(\S)/g)) {
    if (m[1] !== undefined) {
      if (!(m[1] in COMMANDS)) {
        if (/^[a-zA-Z]+$/.test(m[1]) && m[1].length > 1) return null; // \frac, \sqrt ... - not one glyph
        tokens.push(null);
      } else tokens.push(COMMANDS[m[1]]);
    } else {
      const c = CASE_MERGED[m[2]] ?? m[2];
      tokens.push(KNOWN.has(c) ? c : null);
    }
  }
  return tokens.length > 0 ? tokens : null;
}

function parseInk(text: string): Stroke[] {
  const strokes: Stroke[] = [];
  for (const m of text.matchAll(/<trace[^>]*>([^<]*)<\/trace>/g)) {
    const pts = m[1]
      .split(",")
      .map((p) => p.trim().split(/\s+/).map(Number))
      .filter((p) => p.length >= 2 && Number.isFinite(p[0]) && Number.isFinite(p[1]))
      .map(([x, y]) => ({ x, y }));
    if (pts.length > 0) strokes.push(pts);
  }
  return strokes;
}

function normalize(strokes: Stroke[]): Stroke[] {
  const xs = strokes.flat().map((p) => p.x);
  const ys = strokes.flat().map((p) => p.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const scale = LINE_HEIGHT / Math.max(1, Math.max(...ys) - minY);
  return strokes.map((s) => s.map((p) => ({ x: (p.x - minX) * scale, y: (p.y - minY) * scale })));
}

function main() {
  const files = readdirSync(INK_DIR).filter((f) => f.endsWith(".inkml")).slice(0, LIMIT);
  const bins = REL_H_EDGES.length + 1;
  const dyBins = DY_EDGES.length + 1;
  const counts = new Map<string, number[]>();
  const strokesByClass = new Map<string, number[][]>();
  let aligned = 0;
  const started = Date.now();
  files.forEach((file, n) => {
    if (n % 20000 === 0) console.log(`  ${n}/${files.length} (${Math.round((Date.now() - started) / 1000)}s): ${aligned} paired`);
    const text = readFileSync(path.join(INK_DIR, file), "utf8");
    const label = text.match(/<annotation type="normalizedLabel">([^<]*)<\/annotation>/)?.[1];
    if (!label) return;
    const tokens = tokenize(label.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&"));
    if (!tokens) return;
    const symbols = segmentSymbols(normalize(parseInk(text)));
    if (symbols.length !== tokens.length || symbols.length < 2) return;
    aligned++;
    const boxes = symbols.map((s) => s.box);
    symbols.forEach((sym, i) => {
      const char = tokens[i];
      if (!char || sym.struck) return;
      const { relH, dy } = symbolContext(sym.box, boxes);
      const c = counts.get(char) ?? new Array(bins * dyBins).fill(0);
      c[binOf(relH, REL_H_EDGES) * dyBins + binOf(dy, DY_EDGES)]++;
      counts.set(char, c);
      const list = strokesByClass.get(char) ?? [];
      if (list.length < MAX_STROKES_PER_CLASS) {
        list.push(Array.from(resampleStrokes(sym.strokes), (v) => Math.round(v * 1000) / 1000));
        strokesByClass.set(char, list);
      }
    });
  });
  console.log(`${files.length} expressions, ${aligned} segmented into exactly their tokens`);

  const prior: Record<string, { n: number; counts: number[] }> = {};
  for (const [char, c] of counts) prior[char] = { n: c.reduce((a, b) => a + b, 0), counts: c };
  writeFileSync(PRIOR_FILE, JSON.stringify({ source: `mathwriting ${SPLIT}, ${aligned} lines`, relHEdges: REL_H_EDGES, dyEdges: DY_EDGES, classes: prior }) + "\n");
  console.log(`size prior: ${Object.keys(prior).length} classes -> ${PRIOR_FILE}`);

  if (!existsSync(STROKE_DIR)) mkdirSync(STROKE_DIR, { recursive: true });
  for (const [char, list] of strokesByClass) {
    writeFileSync(path.join(STROKE_DIR, `${char.charCodeAt(0).toString(16)}.json`), JSON.stringify({ char, points: STROKE_POINTS, source: `mathwriting ${SPLIT}`, sequences: list }));
  }
  console.log([...strokesByClass].map(([c, l]) => `${c}:${l.length}`).join("  "));
}

main();
