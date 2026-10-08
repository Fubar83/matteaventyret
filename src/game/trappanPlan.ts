/**
 * A trappan division (engine/trappan.ts) as a guided board for GuidedColumn:
 * the divisor left of the bracket's stem, the dividend under its bar, a box
 * above for each quotient digit, and below, stair by stair, boxes for the
 * product, the difference and the digit brought down - one box open at a
 * time, with what to do in it and the numbers it works with lit up. Only the
 * division itself is there at first: each box, line, minus sign, added zero
 * and comma turns up at the step that needs it (`from`).
 *
 *          1 9 1
 *      ───┬──────
 *       4 │ 7 6 4
 *        −  4
 *          ───
 *           3 6
 *        −  3 6
 *          ─────
 *             0 4
 *        −      4
 *               0
 *
 * A decimal comma is printed where it stands - in the dividend, and straight
 * above it in the answer. A question to round (2.5.7) ends with an answer row.
 */
import type { BoardLayout, DrawBox, PrintedText } from "./draw/boardTypes";
import type { GuidedBoardPlan, GuidedStep } from "../mathinput/guidedPlan";
import { decimalText, roundTo, shifted, valueOf, walkOf, type TrappanProblem } from "../engine/trappan";

const COL = 64;
const DIGIT_W = 54;
const DIGIT_H = 58;
const ROW_GAP = 8;
const PAD = 20;
const STEM_GAP = 14;

const digitsOf = (n: number) => String(n).split("").map(Number);

/** The answer the Swedish way, to a fixed number of decimals: 2,30. */
function fixed(value: number, decimals: number): string {
  return value.toFixed(decimals).replace(".", ",");
}

export function trappanPlan(problem: TrappanProblem): GuidedBoardPlan {
  const w = walkOf(problem);
  const { dividend } = w;
  const divisor = w.divisor;
  const n = dividend.digits.length;
  const intLen = n - dividend.decimals;
  const divisorDigits = String(divisor);
  const left = PAD + divisorDigits.length * COL + STEM_GAP;
  const xOf = (col: number) => left + col * COL + COL / 2;
  const boxes: DrawBox[] = [];
  const texts: PrintedText[] = [];
  const lines: BoardLayout["lines"] = [];
  const steps: GuidedStep[] = [];
  const box = (id: string, col: number, y: number, kind: DrawBox["kind"], text?: string, from = 0) =>
    boxes.push({ id, x: xOf(col) - DIGIT_W / 2, y, w: DIGIT_W, h: DIGIT_H, kind, maxDigits: 1, from, ...(text !== undefined ? { text } : {}) });
  /** A decimal comma after column `col`, low on a row starting at y. */
  const comma = (col: number, y: number, from = 0) => texts.push({ x: left + (col + 1) * COL, y: y + DIGIT_H - 10, text: ",", size: 40, from });

  // The quotient goes above the bar, a box at a time (in the stairs below).
  const quotientY = PAD;
  // The answer's comma gets room of its own above the bar - drawn on the bar, 3,76 reads as 376.
  const answerComma = w.quotient.decimals > 0;
  let answerCommaPlaced = false;
  const barY = quotientY + DIGIT_H + (answerComma ? 22 : 6);
  const dividendY = barY + 8;
  const stemBottom = dividendY + DIGIT_H + 6;
  // The dividend and the divisor. Zeros added after the dividend's comma (92 → 92,0) turn up as they're brought down - with the comma, if it had none, and the bar over them.
  const given = shifted(problem).dividend;
  lines.push({ x1: left - STEM_GAP / 2, y1: barY, x2: left + given.digits.length * COL + 6, y2: barY });
  lines.push({ x1: left - STEM_GAP / 2, y1: barY, x2: left - STEM_GAP / 2, y2: stemBottom });
  dividend.digits.split("").forEach((d, c) => {
    if (c < given.digits.length) box(`D:${c}`, c, dividendY, "printed", d);
  });
  if (given.decimals > 0) comma(intLen - 1, dividendY);
  divisorDigits.split("").forEach((d, i) =>
    boxes.push({ id: `d:${i}`, x: PAD + i * COL + (COL - DIGIT_W) / 2, y: dividendY, w: DIGIT_W, h: DIGIT_H, kind: "printed", maxDigits: 1, text: d })
  );
  const divisorIds = divisorDigits.split("").map((_, i) => `d:${i}`);

  // The stairs.
  let y = stemBottom + 12;
  /** The boxes the current part is written in - the dividend's leading digits at first, then a difference and its brought-down digit. */
  let partIds = Array.from({ length: w.steps[0].col + 1 }, (_, c) => `D:${c}`);
  w.steps.forEach((s, k) => {
    const crossesComma = dividend.decimals > 0 && s.col === intLen;
    if (crossesComma && answerComma) {
      comma(intLen - 1, quotientY + 6, steps.length);
      answerCommaPlaced = true;
    }
    box(`q:${s.col}`, s.col, quotientY, "digit", undefined, steps.length);
    const quotientPrompt = `${crossesComma ? "Nu är vi förbi decimaltecknet – kommat i svaret står rakt ovanför. " : ""}Hur många gånger går ${divisor} i ${s.part}?${divisor >= 10 ? " Titta i gångertabellen: det största som får plats." : ""}`;
    steps.push({ boxId: `q:${s.col}`, expected: s.quotientDigit, prompt: quotientPrompt, uses: [...divisorIds, ...partIds] });

    // The product, under the part, ones under ones.
    const product = digitsOf(s.product);
    const productIds = product.map((_, i) => `p${k}:${s.col - (product.length - 1 - i)}`);
    const productFrom = steps.length;
    product.forEach((d, i) => {
      const col = s.col - (product.length - 1 - i);
      box(`p${k}:${col}`, col, y, "digit", undefined, steps.length);
      steps.push({
        boxId: `p${k}:${col}`,
        expected: d,
        prompt: i === 0 ? `Multiplicera tillbaka: ${s.quotientDigit} · ${divisor}. Skriv produkten under ${s.part}, entalen under entalen.` : "Skriv nästa siffra i produkten.",
        uses: [`q:${s.col}`, ...divisorIds],
      });
    });
    const partWidth = Math.max(partIds.length, product.length);
    texts.push({ x: xOf(s.col - partWidth + 1) - COL * 0.62, y: y + DIGIT_H / 2, text: "−", size: 40, from: productFrom });
    y += DIGIT_H + 4;
    // The line to subtract under comes with the subtraction.
    const restFrom = steps.length;
    lines.push({ x1: xOf(s.col - partWidth + 1) - COL / 2 + 4, y1: y, x2: xOf(s.col) + COL / 2 - 4, y2: y, from: restFrom });
    y += 8;

    // The difference - and the next digit brought down beside it.
    const rest = digitsOf(s.rest);
    const restIds = rest.map((_, i) => `r${k}:${s.col - (rest.length - 1 - i)}`);
    // Dividing with a rest: nothing more to bring down, and what's left is the rest - named on the board.
    const endsWithRest = problem.withRest && s.broughtDown === null && s.rest > 0;
    if (endsWithRest) texts.push({ x: xOf(s.col - rest.length + 1) - COL * 0.95, y: y + DIGIT_H / 2, text: "rest", size: 24, from: steps.length });
    rest.forEach((d, i) => {
      const col = s.col - (rest.length - 1 - i);
      box(`r${k}:${col}`, col, y, "digit", undefined, steps.length);
      steps.push({
        boxId: `r${k}:${col}`,
        expected: d,
        prompt:
          i === 0
            ? `Subtrahera: ${s.part} − ${s.product}.${endsWithRest ? " Det finns inga fler siffror att flytta ner – det som blir kvar är resten." : ""}`
            : "Skriv nästa siffra i skillnaden.",
        uses: [...partIds, ...productIds],
      });
    });
    if (s.broughtDown !== null) {
      if (s.addedZero) {
        box(`D:${s.col + 1}`, s.col + 1, dividendY, "printed", "0", steps.length);
        lines.push({ x1: left + (s.col + 1) * COL + 6, y1: barY, x2: left + (s.col + 2) * COL + 6, y2: barY, from: steps.length });
        if (s.col + 1 === intLen && given.decimals === 0) comma(intLen - 1, dividendY, steps.length);
      }
      box(`b${k}`, s.col + 1, y, "digit", undefined, steps.length);
      steps.push({
        boxId: `b${k}`,
        expected: s.broughtDown,
        prompt: s.addedZero ? "Det finns en rest kvar: lägg till en nolla efter kommat och flytta ner den." : "Flytta ner nästa siffra.",
        uses: [`D:${s.col + 1}`],
      });
      partIds = [...restIds, `b${k}`];
    }
    y += DIGIT_H + ROW_GAP;
  });

  // Anything the walk didn't place (it always should): there from the start.
  if (answerComma && !answerCommaPlaced) comma(intLen - 1, quotientY + 6);
  dividend.digits.split("").forEach((d, c) => {
    if (!boxes.some((b) => b.id === `D:${c}`)) box(`D:${c}`, c, dividendY, "printed", d);
  });

  // Rounding (2.5.7): the answer, rounded, in a row of its own.
  const quotientText = decimalText(w.quotient);
  let answerText = problem.withRest && w.rest > 0 ? `= ${quotientText} rest ${w.rest}` : `= ${quotientText}`;
  if (problem.roundTo !== undefined) {
    const rounded = roundTo(valueOf(w.quotient), problem.roundTo);
    const shown = fixed(rounded, problem.roundTo);
    answerText = `≈ ${shown}`;
    y += 10;
    const roundFrom = steps.length;
    texts.push({ x: left - COL * 0.6, y: y + DIGIT_H / 2, text: "≈", size: 40, from: roundFrom });
    const digits = shown.replace(",", "").split("").map(Number);
    const roundedInt = shown.indexOf(",");
    const quotientIds = w.steps.map((s) => `q:${s.col}`);
    digits.forEach((d, i) => {
      box(`a:${i}`, i, y, "digit", undefined, roundFrom);
      steps.push({
        boxId: `a:${i}`,
        expected: d,
        prompt:
          i === 0
            ? `Det blir en rest kvar – divisionen går aldrig jämnt ut. Därför har du räknat en decimal mer än du ska ha: avrunda ${quotientText} till ${problem.roundTo === 1 ? "en decimal" : `${problem.roundTo} decimaler`}. Titta på decimalen efter den sista du behåller.`
            : "Skriv nästa siffra i det avrundade svaret.",
        uses: quotientIds,
      });
    });
    comma(roundedInt - 1, y, roundFrom);
    y += DIGIT_H + ROW_GAP;
  }

  const width = left + Math.max(n, w.steps[w.steps.length - 1].col + 2) * COL + PAD;
  const title = `${decimalText(problem.dividend)} ÷ ${decimalText(problem.divisor)}`;
  // Dividing by 10 or more: its times table, to look up instead of guess.
  const table = divisor >= 10 ? { of: divisor, rows: [1, 2, 3, 4, 5, 6, 7, 8, 9].map((times) => ({ times, product: times * divisor })) } : undefined;
  return { title, answerText, layout: { width, height: y + PAD, boxes, texts, lines }, steps, ...(table ? { table } : {}) };
}

/** For a divisor with decimals: the division the board works, after both commas moved ("1320 ÷ 528"). */
export function shiftedText(problem: TrappanProblem): string {
  const s = shifted(problem);
  return `${decimalText(s.dividend)} ÷ ${s.divisor}`;
}
