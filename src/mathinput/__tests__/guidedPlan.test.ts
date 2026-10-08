import { describe, expect, it } from "vitest";
import { planGuided, readOperands, type GuidedPlan } from "../guidedPlan";
import type { ClassifiedSymbol } from "../layout";
import { printedSymbols, templateById } from "../templates";

/** The digits a row of boxes holds once every step is done, most significant first. */
function rowValue(plan: GuidedPlan, prefix: string): string {
  const done = new Map(plan.steps.map((s) => [s.boxId, s.expected]));
  return plan.layout.boxes
    .filter((b) => b.id.startsWith(`${prefix}:`) && b.kind !== "sign")
    .sort((a, b) => a.x - b.x)
    .map((b) => done.get(b.id))
    .join("");
}

function expectWellFormed(plan: GuidedPlan) {
  const ids = new Set(plan.layout.boxes.map((b) => b.id));
  // Every step has its box, and every box to write in has exactly one step.
  for (const s of plan.steps) expect(ids.has(s.boxId), s.boxId).toBe(true);
  const writable = plan.layout.boxes.filter((b) => b.kind !== "printed").map((b) => b.id);
  expect(plan.steps.map((s) => s.boxId).sort()).toEqual([...writable].sort());
  // No two boxes overlap, and all fit on the board.
  for (const [i, a] of plan.layout.boxes.entries()) {
    expect(a.x).toBeGreaterThanOrEqual(0);
    expect(a.x + a.w).toBeLessThanOrEqual(plan.layout.width);
    expect(a.y + a.h).toBeLessThanOrEqual(plan.layout.height);
    for (const b of plan.layout.boxes.slice(i + 1)) {
      const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
      expect(apart, `${a.id} / ${b.id}`).toBe(true);
    }
  }
  // Prompts never give the digit away as "skriv N".
  for (const s of plan.steps) expect(s.prompt).not.toMatch(/[Ss]kriv \d/);
}

describe("guided plans", () => {
  it("addition: sum digits and minnessiffror in the order it's done by hand (1234 + 5678)", () => {
    const plan = planGuided("+", 1234, 5678);
    expectWellFormed(plan);
    expect(rowValue(plan, "s")).toBe("6912");
    expect(plan.steps.map((s) => `${s.boxId}=${s.expected}`)).toEqual(["s:0=2", "c:1=1", "s:1=1", "c:2=1", "s:2=9", "s:3=6"]);
  });

  it("addition that grows a digit gets a box for it (99 + 1)", () => {
    const plan = planGuided("+", 99, 1);
    expectWellFormed(plan);
    expect(rowValue(plan, "s")).toBe("100");
  });

  it("multiplication by one digit: the partial product is the answer (47 · 6)", () => {
    const plan = planGuided("×", 47, 6);
    expectWellFormed(plan);
    expect(rowValue(plan, "p0")).toBe("282");
    expect(plan.layout.boxes.some((b) => b.id.startsWith("s:"))).toBe(false);
    expect(plan.steps.map((s) => `${s.boxId}=${s.expected}`)).toEqual(["p0:0=2", "m0:1=4", "p0:1=8", "p0:2=2"]);
  });

  it("multiplication by three digits: three shifted partial products, then their sum (123 · 567)", () => {
    const plan = planGuided("×", 123, 567);
    expectWellFormed(plan);
    expect(rowValue(plan, "p0")).toBe("861"); // 123 · 7
    expect(rowValue(plan, "p1")).toBe("738"); // 123 · 6, one column left
    expect(rowValue(plan, "p2")).toBe("615"); // 123 · 5, two columns left
    expect(rowValue(plan, "s")).toBe("69741");
    const box = (id: string) => plan.layout.boxes.find((b) => b.id === id)!;
    expect(box("p1:1").x).toBe(box("p0:1").x); // shifted: its first digit is in the tens column
    expect(box("p2:2").x).toBe(box("p0:2").x);
    // All the multiplying comes before the adding.
    const firstSum = plan.steps.findIndex((s) => s.boxId.startsWith("s:"));
    expect(plan.steps.slice(firstSum).every((s) => s.boxId.startsWith("s:") || s.boxId.startsWith("c:"))).toBe(true);
    // Each row's minnessiffror sit above the top number, in its own row of small boxes.
    const topY = plan.layout.boxes.find((b) => b.id === "top:0")!.y;
    for (const b of plan.layout.boxes.filter((b) => /^m\d:/.test(b.id))) expect(b.y).toBeLessThan(topY);
  });

  it("a 0 in the multiplier gets no row of its own (123 · 405)", () => {
    const plan = planGuided("×", 123, 405);
    expectWellFormed(plan);
    expect(rowValue(plan, "p0")).toBe("615");
    expect(rowValue(plan, "p1")).toBe("492"); // the 4, at the hundreds
    expect(plan.layout.boxes.find((b) => b.id === "p1:2")!.x).toBe(plan.layout.boxes.find((b) => b.id === "p0:2")!.x);
    expect(rowValue(plan, "s")).toBe("49815");
  });
});

describe("the numbers each step lights up", () => {
  /** What a box holds once it's done: a printed digit, or what its step writes. */
  function valueOf(plan: GuidedPlan, id: string): number {
    const box = plan.layout.boxes.find((b) => b.id === id);
    if (!box) throw new Error(`no box ${id}`);
    if (box.kind === "printed") return Number(box.text);
    return Number(plan.steps.find((s) => s.boxId === id)!.expected);
  }

  it.each([
    ["+", 1234, 5678],
    ["+", 99, 1],
    ["×", 47, 6],
    ["×", 123, 567],
    ["×", 123, 405],
    ["×", 999, 99],
  ] as const)("%s %i %i: they give exactly the digit asked for", (op, top, bottom) => {
    const plan = planGuided(op, top, bottom);
    for (const step of plan.steps) {
      expect(step.uses.length, step.boxId).toBeGreaterThan(0);
      if (step.expected === "+") continue; // the sign lights up the rows it adds - checked on its own below
      // Only numbers already there (printed, or written in an earlier step) - never the box being written.
      const done = new Set(plan.steps.slice(0, plan.steps.indexOf(step)).map((s) => s.boxId));
      for (const id of step.uses) expect(done.has(id) || id.startsWith("top:") || id.startsWith("bottom:"), `${step.boxId} uses ${id}`).toBe(true);
      const carries = step.uses.filter((id) => /^(m\d|c):/.test(id)).map((id) => valueOf(plan, id));
      const digits = step.uses.filter((id) => !/^(m\d|c):/.test(id)).map((id) => valueOf(plan, id));
      const carry = carries.reduce((a, b) => a + b, 0);
      const multiplying = /^p\d|^m\d/.test(step.boxId);
      const total = (multiplying ? digits.reduce((a, b) => a * b, 1) : digits.reduce((a, b) => a + b, 0)) + carry;
      // A result box takes the ones; a minnessiffra (or the last column's overflow digit) the tens.
      const isResult = plan.steps.findIndex((s) => s.uses === step.uses) === plan.steps.indexOf(step);
      expect(isResult ? total % 10 : Math.floor(total / 10), `${step.boxId}: ${step.prompt}`).toBe(step.expected);
    }
  });

  it("7 · 3 in 123 · 567: the 3, the 7 - and then for 7 · 2, the minnessiffra too", () => {
    const plan = planGuided("×", 123, 567);
    expect(plan.steps[0].uses).toEqual(["top:0", "bottom:0"]);
    expect(plan.steps[1].boxId).toBe("m0:1");
    expect(plan.steps[2].uses).toEqual(["top:1", "bottom:0", "m0:1"]);
  });
});

describe("the plus sign before adding the partial products", () => {
  it("is written by the child, in front of the last partial product, after all the multiplying and before any adding", () => {
    const plan = planGuided("×", 123, 567);
    const at = plan.steps.findIndex((s) => s.expected === "+");
    const step = plan.steps[at];
    expect(step.boxId).toBe("p2:sign");
    expect(plan.steps.slice(0, at).every((s) => /^(p\d|m\d):/.test(s.boxId))).toBe(true);
    expect(plan.steps.slice(at + 1).every((s) => /^(s|c):/.test(s.boxId))).toBe(true);
    // In the operator column, on the last partial product's row.
    const sign = plan.layout.boxes.find((b) => b.id === "p2:sign")!;
    const row = plan.layout.boxes.find((b) => b.id === "p2:2")!;
    expect(sign.kind).toBe("sign");
    expect(sign.x + sign.w).toBeLessThanOrEqual(Math.min(...plan.layout.boxes.filter((b) => b.kind !== "sign").map((b) => b.x)));
    expect(sign.y + sign.h / 2).toBeCloseTo(row.y + row.h / 2);
    // It lights up the rows it adds.
    expect(step.uses).toContain("p0:0");
    expect(step.uses).toContain("p2:2");
  });

  it("isn't there when there is nothing to add up (one multiplier digit, or an addition)", () => {
    for (const plan of [planGuided("×", 47, 6), planGuided("+", 12, 34)]) {
      expect(plan.steps.some((s) => s.expected === "+")).toBe(false);
      expect(plan.layout.boxes.some((b) => b.kind === "sign")).toBe(false);
    }
  });
});

describe("reading the numbers to start from", () => {
  function s(char: string, cx: number, cy: number): ClassifiedSymbol {
    return { char, box: { cx, cy, width: 44, height: 72, minX: cx - 22, maxX: cx + 22, minY: cy - 36, maxY: cy + 36 } };
  }
  const write = (id: "add" | "mul" | "sub", slot: string, text: string) => {
    const { cy, xs } = templateById(id).slots[slot];
    return [...text].map((ch, i) => s(ch, xs[text.length - 1 - i], cy));
  };

  it("reads both numbers and the printed operator", () => {
    const t = templateById("mul");
    expect(readOperands([...write("mul", "top", "123"), ...write("mul", "bottom", "567"), ...printedSymbols(t)])).toEqual({ operator: "×", top: 123, bottom: 567 });
    const a = templateById("add");
    expect(readOperands([...write("add", "top", "1234"), ...write("add", "bottom", "5678"), ...printedSymbols(a)])).toEqual({ operator: "+", top: 1234, bottom: 5678 });
  });

  it("waits until both numbers are written", () => {
    const t = templateById("mul");
    expect(readOperands([...write("mul", "top", "123"), ...printedSymbols(t)])).toBeNull();
  });

  it("has no guided subtraction yet", () => {
    const t = templateById("sub");
    expect(readOperands([...write("sub", "top", "111"), ...write("sub", "bottom", "99"), ...printedSymbols(t)])).toBeNull();
  });
});

describe("multiplying decimals: made whole, multiplied, the decimals put back", () => {
  const order = (plan: GuidedPlan) => plan.steps.map((s) => `${s.boxId}=${s.expected}`);
  const commaStep = (plan: GuidedPlan) => plan.steps.find((s) => s.choice)!;

  it("0,2 · 0,03: 2 and 3, 1 + 2 decimals away - 2 · 3 = 6, three back: 0,006", () => {
    const plan = planGuided("×", 2, 3, { top: 1, bottom: 2 });
    expect(order(plan)).toEqual(["kt:0=1", "kb:0=2", "ks:0=3", "p0:0=6", "comma=1", "p0:1=0", "p0:2=0", "p0:3=0"]);
    expect(plan.steps[0].prompt).toBe("Gör 0,2 till ett heltal: ta bort kommat, så blir det 2. Hur många decimaler tog du bort? Skriv antalet här.");
    expect(plan.steps[1].prompt).toContain("0,03 till ett heltal: ta bort kommat, så blir det 3");
    expect(plan.steps[2].prompt).toContain("1 + 2");
    expect(plan.steps[3].prompt).toContain("Räkna nu med heltalen: 2 · 3.");
    const comma = commaStep(plan);
    expect(comma.prompt).toBe("Du fick 6. Sätt tillbaka de 3 decimaler du tog bort: svaret ska ha 3 siffror efter kommat. Vilket är rätt?");
    expect(comma.choice!.options).toEqual(["0,06", "0,006", "0,0006"]);
    expect(comma.choice!.whyNot[0]).toBe("0,06 har 2 decimaler – du tog bort 3 decimaler, så svaret ska ha 3 siffror efter kommat.");
    expect(plan.steps[5].prompt).toContain("6 har bara en siffra, men svaret ska ha 3 siffror efter kommat och en före");
    expect(plan.answerText).toBe("= 0,006");
    // Set up as the whole numbers they became - no commas; the answer's comma once the decimals are back.
    expect(plan.layout.boxes.filter((b) => b.kind === "printed").map((b) => `${b.id}=${b.text}`).sort()).toEqual(["bottom:0=3", "top:0=2"]);
    expect(plan.layout.texts.filter((x) => x.text === ",").map((x) => x.from)).toEqual([plan.steps.findIndex((s) => s.choice) + 1]);
  });

  it("3,4 · 6: 34 (one decimal away), 34 · 6 = 204, one back: 20,4 - no sum row for one number", () => {
    const plan = planGuided("×", 34, 6, { top: 1, bottom: 0 });
    expect(order(plan)).toEqual(["kt:0=1", "p0:0=4", "m0:1=2", "p0:1=0", "p0:2=2", "comma=1"]);
    expect(commaStep(plan).choice!.options).toEqual(["204", "20,4", "2,04"]);
    expect(plan.answerText).toBe("= 20,4");
    expect(plan.doneNote).toBe("Du tog bort en decimal och satte tillbaka lika många.");
  });

  it("2,5 · 1,3: 25 · 13 = 325, 1 + 1 back: 3,25", () => {
    const plan = planGuided("×", 25, 13, { top: 1, bottom: 1 });
    expect(order(plan)).toEqual([
      "kt:0=1", "kb:0=1", "ks:0=2",
      "p0:0=5", "m0:1=1", "p0:1=7",
      "p1:1=5", "p1:2=2",
      "p1:sign=+",
      "s:0=5", "s:1=2", "c:2=1", "s:2=3",
      "comma=1",
    ]);
    expect(commaStep(plan).choice!.options).toEqual(["32,5", "3,25", "0,325"]);
    expect(`${plan.title} ${plan.answerText}`).toBe("2,5 · 1,3 = 3,25");
  });

  it("0,4 · 0,3: 4 · 3 = 12, two back - one zero in front: 0,12", () => {
    const plan = planGuided("×", 4, 3, { top: 1, bottom: 1 });
    expect(order(plan)).toEqual(["kt:0=1", "kb:0=1", "ks:0=2", "p0:0=2", "p0:1=1", "comma=1", "p0:2=0"]);
    expect(plan.answerText).toBe("= 0,12");
  });

  it("whole numbers are as before: 23 · 14 = 322 - nothing to take away or put back", () => {
    const plan = planGuided("×", 23, 14);
    expect(rowValue(plan, "s")).toBe("322");
    expect(plan.steps.some((s) => s.choice || s.boxId.startsWith("k"))).toBe(false);
    expect(plan.doneNote).toBeUndefined();
    expect(plan.answerText).toBe("= 322");
  });

  it("turns up box by box: each step's box at its own step, the sum's line with the sum", () => {
    const plan = planGuided("×", 25, 13, { top: 1, bottom: 1 });
    for (const b of plan.layout.boxes) {
      const at = plan.steps.findIndex((s) => s.boxId === b.id);
      expect(b.from ?? 0, b.id).toBe(b.kind === "printed" ? 0 : at);
    }
    const sumStart = plan.steps.findIndex((s) => s.boxId === "s:0");
    expect(plan.layout.lines.map((l) => l.from ?? 0)).toEqual([0, sumStart]);
  });
});
