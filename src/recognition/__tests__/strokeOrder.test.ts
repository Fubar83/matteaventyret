import { describe, expect, it } from "vitest";
import type { Stroke } from "../preprocess";
import { describeStrokes, followsOrder, ORDER_RULES, splitSequence } from "../strokeOrder";
import { STROKE_TEMPLATES } from "../strokeTemplates";

const line = (x1: number, y1: number, x2: number, y2: number): Stroke => Array.from({ length: 9 }, (_, i) => ({ x: x1 + ((x2 - x1) * i) / 8, y: y1 + ((y2 - y1) * i) / 8 }));
/** A bowed stroke from (x, top) to (x, bottom), bulging `bulge` to the side. */
const arc = (x: number, top: number, bottom: number, bulge: number): Stroke =>
  Array.from({ length: 9 }, (_, i) => ({ x: x + bulge * Math.sin((Math.PI * i) / 8), y: top + ((bottom - top) * i) / 8 }));

describe("writing order", () => {
  it("describes each stroke by where it starts and which way it goes", () => {
    expect(describeStrokes([line(0, 0, 40, 0), line(0, 20, 40, 20)])).toBe("TL:R | BL:R");
  });

  it("wants brackets drawn top to bottom", () => {
    expect(followsOrder("(", [arc(10, 0, 60, -8)])).toBe(true);
    expect(followsOrder("(", [arc(10, 60, 0, -8)])).toBe(false);
  });

  it("wants the top bar of an = first, both left to right", () => {
    const top = line(0, 0, 40, 0);
    const bottom = line(0, 20, 40, 20);
    expect(followsOrder("=", [top, bottom])).toBe(true);
    expect(followsOrder("=", [bottom, top])).toBe(false);
    expect(followsOrder("=", [line(40, 0, 0, 0), line(40, 20, 0, 20)])).toBe(false);
  });

  it("allows both ways of writing a 5: one stroke, or the body then the flag", () => {
    const body = [{ x: 5, y: 0 }, { x: 3, y: 25 }, { x: 25, y: 30 }, { x: 25, y: 50 }, { x: 2, y: 58 }];
    const flag = line(5, 0, 30, 0);
    expect(followsOrder("5", [body, flag])).toBe(true);
    expect(followsOrder("5", [flag, body])).toBe(false);
    expect(followsOrder("5", [[{ x: 30, y: 0 }, ...body]])).toBe(true);
  });

  it("lets a character without rules be written any way", () => {
    expect(followsOrder("a", [line(0, 50, 30, 0), line(30, 0, 0, 50)])).toBe(true);
  });

  it("reads a stroke sample's points back as strokes", () => {
    expect(splitSequence([0, 0, 1, 1, 1, 0, 2, 2, 1, 3, 3, 0]).map((s) => s.length)).toEqual([2, 2]);
  });
});

describe("the taught way of writing each character", () => {
  it("is one of the ways its rules allow", () => {
    for (const [char, strokes] of Object.entries(STROKE_TEMPLATES)) {
      // Scaled to the size a character is written at: the rules judge by proportions, the template is 0-1.
      const scaled = strokes.map((s) => s.map((p) => ({ x: p.x * 30, y: p.y * 50 })));
      expect([char, followsOrder(char, scaled)]).toEqual([char, true]);
    }
  });

  it("covers every character with rules", () => {
    expect(Object.keys(STROKE_TEMPLATES).sort()).toEqual(Object.keys(ORDER_RULES).sort());
  });
});
