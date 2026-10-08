import { rememberInk } from "../../recognition/personal";
import type { DrawBoardHandle } from "./DrawBoard";

/**
 * The writer answered "Menade du?" for a box: its ink is that digit -
 * remembered on this device so their handwriting reads better next time
 * (recognition/personal.ts). A box read as two digits ("15") isn't one
 * symbol, so it isn't kept.
 */
export function rememberBoxDigit(board: DrawBoardHandle | null, boxId: string, digits: readonly number[]): void {
  if (!board || digits.length !== 1) return;
  rememberInk(board.strokesOf(boxId), String(digits[0]));
}
