/**
 * The detection pipeline this test page exists to show: group a page's
 * strokes into candidate symbols (segmentation.ts), decide which of those
 * are actually straight lines by geometry (lineDetection.ts), and classify
 * everything else with the shared handwriting recognizer (the same
 * model/preprocessing the game and the LaTeX test page use). Deliberately
 * stops here - no spatial parsing (is this above that, is this a fraction),
 * no math understanding. That's a separate layer built on top of this
 * output, not part of detection itself.
 */
import { recognizeStrokes } from "../recognition/recognizer";
import type { Stroke } from "../recognition/preprocess";
import { segmentSymbols } from "../mathinput/segmentation";
import { detectLine, type DetectedLine } from "./lineDetection";

export type GlyphType = "digit" | "operator" | "dot" | "letter";

export interface DetectedGlyph {
  type: GlyphType;
  value: string;
  bbox: { x: number; y: number; w: number; h: number };
  confidence: number;
}

export type DetectedItem = DetectedLine | DetectedGlyph;

const DIGIT_CHARS = new Set("0123456789".split(""));
// Every math sign except "." (which gets its own "dot" type, per the brief:
// "numbers, dots and +-*/ and other math symbols" - a dot is its own kind of
// thing, not lumped in with the operators).
const OPERATOR_CHARS = new Set(["+", "-", "×", "÷", "=", "<", ">", "(", ")", "/", ",", "^", "π"]);

function glyphType(char: string): GlyphType {
  if (DIGIT_CHARS.has(char)) return "digit";
  if (char === ".") return "dot";
  if (OPERATOR_CHARS.has(char)) return "operator";
  return "letter";
}

export async function detectAll(strokes: Stroke[]): Promise<DetectedItem[]> {
  const symbols = segmentSymbols(strokes);
  const items: DetectedItem[] = [];
  for (const symbol of symbols) {
    const line = detectLine(symbol);
    if (line) {
      items.push(line);
      continue;
    }
    const result = await recognizeStrokes(symbol.strokes);
    items.push({
      type: glyphType(result.char),
      value: result.char,
      bbox: {
        x: Math.round(symbol.box.minX),
        y: Math.round(symbol.box.minY),
        w: Math.round(symbol.box.width),
        h: Math.round(symbol.box.height),
      },
      confidence: Math.round(result.topTwo.first.prob * 100) / 100,
    });
  }
  return items;
}
