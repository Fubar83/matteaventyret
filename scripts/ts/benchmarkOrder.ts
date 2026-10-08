/**
 * What reading in writing order (orderDecode.ts, a profile's strictOrder)
 * is worth. For the strict profiles' MathWriting test expressions (the same
 * sample as benchmarkProfiles.ts), each is first checked against its label
 * (forced alignment, alignShared.ts): did its writer happen to write the
 * way the rules ask - each symbol's strokes one after another, each
 * character one of its allowed ways (strokeOrder.ts)? Then it's read both
 * ways - tolerant (the learned segmenter) and in order - and scored
 * separately for expressions that follow the order (what a child taught the
 * order writes) and those that don't (what the rules cost when ignored).
 *
 * Run: npx jiti scripts/ts/benchmarkOrder.ts [--limit N per profile] [--profile id] [--reading-weight w] [--wrong-order f]   (npm run benchmark:order)
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { STAGES } from "../../src/game/stages";
import { ORDER_TUNING } from "../../src/mathinput/orderDecode";
import { recognizeExpression } from "../../src/mathinput/recognizeExpression";
import type { Stroke } from "../../src/recognition/preprocess";
import { PROFILE_BY_STAGE, PROFILES, type ProfileId } from "../../src/recognition/profiles";
import { followsOrder } from "../../src/recognition/strokeOrder";
import { alignLabel, loadModel } from "./alignShared";
import { arg, BS, loadModelsFromDisk, normalize, readExpression, ROOT, similarity, tokens } from "./benchmarkShared";

const LIMIT = Number(arg("--limit") ?? 100);
const ONLY = arg("--profile");
// Other settings to try: --reading-weight, --wrong-order.
if (arg("--reading-weight")) ORDER_TUNING.readingWeight = Number(arg("--reading-weight"));
if (arg("--wrong-order")) ORDER_TUNING.wrongOrderFactor = Number(arg("--wrong-order"));
if (arg("--checker-weight")) ORDER_TUNING.checkerWeight = Number(arg("--checker-weight"));

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

function allowedTokens(id: ProfileId): Set<string> {
  const p = PROFILES[id];
  const out = new Set<string>(["{", "}", BS + "frac"]);
  for (const c of p.chars) for (const t of TOKENS_OF[c] ?? [c]) out.add(t);
  if (p.scripts) out.add("^").add("_");
  if (p.chars.has("s") && p.chars.has("n")) [BS + "sin", BS + "cos", BS + "tan"].forEach((t) => out.add(t));
  if (p.chars.has("g")) out.add(BS + "lg");
  return out;
}

/** Whether the writer wrote the way the rules ask: aligned surely, each glyph's strokes one of its allowed ways. */
function followsTheOrder(label: string, strokes: Stroke[]): boolean | null {
  const aligned = alignLabel(label, strokes);
  if (!aligned || !aligned.keep) return null;
  const { groupOf, glyphs } = aligned.result;
  return glyphs.every((char, k) => char === null || followsOrder(char, strokes.filter((_, i) => groupOf[i] === k)));
}

async function main() {
  await loadModel();
  const dir = path.join(ROOT, "data", "mathwriting", "mathwriting-2024", "test");
  const expressions: { label: string; strokes: Stroke[] }[] = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".inkml"))) {
    const e = readExpression(readFileSync(path.join(dir, file), "utf8"));
    if (e) expressions.push(e);
  }
  type Tally = { n: number; tolerant: number; inOrder: number; simTolerant: number; simInOrder: number };
  const blank = (): Tally => ({ n: 0, tolerant: 0, inOrder: 0, simTolerant: 0, simInOrder: 0 });
  const totals = { follows: blank(), doesnt: blank(), unknown: blank() };
  for (const id of (Object.keys(PROFILES) as ProfileId[]).filter((id) => PROFILES[id].strictOrder && (!ONLY || id === ONLY))) {
    const stage = STAGES.find((s) => PROFILE_BY_STAGE[s.id] === id);
    if (!stage) continue;
    const allowed = allowedTokens(id);
    const sample = expressions
      .filter((e) => {
        const t = tokens(e.label);
        return t.length >= 3 && t.every((x) => allowed.has(x));
      })
      .slice(0, LIMIT);
    const mine = { follows: blank(), doesnt: blank(), unknown: blank() };
    for (const e of sample) {
      const expected = normalize(e.label);
      const follows = followsTheOrder(e.label, e.strokes);
      const bucket = follows === null ? "unknown" : follows ? "follows" : "doesnt";
      const read = async (order: boolean) => normalize((await recognizeExpression(e.strokes, { level: stage.writingLevel, profile: PROFILES[id], tweaks: { order } })).latex);
      const [tolerant, inOrder] = [await read(false), await read(true)];
      for (const t of [mine[bucket], totals[bucket]]) {
        t.n++;
        t.tolerant += tolerant === expected ? 1 : 0;
        t.inOrder += inOrder === expected ? 1 : 0;
        t.simTolerant += similarity(expected, tolerant);
        t.simInOrder += similarity(expected, inOrder);
      }
    }
    const pct = (k: number, n: number) => (n ? `${Math.round((k / n) * 100)}%`.padStart(4) : "   -");
    const row = (name: string, t: Tally) => `${name} ${String(t.n).padStart(3)}: exact ${pct(t.tolerant, t.n)} -> ${pct(t.inOrder, t.n)}`;
    console.log(`${id.padEnd(14)} ${row("follows the order", mine.follows)}   ${row("doesn't", mine.doesnt)}`);
  }
  const pct = (k: number, n: number) => (n ? `${((k / n) * 100).toFixed(1)}%` : "-");
  console.log("\nAll strict profiles (tolerant -> in order):");
  for (const [name, t] of Object.entries(totals)) {
    console.log(`  ${name.padEnd(8)} ${String(t.n).padStart(5)} expr   exact ${pct(t.tolerant, t.n)} -> ${pct(t.inOrder, t.n)}   chars ${pct(t.simTolerant, t.n)} -> ${pct(t.simInOrder, t.n)}`);
  }
}

main();
