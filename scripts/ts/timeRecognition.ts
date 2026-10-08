/**
 * How long reading a page takes - as the writing grows stroke by stroke
 * (the pad reads it again after every pause), for a profile read in writing
 * order and one read the ordinary way. The app runs the same code in the
 * browser, so what's slow here freezes the page there.
 *
 * Run: npx jiti scripts/ts/timeRecognition.ts [--n expressions]
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { recognizeExpression } from "../../src/mathinput/recognizeExpression";
import { PROFILES } from "../../src/recognition/profiles";
import { arg, loadModelsFromDisk, readExpression, ROOT } from "./benchmarkShared";

const N = Number(arg("--n") ?? 5);
loadModelsFromDisk();

async function main() {
  const dir = path.join(ROOT, "data", "mathwriting", "mathwriting-2024", "test");
  const exprs = readdirSync(dir)
    .filter((f) => f.endsWith(".inkml"))
    .map((f) => readExpression(readFileSync(path.join(dir, f), "utf8")))
    .filter((e): e is NonNullable<typeof e> => !!e && e.strokes.length >= 12 && e.strokes.length <= 20 && /^[0-9x+\-=().]+$/.test(e.label.replace(/\s/g, "")))
    .slice(0, N);
  // Warm up the models.
  await recognizeExpression(exprs[0].strokes, { profile: PROFILES.linearAlgebra });
  for (const [name, profile] of [
    ["in order (åk 7+)", PROFILES.linearAlgebra],
    ["ordinary (åk 1-6)", PROFILES.arithmetic],
  ] as const) {
    let total = 0;
    let reads = 0;
    let worst = 0;
    for (const e of exprs) {
      // As written: read after every stroke.
      for (let k = 1; k <= e.strokes.length; k++) {
        const t = performance.now();
        await recognizeExpression(e.strokes.slice(0, k), { profile });
        const ms = performance.now() - t;
        total += ms;
        worst = Math.max(worst, ms);
        reads++;
      }
    }
    console.log(`${name}: ${reads} reads, ${(total / reads).toFixed(0)} ms on average, worst ${worst.toFixed(0)} ms`);
  }
}

main();
