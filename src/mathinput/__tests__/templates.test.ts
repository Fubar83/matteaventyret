import { describe, expect, it } from "vitest";
import { layoutSymbols, type ClassifiedSymbol } from "../layout";
import type { BoundingBox } from "../segmentation";
import { mergeByBox, printedSymbols, templateById, TEMPLATES, type WritingTemplate } from "../templates";
import { verifyWork } from "../verify";

/** A handwritten-size symbol centered at (cx, cy). */
function s(char: string, cx: number, cy: number, opts: { w?: number; h?: number; struck?: boolean } = {}): ClassifiedSymbol {
  const w = opts.w ?? 44;
  const h = opts.h ?? 72;
  const box: BoundingBox = { cx, cy, width: w, height: h, minX: cx - w / 2, maxX: cx + w / 2, minY: cy - h / 2, maxY: cy + h / 2 };
  return { char, box, struck: opts.struck };
}

/**
 * Writes `text` into a template row, right-aligned: its last digit in the
 * ones box (or `fromCol`), optionally nudged sideways. Digits are sized to
 * the template's boxes, the way a child fills them - the division templates
 * use a smaller cell.
 */
function write(t: WritingTemplate, slot: string, text: string, opts: { fromCol?: number; dx?: number } = {}): ClassifiedSymbol[] {
  const { cy, xs } = t.slots[slot];
  const from = opts.fromCol ?? 0;
  const size = t.id === "shortDiv" || t.id === "trappan" ? { w: 38, h: 56 } : {};
  return [...text].map((ch, i) => s(ch, xs[from + text.length - 1 - i] + (opts.dx ?? 0), cy, size));
}

const norm = (t: string) => t.replace(/\s+/g, " ");

describe("writing templates", () => {
  it("every template fits its own drawing area", () => {
    for (const t of TEMPLATES) {
      for (const b of t.boxes) {
        expect(b.x).toBeGreaterThanOrEqual(0);
        expect(b.x + b.w).toBeLessThanOrEqual(t.width);
        expect(b.y + b.h).toBeLessThanOrEqual(t.height);
      }
    }
  });

  it("addition: the printed '+' and line make a column sum from just the digits the child wrote", () => {
    const t = templateById("add");
    const symbols = [...write(t, "top", "100"), ...write(t, "bottom", "23"), ...write(t, "answer", "123"), ...printedSymbols(t)];
    expect(norm(layoutSymbols(symbols))).toBe(norm("\\begin{array}{rccc} & 1 & 0 & 0 \\\\ + & & 2 & 3 \\\\ \\hline & 1 & 2 & 3 \\end{array}"));
    const [check] = verifyWork(symbols);
    expect(check.title).toBe("Addition: 100 + 23");
    expect(check.allCorrect, JSON.stringify({ notice: check.notice, marks: check.marks.filter((m) => m.status !== "correct").map((m) => [m.status, Math.round(m.box.cx), Math.round(m.box.cy), m.expected]) })).toBe(true);
  });

  it("puts each digit in the column of the box it's in, even written off-center (a whole row shifted 25px right)", () => {
    const t = templateById("add");
    const symbols = [...write(t, "top", "57"), ...write(t, "bottom", "68", { dx: 25 }), ...write(t, "answer", "125", { dx: -20 }), ...printedSymbols(t)];
    const [check] = verifyWork(symbols);
    expect(check.allCorrect, JSON.stringify({ notice: check.notice, marks: check.marks.filter((m) => m.status !== "correct").map((m) => [m.status, Math.round(m.box.cx), Math.round(m.box.cy), m.expected]) })).toBe(true);
  });

  it("subtraction: grades borrowing written in the template's note boxes", () => {
    const t = templateById("sub");
    const notes = t.slots.notes;
    const symbols = [
      ...write(t, "top", "52"),
      ...write(t, "bottom", "17"),
      ...write(t, "answer", "35"),
      // 5 struck, "10" in the ones column's note box
      ...printedSymbols(t),
    ];
    symbols[0] = { ...symbols[0], struck: true };
    symbols.push(s("1", notes.xs[0] - 9, notes.cy, { w: 14, h: 28 }), s("0", notes.xs[0] + 9, notes.cy, { w: 16, h: 28 }));
    const [check] = verifyWork(symbols);
    expect(check.title).toBe("Subtraktion: 52 − 17");
    expect(check.errors).toBe(0);
  });

  it("subtraction: a borrowed '10' written big enough to fill its box is still a note, not a row of digits", () => {
    const t = templateById("sub");
    const notes = t.slots.notes;
    const symbols = [...write(t, "top", "52"), ...write(t, "bottom", "17"), ...write(t, "answer", "35"), ...printedSymbols(t)];
    symbols[0] = { ...symbols[0], struck: true };
    // 50px tall next to 72px digits - too big for the size test alone (under 65%), but it's in the note row.
    symbols.push(s("1", notes.xs[0] - 13, notes.cy, { w: 16, h: 50 }), s("0", notes.xs[0] + 13, notes.cy, { w: 24, h: 50 }));
    const [check] = verifyWork(symbols);
    expect(check.title).toBe("Subtraktion: 52 − 17");
    expect(check.errors).toBe(0);
    expect(check.marks.filter((m) => m.status === "correct").length).toBeGreaterThanOrEqual(4); // strike, "1", "0", answer digits
  });

  it("multiplication has no note row - the template starts straight with the numbers", () => {
    const t = templateById("mul");
    expect(t.boxes.some((b) => b.kind === "note")).toBe(false);
    expect(t.slots.notes).toBeUndefined();
  });

  it("multiplication: partial products in the first rows, their sum under the second line (23 · 45)", () => {
    const t = templateById("mul");
    const symbols = [
      ...write(t, "top", "23"),
      ...write(t, "bottom", "45"),
      ...write(t, "section0row0", "115"),
      ...write(t, "section0row1", "92", { fromCol: 1 }),
      ...write(t, "answer", "1035"),
      ...printedSymbols(t),
    ];
    const [check] = verifyWork(symbols);
    expect(check.title).toBe("Multiplikation: 23 · 45");
    expect(check.allCorrect, JSON.stringify({ notice: check.notice, marks: check.marks.filter((m) => m.status !== "correct").map((m) => [m.status, Math.round(m.box.cx), Math.round(m.box.cy), m.expected]) })).toBe(true);
  });

  it("multiplication by one digit: the answer can go straight in the first row", () => {
    const t = templateById("mul");
    const symbols = [...write(t, "top", "47"), ...write(t, "bottom", "6"), ...write(t, "section0row0", "282"), ...printedSymbols(t)];
    const [check] = verifyWork(symbols);
    expect(check.title).toBe("Multiplikation: 47 · 6");
    expect(check.allCorrect, JSON.stringify({ notice: check.notice, marks: check.marks.filter((m) => m.status !== "correct").map((m) => [m.status, Math.round(m.box.cx), Math.round(m.box.cy), m.expected]) })).toBe(true);
  });

  describe("kort division before everything is written", () => {
    const t = templateById("shortDiv");

    it("an empty template is just a division, without numbers", () => {
      expect(layoutSymbols(printedSymbols(t))).toBe("\\frac{\\phantom{0}}{\\phantom{0}} =");
    });

    it("a dividend with no divisor yet is still a division - '100 /', not '1 - 00 ='", () => {
      expect(layoutSymbols([...write(t, "dividend", "100"), ...printedSymbols(t)])).toBe("\\frac{1 0 0}{\\phantom{0}} =");
    });

    it("dividend and divisor, no answer yet", () => {
      expect(layoutSymbols([...write(t, "dividend", "100"), ...write(t, "divisor", "5"), ...printedSymbols(t)])).toBe("\\frac{1 0 0}{5} =");
    });
  });

  it("kort division: dividend, divisor and quotient in their boxes, the remainder note up-left of its digit (688 / 4 = 172)", () => {
    const t = templateById("shortDiv");
    const d = t.slots.dividend;
    const symbols = [
      ...write(t, "dividend", "688"),
      s("2", d.xs[1] - 30, d.cy - 34, { w: 16, h: 28 }),
      ...write(t, "divisor", "4"),
      ...write(t, "quotient", "172"),
      ...printedSymbols(t),
    ];
    expect(layoutSymbols(symbols)).toBe("\\frac{6 {}^{2}8 8}{4} = 1 7 2");
    const [check] = verifyWork(symbols);
    expect(check.title).toBe("Kort division: 688 / 4");
    expect(check.allCorrect, JSON.stringify({ notice: check.notice, marks: check.marks.filter((m) => m.status !== "correct").map((m) => [m.status, Math.round(m.box.cx), Math.round(m.box.cy), m.expected]) })).toBe(true);
  });

  it("trappan: the printed bracket plus the child's quotient and steps (764 / 4 = 191)", () => {
    const t = templateById("trappan");
    const row = (r: number) => t.slots[`work${r}`];
    const lineUnder = (r: number, fromCol: number, toCol: number) => {
      const { cy, xs } = row(r);
      const between = (cy + row(r + 1).cy) / 2; // drawn in the gap under the row
      return s("-", (xs[fromCol] + xs[toCol]) / 2, between, { w: Math.abs(xs[fromCol] - xs[toCol]) + 40, h: 3 });
    };
    const symbols = [
      ...write(t, "quotient", "191"),
      ...write(t, "dividend", "764"),
      ...write(t, "divisor", "4"),
      s("-", row(0).xs[3], row(0).cy, { w: 30, h: 3 }),
      ...write(t, "work0", "4", { fromCol: 2 }),
      lineUnder(0, 3, 2),
      ...write(t, "work1", "36", { fromCol: 1 }),
      s("-", row(2).xs[3], row(2).cy, { w: 30, h: 3 }),
      ...write(t, "work2", "36", { fromCol: 1 }),
      lineUnder(2, 3, 1),
      ...write(t, "work3", "04"),
      s("-", row(4).xs[1], row(4).cy, { w: 30, h: 3 }),
      ...write(t, "work4", "4"),
      lineUnder(4, 1, 0),
      ...write(t, "work5", "0"),
      ...printedSymbols(t),
    ];
    expect(layoutSymbols(symbols)).toContain("4\\,\\big| & \\overline{764}");
    const [check] = verifyWork(symbols);
    expect(check.title).toBe("Trappan: 764 / 4");
    expect(check.allCorrect, JSON.stringify({ notice: check.notice, marks: check.marks.filter((m) => m.status !== "correct").map((m) => [m.status, Math.round(m.box.cx), Math.round(m.box.cy), m.expected]) })).toBe(true);
  });
});

describe("column templates read each box as it is, whatever the size of the writing", () => {
  const small = { w: 26, h: 40 };

  it("a digit written small is a plain digit - not an exponent, subscript or carry", () => {
    const t = templateById("add");
    const { top, bottom, answer } = t.slots;
    const symbols = [
      s("3", top.xs[1], top.cy),
      s("4", top.xs[0] + 5, top.cy + 15, small),
      s("2", bottom.xs[0], bottom.cy - 10, small),
      s("3", answer.xs[1], answer.cy),
      s("6", answer.xs[0], answer.cy - 15, small),
      ...printedSymbols(t),
    ];
    expect(norm(layoutSymbols(symbols))).toBe(norm("\\begin{array}{rcc} & 3 & 4 \\\\ + & & 2 \\\\ \\hline & 3 & 6 \\end{array}"));
    const [check] = verifyWork(symbols);
    expect(check.allCorrect).toBe(true);
  });

  it("a half-written template is still column work, not loose symbols", () => {
    for (const id of ["add", "sub", "mul"] as const) {
      const t = templateById(id);
      const symbols = [s("3", t.slots.top.xs[1], t.slots.top.cy), s("4", t.slots.top.xs[0], t.slots.top.cy + 15, small), ...printedSymbols(t)];
      expect(layoutSymbols(symbols)).toMatch(/^\\begin\{array\}.* & 3 & 4 \\\\/);
      expect(verifyWork(symbols)).toEqual([]);
    }
  });

  it("a small mark low between two boxes is a decimal comma (3,4 + 1,2 = 4,6)", () => {
    const t = templateById("add");
    const comma = (slot: string) => s("1", (t.slots[slot].xs[0] + t.slots[slot].xs[1]) / 2, t.slots[slot].cy + 30, { w: 8, h: 18 });
    const symbols = [...write(t, "top", "34"), comma("top"), ...write(t, "bottom", "12"), comma("bottom"), ...write(t, "answer", "46"), comma("answer"), ...printedSymbols(t)];
    expect(norm(layoutSymbols(symbols))).toBe(
      norm("\\begin{array}{rcc} & 3\\rlap{,} & 4 \\\\ + & 1\\rlap{,} & 2 \\\\ \\hline & 4\\rlap{,} & 6 \\end{array}")
    );
    const [check] = verifyWork(symbols);
    expect(check.allCorrect).toBe(true);
  });

  it("trappan: a two-digit divisor written unevenly is just its digits", () => {
    const t = templateById("trappan");
    const d = t.slots.divisor;
    const symbols = [...write(t, "dividend", "96"), s("1", d.xs[1], d.cy, { w: 30, h: 56 }), s("2", d.xs[0], d.cy + 10, { w: 20, h: 30 }), ...printedSymbols(t)];
    expect(layoutSymbols(symbols)).toContain("12\\,\\big|");
  });

  describe("one digit per box", () => {
    const t = templateById("add");
    const seg = (cx: number, cy: number, w: number, h: number) => {
      const box = s("?", cx, cy, { w, h }).box;
      return { strokes: [[{ x: box.minX, y: box.minY }, { x: box.maxX, y: box.maxY }]], box };
    };

    it("a '5' whose hat was lifted off is one symbol, not a '5' and a '-'", () => {
      const { cy, xs } = t.slots.bottom;
      const body = seg(xs[3] + 4, cy + 8, 40, 60);
      const hat = seg(xs[3] - 4, cy - 34, 48, 6);
      const merged = mergeByBox([body, hat], printedSymbols(t));
      expect(merged).toHaveLength(1);
      expect(merged[0].strokes).toHaveLength(2);
    });

    it("leaves a note's two digits and a decimal comma apart", () => {
      const notes = t.slots.notes;
      const top = t.slots.top;
      const segments = [seg(notes.xs[1] - 9, notes.cy, 10, 24), seg(notes.xs[1] + 9, notes.cy, 14, 24), seg((top.xs[0] + top.xs[1]) / 2, top.cy + 30, 8, 18), seg(top.xs[0], top.cy, 44, 72)];
      expect(mergeByBox(segments, printedSymbols(t))).toHaveLength(4);
    });
  });
});
