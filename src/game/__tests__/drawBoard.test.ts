import { describe, expect, it } from "vitest";
import { buildGraph } from "../../engine/arithmetic";
import type { WrittenMap } from "../../engine/types";
import type { Stroke } from "../../recognition/preprocess";
import type { DrawBox } from "../draw/boardTypes";
import { activeBoxes, boxForCell, boxStatuses, boxValues, buildColumnBoard } from "../draw/columnBoardLayout";
import { boxForStroke, isStrikeLine, splitDigits } from "../draw/readBox";
import { segmentSymbols } from "../../mathinput/segmentation";

const line = (...pts: [number, number][]): Stroke => pts.map(([x, y]) => ({ x, y }));

describe("buildColumnBoard", () => {
  const graph = buildGraph("columnAdd", { top: 57, bottom: 68 });
  const board = buildColumnBoard(graph, 57, 68, "+", {});
  const box = (id: string) => board.layout.boxes.find((b) => b.id === id)!;

  it("prints the numbers and gives every cell to write a box of its own", () => {
    expect(board.layout.boxes.filter((b) => b.kind === "printed").map((b) => b.text).sort()).toEqual(["5", "6", "7", "8"]);
    expect(box("add-c0").kind).toBe("small"); // the carry, above the tens
    expect(["add-r0", "add-r1", "add-r2"].every((id) => box(id).kind === "digit")).toBe(true);
    expect(board.layout.texts.some((t) => t.text === "+")).toBe(true);
    expect(board.layout.lines.length).toBe(1);
  });

  it("lets a result box that can take a carry take the whole column sum ('15'), but not the overflow digit", () => {
    expect(box("add-r0").maxDigits).toBe(2);
    expect(box("add-r1").maxDigits).toBe(2);
    expect(box("add-r2").maxDigits).toBe(1);
  });

  it("keeps the carry box above the column it belongs to", () => {
    const tensResult = box("add-r1");
    const carry = box("add-c0");
    expect(carry.x + carry.w / 2).toBeCloseTo(tensResult.x + tensResult.w / 2);
    expect(carry.y).toBeLessThan(box("top:1").y);
  });

  it("opens only the boxes whose turn it is in a guided phase, every answer box in Fritt", () => {
    const ready = new Set(["add-r0", "add-c0"]);
    expect([...activeBoxes(board, ready, {}, false)].sort()).toEqual(["add-c0", "add-r0"]);
    const fritt = activeBoxes(board, new Set(graph.cells.map((c) => c.id)), {}, true);
    expect(fritt.has("add-r2")).toBe(true);
    expect(fritt.has("top:0")).toBe(false); // nothing to cross out in an addition
  });

  it("shows written values and colors by verdict", () => {
    expect(boxValues(board, { "add-r0": 5 })["add-r0"]).toBe("5");
    expect(boxStatuses(board, { "add-r0": "correct", "add-c0": "wrong" })).toEqual({ "add-r0": "correct", "add-c0": "wrong" });
    expect(boxForCell(board, "add-c0")).toBe("add-c0");
  });

  it("draws a decimal comma between the tenths and the ones", () => {
    const dec = buildColumnBoard(buildGraph("columnAdd", { top: 47, bottom: 38 }), 47, 38, "+", {}, 1);
    expect(dec.layout.texts.filter((t) => t.text === ",").length).toBe(3); // top, bottom and answer rows
  });
});

describe("buildColumnBoard for subtraction", () => {
  const graph = buildGraph("columnSub", { top: 100, bottom: 54 });
  // The crossing-out that reveals the "10" over the tens (the engine gates it on its own chain - see board.ts revealedBy).
  const revealer = graph.cells.find((c) => c.id === "sub-bt1-tens")!.dependsOn[0];

  it("shows a borrowed '10' only once the digit it's borrowed from has been crossed out", () => {
    const hidden = buildColumnBoard(graph, 100, 54, "-", {});
    expect(hidden.layout.boxes.some((b) => b.id.startsWith("ten:"))).toBe(false);
    const written: WrittenMap = { [revealer]: "struck" };
    const shown = buildColumnBoard(graph, 100, 54, "-", written);
    const ten = shown.layout.boxes.find((b) => b.id === "ten:sub-bt1-tens")!;
    expect(ten.maxDigits).toBe(2);
    expect(ten.strikeable).toBe(true); // this ten is lent on, so it gets crossed out too
  });

  it("makes a printed digit that must be crossed out strikeable, and shows it struck", () => {
    const board = buildColumnBoard(graph, 100, 54, "-", {});
    expect(board.layout.boxes.find((b) => b.id === "top:2")!.strikeable).toBe(true);
    expect(boxValues(board, { "sub-strike2": "struck" })["top:2"]).toBe("struck");
  });

  it("colors a borrowed ten by its worst part", () => {
    const board = buildColumnBoard(graph, 100, 54, "-", { [revealer]: "struck" });
    expect(boxStatuses(board, { "sub-bt1-tens": "correct", "sub-bt1-ones": "wrong" })["ten:sub-bt1-tens"]).toBe("wrong");
  });
});

describe("reading boxes", () => {
  const boxes: DrawBox[] = [
    { id: "a", x: 0, y: 0, w: 76, h: 92, kind: "digit" },
    { id: "b", x: 88, y: 0, w: 76, h: 92, kind: "digit" },
  ];

  it("puts a stroke in the box its center is in - with some slack past the edge - or in none", () => {
    expect(boxForStroke(line([30, 10], [40, 80]), boxes)).toBe("a");
    expect(boxForStroke(line([150, 10], [170, 80]), boxes)).toBe("b"); // pokes out of b's right edge
    expect(boxForStroke(line([400, 400], [420, 450]), boxes)).toBeNull();
  });

  it("reads a line across a box as crossing it out - but not an upright '1' or a short dash", () => {
    const box = boxes[0];
    expect(isStrikeLine(line([4, 84], [72, 8]), box)).toBe(true);
    expect(isStrikeLine(line([2, 46], [74, 44]), box)).toBe(true);
    expect(isStrikeLine(line([38, 6], [38, 86]), box)).toBe(false);
    expect(isStrikeLine(line([30, 46], [46, 46]), box)).toBe(false);
  });

  it("splits a box's ink into its digits, left to right", () => {
    const one = line([10, 5], [10, 60]);
    const five = line([60, 5], [40, 5], [38, 30], [60, 35], [58, 60], [36, 58]);
    expect(splitDigits([five, one], 2)).toEqual([[one], [five]]);
    expect(splitDigits([one, five], 1)).toEqual([[one, five]]);
  });

  it("a 5 written in two strokes - body, then the flag on top - is one digit, not two", () => {
    // As on a phone: the body down and round, then the flag across its top - a little to the right and above,
    // which the segmenter on its own takes for two symbols.
    const body = line([14, 14], [13, 30], [12, 42], [30, 38], [46, 46], [50, 62], [42, 74], [26, 76], [14, 72]);
    const flag = line([22, 8], [39, 7], [56, 6]);
    expect(segmentSymbols([body, flag])).toHaveLength(2);
    expect(splitDigits([body, flag], 2)).toEqual([[body, flag]]);
    // A 4 whose crossbar is its own stroke, the same.
    const down = line([30, 6], [30, 76]);
    const bar = line([8, 50], [44, 50]);
    const slant = line([28, 8], [8, 50]);
    expect(splitDigits([slant, bar, down], 2)).toHaveLength(1);
  });

  it("two digits side by side still come apart - 15, a 4 and a 7", () => {
    const one = line([12, 6], [12, 74]);
    const fiveBody = line([40, 10], [38, 40], [54, 36], [70, 46], [70, 64], [60, 74], [40, 72]);
    const fiveFlag = line([42, 8], [72, 6]);
    const groups = splitDigits([one, fiveBody, fiveFlag], 2);
    expect(groups).toHaveLength(2);
    expect(groups[0]).toEqual([one]);
    expect(groups[1]).toHaveLength(2);
    const four = [line([18, 8], [4, 46], [30, 46]), line([24, 20], [24, 74])];
    const seven = [line([44, 8], [72, 8], [52, 74])];
    expect(splitDigits([...four, ...seven], 2)).toHaveLength(2);
  });

  it("cuts ink that falls into more pieces than the box's digits at the widest gap", () => {
    const a = line([0, 0], [0, 40]);
    const b = line([10, 0], [10, 40]); // close to a: the same digit, drawn in two strokes
    const c = line([60, 0], [60, 40]);
    const groups = splitDigits([a, b, c], 2);
    expect(groups.length).toBe(2);
    expect(groups[1]).toEqual([c]);
  });
});
