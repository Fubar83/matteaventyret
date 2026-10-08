/**
 * How people actually draw each character: from the real pen paths cut out
 * of MathWriting (data/mwalignedstrokes, alignStrokes.ts --symbols), the
 * most common ways per character - how many strokes, and for each stroke
 * where it starts and which way it goes. What the writing-order rules
 * (src/recognition/strokeOrder.ts) are checked against, so a rule never
 * rejects how most people write.
 *
 * Run: npx jiti scripts/ts/strokeOrderStats.ts [chars, e.g. "45(="] [--top N]
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describeStrokes, followsOrder, ORDER_RULES, splitSequence } from "../../src/recognition/strokeOrder";
import { arg, ROOT } from "./benchmarkShared";

const ONLY = process.argv[2] && !process.argv[2].startsWith("--") ? new Set([...process.argv[2]]) : null;
const TOP = Number(arg("--top") ?? 6);
const dir = path.join(ROOT, "data", "mwalignedstrokes", "cache");

for (const file of readdirSync(dir).filter((f) => f.endsWith(".json"))) {
  const { char, sequences } = JSON.parse(readFileSync(path.join(dir, file), "utf8")) as { char: string; sequences: number[][] };
  if (ONLY && !ONLY.has(char)) continue;
  const counts = new Map<string, number>();
  let follow = 0;
  for (const seq of sequences) {
    const strokes = splitSequence(seq);
    const key = describeStrokes(strokes);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    if (followsOrder(char, strokes)) follow++;
  }
  const top = [...counts].sort((a, b) => b[1] - a[1]).slice(0, TOP);
  console.log(`${char} (${sequences.length}${ORDER_RULES[char] ? `, ${Math.round((follow / sequences.length) * 100)}% follow the rules` : ""}): ${top.map(([k, n]) => `${k} ${Math.round((n / sequences.length) * 100)}%`).join("   ")}`);
}
