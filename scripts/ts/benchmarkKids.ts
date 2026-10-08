/**
 * The benchmark that matters most: real children's writing. Reads the test
 * examples saved on the handwriting page ("Spara som testexempel", then
 * "Ladda ner") from data/kids/*.json, and scores each way of reading them -
 * on its own picture only, then with each context step, then all of them -
 * against what the writing really says (as corrected when it was saved):
 *   - exact: the LaTeX comes out exactly right (after normalizing notation)
 *   - chars: how much of it is right (1 − edit distance / length)
 *
 * Run: npx jiti scripts/ts/benchmarkKids.ts [--dir data/kids]   (npm run benchmark:kids)
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { recognizeExpression, type RecognitionTweaks } from "../../src/mathinput/recognizeExpression";
import type { TestCase } from "../../src/mathinput/testCases";
import type { WritingLevel } from "../../src/recognition/levels";
import { arg, loadModelsFromDisk, normalize, ROOT, similarity } from "./benchmarkShared";

const DIR = path.resolve(ROOT, arg("--dir") ?? path.join("data", "kids"));

const OFF: RecognitionTweaks = { sizePrior: false, resegment: false, rerank: false, strokes: false, segmenter: false, order: false };
const CONFIGS: { name: string; tweaks: RecognitionTweaks }[] = [
  { name: "picture only", tweaks: OFF },
  { name: "+sizePrior", tweaks: { ...OFF, sizePrior: true } },
  { name: "+resegment", tweaks: { ...OFF, resegment: true } },
  { name: "+rerank", tweaks: { ...OFF, rerank: true } },
  { name: "+strokes", tweaks: { ...OFF, strokes: true } },
  { name: "all", tweaks: { sizePrior: true, resegment: true, rerank: true, strokes: true, segmenter: false, order: false } },
  { name: "all+segmenter", tweaks: { sizePrior: true, resegment: true, rerank: true, strokes: true, segmenter: true, order: false } },
];

loadModelsFromDisk();

async function main() {
  if (!existsSync(DIR)) {
    console.log(`No test examples yet: put the files downloaded from the handwriting page ("Ladda ner") in ${DIR}`);
    return;
  }
  const cases: TestCase[] = readdirSync(DIR)
    .filter((f) => f.endsWith(".json"))
    .flatMap((f) => JSON.parse(readFileSync(path.join(DIR, f), "utf8")) as TestCase[]);
  if (cases.length === 0) {
    console.log(`No test examples in ${DIR}`);
    return;
  }
  const scores = CONFIGS.map(() => ({ exact: 0, sim: 0 }));
  const misses: string[] = [];
  for (const c of cases) {
    const expected = normalize(c.expected);
    for (const [k, config] of CONFIGS.entries()) {
      const got = normalize((await recognizeExpression(c.strokes, { level: c.level as WritingLevel, tweaks: config.tweaks })).latex);
      if (got === expected) scores[k].exact++;
      scores[k].sim += similarity(expected, got);
      if (k === CONFIGS.length - 1 && got !== expected && misses.length < 15) misses.push(`${expected}   ->   ${got}`);
    }
  }
  const pct = (v: number) => `${((v / cases.length) * 100).toFixed(1)}%`;
  console.log(`\n${cases.length} test examples from ${DIR}`);
  CONFIGS.forEach((c, k) => console.log(`  ${c.name.padEnd(14)} exact ${pct(scores[k].exact).padStart(6)}   chars ${pct(scores[k].sim).padStart(6)}`));
  if (misses.length > 0) {
    console.log(`\nStill misread (with everything on):`);
    for (const m of misses) console.log(`  ${m}`);
  }
}

main();
