/**
 * Measures the whole handwriting pipeline - segmentation, the level's model,
 * layout - on real handwritten expressions it has never seen: MathWriting's
 * test split, filtered per writing level to expressions that only use that
 * level's symbols. Scores each level on:
 *   - exact: the LaTeX comes out exactly right (after normalizing notation)
 *   - symbols: as many symbols found as the expression has
 * plus a sample of what went wrong. MathWriting is adults' writing, mostly
 * university math - so level 1-2 has few expressions here, and none of them
 * is a child's; it measures the pipeline, not how forgiving it is to kids.
 *
 * Run: npx jiti scripts/ts/benchmark.ts [--split test] [--limit N]   (npm run benchmark)
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { WritingLevel } from "../../src/recognition/levels";
import { recognizeExpression } from "../../src/mathinput/recognizeExpression";
import { arg, BS, normalize, readExpression, ROOT, tokens, loadModelsFromDisk } from "./benchmarkShared";

const SPLIT = arg("--split") ?? "test";
const LIMIT = Number(arg("--limit") ?? Infinity);

loadModelsFromDisk();

/** Every token each level may use (MathWriting's normalized LaTeX, function names already marked as commands). */
const cmd = (...names: string[]) => names.map((n) => BS + n);
const L1 = [..."0123456789+-=<>x", ...cmd("cdot", "times"), "{", "}"];
const L2 = [...L1, ...",./():", ...cmd("%", "approx", "frac")];
const L3 = [...L2, ..."abcdhkmnruvyzACV", ...cmd("pi", "sqrt", "le", "ge", "ne", "circ"), "^"];
const L4 = [
  ...L3,
  ..."efgpqstB|'",
  ...cmd("pm", "to", "rightarrow", "infty", "int", "Delta", "alpha", "beta", "theta", "Leftrightarrow", "Rightarrow", "sin", "cos", "tan", "log", "ln", "lg", "lim", "prime"),
  "_",
];
const LEVEL_TOKENS: Record<WritingLevel, Set<string>> = { 1: new Set(L1), 2: new Set(L2), 3: new Set(L3), 4: new Set(L4) };

/** The lowest level whose tokens cover the expression, or null. */
function levelOf(label: string): WritingLevel | null {
  const t = tokens(label);
  for (const level of [1, 2, 3, 4] as const) if (t.every((x) => LEVEL_TOKENS[level].has(x))) return level;
  return null;
}

async function main() {
  const dir = path.join(ROOT, "data", "mathwriting", "mathwriting-2024", SPLIT);
  const files = readdirSync(dir).filter((f) => f.endsWith(".inkml"));
  const stats = new Map<WritingLevel, { n: number; exact: number; count: number; misses: string[] }>();
  let done = 0;
  for (const file of files) {
    if (done >= LIMIT) break;
    const expr = readExpression(readFileSync(path.join(dir, file), "utf8"));
    if (!expr) continue;
    const level = levelOf(expr.label);
    if (!level) continue;
    done++;
    const result = await recognizeExpression(expr.strokes, { level });
    const s = stats.get(level) ?? { n: 0, exact: 0, count: 0, misses: [] };
    s.n++;
    const expected = normalize(expr.label);
    const got = normalize(result.latex);
    if (got === expected) s.exact++;
    else if (s.misses.length < 8) s.misses.push(`${expected}  ->  ${got}`);
    const glyphs = tokens(expr.label).filter((t) => !["{", "}", "^", "_", BS + "frac", BS + "sqrt"].includes(t)).length;
    if (result.symbols.length === glyphs) s.count++;
    stats.set(level, s);
  }
  for (const level of [1, 2, 3, 4] as const) {
    const s = stats.get(level);
    if (!s) continue;
    const pct = (k: number) => `${Math.round((k / s.n) * 100)}%`;
    console.log(`\nLevel ${level}: ${s.n} expressions - exact ${pct(s.exact)}, right number of symbols ${pct(s.count)}`);
    for (const m of s.misses) console.log(`   ${m}`);
  }
}

main();
