/**
 * Do the recognition profiles (src/recognition/profiles.ts) read better than
 * the whole writing level they replace? For each profile: MathWriting test
 * expressions that only use what that profile allows, each read twice with
 * the same models - once as today (the stage's writing level: all its
 * characters, powers always on), once with the profile (its characters only,
 * powers only where the profile reads them) - and scored on
 *   - exact: the LaTeX comes out exactly right (after normalizing notation)
 *   - chars: how much of it is right (1 − edit distance / length), so a
 *     reading that gets closer counts even if it isn't perfect yet.
 * No model changes - this measures what narrowing alone is worth, before any
 * retraining. MathWriting is adults' writing, not children's.
 *
 * Run: npx jiti scripts/ts/benchmarkProfiles.ts [--limit N per profile] [--profile id] [--configs level,profile,all]   (npm run benchmark:profiles)
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { STAGES } from "../../src/game/stages";
import { recognizeExpression, type RecognitionTweaks } from "../../src/mathinput/recognizeExpression";
import type { Stroke } from "../../src/recognition/preprocess";
import { PROFILE_BY_STAGE, PROFILES, type ProfileId, type RecognitionProfile } from "../../src/recognition/profiles";
import type { WritingLevel } from "../../src/recognition/levels";
import { arg, BS, loadModelsFromDisk, normalize, readExpression, ROOT, similarity, tokens } from "./benchmarkShared";

const LIMIT = Number(arg("--limit") ?? 200);
const ONLY = arg("--profile");
const ONLY_CONFIGS = arg("--configs")?.split(",");

const OFF: RecognitionTweaks = { sizePrior: false, resegment: false, rerank: false, strokes: false, segmenter: false, order: false };
/** What each expression is read with: the level as before, the profile alone, then each context step on its own, then all of them. */
const CONFIGS: { name: string; profile: boolean; tweaks: RecognitionTweaks }[] = [
  { name: "level", profile: false, tweaks: OFF },
  { name: "profile", profile: true, tweaks: OFF },
  { name: "+sizePrior", profile: true, tweaks: { ...OFF, sizePrior: true } },
  { name: "+resegment", profile: true, tweaks: { ...OFF, resegment: true } },
  { name: "+rerank", profile: true, tweaks: { ...OFF, rerank: true } },
  { name: "+strokes", profile: true, tweaks: { ...OFF, strokes: true } },
  { name: "+segmenter", profile: true, tweaks: { ...OFF, segmenter: true } },
  { name: "all-strokes", profile: true, tweaks: { sizePrior: true, resegment: true, rerank: true, strokes: false, segmenter: false, order: false } },
  { name: "all", profile: true, tweaks: { sizePrior: true, resegment: true, rerank: true, strokes: true, segmenter: false, order: false } },
  { name: "all+segmenter", profile: true, tweaks: { sizePrior: true, resegment: true, rerank: true, strokes: true, segmenter: true, order: false } },
  { name: "all+order", profile: true, tweaks: { sizePrior: true, resegment: true, rerank: true, strokes: true, segmenter: true, order: true } },
];

loadModelsFromDisk();

/** MathWriting's tokens for each character a profile can read. */
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

/** Every token an expression may use to be read with this profile. */
function profileTokens(p: RecognitionProfile): Set<string> {
  const out = new Set<string>(["{", "}", BS + "frac"]);
  for (const c of p.chars) for (const t of TOKENS_OF[c] ?? [c]) out.add(t);
  if (p.scripts) out.add("^").add("_");
  // Function names are read from their letters (and digit look-alikes: l→1, o→0).
  if (p.chars.has("s") && p.chars.has("n")) [BS + "sin", BS + "cos", BS + "tan"].forEach((t) => out.add(t));
  if (p.chars.has("g")) out.add(BS + "lg");
  return out;
}

/** The writing level a profile's stages are at - what they're read with today. */
function levelOf(id: ProfileId): WritingLevel {
  const stage = STAGES.find((s) => PROFILE_BY_STAGE[s.id] === id);
  if (!stage) throw new Error(`no stage uses ${id}`);
  return stage.writingLevel;
}

async function main() {
  const dir = path.join(ROOT, "data", "mathwriting", "mathwriting-2024", "test");
  const expressions: { label: string; strokes: Stroke[] }[] = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".inkml"))) {
    const expr = readExpression(readFileSync(path.join(dir, file), "utf8"));
    if (expr) expressions.push(expr);
  }

  const ids = (Object.keys(PROFILES) as ProfileId[]).filter((id) => !ONLY || id === ONLY);
  const configs = CONFIGS.filter((c) => !ONLY_CONFIGS || ONLY_CONFIGS.includes(c.name));
  const totals = configs.map(() => ({ exact: 0, sim: 0 }));
  let totalN = 0;
  const summary: string[] = [];
  console.log(`configurations: ${configs.map((c) => c.name).join(" | ")}`);
  for (const id of ids) {
    const profile = PROFILES[id];
    const level = levelOf(id);
    const allowed = profileTokens(profile);
    // Expressions this profile could have to read - with at least one operator or letter, not a lone number.
    const sample = expressions
      .filter((e) => {
        const t = tokens(e.label);
        return t.length >= 3 && t.every((x) => allowed.has(x));
      })
      .slice(0, LIMIT);
    if (sample.length === 0) {
      summary.push(`${id.padEnd(14)} (no MathWriting expressions fit)`);
      continue;
    }
    const scores = configs.map(() => ({ exact: 0, sim: 0 }));
    const examples: string[] = [];
    for (const e of sample) {
      const expected = normalize(e.label);
      const got: string[] = [];
      for (const [k, c] of configs.entries()) {
        const latex = normalize((await recognizeExpression(e.strokes, { level, profile: c.profile ? profile : undefined, tweaks: c.tweaks })).latex);
        got.push(latex);
        if (latex === expected) scores[k].exact++;
        scores[k].sim += similarity(expected, latex);
      }
      // Against the first configuration: what the last one fixed, and what it broke.
      const [first, last] = [got[0], got[got.length - 1]];
      if (first !== expected && last === expected && examples.length < 3) examples.push(`fixed: ${expected}   (was ${first})`);
      if (first === expected && last !== expected && examples.length < 5) examples.push(`BROKE: ${expected}   (now ${last})`);
    }
    const n = sample.length;
    totalN += n;
    scores.forEach((s, k) => {
      totals[k].exact += s.exact;
      totals[k].sim += s.sim;
    });
    const pct = (k: number) => `${Math.round((k / n) * 100)}%`.padStart(4);
    const row = `${id.padEnd(14)} ${String(n).padStart(4)} expr   exact ${scores.map((s) => pct(s.exact)).join(" ")}   chars ${scores.map((s) => pct(s.sim)).join(" ")}`;
    summary.push(row);
    console.log([row, ...examples.map((x) => `      ${x}`)].join("\n"));
  }
  console.log(`\n=== Summary: ${configs.map((c) => c.name).join(" | ")} ===`);
  console.log(summary.join("\n"));
  if (totalN > 0) {
    const pct = (k: number) => `${((k / totalN) * 100).toFixed(1)}%`;
    console.log(`\nAll profiles, ${totalN} expressions:`);
    configs.forEach((c, k) => console.log(`  ${c.name.padEnd(12)} exact ${pct(totals[k].exact)}   chars ${pct(totals[k].sim)}`));
  }
}

main();
