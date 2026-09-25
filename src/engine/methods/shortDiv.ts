/**
 * shortDiv: kort division. Not implemented in version 1 - see the build
 * brief's "Kort division" section. Kept as a typed stub so the method
 * registry (../arithmetic.ts) already has a slot for it.
 */
import type { BuildOptions, CellGraph } from "../types";

export interface ShortDivParams {
  dividend: number;
  divisor: number;
}

export function buildGraph(_params: ShortDivParams, _options?: BuildOptions): CellGraph {
  throw new Error("shortDiv is not implemented in version 1 (planned for level 2.2)");
}
