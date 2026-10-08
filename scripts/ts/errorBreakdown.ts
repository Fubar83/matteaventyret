/**
 * Where do misread expressions go wrong? Each MathWriting test expression a
 * profile can read (the same sample as benchmarkProfiles.ts) is read with
 * every step on, and each miss is put in one bucket:
 *   - segmentation: the ink was cut into the wrong number of symbols
 *   - classification: the right number of symbols, but some read as the wrong character
 *   - layout: every symbol read right, but put together into the wrong LaTeX
 * Tells whether more picture-model training (classification) is where the
 * gain is, or the cutting and the layout.
 *
 * Run: npx jiti scripts/ts/errorBreakdown.ts [--limit N per profile] [--full-dir folder] [--segmenter]
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { STAGES } from "../../src/game/stages";
import { recognizeExpression } from "../../src/mathinput/recognizeExpression";
import type { Stroke } from "../../src/recognition/preprocess";
import { PROFILE_BY_STAGE, PROFILES, type ProfileId, type RecognitionProfile } from "../../src/recognition/profiles";
import { arg, BS, loadModelsFromDisk, normalize, readExpression, ROOT, tokens } from "./benchmarkShared";

const LIMIT = Number(arg("--limit") ?? 100);
/** Cut the ink with the learned segmenter (strokePairs.ts) instead of the rules. */
const SEGMENTER = process.argv.includes("--segmenter");

loadModelsFromDisk();

const TOKENS_OF: Record<string, string[]> = {
  ".": [".", BS + "cdot"],
  x: ["x", BS + "times"],
  π: [BS + "pi"],
  "√": [BS + "sqrt"],
  "≈": [BS + "approx"],
  "±": [BS + "pm"],
  "%": [BS + "%"],
  "°": [BS + "circ"],
  Δ: [BS + "Delta"],
  "∫": [BS + "int"],
};

function profileTokens(p: RecognitionProfile): Set<string> {
  const out = new Set<string>(["{", "}", BS + "frac"]);
  for (const c of p.chars) for (const t of TOKENS_OF[c] ?? [c]) out.add(t);
  if (p.scripts) out.add("^").add("_");
  if (p.chars.has("s") && p.chars.has("n")) [BS + "sin", BS + "cos", BS + "tan"].forEach((t) => out.add(t));
  if (p.chars.has("g")) out.add(BS + "lg");
  return out;
}

/** The character each written glyph of a label is read as - a fraction's bar is a "-", a function name its letters. */
const GLYPH_OF: Record<string, string> = {
  [BS + "frac"]: "-",
  [BS + "cdot"]: ".",
  [BS + "times"]: "x",
  [BS + "pi"]: "π",
  [BS + "sqrt"]: "√",
  [BS + "approx"]: "≈",
  [BS + "pm"]: "±",
  [BS + "%"]: "%",
  [BS + "circ"]: "°",
  [BS + "Delta"]: "Δ",
  [BS + "int"]: "∫",
};
function glyphs(label: string): string[] {
  const out: string[] = [];
  for (const t of tokens(label)) {
    if ("{}^_".includes(t)) continue;
    if (GLYPH_OF[t]) out.push(GLYPH_OF[t]);
    else if (t.startsWith(BS)) out.push(...t.slice(1));
    else out.push(t);
  }
  return out;
}

/** How many of `got` aren't matched by a character in `want` (both as multisets). */
function unmatched(want: string[], got: string[]): number {
  const left = new Map<string, number>();
  for (const c of want) left.set(c, (left.get(c) ?? 0) + 1);
  let miss = 0;
  for (const c of got) {
    const n = left.get(c) ?? 0;
    if (n > 0) left.set(c, n - 1);
    else miss++;
  }
  return miss;
}

async function main() {
  const dir = path.join(ROOT, "data", "mathwriting", "mathwriting-2024", "test");
  const expressions: { label: string; strokes: Stroke[] }[] = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".inkml"))) {
    const expr = readExpression(readFileSync(path.join(dir, file), "utf8"));
    if (expr) expressions.push(expr);
  }
  const buckets = { exact: 0, segmentation: 0, classification: 0, layout: 0 };
  /** Classification misses by how many symbols were wrong. */
  const wrongCount = new Map<number, number>();
  /** Which character was read as which, in classification misses with one wrong symbol. */
  const confusions = new Map<string, number>();
  const segExamples: string[] = [];
  const layoutExamples: string[] = [];
  let total = 0;
  for (const id of Object.keys(PROFILES) as ProfileId[]) {
    const profile = PROFILES[id];
    const stage = STAGES.find((s) => PROFILE_BY_STAGE[s.id] === id);
    if (!stage) continue;
    const allowed = profileTokens(profile);
    const sample = expressions
      .filter((e) => {
        const t = tokens(e.label);
        return t.length >= 3 && t.every((x) => allowed.has(x));
      })
      .slice(0, LIMIT);
    for (const e of sample) {
      total++;
      const result = await recognizeExpression(e.strokes, { level: stage.writingLevel, profile, tweaks: { segmenter: SEGMENTER } });
      const expected = normalize(e.label);
      if (normalize(result.latex) === expected) {
        buckets.exact++;
        continue;
      }
      const want = glyphs(e.label);
      const got = result.symbols.map((s) => s.char);
      if (want.length !== got.length) {
        buckets.segmentation++;
        if (segExamples.length < 12) segExamples.push(`${expected}   -> ${normalize(result.latex)}   (${want.length} glyphs, cut into ${got.length})`);
        continue;
      }
      const wrong = unmatched(want, got);
      if (wrong > 0) {
        buckets.classification++;
        wrongCount.set(wrong, (wrongCount.get(wrong) ?? 0) + 1);
        if (wrong === 1) {
          const a = want.filter((c) => !got.includes(c));
          const b = got.filter((c) => !want.includes(c));
          const key = `${a[0] ?? "?"}→${b[0] ?? "?"}`;
          confusions.set(key, (confusions.get(key) ?? 0) + 1);
        }
      } else {
        buckets.layout++;
        if (layoutExamples.length < 12) layoutExamples.push(`${expected}   -> ${normalize(result.latex)}`);
      }
    }
    console.log(`${id}: ${total} so far`);
  }
  const pct = (n: number) => `${((n / total) * 100).toFixed(1)}%`;
  console.log(`\n=== ${total} expressions ===`);
  for (const [k, n] of Object.entries(buckets)) console.log(`  ${k.padEnd(15)} ${String(n).padStart(5)}  ${pct(n)}`);
  console.log(`\nClassification misses by number of wrong symbols: ${[...wrongCount].sort((a, b) => a[0] - b[0]).map(([k, n]) => `${k}: ${n}`).join(", ")}`);
  console.log(`Most common single-symbol confusions: ${[...confusions].sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, n]) => `${k} ${n}`).join(", ")}`);
  console.log(`\nSegmentation examples:\n  ${segExamples.join("\n  ")}`);
  console.log(`\nLayout examples:\n  ${layoutExamples.join("\n  ")}`);
}

main();
