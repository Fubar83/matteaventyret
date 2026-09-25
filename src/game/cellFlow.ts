import type { CellGraph, WrittenMap } from "../engine/types";

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
