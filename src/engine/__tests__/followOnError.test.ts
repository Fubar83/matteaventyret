/**
 * följdfel: a cell that is wrong only because an earlier cell the child
 * wrote themselves was wrong must be marked as a follow-on error, not an
 * original one - only original errors count against stars.
 */
import { describe, expect, it } from "vitest";
import { checkAll as checkAddAll } from "../methods/columnAdd";
import { checkAll as checkSubAll } from "../methods/columnSub";

describe("addition följdfel", () => {
  it("a wrong minnessiffra propagates into the next column as a följdfel, not a fresh error", () => {
    // 47 + 38: true carry out of the ones column is 1, true tens result is 8.
    // The child writes the ones result correctly (5), writes the wrong carry (0
    // instead of 1), then correctly adds using their own (wrong) carry: 4+3+0=7.
    const report = checkAddAll(
      { top: 47, bottom: 38 },
      { "add-r0": 5, "add-c0": 0, "add-r1": 7 }
    );
    const carry = report.results.find((r) => r.cellId === "add-c0")!;
    const tens = report.results.find((r) => r.cellId === "add-r1")!;
    expect(carry.status).toBe("wrong"); // the carry itself is an original error
    expect(tens.status).toBe("followOnError"); // consistent with the child's own carry
    expect(report.errorCount).toBe(1);
    expect(report.followOnErrorCount).toBe(1);
  });

  it("the same wrong tens value with no wrong carry written is a fresh error", () => {
    const report = checkAddAll({ top: 47, bottom: 38 }, { "add-r0": 5, "add-c0": 1, "add-r1": 7 });
    const tens = report.results.find((r) => r.cellId === "add-r1")!;
    expect(tens.status).toBe("wrong");
    expect(report.errorCount).toBe(1);
    expect(report.followOnErrorCount).toBe(0);
  });
});

describe("subtraction följdfel", () => {
  it("a wrong borrowed-ten ones-digit propagates into that column's own result", () => {
    // 52 - 27: true borrowed ten is 10 (tens=1, ones=0), true ones result is 5.
    // The reduced tens value (4) is never written (see columnSub.ts), so the
    // only thing left for a följdfel to propagate through here is the
    // borrowed ten itself: the child writes its ones digit as 1 instead of 0
    // (reading their own borrowed amount as 11), then correctly computes 2+11-7=6.
    const report = checkSubAll(
      { top: 52, bottom: 27 },
      { "sub-strike1": "struck", "sub-bt0-tens": 1, "sub-bt0-ones": 1, "sub-r0": 6, "sub-r1": 2 }
    );
    const borrowOnes = report.results.find((r) => r.cellId === "sub-bt0-ones")!;
    const onesResult = report.results.find((r) => r.cellId === "sub-r0")!;
    expect(borrowOnes.status).toBe("wrong");
    expect(onesResult.status).toBe("followOnError");
    expect(report.errorCount).toBe(1);
    expect(report.followOnErrorCount).toBe(1);
  });

  it("an unrelated wrong result is a fresh error", () => {
    const report = checkSubAll(
      { top: 52, bottom: 27 },
      { "sub-strike1": "struck", "sub-bt0-tens": 1, "sub-bt0-ones": 0, "sub-r0": 9, "sub-r1": 2 }
    );
    const onesResult = report.results.find((r) => r.cellId === "sub-r0")!;
    expect(onesResult.status).toBe("wrong");
    expect(report.errorCount).toBe(1);
    expect(report.followOnErrorCount).toBe(0);
  });
});
