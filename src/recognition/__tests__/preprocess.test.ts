import { describe, expect, it } from "vitest";
import { preprocessStrokes, RECOGNIZER_INPUT_SIZE } from "../preprocess";

describe("preprocessStrokes", () => {
  it("returns an all-zero 28x28 grid for no strokes", () => {
    const grid = preprocessStrokes([]);
    expect(grid.length).toBe(RECOGNIZER_INPUT_SIZE * RECOGNIZER_INPUT_SIZE);
    expect(Array.from(grid).every((v) => v === 0)).toBe(true);
  });

  it("centres ink drawn off to one side of the canvas", () => {
    // A vertical stroke drawn far to the right of a large canvas.
    const grid = preprocessStrokes([
      [
        { x: 380, y: 200 },
        { x: 380, y: 400 },
      ],
    ]);
    const size = RECOGNIZER_INPUT_SIZE;
    let weightedX = 0;
    let totalWeight = 0;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const v = grid[y * size + x];
        weightedX += x * v;
        totalWeight += v;
      }
    }
    expect(totalWeight).toBeGreaterThan(0);
    const centroidX = weightedX / totalWeight;
    expect(centroidX).toBeGreaterThan(size / 2 - 3);
    expect(centroidX).toBeLessThan(size / 2 + 3);
  });

  it("scales a tiny stroke up to use most of the grid", () => {
    const grid = preprocessStrokes([
      [
        { x: 10, y: 10 },
        { x: 10, y: 14 },
        { x: 14, y: 14 },
      ],
    ]);
    const size = RECOGNIZER_INPUT_SIZE;
    const litPixels = Array.from(grid).filter((v) => v > 0.3).length;
    expect(litPixels).toBeGreaterThan(5);
    // Ink should reach reasonably close to the grid's edges once scaled up.
    let minX = size;
    let maxX = 0;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (grid[y * size + x] > 0.3) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
        }
      }
    }
    expect(maxX - minX).toBeGreaterThan(size * 0.4);
  });

  it("draws a dot for a single-point tap", () => {
    const grid = preprocessStrokes([[{ x: 50, y: 50 }]]);
    expect(Array.from(grid).some((v) => v > 0)).toBe(true);
  });

  function litSpanX(grid: Float32Array): number {
    const size = RECOGNIZER_INPUT_SIZE;
    let minX = size;
    let maxX = 0;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (grid[y * size + x] > 0.3) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
        }
      }
    }
    return maxX - minX;
  }

  it("without a canvasSize, still magnifies a tiny stroke to fill the grid (old behaviour, unaffected)", () => {
    const grid = preprocessStrokes([
      [
        { x: 10, y: 10 },
        { x: 10, y: 14 },
        { x: 14, y: 14 },
      ],
    ]);
    expect(litSpanX(grid)).toBeGreaterThan(RECOGNIZER_INPUT_SIZE * 0.4);
  });

  it("given a canvasSize, keeps a mark tiny relative to its own canvas small on the grid instead of magnifying it (period/comma)", () => {
    // A 4px mark on a 120px canvas (a tap) - well under the small-mark threshold.
    const grid = preprocessStrokes(
      [
        [
          { x: 60, y: 60 },
          { x: 62, y: 62 },
          { x: 63, y: 64 },
        ],
      ],
      120
    );
    expect(litSpanX(grid)).toBeLessThan(RECOGNIZER_INPUT_SIZE * 0.3);
  });

  it("given a canvasSize, still magnifies a normal-sized character drawn small on a small board cell (not just a tap)", () => {
    // A 20px stroke on a 32px cell (a real digit drawn in a compact inline cell) - well over the threshold.
    const grid = preprocessStrokes(
      [
        [
          { x: 6, y: 6 },
          { x: 6, y: 26 },
        ],
      ],
      32
    );
    expect(litSpanX(grid)).toBeGreaterThanOrEqual(0); // a vertical line has ~0 x-span; sanity-check it isn't shrunk to nothing
    let anyLit = false;
    for (let i = 0; i < grid.length; i++) if (grid[i] > 0.3) anyLit = true;
    expect(anyLit).toBe(true);
    // Its y-span should still reach close to the grid's edges, same as the old unconditional-magnify test above.
    const size = RECOGNIZER_INPUT_SIZE;
    let minY = size;
    let maxY = 0;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        if (grid[y * size + x] > 0.3) {
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }
    expect(maxY - minY).toBeGreaterThan(size * 0.4);
  });
});
