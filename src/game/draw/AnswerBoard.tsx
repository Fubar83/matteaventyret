import { useEffect, useMemo, useRef, useState } from "react";
import { PendingChoice } from "./PendingChoice";
import { rememberBoxDigit } from "./rememberBox";
import { answerLayout } from "./answerLayout";
import type { BoxReading, BoxStatus } from "./boardTypes";
import { DrawBoard, type DrawBoardHandle } from "./DrawBoard";
import { useUnsureBoxes } from "./useUnsureBoxes";

interface AnswerBoardProps {
  /** How many digits the answer has (one box each). */
  length: number;
  /** Fires once every box holds a digit, with the number they make. */
  onSubmit: (value: number) => void;
  /** Bumped by the parent to clear the boxes for another try. */
  resetToken?: number;
  /** Shown in the boxes instead of ink - e.g. the answer, revealed after three tries. */
  revealed?: number | null;
  /** The answer's verdict, as the ink's color. */
  verdict?: "correct" | "wrong" | null;
  /** The digits written so far, as they come in (for a question that echoes the answer elsewhere). */
  onDigitsChange?: (digits: (number | undefined)[]) => void;
  disabled?: boolean;
}

/**
 * A single numeric answer written on the drawing board: place value,
 * statistics, charts and Blixtrunda all use it. Boxes can be filled in any
 * order; the answer is submitted as soon as the last one is read.
 */
export function AnswerBoard({ length, onSubmit, resetToken = 0, revealed = null, verdict = null, onDigitsChange, disabled }: AnswerBoardProps) {
  const layout = useMemo(() => answerLayout(length), [length]);
  const boardRef = useRef<DrawBoardHandle>(null);
  // The digits read so far - a ref, not state: several boxes can be read one
  // right after the other (one settle), each needing to see the one before.
  const digitsRef = useRef<(number | undefined)[]>(Array(length).fill(undefined));
  const marks = useUnsureBoxes();

  // A new try, or a new question, starts blank (adjusting state when a prop changes - React docs)...
  const [seen, setSeen] = useState({ resetToken, length });
  if (seen.resetToken !== resetToken || seen.length !== length) {
    setSeen({ resetToken, length });
    marks.reset();
  }
  // ...its ink and digits too, which live outside React state.
  useEffect(() => {
    digitsRef.current = Array(length).fill(undefined);
    boardRef.current?.clearAll();
  }, [resetToken, length]);

  function setDigit(boxId: string, digit: number | undefined) {
    const index = Number(boxId.replace("answer", ""));
    const next = [...digitsRef.current];
    next[index] = digit;
    digitsRef.current = next;
    onDigitsChange?.(next);
    if (digit !== undefined && next.every((d) => d !== undefined)) onSubmit(Number(next.join("")));
  }

  function handleRead(boxId: string, reading: BoxReading) {
    if (reading.kind === "unsure") {
      marks.mark(boxId, reading.guesses);
      setDigit(boxId, undefined);
      return;
    }
    marks.settle(boxId);
    if (reading.kind === "digits") setDigit(boxId, reading.digits[0]);
    else if (reading.kind === "empty") setDigit(boxId, undefined);
    else if (reading.kind !== "strike") boardRef.current?.removeStrokes(reading.strokes);
  }

  const question = marks.question;

  const active = useMemo(
    () => new Set(revealed !== null || verdict === "correct" ? [] : layout.boxes.map((b) => b.id)),
    [layout, revealed, verdict]
  );
  const values: Record<string, string> = {};
  if (revealed !== null) String(revealed).split("").forEach((d, i) => (values[`answer${i}`] = d));
  const statuses: Record<string, BoxStatus> = {};
  if (verdict === "correct" || revealed !== null) layout.boxes.forEach((b) => (statuses[b.id] = "correct"));

  return (
    <div className="flex flex-col items-center gap-2 w-full">
      <DrawBoard
        ref={boardRef}
        layout={layout}
        active={active}
        values={values}
        statuses={statuses}
        unsure={marks.unsure}
        asking={question?.boxId ?? null}
        onAsk={marks.ask}
        onRead={handleRead}
        disabled={disabled}
      />
      {question && (
        <PendingChoice
          guesses={question.guesses}
          onPick={(g) => {
            marks.settle(question.boxId);
            rememberBoxDigit(boardRef.current, question.boxId, g);
            setDigit(question.boxId, g[0]);
          }}
          onRewrite={() => {
            marks.settle(question.boxId);
            boardRef.current?.clearBox(question.boxId);
          }}
        />
      )}
    </div>
  );
}
