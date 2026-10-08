/**
 * How alike are two samples of the same character in the picture model's own
 * features, and two of different characters? Sets the thresholds the
 * recognizer uses to match ink against a writer's own samples (recognizer.ts's
 * PERSONAL_MATCHES): a threshold should be passed by many same-character
 * pairs and almost no different-character ones.
 *
 * Run: npx jiti scripts/ts/checkPersonalThresholds.ts [--model full|basic]
 */
import * as tf from "@tensorflow/tfjs";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { arg, ROOT } from "./benchmarkShared";

const MODEL = arg("--model") ?? "full";
const CHARS = [..."0123456789", "x", "(", ")", "+", "a", "b", "z", "g", "s"];

async function main() {
  const folder = path.join(ROOT, "public", "recognition", `model-${MODEL}`);
  const json = JSON.parse(readFileSync(path.join(folder, "model.json"), "utf8"));
  const weights = readFileSync(path.join(folder, "weights.bin"));
  const model = await tf.loadLayersModel(
    tf.io.fromMemory({ modelTopology: json.modelTopology, weightSpecs: json.weightsManifest[0].weights, weightData: weights.buffer.slice(weights.byteOffset, weights.byteOffset + weights.byteLength) })
  );
  const dense = model.layers.filter((l) => l.getClassName() === "Dense");
  const fm = tf.model({ inputs: model.inputs, outputs: dense[dense.length - 2].output as tf.SymbolicTensor });

  // Held-out-ish samples: the end of each class's extracted MathWriting test... the cache's last 30 per class.
  const byChar = new Map<string, Float32Array[]>();
  for (const c of CHARS) {
    const p = path.join(ROOT, "data", "mwtrain", "cache", `${c.charCodeAt(0).toString(16)}.json`);
    if (!existsSync(p)) continue;
    const grids: number[][] = JSON.parse(readFileSync(p, "utf8")).grids;
    const feats = tf.tidy(() => {
      const g = grids.slice(-30);
      const x = tf.tensor4d(g.flat(), [g.length, 28, 28, 1]);
      const out = fm.predict(x) as tf.Tensor;
      const data = out.dataSync() as Float32Array;
      const size = data.length / g.length;
      return g.map((_, i) => data.slice(i * size, (i + 1) * size));
    });
    byChar.set(c, feats);
  }
  const cos = (a: Float32Array, b: Float32Array) => {
    let d = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) { d += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
    return d / Math.sqrt(na * nb || 1);
  };
  const same: number[] = [];
  const diff: number[] = [];
  const entries = [...byChar];
  for (const [ci, [, fa]] of entries.entries()) {
    for (let i = 0; i < fa.length; i++) for (let j = i + 1; j < fa.length; j++) same.push(cos(fa[i], fa[j]));
    for (const [, fb] of entries.slice(ci + 1)) for (const a of fa.slice(0, 10)) for (const b of fb.slice(0, 10)) diff.push(cos(a, b));
  }
  for (const t of [0.8, 0.85, 0.9, 0.93, 0.95, 0.97]) {
    const s = same.filter((v) => v >= t).length / same.length;
    const d = diff.filter((v) => v >= t).length / diff.length;
    console.log(`threshold ${t}: same-character pairs ${(s * 100).toFixed(1)}%   different-character pairs ${(d * 100).toFixed(2)}%`);
  }
}

main();
