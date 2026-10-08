/**
 * What matching the pen's path (src/recognition/pathMatch.ts) is worth, for
 * single symbols:
 *  - taught: simulated writing the way Skrivskolan teaches it - each
 *    taught path (strokeTemplates.ts) drawn with a hand's variation (size,
 *    slant, wobble, uneven speed). How a child who learned the order writes.
 *  - own: a simulated child's own style per character (one fixed
 *    distortion of the taught path, as if they always write it their way),
 *    three of their samples remembered, read on new ones in the same style.
 *  - real: MathWriting's real symbols (data/mwalignedstrokes) - adults who
 *    never saw the taught paths. Matching mustn't make these worse.
 * Read among the advanced profiles' characters, with the picture model and
 * the stroke model as in the app, then with path matching on top.
 *
 * Run: npx jiti scripts/ts/benchmarkPaths.ts [--n per char] [--template-scale s] [--personal-scale s] [--template-boost b] [--personal-boost b]
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { MATCH_BOOST, MATCH_SCALE, pathOf, personalPathFactors, templateFactors } from "../../src/recognition/pathMatch";
import type { Point, Stroke } from "../../src/recognition/preprocess";
import { PROFILES } from "../../src/recognition/profiles";
import { recognizeStrokes, strokeFactors } from "../../src/recognition/recognizer";
import { splitSequence } from "../../src/recognition/strokeOrder";
import { STROKE_TEMPLATES } from "../../src/recognition/strokeTemplates";
import { arg, loadModelsFromDisk, ROOT } from "./benchmarkShared";

const N = Number(arg("--n") ?? 60);
if (arg("--template-scale")) MATCH_SCALE.template = Number(arg("--template-scale"));
if (arg("--personal-scale")) MATCH_SCALE.personal = Number(arg("--personal-scale"));
if (arg("--template-boost")) MATCH_BOOST.template = Number(arg("--template-boost"));
if (arg("--personal-boost")) MATCH_BOOST.personal = Number(arg("--personal-boost"));
const ALLOWED = PROFILES.linearAlgebra.chars;
const CHARS = Object.keys(STROKE_TEMPLATES);
const PROPORTIONS: Record<string, [number, number]> = { "(": [0.35, 1], ")": [0.35, 1], "/": [0.55, 1], ",": [0.35, 0.6], "-": [1, 0.05], "=": [1, 0.6], "+": [1, 1], x: [1, 1] };

loadModelsFromDisk();

let seed = 11;
const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const spread = (a: number) => (random() * 2 - 1) * a;

interface Style {
  rot: number;
  shear: number;
  sx: number;
  sy: number;
  wobble: { ax: number; ay: number; fx: number; fy: number; px: number; py: number };
}
const randomStyle = (amount: number): Style => ({
  rot: spread(0.15 * amount),
  shear: spread(0.25 * amount),
  sx: 1 + spread(0.2 * amount),
  sy: 1 + spread(0.15 * amount),
  wobble: { ax: spread(0.05 * amount), ay: spread(0.05 * amount), fx: 1 + random() * 3, fy: 1 + random() * 3, px: random() * 6, py: random() * 6 },
});

/** A character's taught path, drawn in a style, at a size, with the hand's jitter and an uneven speed. */
function draw(char: string, style: Style, jitter: number): Stroke[] {
  const [w, h] = PROPORTIONS[char] ?? [0.6, 1];
  const size = 40 + random() * 40;
  const cos = Math.cos(style.rot);
  const sin = Math.sin(style.rot);
  return STROKE_TEMPLATES[char].map((s) => {
    // Along the stroke, at an uneven pace: denser where the pen slows.
    const dense: Point[] = [];
    for (let i = 1; i < s.length; i++) {
      const steps = 2 + Math.floor(random() * 4);
      for (let k = 0; k < steps; k++) dense.push({ x: s[i - 1].x + ((s[i].x - s[i - 1].x) * k) / steps, y: s[i - 1].y + ((s[i].y - s[i - 1].y) * k) / steps });
    }
    dense.push(s[s.length - 1]);
    return dense.map((p, i) => {
      const t = i / Math.max(1, dense.length - 1);
      let x = (p.x - 0.5) * w * style.sx + style.wobble.ax * Math.sin(style.wobble.fx * t * Math.PI * 2 + style.wobble.px);
      let y = (p.y - 0.5) * h * style.sy + style.wobble.ay * Math.sin(style.wobble.fy * t * Math.PI * 2 + style.wobble.py);
      x += y * style.shear;
      [x, y] = [x * cos - y * sin, x * sin + y * cos];
      return { x: x * size + spread(jitter * size), y: y * size + spread(jitter * size) };
    });
  });
}

/** Read with the picture and stroke models as in the app, optionally times path factors. */
async function read(strokes: Stroke[], extra?: (labels: readonly string[]) => readonly number[]): Promise<string> {
  const byStroke = await strokeFactors(strokes);
  const r = await recognizeStrokes(strokes, undefined, "full", ALLOWED, (labels) => {
    const e = extra?.(labels);
    return labels.map((c, i) => (byStroke?.get(c) ?? 1) * (e?.[i] ?? 1));
  });
  return r.char;
}

async function main() {
  const tally = (name: string) => ({ name, n: 0, base: 0, matched: 0, perChar: new Map<string, [number, number, number]>() });
  const results = [tally("taught"), tally("own"), tally("real")];
  const count = (t: (typeof results)[number], char: string, base: string, matched: string) => {
    t.n++;
    t.base += base === char ? 1 : 0;
    t.matched += matched === char ? 1 : 0;
    const c = t.perChar.get(char) ?? [0, 0, 0];
    t.perChar.set(char, [c[0] + 1, c[1] + (base === char ? 1 : 0), c[2] + (matched === char ? 1 : 0)]);
  };

  for (const char of CHARS) {
    // Taught writing.
    for (let i = 0; i < N; i++) {
      const strokes = draw(char, randomStyle(1), 0.012);
      count(results[0], char, await read(strokes), await read(strokes, (labels) => templateFactors(strokes, labels)));
    }
    // A child's own style for this character, three remembered samples, then new writing in it.
    const style = randomStyle(2.2);
    const remembered = Array.from({ length: 3 }, () => ({ char, path: Array.from(pathOf(draw(char, style, 0.015))) }));
    // Other characters' samples too, as a child who's practised them all would have.
    const others = CHARS.filter((c) => c !== char).map((c) => ({ char: c, path: Array.from(pathOf(draw(c, randomStyle(2.2), 0.015))) }));
    for (let i = 0; i < N; i++) {
      const strokes = draw(char, style, 0.015);
      count(results[1], char, await read(strokes), await read(strokes, (labels) => personalPathFactors(strokes, labels, [...remembered, ...others]) ?? labels.map(() => 1)));
    }
  }
  // Real adult symbols.
  const dir = path.join(ROOT, "data", "mwalignedstrokes", "cache");
  for (const file of readdirSync(dir)) {
    const { char, sequences } = JSON.parse(readFileSync(path.join(dir, file), "utf8")) as { char: string; sequences: number[][] };
    if (!CHARS.includes(char)) continue;
    for (const seq of sequences.slice(0, N)) {
      const strokes = splitSequence(seq).map((s) => s.map((p) => ({ x: p.x * 30, y: p.y * 30 })));
      count(results[2], char, await read(strokes), await read(strokes, (labels) => templateFactors(strokes, labels)));
    }
  }

  for (const t of results) {
    console.log(`\n${t.name}: ${t.n} symbols, right ${((t.base / t.n) * 100).toFixed(1)}% -> ${((t.matched / t.n) * 100).toFixed(1)}% with path matching`);
    console.log(
      "  " +
        [...t.perChar]
          .map(([c, [n, b, m]]) => `${c} ${Math.round((b / n) * 100)}->${Math.round((m / n) * 100)}`)
          .join("  ")
    );
  }
}

main();
