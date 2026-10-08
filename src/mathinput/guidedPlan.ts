/**
 * Guidat on the handwriting page: once the child has written the two numbers
 * of an addition or a multiplication in a template, the work is laid out as
 * a board sized for exactly that problem (the game's drawing board - see
 * game/draw/boardTypes.ts) and walked through one box at a time, in the
 * order it's done by hand:
 *
 *   addition        column by column from the ones: the column's sum digit,
 *                   then its minnessiffra (only when there is one) in a small
 *                   box above the next column.
 *
 *   multiplication  one partial product per multiplier digit (a 0 digit is
 *                   skipped), each row shifted one more column left: the top
 *                   number times that digit, from the ones, each result digit
 *                   then its minnessiffra - the minnessiffror of every row in
 *                   their own row of small boxes above the top number (row
 *                   one's nearest the number). With more than one partial
 *                   product they're then added up under a second line, their
 *                   minnessiffror in a row of small boxes above the first
 *                   partial product - exactly like an addition.
 *
 * A single-digit multiplier's one partial product is the answer itself.
 * Boxes only exist where a digit goes (a minnessiffra of 0 is never written).
 *
 * Decimals (×): make the numbers whole, multiply, and put the decimals back.
 *   1. Each number with decimals becomes a whole number - 0,2 becomes 2, 0,03
 *      becomes 3 - and the child writes how many decimals that took away
 *      (1 and 2), then how many in all (3). A row each at the top.
 *   2. The whole numbers are multiplied as usual: 2 · 3 = 6.
 *   3. The decimals go back: the child picks the answer with that many digits
 *      after the comma (0,06, 0,006 or 0,0006); a wrong pick says why. The
 *      comma turns up, and zeros are written in front when the answer is too
 *      short: 6 with three decimals is 0,006.
 *
 * Nothing is there before it's needed: each box, minnessiffra row, sign,
 * line and comma turns up at the step that first uses it (`from`).
 */
import { digitAt, digitsOf, formatSwedishDecimal, formatSwedishNumber } from "../engine/digits";
import type { BoardLayout, DrawBox, PrintedText } from "../game/draw/boardTypes";
import { parseColumnWork } from "./columnLayout";
import type { ClassifiedSymbol } from "./layout";
import { valueOf } from "./verify/types";

export type GuidedOperator = "+" | "−" | "×";

export interface GuidedStep {
  boxId: string;
  /** The digit to write - or "+", the sign before a multiplication's partial products are added. */
  expected: number | "+";
  /** What to do, in plain Swedish - never the digit itself. */
  prompt: string;
  /**
   * The boxes holding the numbers this step works with - lit up on the board:
   * for 7 · 3 the 3 in the top number, the 7 in the multiplier and a
   * minnessiffra to add; for a column sum every digit in the column. A
   * minnessiffra's step uses the same numbers as the result it comes from.
   */
  uses: string[];
  /**
   * A step answered by picking, not writing (where the comma goes): the
   * options, the right one, and for each wrong one why it isn't. `boxId` names
   * no box then.
   */
  choice?: { options: string[]; correct: number; whyNot: string[] };
}

/** Any guided board - a column calculation (planGuided), a trappan division (game/trappanPlan.ts): what GuidedColumn walks through. */
export interface GuidedBoardPlan {
  /** e.g. "123 · 567" */
  title: string;
  /** What follows the title once it's done: "= 69 741", "≈ 2,33". */
  answerText: string;
  layout: BoardLayout;
  steps: GuidedStep[];
  /**
   * A times table to look things up in ("12": 1 · 12 = 12 … 9 · 12 = 108) -
   * for a trappan with a divisor of 10 or more, so "how many times does 52
   * go into 312?" is read off, not guessed.
   */
  table?: { of: number; rows: { times: number; product: number }[] };
  /** Said once it's done: a check of the answer (a multiplication's decimals counted). */
  doneNote?: string;
}

export interface GuidedPlan extends GuidedBoardPlan {
  operator: GuidedOperator;
  top: number;
  bottom: number;
  answer: number;
  /** e.g. "123 · 567" */
  title: string;
  layout: BoardLayout;
  steps: GuidedStep[];
}

const COL = 80;
const DIGIT_W = 68;
const DIGIT_H = 84;
const SMALL_W = 52;
const SMALL_H = 46;
const NOTE_PITCH = SMALL_H + 8;
const OP_W = 64;
/** The box a sign is written in, in the operator column. */
const SIGN_W = 56;
const SIGN_H = 64;
const PAD = 14;
const ROW_GAP = 10;

const PLACE_NAMES = ["entals", "tiotals", "hundratals", "tusentals", "tiotusentals", "hundratusentals"];
const SIGN = { "+": "+", "−": "−", "×": "·" } as const;
/** A small box wide enough for "10" - the ten a subtraction column gets when it borrows. */
const TEN_W = 76;

/** A number laid out by column: col -> digit, 0 = ones. */
type Digits = Map<number, number>;

function digitMap(n: number, shift = 0): Digits {
  const out: Digits = new Map();
  digitsOf(n).forEach((_, i) => out.set(i + shift, digitAt(n, i)));
  return out;
}

const decimalWords = (n: number) => (n === 0 ? "inga decimaler" : n === 1 ? "en decimal" : `${n} decimaler`);


interface RowSpec {
  /** Box id prefix, e.g. "p0" -> "p0:3". */
  prefix: string;
  /** "printed": a number the problem prints; "digit": answer boxes; "small": minnessiffror. */
  kind: "printed" | "digit" | "small";
  cols: number[];
  /** For printed rows. */
  digits?: Digits;
  /** Small text in the operator column (the operator, or which multiplier digit a row of minnessiffror belongs to). */
  label?: { text: string; size: number };
  /** A line drawn under this row. */
  lineAfter?: boolean;
  /** A box in the operator column for the child to write this row's sign in (id `${prefix}:sign`). */
  signBox?: boolean;
  /** Small boxes wide enough for two digits ("10"). */
  wide?: boolean;
  /** A decimal comma this many digits from the right - turning up at step `from`. */
  comma?: { decimals: number; from?: number };
  /** The step the line under this row turns up at (0: from the start). */
  lineFrom?: number;
  /** A word written left of the row's boxes ("överslag: 3 · 6 ="). */
  note?: string;
  /** Extra room under the row - the decimals counted apart from the calculation. */
  gapAfter?: number;
  /** A heading above the row's boxes ("decimaler bort"). */
  header?: string;
}

/** A number being added up, and the prefix of the boxes it's in ("top", "p1"). */
interface Addend {
  prefix: string;
  digits: Digits;
}

/**
 * Steps adding up `addends` (each already shifted to its columns) into the
 * answer boxes `sumPrefix:col`, with minnessiffror in `carryPrefix:col`.
 * Returns the steps and which columns got a minnessiffra box.
 */
function additionSteps(addends: Addend[], answerLen: number, sumPrefix: string, carryPrefix: string, intro: string): { steps: GuidedStep[]; carryCols: number[] } {
  const steps: GuidedStep[] = [];
  const carryCols: number[] = [];
  let carryIn = 0;
  for (let col = 0; col < answerLen; col++) {
    const inColumn = addends.filter((a) => a.digits.has(col));
    const digits = inColumn.map((a) => a.digits.get(col)!);
    const uses = [...inColumn.map((a) => `${a.prefix}:${col}`), ...(carryIn > 0 ? [`${carryPrefix}:${col}`] : [])];
    const sum = digits.reduce((s, d) => s + d, 0) + carryIn;
    const carryOut = Math.floor(sum / 10);
    const terms = [...digits.map(String), ...(carryIn > 0 ? [`minnessiffran ${carryIn}`] : [])];
    const what =
      terms.length === 0
        ? "Skriv svaret här."
        : terms.length === 1
          ? digits.length === 1
            ? "Bara en siffra i kolumnen - skriv den här."
            : "Skriv minnessiffran här."
          : `Addera ${terms.join(" + ")}. ${sum >= 10 ? "Skriv entalssiffran här." : "Skriv summan här."}`;
    steps.push({ boxId: `${sumPrefix}:${col}`, expected: sum % 10, prompt: col === 0 ? `${intro}${what}` : what, uses });
    if (carryOut > 0 && col < answerLen - 1) {
      carryCols.push(col + 1);
      steps.push({ boxId: `${carryPrefix}:${col + 1}`, expected: carryOut, prompt: "Tiotalssiffran är en minnessiffra - skriv den i den lilla rutan ovanför nästa kolumn.", uses });
    }
    carryIn = col < answerLen - 1 ? carryOut : 0;
  }
  return { steps, carryCols };
}

/** Steps for one partial product: `top` times the multiplier digit `d`, at `row` (shifted `shift` columns left). */
function partialSteps(top: number, d: number, row: number, shift: number, rowCount: number): { steps: GuidedStep[]; carryCols: number[]; resultCols: number[] } {
  const steps: GuidedStep[] = [];
  const carryCols: number[] = [];
  const resultCols: number[] = [];
  const n = digitsOf(top).length;
  let carryIn = 0;
  for (let i = 0; i < n; i++) {
    const ti = digitAt(top, i);
    const product = ti * d + carryIn;
    const carryOut = Math.floor(product / 10);
    const last = i === n - 1;
    const intro =
      i > 0
        ? ""
        : rowCount === 1
          ? "Börja med entalen. "
          : row === 0
            ? `Börja med entalssiffran ${d}. `
            : `Nu ${PLACE_NAMES[shift]}siffran ${d}. Raden börjar ${shift === 1 ? "ett steg" : `${shift} steg`} åt vänster - under ${d}. `;
    const plus = carryIn > 0 ? ` och lägg till minnessiffran ${carryIn}` : "";
    const writeWhat = product >= 10 ? "Skriv entalssiffran här." : "Skriv svaret här.";
    // The top number's digit, the multiplier digit, and the minnessiffra written above this column (if any).
    const uses = [`top:${i}`, `bottom:${shift}`, ...(carryIn > 0 ? [`m${row}:${i}`] : [])];
    resultCols.push(i + shift);
    steps.push({ boxId: `p${row}:${i + shift}`, expected: product % 10, prompt: `${intro}Räkna ${d} · ${ti}${plus}. ${writeWhat}`, uses });
    if (carryOut > 0 && !last) {
      carryCols.push(i + 1);
      steps.push({ boxId: `m${row}:${i + 1}`, expected: carryOut, prompt: `Tiotalssiffran är en minnessiffra - skriv den i den lilla rutan ovanför ${digitAt(top, i + 1)}.`, uses });
    }
    if (carryOut > 0 && last) {
      resultCols.push(i + 1 + shift);
      steps.push({ boxId: `p${row}:${i + 1 + shift}`, expected: carryOut, prompt: "Det finns inget mer att multiplicera - skriv tiotalssiffran här.", uses });
    }
    carryIn = carryOut;
  }
  return { steps, carryCols, resultCols };
}

/**
 * A column subtraction, from the ones, borrowing ("växla") the way the
 * game's own subtraction board does: when a column's top digit is smaller,
 * the neighbour to the left lends a ten - its new value written small above
 * it ("n:col"), any zeros passed on the way becoming 9 - and the column gets
 * "10" written above it ("t:col"). Then top (+ 10) − bottom in the answer
 * box. `top` ≥ `bottom`.
 */
function subtractionSteps(top: number, bottom: number): { steps: GuidedStep[]; newCols: number[]; tenCols: number[] } {
  const steps: GuidedStep[] = [];
  const newCols: number[] = [];
  const tenCols: number[] = [];
  const n = digitsOf(top).length;
  const answerLen = digitsOf(top - bottom).length;
  const cur = Array.from({ length: n }, (_, c) => digitAt(top, c));
  /** The box showing a column's top digit as it is now: the new value above it once it has lent. */
  const topBox = (col: number) => (newCols.includes(col) ? `n:${col}` : `top:${col}`);
  for (let col = 0; col < n; col++) {
    const b = col < digitsOf(bottom).length ? digitAt(bottom, col) : 0;
    const intro = col === 0 ? "Börja med entalen. " : "";
    let ten = false;
    if (cur[col] < b) {
      // The nearest digit to the left with something to lend.
      let j = col + 1;
      while (cur[j] === 0) j++;
      steps.push({
        boxId: `n:${j}`,
        expected: cur[j] - 1,
        prompt:
          j === col + 1
            ? `${intro}${cur[col]} − ${b} går inte, ${cur[col]} är mindre än ${b}. Växla ett tiotal från grannen till vänster: ${cur[j]} blir ${cur[j] - 1}. Skriv det ovanför.`
            : `${intro}${cur[col]} − ${b} går inte, och grannen är 0 - den har inget att låna ut. Gå vidare till ${cur[j]}: den blir ${cur[j] - 1}. Skriv det ovanför.`,
        uses: [topBox(j), topBox(col), `bottom:${col}`],
      });
      newCols.push(j);
      cur[j]--;
      for (let k = j - 1; k > col; k--) {
        steps.push({ boxId: `n:${k}`, expected: 9, prompt: "Nollan får ett tiotal och lånar ut ett till grannen - den blir 9. Skriv det ovanför.", uses: [`top:${k}`] });
        newCols.push(k);
        cur[k] = 9;
      }
      steps.push({ boxId: `t:${col}`, expected: 10, prompt: "Tiotalet du växlade blir 10 här. Skriv 10 ovanför.", uses: [topBox(col)] });
      tenCols.push(col);
      ten = true;
    }
    if (col >= answerLen) continue; // a leading zero isn't written
    const a = cur[col] + (ten ? 10 : 0);
    const uses = [topBox(col), ...(ten ? [`t:${col}`] : []), ...(col < digitsOf(bottom).length ? [`bottom:${col}`] : [])];
    const what = col >= digitsOf(bottom).length ? "Inget att dra bort i den här kolumnen - skriv siffran som den är." : ten ? `Räkna 10 + ${cur[col]} − ${b}, alltså ${a} − ${b}.` : `Räkna ${a} − ${b}.`;
    steps.push({ boxId: `s:${col}`, expected: a - b, prompt: `${!ten ? intro : ""}${what}`, uses });
    cur[col] = a - b;
  }
  return { steps, newCols, tenCols };
}

/**
 * `decimals` (×): how many decimals each number is written with - `top` and
 * `bottom` are then the numbers without their commas (2,5 · 1,3 is 25 and 13
 * with one decimal each).
 */
export function planGuided(operator: GuidedOperator, top: number, bottom: number, decimals?: { top: number; bottom: number }): GuidedPlan {
  const answer = operator === "+" ? top + bottom : operator === "−" ? top - bottom : top * bottom;
  const answerLen = digitsOf(answer).length;
  const rows: RowSpec[] = [];
  const steps: GuidedStep[] = [];
  const dTop = operator === "×" ? (decimals?.top ?? 0) : 0;
  const dBottom = operator === "×" ? (decimals?.bottom ?? 0) : 0;
  const answerDecimals = dTop + dBottom;
  // With decimals (×) the numbers on the board are the whole numbers they become: 0,2 · 0,03 is set up as 2 · 3.
  const topDigits = digitMap(top);
  const bottomDigits = digitMap(bottom);
  const shown = (scaled: number, d: number) => (d > 0 ? formatSwedishDecimal(scaled, d) : formatSwedishNumber(scaled));
  const topText = shown(top, dTop);
  const bottomText = shown(bottom, dBottom);
  let doneNote: string | undefined;
  let minCols = 0;
  const operandRows = (lineAfter = true): RowSpec[] => [
    { prefix: "top", kind: "printed", cols: [...topDigits.keys()], digits: topDigits },
    { prefix: "bottom", kind: "printed", cols: [...bottomDigits.keys()], digits: bottomDigits, label: { text: SIGN[operator], size: 46 }, lineAfter },
  ];

  if (operator === "−") {
    const sub = subtractionSteps(top, bottom);
    // "10" on top, then the new values right above the number.
    if (sub.tenCols.length > 0) rows.push({ prefix: "t", kind: "small", cols: sub.tenCols, wide: true });
    if (sub.newCols.length > 0) rows.push({ prefix: "n", kind: "small", cols: sub.newCols });
    rows.push(...operandRows(), { prefix: "s", kind: "digit", cols: Array.from({ length: answerLen }, (_, c) => c) });
    steps.push(...sub.steps);
  } else if (operator === "+") {
    const sum = additionSteps(
      [
        { prefix: "top", digits: digitMap(top) },
        { prefix: "bottom", digits: digitMap(bottom) },
      ],
      answerLen,
      "s",
      "c",
      "Börja med entalen. "
    );
    if (sum.carryCols.length > 0) rows.push({ prefix: "c", kind: "small", cols: sum.carryCols });
    rows.push(...operandRows(), { prefix: "s", kind: "digit", cols: Array.from({ length: answerLen }, (_, c) => c) });
    steps.push(...sum.steps);
  } else {
    // Decimals: each number made whole, and the decimals taken away counted - a row each at the top.
    const counted: { prefix: string; note: string; expected: number; prompt: string }[] = [];
    if (dTop > 0)
      counted.push({ prefix: "kt", note: `${topText} → ${formatSwedishNumber(top)}`, expected: dTop, prompt: `Gör ${topText} till ett heltal: ta bort kommat, så blir det ${formatSwedishNumber(top)}. Hur många decimaler tog du bort? Skriv antalet här.` });
    if (dBottom > 0)
      counted.push({ prefix: "kb", note: `${bottomText} → ${formatSwedishNumber(bottom)}`, expected: dBottom, prompt: `Gör ${bottomText} till ett heltal: ta bort kommat, så blir det ${formatSwedishNumber(bottom)}. Hur många decimaler tog du bort? Skriv antalet här.` });
    if (counted.length === 2)
      counted.push({ prefix: "ks", note: "tillsammans:", expected: answerDecimals, prompt: `Hur många decimaler tog du bort tillsammans? ${dTop} + ${dBottom}. Dem sätter du tillbaka på slutet.` });
    counted.forEach((c, i) => {
      rows.push({ prefix: c.prefix, kind: "digit", cols: [0], note: c.note, ...(i === 0 ? { header: "decimaler bort" } : {}), ...(i === counted.length - 1 ? { gapAfter: 24 } : {}) });
      steps.push({ boxId: `${c.prefix}:0`, expected: c.expected, prompt: c.prompt, uses: i === 2 ? ["kt:0", "kb:0"] : [] });
    });
    // Room left of the boxes for "0,03 → 3" - and for the heading.
    if (counted.length > 0) minCols = 1 + Math.ceil(Math.max(0, Math.max("tillsammans".length + 4, ...counted.map((c) => c.note.length)) * 12 + 24 - OP_W) / COL);
    const calcFrom = steps.length;

    // One partial product per non-zero multiplier digit, shifted by that digit's place.
    const multiplier = digitsOf(bottom)
      .map((_, place) => ({ place, d: digitAt(bottom, place) }))
      .filter((m) => m.d !== 0);
    const partials = multiplier.map((m, row) => ({ ...m, row, ...partialSteps(top, m.d, row, m.place, multiplier.length) }));
    // Minnessiffror above the top number: the first row's nearest the number.
    for (const p of [...partials].reverse()) {
      if (p.carryCols.length === 0) continue;
      rows.push({ prefix: `m${p.row}`, kind: "small", cols: p.carryCols, label: partials.length > 1 ? { text: `${SIGN["×"]}${p.d}`, size: 24 } : undefined });
    }
    rows.push(...operandRows());
    if (partials.length === 1) {
      const p = partials[0];
      rows.push({ prefix: `p${p.row}`, kind: "digit", cols: p.resultCols });
      steps.push(...p.steps);
    } else {
      const addends = partials.map((p) => ({ prefix: `p${p.row}`, digits: digitMap(top * p.d, p.place) }));
      const sum = additionSteps(addends, answerLen, "s", "c", "Nu adderar du delprodukterna, från entalen. ");
      if (sum.carryCols.length > 0) rows.push({ prefix: "c", kind: "small", cols: sum.carryCols });
      // The last partial product gets the "+" that makes the rows an addition - the child writes it, like on paper.
      const last = partials[partials.length - 1];
      partials.forEach((p) => rows.push({ prefix: `p${p.row}`, kind: "digit", cols: p.resultCols, lineAfter: p === last, signBox: p === last }));
      rows.push({ prefix: "s", kind: "digit", cols: Array.from({ length: answerLen }, (_, c) => c) });
      for (const p of partials) steps.push(...p.steps);
      steps.push({
        boxId: `p${last.row}:sign`,
        expected: "+",
        prompt: "Nu ska delprodukterna adderas. Skriv ett plustecken framför den sista raden.",
        uses: partials.flatMap((p) => p.resultCols.map((c) => `p${p.row}:${c}`)),
      });
      // The line to add under turns up with the first digit of the sum.
      rows.find((r) => r.prefix === `p${last.row}`)!.lineFrom = steps.length;
      steps.push(...sum.steps);
    }

    if (answerDecimals > 0) {
      const answerRow = rows[rows.length - 1];
      steps[calcFrom].prompt = `Räkna nu med heltalen: ${formatSwedishNumber(top)} · ${formatSwedishNumber(bottom)}. ${steps[calcFrom].prompt}`;

      // The decimals back: the answer with that many digits after the comma.
      const digitWords = (n: number) => (n === 1 ? "en siffra" : `${n} siffror`);
      const ks = [answerDecimals - 1, answerDecimals, answerDecimals + 1].filter((k) => k >= 0);
      const options = ks.map((k) => formatSwedishDecimal(answer, k));
      const correct = ks.indexOf(answerDecimals);
      const whyNot = ks.map((k, i) =>
        k === answerDecimals ? "" : `${options[i]} har ${decimalWords(k)} – du tog bort ${decimalWords(answerDecimals)}, så svaret ska ha ${digitWords(answerDecimals)} efter kommat.`
      );
      steps.push({
        boxId: "comma",
        expected: correct,
        prompt: `Du fick ${formatSwedishNumber(answer)}. Sätt tillbaka de ${decimalWords(answerDecimals)} du tog bort: svaret ska ha ${digitWords(answerDecimals)} efter kommat. Vilket är rätt?`,
        uses: [...answerRow.cols.map((c) => `${answerRow.prefix}:${c}`), `${counted[counted.length - 1].prefix}:0`],
        choice: { options, correct, whyNot },
      });
      answerRow.comma = { decimals: answerDecimals, from: steps.length };
      // 6 with three decimals is 0,006: zeros in front, up to one before the comma.
      for (let c = answerLen; c <= answerDecimals; c++) {
        answerRow.cols.push(c);
        steps.push({
          boxId: `${answerRow.prefix}:${c}`,
          expected: 0,
          prompt:
            c === answerLen
              ? `${formatSwedishNumber(answer)} har bara ${digitWords(answerLen)}, men svaret ska ha ${digitWords(answerDecimals)} efter kommat och en före. Fyll på med nollor framför – skriv en nolla här.`
              : "Skriv en nolla till.",
          uses: [],
        });
      }
      doneNote = `Du tog bort ${decimalWords(answerDecimals)} och satte tillbaka lika många.`;
    }
  }

  const stepAt = new Map(steps.map((s, i) => [s.boxId, i]));
  const answerShown = shown(answer, answerDecimals);
  // 2,5 · 1,2 = 3,00 - which is 3.
  const trimmed = answerDecimals > 0 && answerShown.endsWith("0") ? answerShown.replace(/,?0+$/, "") : null;
  return {
    operator,
    top,
    bottom,
    answer,
    title: `${topText} ${SIGN[operator]} ${bottomText}`,
    answerText: `= ${answerShown}${trimmed !== null ? ` = ${trimmed}` : ""}`,
    layout: layoutRows(rows, stepAt, minCols),
    steps,
    ...(doneNote ? { doneNote } : {}),
  };
}

/** `stepAt`: which step each box is written at - it turns up then (printed numbers are there from the start). */
function layoutRows(rows: RowSpec[], stepAt: Map<string, number>, minCols = 0): BoardLayout {
  const nCols = Math.max(minCols, Math.max(...rows.flatMap((r) => r.cols)) + 1);
  const width = PAD + OP_W + nCols * COL + PAD;
  const centerOf = (col: number) => PAD + OP_W + (nCols - 1 - col) * COL + COL / 2;
  const boxes: DrawBox[] = [];
  const texts: PrintedText[] = [];
  const lines: BoardLayout["lines"] = [];
  let y = PAD;
  for (const row of rows) {
    if (row.header) y += 26;
    const h = row.kind === "small" ? SMALL_H : DIGIT_H;
    const w = row.kind === "small" ? SMALL_W : DIGIT_W;
    const froms: number[] = [];
    for (const col of row.cols) {
      const bw = row.wide ? TEN_W : w;
      const id = `${row.prefix}:${col}`;
      const from = row.kind === "printed" ? 0 : (stepAt.get(id) ?? 0);
      froms.push(from);
      const box: DrawBox = { id, x: centerOf(col) - bw / 2, y, w: bw, h, kind: row.kind, maxDigits: row.wide ? 2 : 1, from };
      if (row.kind === "printed") box.text = String(row.digits!.get(col));
      boxes.push(box);
    }
    const rowFrom = froms.length > 0 ? Math.min(...froms) : 0;
    // A minnessiffra row's label (·3) turns up with its first minnessiffra; the operator is there from the start.
    if (row.label) texts.push({ x: PAD + OP_W / 2, y: y + h / 2, text: row.label.text, size: row.label.size, from: row.kind === "small" ? rowFrom : 0 });
    if (row.signBox) {
      const id = `${row.prefix}:sign`;
      boxes.push({ id, x: PAD + OP_W / 2 - SIGN_W / 2, y: y + (h - SIGN_H) / 2, w: SIGN_W, h: SIGN_H, kind: "sign", from: stepAt.get(id) ?? 0 });
    }
    // Low in the row, between the digits - not hanging into the row below.
    if (row.comma) texts.push({ x: centerOf(row.comma.decimals - 1) - COL / 2, y: y + h - 26, text: ",", size: 46, from: row.comma.from ?? 0 });
    if (row.header) texts.push({ x: centerOf(Math.max(...row.cols)) - 24, y: y - 14, text: row.header, size: 20, from: rowFrom });
    if (row.note) texts.push({ x: (PAD + centerOf(Math.max(...row.cols)) - w / 2) / 2, y: y + h / 2, text: row.note, size: 24, from: rowFrom });
    y += (row.kind === "small" ? NOTE_PITCH : h + ROW_GAP) + (row.gapAfter ?? 0);
    if (row.lineAfter) {
      lines.push({ x1: PAD, y1: y + 2, x2: width - PAD, y2: y + 2, from: row.lineFrom ?? 0 });
      y += 14;
    }
  }
  return { width, height: y + PAD - ROW_GAP, boxes, texts, lines };
}

/**
 * The two numbers written so far in a column template (and its printed
 * operator), or null until both are there and readable - what "Starta"
 * starts from.
 */
export function readOperands(symbols: ClassifiedSymbol[]): { operator: GuidedOperator; top: number; bottom: number } | null {
  const bar = symbols.find((s) => s.char === "-" && s.grid?.rowYs);
  if (!bar) return null;
  const work = parseColumnWork(bar, symbols);
  if (!work || work.operator === "-") return null;
  const firstLine = work.lines[0];
  if (firstLine !== 2) return null;
  const [top, bottom] = work.rows.slice(0, 2).map((r) => valueOf(r.cells));
  if (top === null || bottom === null || top === 0 || bottom === 0) return null;
  return { operator: work.operator, top, bottom };
}
