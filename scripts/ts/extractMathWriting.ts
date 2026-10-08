/**
 * Cuts single-symbol training samples out of MathWriting's handwritten
 * expressions (data/mathwriting/mathwriting-2024/train, ~230k InkML files).
 * MathWriting only labels a whole expression, never its symbols, so this
 * labels them itself - conservatively:
 *
 *  1. Only one-line expressions whose label is a flat row of tokens we can
 *     name ("3,5+2=5,5", "y=2x+1" - no fractions, exponents or roots).
 *  2. The ink is segmented with the app's own segmenter (segmentation.ts),
 *     after scaling the line to the size a tablet line is written at.
 *  3. Only when it finds exactly as many symbols as the label has tokens are
 *     they paired up, left to right; anything else is skipped.
 *
 * Each paired symbol runs through the live recognizer's own preprocessing and
 * is stored per class in data/mwtrain/cache/<hex>.json, which
 * trainBootstrapModel.mjs pools with the other sources. Tokens that aren't
 * one of our classes (w, γ, ...) still count for the pairing, just aren't kept.
 *
 * Run: npx jiti scripts/ts/extractMathWriting.ts [--split train] [--limit N]
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { preprocessStrokes, type Stroke } from "../../src/recognition/preprocess";
import { segmentSymbols } from "../../src/mathinput/segmentation";
import characters from "../../src/recognition/characters.json";

const ROOT = path.join(__dirname, "..", "..");
const arg = (name: string) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const SPLIT = arg("--split") ?? "train";
const LIMIT = Number(arg("--limit") ?? Infinity);
const INK_DIR = path.join(ROOT, "data", "mathwriting", "mathwriting-2024", SPLIT);
const OUT_DIR = path.join(ROOT, "data", "mwtrain", "cache");
/** Per class - more than any model trains on per class, so every run can sample differently. */
const MAX_PER_CLASS = 800;
/** A line of writing on the tablet is about this tall (px) - segmentation's merge margins are tuned to it. */
const LINE_HEIGHT = 60;

const BS = "\\";
/** LaTeX commands that are one written glyph, and the class each is (null: a glyph, but not one of ours). */
const COMMANDS: Record<string, string | null> = {
  cdot: ".", times: "x", le: "≤", leq: "≤", ge: "≥", geq: "≥", ne: "≠", neq: "≠", approx: "≈", pm: "±",
  to: "→", rightarrow: "→", longrightarrow: "→", Rightarrow: "⇒", Leftrightarrow: "⇔", iff: "⇔",
  infty: "∞", int: "∫", Delta: "Δ", alpha: "α", beta: "β", theta: "θ", pi: "π", "%": "%",
  gamma: null, delta: null, epsilon: null, lambda: null, mu: null, sigma: null, phi: null, omega: null, rho: null, tau: null,
  varphi: null, psi: null, nu: null, eta: null, kappa: null, xi: null, chi: null, zeta: null, Sigma: null, Omega: null, Gamma: null, Phi: null,
  cap: null, cup: null, in: null, subset: null, forall: null, exists: null, neg: null, wedge: null, vee: null, star: null, ast: null,
  partial: null, nabla: null, prime: null, sim: null, equiv: null, leftarrow: null, mapsto: null, div: null,
};
const KNOWN = new Set(characters.map((c) => c.char));
/**
 * Paired correctly, but not kept: in running writing a "/" is steep and a ","
 * is a short tick, and scaled up to the classifier's grid both look exactly
 * like a "1" (the current model reads 98% of the extracted "/" and 70% of
 * the "," as "1"). Training on them would teach it a "1" may be either -
 * the one confusion the youngest children can't afford. A comma is told by
 * its size and place instead (layout.ts).
 */
const NOT_KEPT = new Set(["/", ","]);
const CASE_MERGED: Record<string, string> = { C: "c", P: "p", V: "v" };

/** The label as one class per written glyph, or null if it isn't a flat row of glyphs. */
function tokenize(label: string): (string | null)[] | null {
  if (/[{}^_&]/.test(label) || label.includes(BS + BS)) return null;
  const tokens: (string | null)[] = [];
  const re = /\\([a-zA-Z]+|%)|(\S)/g;
  for (const m of label.matchAll(re)) {
    if (m[1] !== undefined) {
      if (!(m[1] in COMMANDS)) return null; // \frac, \left, \mathrm, \sqrt ... - not a single glyph
      tokens.push(COMMANDS[m[1]]);
    } else {
      const c = m[2];
      const merged = CASE_MERGED[c] ?? c;
      tokens.push(KNOWN.has(merged) ? merged : null);
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

/** Scaled so the line is LINE_HEIGHT tall, and moved to the origin. */
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
  const grids = new Map<string, number[][]>();
  let flat = 0;
  let aligned = 0;
  const started = Date.now();
  files.forEach((file, n) => {
    if (n % 20000 === 0) console.log(`  ${n}/${files.length} (${Math.round((Date.now() - started) / 1000)}s): ${flat} flat, ${aligned} paired`);
    const text = readFileSync(path.join(INK_DIR, file), "utf8");
    const label = text.match(/<annotation type="normalizedLabel">([^<]*)<\/annotation>/)?.[1];
    if (!label) return;
    const tokens = tokenize(label.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&"));
    if (!tokens) return;
    flat++;
    const symbols = segmentSymbols(normalize(parseInk(text)));
    if (symbols.length !== tokens.length) return;
    aligned++;
    symbols.forEach((sym, i) => {
      const char = tokens[i];
      if (!char || NOT_KEPT.has(char) || sym.struck) return;
      const list = grids.get(char) ?? [];
      if (list.length >= MAX_PER_CLASS) return;
      list.push(Array.from(preprocessStrokes(sym.strokes), (v) => Math.round(v * 100) / 100));
      grids.set(char, list);
    });
  });
  console.log(`${files.length} expressions: ${flat} flat one-line, ${aligned} segmented into exactly their tokens`);
  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  for (const [char, list] of [...grids].sort((a, b) => b[1].length - a[1].length)) {
    writeFileSync(path.join(OUT_DIR, `${char.charCodeAt(0).toString(16)}.json`), JSON.stringify({ char, source: `mathwriting ${SPLIT} (extracted)`, grids: list }));
  }
  console.log([...grids].map(([c, l]) => `${c}:${l.length}`).join("  "));
}

main();
