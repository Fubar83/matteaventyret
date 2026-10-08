/**
 * Test examples from real writers - children, ideally - collected on the
 * handwriting page: the ink, and what it really says (the reading as
 * corrected in the editor). Kept in this browser until downloaded as a JSON
 * file for data/kids/, where scripts/ts/benchmarkKids.ts scores every way of
 * reading them. The benchmark on MathWriting is adults' university maths;
 * this is the one that says how the game reads a child.
 */
import type { Stroke } from "../recognition/preprocess";

const STORAGE_KEY = "matteaventyret-testcases-v1";

export interface TestCase {
  /** What the writing really says, as LaTeX (the editor's corrected version). */
  expected: string;
  /** What it was read as when saved - for a quick look, the benchmark reads it afresh. */
  read: string;
  level: number;
  template: string;
  strokes: Stroke[];
  savedAt: string;
}

export function loadTestCases(): TestCase[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function store(cases: TestCase[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
  } catch {
    // Full or blocked: nothing more can be kept - downloading what's there still works.
  }
}

export function addTestCase(c: Omit<TestCase, "savedAt">): number {
  const cases = [...loadTestCases(), { ...c, strokes: c.strokes.map((s) => s.map((p) => ({ x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 }))), savedAt: new Date().toISOString() }];
  store(cases);
  return cases.length;
}

export function clearTestCases() {
  store([]);
}

/** The saved examples as a file to put in data/kids/. */
export function downloadTestCases() {
  const blob = new Blob([JSON.stringify(loadTestCases(), null, 1)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `testexempel-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
