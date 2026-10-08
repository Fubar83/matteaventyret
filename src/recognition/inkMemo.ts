/**
 * Remembering what the models made of a group of strokes. The pad reads the
 * whole page again after every pause in the writing, but only the newest
 * stroke changed - without this, every symbol went through the models again,
 * each time, and the page froze for a moment after every character (worst
 * when reading in writing order, which tries several groupings per stroke).
 *
 * A stroke is known by its ink (a fingerprint of its points), not by object
 * identity, so the same ink read again - after a re-render, an undo - is
 * still found.
 */
import type { Stroke } from "./preprocess";

const fingerprints = new WeakMap<Stroke, string>();

/** A short fingerprint of one stroke's ink: its length, ends and a sum over its points. */
function fingerprint(stroke: Stroke): string {
  let known = fingerprints.get(stroke);
  if (known === undefined) {
    let sum = 0;
    for (let i = 0; i < stroke.length; i++) sum += stroke[i].x * (i + 1) + stroke[i].y * (i + 7);
    const first = stroke[0];
    const last = stroke[stroke.length - 1];
    known = first ? `${stroke.length}:${first.x.toFixed(1)},${first.y.toFixed(1)}:${last.x.toFixed(1)},${last.y.toFixed(1)}:${sum.toFixed(1)}` : "0";
    fingerprints.set(stroke, known);
  }
  return known;
}

/** A group of strokes' key, in drawing order. */
export function inkKey(strokes: readonly Stroke[]): string {
  return strokes.map(fingerprint).join("|");
}

/** Every memo, so they can all be forgotten at once (forgetAllReadings). */
const ALL = new Set<InkMemo<unknown>>();

/** Forgets everything remembered - the models changed, or this writer's own samples did. */
export function forgetAllReadings(): void {
  for (const memo of ALL) memo.clear();
}

/** A bounded memo: the most recently used `capacity` results are kept. */
export class InkMemo<V> {
  private readonly entries = new Map<string, V>();
  private readonly capacity: number;
  constructor(capacity = 3000) {
    this.capacity = capacity;
    ALL.add(this as InkMemo<unknown>);
  }

  get(key: string, make: () => V): V {
    const hit = this.entries.get(key);
    if (hit !== undefined) {
      // Most recently used goes last.
      this.entries.delete(key);
      this.entries.set(key, hit);
      return hit;
    }
    const value = make();
    this.entries.set(key, value);
    if (this.entries.size > this.capacity) this.entries.delete(this.entries.keys().next().value!);
    return value;
  }

  has(key: string): boolean {
    return this.entries.has(key);
  }

  peek(key: string): V | undefined {
    return this.entries.get(key);
  }

  clear(): void {
    this.entries.clear();
  }
}
