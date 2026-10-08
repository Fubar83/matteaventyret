/**
 * One MathWriting expression, read step by step: its symbols (character,
 * box, how sure), and the LaTeX - for finding out why a particular
 * expression goes wrong. Finds it by its label.
 *
 * Run: npx jiti scripts/ts/debugExpression.ts "<label>" [--split test] [--profile id]
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { recognizeExpression } from "../../src/mathinput/recognizeExpression";
import { PROFILES, type ProfileId } from "../../src/recognition/profiles";
import { arg, loadModelsFromDisk, readExpression, ROOT } from "./benchmarkShared";

const LABEL = process.argv[2];
const SPLIT = arg("--split") ?? "test";
const PROFILE = arg("--profile") as ProfileId | undefined;

loadModelsFromDisk();

async function main() {
  const dir = path.join(ROOT, "data", "mathwriting", "mathwriting-2024", SPLIT);
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".inkml"))) {
    const e = readExpression(readFileSync(path.join(dir, file), "utf8"));
    if (!e || e.label !== LABEL) continue;
    const result = await recognizeExpression(e.strokes, { level: 4, profile: PROFILE ? PROFILES[PROFILE] : undefined });
    console.log(`${file}: ${e.label}\n  -> ${result.latex}`);
    for (const s of result.symbols) {
      const b = s.box;
      console.log(`  ${s.char.padEnd(2)} ${s.confident ? "sure  " : "unsure"} x ${b.minX.toFixed(0)}-${b.maxX.toFixed(0)}  y ${b.minY.toFixed(0)}-${b.maxY.toFixed(0)}  (${b.width.toFixed(0)}x${b.height.toFixed(0)})  ${s.strokes.length} strokes  [${s.alternatives.join(" ")}]`);
    }
  }
}

main();
