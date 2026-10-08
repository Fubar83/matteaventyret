/**
 * Finds written-out arithmetic on the page and grades it: long divisions
 * (trappan / liggande stolen) first, then column arithmetic (widest line
 * first, like the layout pass), then kort division among what's left.
 * Returns one WorkCheck per piece of work found - none for a plain formula.
 */
import { parseColumnWork } from "../columnLayout";
import type { ClassifiedSymbol } from "../layout";
import { parseLongDivision } from "../longDivisionLayout";
import { parseShortDivision } from "../shortDivisionParse";
import { checkColumnWork } from "./columnCheck";
import { checkLongDivision, checkShortDivision } from "./divisionCheck";
import type { WorkCheck } from "./types";

export type { CheckMark, MarkStatus, WorkCheck } from "./types";

export function verifyWork(symbols: ClassifiedSymbol[]): WorkCheck[] {
  const checks: WorkCheck[] = [];
  let remaining = symbols;
  const consume = (used: Set<ClassifiedSymbol>) => (remaining = remaining.filter((s) => !used.has(s)));

  for (const bracket of symbols.filter((s) => s.bracket)) {
    if (!remaining.includes(bracket)) continue;
    const work = parseLongDivision(bracket, bracket.bracket!, remaining);
    checks.push(checkLongDivision(work));
    consume(work.consumed);
  }

  for (const bar of remaining.filter((s) => s.char === "-").sort((a, b) => b.box.width - a.box.width)) {
    if (!remaining.includes(bar)) continue;
    const work = parseColumnWork(bar, remaining);
    if (!work) continue;
    const check = checkColumnWork(work);
    if (check) checks.push(check);
    consume(work.consumed);
  }

  for (let work = parseShortDivision(remaining); work; work = parseShortDivision(remaining)) {
    checks.push(checkShortDivision(work));
    consume(work.consumed);
  }
  return checks;
}
