import type { Cell, CellGraph, WrittenMap } from "../engine/types";

/**
 * Where the tens digit goes when a child writes a whole column sum into a
 * result box - "15" for 7 + 8, which is how most children think it ("fifteen:
 * write the 5, carry the 1") rather than as two separate steps.
 *
 * For addition and multiplication that's the column's minnessiffra (shown
 * above the next column), or, in the last column - which has no minnessiffra
 * - the overflow result digit to its left. Null where a two-digit answer in
 * one column never makes sense (subtraction, or a column with neither).
 */
export function tensCellFor(graph: CellGraph, cell: Cell): Cell | null {
  if (cell.type !== "result") return null;
  const m = /^(add|mul)-r(\d+)$/.exec(cell.id);
  if (!m) return null;
  const [, prefix, colText] = m;
  const col = Number(colText);
  return graph.cells.find((c) => c.id === `${prefix}-c${col}`) ?? graph.cells.find((c) => c.id === `${prefix}-r${col + 1}`) ?? null;
}

/**
 * A cell graph never needs the child to write a not-required cell (e.g. a
 * minnessiffra of 0, an optional leading zero), but a later required cell
 * can still structurally depend on one. This computes readiness as if every
 * not-required cell that is otherwise ready had already been silently
 * filled in - without ever adding it to `written`, so nothing not-required
 * is ever shown as written (see build brief "Addition rules": "A
 * minnessiffra of 0 is never written").
 */
export function resolveImplicitlyReady(graph: CellGraph, written: WrittenMap): WrittenMap {
  const resolved = { ...written };
  let changed = true;
  while (changed) {
    changed = false;
    for (const cell of graph.cells) {
      if (!cell.required && resolved[cell.id] === undefined && cell.dependsOn.every((id) => resolved[id] !== undefined)) {
        resolved[cell.id] = cell.expected as WrittenMap[string];
        changed = true;
      }
    }
  }
  return resolved;
}
