import { describe, expect, it } from "vitest";
import type { DivisionBracket } from "../divisionBracket";
import type { ClassifiedSymbol } from "../layout";
import type { BoundingBox } from "../segmentation";
import { verifyWork } from "../verify";

function s(char: string, cx: number, cy: number, opts: { w?: number; h?: number; struck?: boolean } = {}): ClassifiedSymbol {
  const w = opts.w ?? 24;
  const h = opts.h ?? 40;
  const box: BoundingBox = { cx, cy, width: w, height: h, minX: cx - w / 2, maxX: cx + w / 2, minY: cy - h / 2, maxY: cy + h / 2 };
  return { char, box, struck: opts.struck };
}
/** A row of digits whose LAST digit sits at rightX, one column per 34px. */
const digits = (text: string, rightX: number, cy: number) => [...text].map((d, i) => s(d, rightX - (text.length - 1 - i) * 34, cy));
const line = (fromX: number, toX: number, cy: number) => s("-", (fromX + toX) / 2, cy, { w: toX - fromX, h: 3 });
const small = (char: string, cx: number, cy: number, struck = false) => s(char, cx, cy, { w: 10, h: 18, struck });

/** "a", "op b", line, answer - the usual two-number column layout. */
function column(a: string, op: string, b: string, answer: string | null, extra: ClassifiedSymbol[] = []): ClassifiedSymbol[] {
  return [
    ...digits(a, 200, 60),
    s(op, 90, 120, op === "-" ? { w: 26, h: 3 } : { w: 22, h: 22 }),
    ...digits(b, 200, 120),
    line(80, 230, 160),
    ...(answer ? digits(answer, 200, 200) : []),
    ...extra,
  ];
}

describe("verifyWork: column arithmetic", () => {
  it("passes a correct addition, graded by the game engine", () => {
    const [check] = verifyWork(column("100", "+", "23", "123"));
    expect(check.title).toBe("Addition: 100 + 23");
    expect(check.allCorrect).toBe(true);
    expect(check.marks.filter((m) => m.status === "correct").length).toBe(3);
  });

  it("marks exactly the wrong digit", () => {
    const [check] = verifyWork(column("100", "+", "23", "133"));
    expect(check.errors).toBe(1);
    const wrong = check.marks.find((m) => m.status === "wrong")!;
    expect(wrong.box.cx).toBe(166); // the tens digit
    expect(wrong.expected).toBe("2");
  });

  it("calls a digit that follows from the child's own wrong carry a följdfel, not a new error (57 + 68, carry written as 2)", () => {
    const [check] = verifyWork(column("57", "+", "68", "135", [small("2", 166, 22)]));
    expect(check.errors).toBe(1); // the carry itself
    expect(check.followOnErrors).toBe(1); // tens: 5 + 6 + 2 = 13 -> 3
  });

  it("flags a missing answer instead of grading nothing", () => {
    const [check] = verifyWork(column("100", "+", "23", null));
    expect(check.allCorrect).toBe(false);
    expect(check.notice).toMatch(/Inget svar/);
  });

  it("grades the borrowing from the screenshot (100 - 91 = 009): struck 1, struck and replaced '10', '10' - all correct", () => {
    const extra = [
      small("1", 156, 22, true),
      small("0", 166, 22, true),
      small("9", 178, 22),
      small("1", 196, 22),
      small("0", 207, 22),
    ];
    const symbols = column("100", "-", "91", "009", extra);
    symbols[0] = s("x", 132, 60); // the struck "1", read as an "x"
    symbols[1] = s("0", 166, 60, { struck: true });
    const [check] = verifyWork(symbols);
    expect(check.title).toBe("Subtraktion: 100 − 91");
    expect(check.errors).toBe(0);
    expect(check.allCorrect).toBe(true);
  });

  it("grades the 100 - 54 = 46 screenshot as all correct: a borrowed '10' whose '1' and '0' aren't level, and a '10' only partly crossed out", () => {
    const symbols = [
      s("x", 132, 60), // struck 1
      s("0", 166, 60),
      s("0", 200, 60),
      small("1", 158, 22), // tens: "10", only its 0 caught by the dash
      small("0", 170, 22, true),
      small("1", 194, 14), // ones: "10" written unevenly - the 1 higher than the 0
      small("0", 207, 32),
      s("-", 95, 120, { w: 26, h: 3 }),
      ...digits("54", 200, 120),
      line(80, 230, 160),
      ...digits("46", 200, 200),
    ];
    const [check] = verifyWork(symbols);
    expect(check.title).toBe("Subtraktion: 100 − 54");
    expect(check.errors).toBe(0);
    expect(check.marks.filter((m) => m.status === "wrong")).toEqual([]);
  });

  it("flags a crossed-out borrowed ten in a column that never lends it on (100 - 91, ones column's '10' struck)", () => {
    const extra = [small("1", 156, 22), small("0", 166, 22), small("1", 196, 22, true), small("0", 207, 22, true)];
    const [check] = verifyWork(column("100", "-", "91", "009", extra));
    expect(check.marks.some((m) => m.status === "wrong" && m.expected === "ska inte strykas")).toBe(true);
  });

  it("checks a multi-digit multiplication's partial products and sum (23 · 45)", () => {
    const symbols = [
      ...digits("23", 200, 40),
      s("x", 120, 100, { w: 20, h: 22 }),
      ...digits("45", 200, 100),
      line(100, 230, 140),
      ...digits("115", 200, 180),
      ...digits("92", 166, 230),
      line(100, 230, 270),
      ...digits("1035", 200, 310),
    ];
    const [check] = verifyWork(symbols);
    expect(check.title).toBe("Multiplikation: 23 · 45");
    expect(check.allCorrect).toBe(true);
  });

  it("calls a sum that's right for the child's own (wrong) partial product a följdfel", () => {
    const symbols = [
      ...digits("23", 200, 40),
      s("x", 120, 100, { w: 20, h: 22 }),
      ...digits("45", 200, 100),
      line(100, 230, 140),
      ...digits("125", 200, 180), // wrong: should be 115
      ...digits("92", 166, 230),
      line(100, 230, 270),
      ...digits("1045", 200, 310), // 125 + 920 = 1045
    ];
    const [check] = verifyWork(symbols);
    expect(check.errors).toBe(1);
    expect(check.followOnErrors).toBe(1);
  });
});

describe("verifyWork: division", () => {
  it("grades kort division with the engine, remainder note included (688 / 4 = 172)", () => {
    const symbols = [
      s("6", 100, 40),
      s("2", 118, 26, { w: 10, h: 16 }),
      s("8", 134, 40),
      s("8", 168, 40),
      line(80, 190, 75),
      s("4", 134, 110),
      s("=", 220, 75, { h: 20 }),
      ...digits("172", 328, 75),
    ];
    const [check] = verifyWork(symbols);
    expect(check.title).toBe("Kort division: 688 / 4");
    expect(check.allCorrect).toBe(true);
  });

  it("marks a wrong quotient digit in kort division", () => {
    const symbols = [...digits("688", 168, 40), s("2", 118, 26, { w: 10, h: 16 }), line(80, 190, 75), s("4", 134, 110), s("=", 220, 75, { h: 20 }), ...digits("182", 328, 75)];
    const [check] = verifyWork(symbols);
    expect(check.errors).toBe(1);
  });

  function bracketSymbol(b: DivisionBracket): ClassifiedSymbol {
    const minX = Math.min(b.bar.minX, b.stemX);
    const maxX = Math.max(b.bar.maxX, b.stemX);
    const box: BoundingBox = { minX, maxX, minY: b.bar.y, maxY: b.stemBottom, cx: (minX + maxX) / 2, cy: (b.bar.y + b.stemBottom) / 2, width: maxX - minX, height: b.stemBottom - b.bar.y };
    return { char: "⟌", box, bracket: b };
  }
  const work764 = (productRow: string) => [
    s("-", 100, 150, { w: 16, h: 3 }),
    ...digits(productRow, 130, 150),
    line(90, 145, 175),
    ...digits("36", 164, 205),
    s("-", 110, 250, { w: 16, h: 3 }),
    ...digits("36", 164, 250),
    line(100, 180, 275),
    ...digits("04", 198, 305),
    s("-", 170, 350, { w: 16, h: 3 }),
    ...digits("4", 198, 350),
    line(160, 215, 375),
    ...digits("0", 198, 405),
  ];

  it("grades liggande stolen step by step (764 / 4 = 191)", () => {
    const bracket = bracketSymbol({ divisorSide: "right", bar: { minX: 100, maxX: 230, y: 60 }, stemX: 230, stemBottom: 120 });
    const [check] = verifyWork([bracket, ...digits("191", 198, 35), ...digits("764", 198, 90), ...digits("4", 255, 90), ...work764("4")]);
    expect(check.title).toBe("Liggande stolen: 764 / 4");
    expect(check.allCorrect).toBe(true);
  });

  it("marks a wrong step in the long division's work", () => {
    const bracket = bracketSymbol({ divisorSide: "left", bar: { minX: 100, maxX: 230, y: 60 }, stemX: 100, stemBottom: 120 });
    const [check] = verifyWork([bracket, ...digits("191", 198, 35), ...digits("764", 198, 90), ...digits("4", 75, 90), ...work764("5")]);
    expect(check.title).toBe("Trappan: 764 / 4");
    expect(check.errors).toBeGreaterThan(0);
  });
});

describe("verifyWork: nothing to grade", () => {
  it("returns no checks for a plain formula", () => {
    expect(verifyWork([s("1", 0, 100), s("+", 30, 100, { h: 20 }), s("2", 60, 100)])).toEqual([]);
  });
});
