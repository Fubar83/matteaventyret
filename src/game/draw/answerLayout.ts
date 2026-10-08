import type { BoardLayout } from "./boardTypes";

const DIGIT_W = 76;
const DIGIT_H = 92;
const PITCH = 88;
const PAD = 14;

/** A row of answer boxes, one per digit - the drawing-board version of a single numeric answer (see AnswerBoard). */
export function answerLayout(length: number): BoardLayout {
  return {
    width: PAD * 2 + length * PITCH,
    height: PAD * 2 + DIGIT_H,
    boxes: Array.from({ length }, (_, i) => ({
      id: `answer${i}`,
      x: PAD + i * PITCH + (PITCH - DIGIT_W) / 2,
      y: PAD,
      w: DIGIT_W,
      h: DIGIT_H,
      kind: "digit" as const,
      maxDigits: 1 as const,
    })),
    texts: [],
    lines: [],
  };
}
