/**
 * longDiv: liggande stolen (dela, multiplicera, subtrahera, flytta ner).
 * Not implemented in version 1 - see the build brief's "Liggande stolen"
 * section. Kept as a typed stub so the method registry (../arithmetic.ts)
 * already has a slot for it.
 */
import type { BuildOptions, CellGraph } from "../types";

export interface LongDivParams {
  dividend: number;
  divisor: number;
}

export function buildGraph(_params: LongDivParams, _options?: BuildOptions): CellGraph {
  throw new Error("longDiv is not implemented in version 1 (planned for level 2.2)");
}
