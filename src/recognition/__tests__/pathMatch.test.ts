import { describe, expect, it } from "vitest";
import { MATCH_SCALE, matchQuality, pathDistance, pathOf, personalPathFactors, templateFactors } from "../pathMatch";
import type { Stroke } from "../preprocess";
import { STROKE_TEMPLATES } from "../strokeTemplates";

/** A taught character as written: 0.6 wide, 1 tall, at about 50 px. */
const written = (char: string, wobble = 0): Stroke[] =>
  STROKE_TEMPLATES[char].map((s) => s.map((p, i) => ({ x: p.x * 30 + wobble * Math.sin(i), y: p.y * 50 + wobble * Math.cos(i * 1.3) })));

describe("path matching", () => {
  it("finds a path no distance from itself", () => {
    const p = pathOf(written("8"));
    expect(pathDistance(p, p)).toBeCloseTo(0, 5);
  });

  it("finds the same character drawn the same way closer than another character", () => {
    const eight = pathOf(written("8", 1.5));
    expect(pathDistance(eight, pathOf(written("8")))).toBeLessThan(pathDistance(eight, pathOf(written("3"))));
  });

  it("tells the order apart: the same 8 drawn backwards is far from the taught one", () => {
    const forward = written("8");
    const backward = forward.map((s) => [...s].reverse());
    expect(pathDistance(pathOf(backward), pathOf(forward))).toBeGreaterThan(MATCH_SCALE.template);
  });

  it("raises the character whose taught path the ink follows, and leaves the rest", () => {
    const labels = ["8", "3", "s"];
    const [eight, three, s] = templateFactors(written("8", 1), labels);
    expect(eight).toBeGreaterThan(2);
    expect(three).toBeLessThan(eight);
    expect(s).toBe(1); // no taught way of writing an "s"
  });

  it("matches this child's own way of writing a character", () => {
    // Their 5: one stroke, the taught 5's body only.
    const mine: Stroke[] = [STROKE_TEMPLATES["5"][0].map((p) => ({ x: p.x * 30, y: p.y * 50 }))];
    const samples = [{ char: "5", path: Array.from(pathOf(mine)) }];
    const [five, six] = personalPathFactors(mine, ["5", "6"], samples)!;
    expect(five).toBeGreaterThan(5);
    expect(six).toBe(1);
    expect(personalPathFactors(mine, ["5"], [{ char: "5" }])).toBeNull();
  });

  it("counts a distance as less of a match the larger it is", () => {
    expect(matchQuality(0, 0.2)).toBe(1);
    expect(matchQuality(0.1, 0.2)).toBeGreaterThan(matchQuality(0.3, 0.2));
  });
});
