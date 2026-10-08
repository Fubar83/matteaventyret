/**
 * How each character with writing rules (strokeOrder.ts) is taught to be
 * written: its strokes in order, each as points in a box 0-1 wide and 0-1
 * tall (y down), the pen going from the first point to the last. Shown
 * animated when a child wrote one another way, and in Skrivskolan. Each is
 * one of the ways its rules allow (checked by strokeOrder.test.ts).
 */
import type { Point, Stroke } from "./preprocess";

const line = (...pts: [number, number][]): Stroke => pts.map(([x, y]) => ({ x, y }));

/** Part of an ellipse around (cx, cy), from angle `from` to `to` in degrees (0 = right, 90 = down), as points. */
function arc(cx: number, cy: number, rx: number, ry: number, from: number, to: number, steps = 16): Point[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const a = ((from + ((to - from) * i) / steps) * Math.PI) / 180;
    return { x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) };
  });
}

export const STROKE_TEMPLATES: Readonly<Record<string, readonly Stroke[]>> = {
  "(": [arc(0.95, 0.5, 0.55, 0.5, 250, 110)],
  ")": [arc(0.05, 0.5, 0.55, 0.5, -70, 70)],
  "/": [line([0.85, 0], [0.15, 1])],
  ",": [line([0.6, 0.55], [0.55, 0.75], [0.4, 1])],
  "-": [line([0.05, 0.5], [0.95, 0.5])],
  "=": [line([0.05, 0.3], [0.95, 0.3]), line([0.05, 0.7], [0.95, 0.7])],
  "+": [line([0.05, 0.5], [0.95, 0.5]), line([0.5, 0.05], [0.5, 0.95])],
  x: [line([0.1, 0.1], [0.9, 0.9]), line([0.9, 0.1], [0.1, 0.9])],
  "0": [arc(0.5, 0.5, 0.4, 0.5, -90, -450, 24)],
  "1": [line([0.25, 0.25], [0.6, 0], [0.6, 1])],
  "2": [[...arc(0.5, 0.3, 0.38, 0.3, 200, 380), { x: 0.75, y: 0.55 }, { x: 0.1, y: 1 }, { x: 0.95, y: 1 }]],
  "3": [[...arc(0.45, 0.26, 0.38, 0.26, 210, 450), ...arc(0.45, 0.74, 0.42, 0.26, -90, 150)]],
  // The "L", then the stem from the top.
  "4": [line([0.45, 0], [0.1, 0.65], [0.95, 0.65]), line([0.7, 0.3], [0.7, 1])],
  // The body first, then the flag on top.
  "5": [[{ x: 0.2, y: 0 }, { x: 0.15, y: 0.45 }, ...arc(0.45, 0.7, 0.42, 0.3, -130, 140)], line([0.2, 0], [0.85, 0])],
  // Down the left side from the top, then round the loop.
  "6": [[{ x: 0.75, y: 0 }, { x: 0.42, y: 0.14 }, { x: 0.2, y: 0.42 }, ...arc(0.5, 0.7, 0.32, 0.3, 180, -180, 24)]],
  "7": [line([0.1, 0], [0.9, 0], [0.35, 1])],
  // From the top right over the top loop, across the middle, round the bottom loop and back up.
  "8": [[...arc(0.5, 0.25, 0.3, 0.25, -20, -250), ...arc(0.5, 0.73, 0.36, 0.27, -60, 240, 24), arc(0.5, 0.25, 0.3, 0.25, -20, -20, 1)[0]]],
  "9": [[...arc(0.5, 0.3, 0.38, 0.3, 0, -360, 24), { x: 0.85, y: 1 }]],
};

/** How a character is taught to be written, or null for one without writing rules. */
export function templateFor(char: string): readonly Stroke[] | null {
  return STROKE_TEMPLATES[char] ?? null;
}
