/**
 * Glues the pipeline together: segment the page's strokes into candidate
 * symbols, classify each one with the shared handwriting recognizer (the
 * same model/preprocessing the game uses - see src/recognition/), then lay
 * the results out into LaTeX.
 */
import { recognizeStrokes } from "../recognition/recognizer";
import type { Stroke } from "../recognition/preprocess";
import { layoutSymbols, type ClassifiedSymbol } from "./layout";
import { segmentSymbols, type SegmentedSymbol } from "./segmentation";

export interface RecognizedSymbol {
  char: string;
  confident: boolean;
  box: SegmentedSymbol["box"];
}

export interface ExpressionResult {
  latex: string;
  symbols: RecognizedSymbol[];
}

const EMPTY: ExpressionResult = { latex: "", symbols: [] };

export async function recognizeExpression(strokes: Stroke[]): Promise<ExpressionResult> {
  const segments = segmentSymbols(strokes);
  if (segments.length === 0) return EMPTY;

  const symbols: RecognizedSymbol[] = await Promise.all(
    segments.map(async (seg) => {
      const result = await recognizeStrokes(seg.strokes);
      return { char: result.char, confident: result.confident, box: seg.box };
    })
  );

  const classified: ClassifiedSymbol[] = symbols.map((s) => ({ char: s.char, box: s.box }));
  return { latex: layoutSymbols(classified), symbols };
}
