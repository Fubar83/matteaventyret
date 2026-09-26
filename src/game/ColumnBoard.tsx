import { Fragment } from "react";
import { formatSwedishDecimal } from "../engine/digits";
import type { Cell, CellGraph, WrittenMap } from "../engine/types";
import type { Stroke } from "../recognition/preprocess";
import { buildColumns } from "./board";
import { DigitCanvas } from "./DigitCanvas";
import type { BoxState } from "./DigitBox";
import { DigitBox } from "./DigitBox";

export type CellVerdict = "correct" | "wrong" | "followOn";

export function operatorFor(method: "columnAdd" | "columnSub" | "columnMul"): "+" | "-" | "×" {
  if (method === "columnAdd") return "+";
  if (method === "columnSub") return "-";
  return "×";
}

interface ColumnBoardProps {
  graph: CellGraph;
  top: number;
  bottom: number;
  operator: "+" | "-" | "×";
  written: WrittenMap;
  selectedCellId: string | null;
  activeCellIds: ReadonlySet<string>;
  verdicts: Readonly<Record<string, CellVerdict>>;
  onCellTap: (cell: Cell) => void;
  /** Numpad needs tap-to-select-then-type; handwriting draws straight into the cell instead. */
  inputMode?: "numpad" | "handwriting";
  onCellStrokes?: (cell: Cell, strokes: Stroke[], canvasSize: number) => void;
  /** A cell whose recognition came back unsure: its canvas freezes (shows what was drawn) until resolved. */
  pendingCellId?: string | null;
  /** Bumped per-cell to force that cell's canvas to clear (e.g. after a wrong recognized digit). */
  canvasResetTokens?: Readonly<Record<string, number>>;
  /** top/bottom/result are stored as plain integers scaled by 10^decimalPlaces (see build brief "Decimaltal i vardagen") - a comma is drawn between that column and the next. 0 (default) means a plain integer, no comma. */
  decimalPlaces?: number;
}

function stateFor(
  cell: Cell,
  written: WrittenMap,
  selectedCellId: string | null,
  activeCellIds: ReadonlySet<string>,
  verdicts: Readonly<Record<string, CellVerdict>>
): BoxState {
  const verdict = verdicts[cell.id];
  if (verdict === "correct") return "correct";
  if (verdict === "wrong") return "wrong";
  if (verdict === "followOn") return "followOn";
  if (written[cell.id] !== undefined) return cell.id === selectedCellId ? "selected" : "default";
  if (cell.id === selectedCellId) return "selected";
  return activeCellIds.has(cell.id) ? "default" : "disabled";
}

function displayValue(cell: Cell, written: WrittenMap): number | string | null {
  const v = written[cell.id];
  if (v === undefined) return null;
  return v === "struck" ? null : v;
}

const FULL_PX = 96;
const SMALL_PX = 64;
// Wide enough for either a full box or two small boxes (a borrowed "10") side by side without overflowing the column.
const COLUMN_WIDTH = "w-36";

export function ColumnBoard({
  graph,
  top,
  bottom,
  operator,
  written,
  selectedCellId,
  activeCellIds,
  verdicts,
  onCellTap,
  inputMode = "numpad",
  onCellStrokes,
  pendingCellId = null,
  canvasResetTokens = {},
  decimalPlaces = 0,
}: ColumnBoardProps) {
  const columns = buildColumns(graph, top, bottom);

  /** A comma slot after the column at `col.col === decimalPlaces` - visible in operand/result rows, an equal-width blank spacer elsewhere so columns stay aligned across rows. */
  function commaSlot(colColIndex: number, visible: boolean) {
    if (decimalPlaces <= 0 || colColIndex !== decimalPlaces) return null;
    return (
      <div className="w-3 flex items-end justify-center h-full pb-1" aria-hidden={!visible}>
        {visible && <span className="text-3xl font-bold text-slate-600">,</span>}
      </div>
    );
  }

  const boxProps = (cell: Cell, size: "full" | "small" = "full") => ({
    value: displayValue(cell, written),
    size,
    state: stateFor(cell, written, selectedCellId, activeCellIds, verdicts),
    onClick: activeCellIds.has(cell.id) || written[cell.id] !== undefined ? () => onCellTap(cell) : undefined,
  });

  /** A writable (non-strike) cell renders as an inline canvas in handwriting mode, in place of a box, once it's active and still blank. */
  function renderWritable(cell: Cell, size: "full" | "small" = "full") {
    const showCanvas = inputMode === "handwriting" && written[cell.id] === undefined && activeCellIds.has(cell.id);
    if (!showCanvas) return <DigitBox {...boxProps(cell, size)} />;
    const px = size === "full" ? FULL_PX : SMALL_PX;
    const isPending = pendingCellId === cell.id;
    return (
      <div className={`rounded-md ${isPending ? "ring-2 ring-amber-400" : ""}`}>
        <DigitCanvas
          size={px}
          compact
          disabled={!!pendingCellId}
          resetToken={canvasResetTokens[cell.id] ?? 0}
          onSettled={(strokes) => onCellStrokes?.(cell, strokes, px)}
        />
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <div className="inline-flex flex-col items-end gap-2 bg-[repeating-linear-gradient(0deg,transparent,transparent_23px,#e2e8f0_24px)] p-4 rounded-xl">
        {/* annotation rows */}
        <div className="flex flex-row gap-2">
          {columns.map((col) => (
            <Fragment key={col.col}>
              <div key={col.col} className={`${COLUMN_WIDTH} flex flex-col-reverse items-center gap-1 min-h-[4rem]`}>
                {col.annotations.map((slot, i) =>
                  slot.kind === "ten" ? (
                    (() => {
                      const struck = !!slot.strikeCell && written[slot.strikeCell.id] === "struck";
                      const strikeable = !!slot.strikeCell && !struck && activeCellIds.has(slot.strikeCell.id);
                      return (
                        <div key={i} className={`relative flex gap-1 rounded-md ${strikeable ? "ring-2 ring-sky-300" : ""}`}>
                          {renderWritable(slot.tens, "small")}
                          {renderWritable(slot.ones, "small")}
                          {struck && (
                            <span aria-hidden className="pointer-events-none absolute inset-0 flex items-center">
                              <span className="block w-full h-1 bg-rose-600" />
                            </span>
                          )}
                          {strikeable && (
                            <button
                              type="button"
                              aria-label="Stryk över"
                              onClick={() => onCellTap(slot.strikeCell!)}
                              className="absolute inset-0"
                            />
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    <div key={i}>{renderWritable(slot.cell, "small")}</div>
                  )
                )}
              </div>
              {commaSlot(col.col, false)}
            </Fragment>
          ))}
        </div>

        {/* top operand */}
        <div className="flex flex-row gap-2">
          {columns.map((col) => (
            <Fragment key={col.col}>
              <div key={col.col} className={`${COLUMN_WIDTH} flex justify-center`}>
                {col.topDigit !== null &&
                  (() => {
                    const strikeCell = col.topStrikeCell;
                    const struck = strikeCell ? written[strikeCell.id] === "struck" : false;
                    const strikeable = !!strikeCell && !struck && activeCellIds.has(strikeCell.id);
                    return (
                      <DigitBox
                        value={col.topDigit}
                        struck={struck}
                        state={strikeable ? "strikeable" : "printed"}
                        onClick={strikeable ? () => onCellTap(strikeCell!) : undefined}
                      />
                    );
                  })()}
              </div>
              {commaSlot(col.col, true)}
            </Fragment>
          ))}
        </div>

        {/* bottom operand with operator */}
        <div className="flex flex-row gap-2 items-center">
          {columns.map((col, idx) => (
            <Fragment key={col.col}>
              <div key={col.col} className={`${COLUMN_WIDTH} flex justify-center relative`}>
                {idx === 0 && <span className="absolute -left-10 text-4xl font-bold text-slate-600">{operator}</span>}
                {col.bottomDigit !== null && <DigitBox value={col.bottomDigit} state="printed" />}
              </div>
              {commaSlot(col.col, true)}
            </Fragment>
          ))}
        </div>

        <div className="w-full border-t-4 border-slate-700 my-1" />

        {/* result row */}
        <div className="flex flex-row gap-2">
          {columns.map((col) => (
            <Fragment key={col.col}>
              <div key={col.col} className={`${COLUMN_WIDTH} flex justify-center`}>
                {col.resultCell && renderWritable(col.resultCell)}
              </div>
              {commaSlot(col.col, true)}
            </Fragment>
          ))}
        </div>
      </div>
      <span className="sr-only">
        {formatSwedishDecimal(top, decimalPlaces)} {operator} {formatSwedishDecimal(bottom, decimalPlaces)}
      </span>
    </div>
  );
}
