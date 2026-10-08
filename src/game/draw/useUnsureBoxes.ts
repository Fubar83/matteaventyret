import { useMemo, useState } from "react";

export interface UnsureQuestion {
  boxId: string;
  /** The most likely readings, best first. */
  guesses: number[][];
}

/**
 * Boxes the recognizer wasn't sure about. They aren't asked about right away:
 * the board marks them (see DrawBoard's `unsure`) and keeps going, since the
 * child often fixes a shaky digit by writing over it - which reads the box
 * again and clears the mark (`settle`). The "Menade du?" question only opens
 * when the child taps a mark, or when there's nothing left to write without
 * it (DrawBoard's `onAsk`).
 */
export function useUnsureBoxes() {
  const [guesses, setGuesses] = useState<Readonly<Record<string, number[][]>>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const unsure = useMemo(() => new Set(Object.keys(guesses)), [guesses]);
  const question: UnsureQuestion | null = openId !== null && guesses[openId] ? { boxId: openId, guesses: guesses[openId] } : null;

  return {
    unsure,
    question,
    /** The box was read, but not surely: mark it. */
    mark(boxId: string, readings: number[][]) {
      setGuesses((g) => ({ ...g, [boxId]: readings }));
    },
    /** The box was read as something definite (or erased) - its mark, and any open question about it, go. */
    settle(boxId: string) {
      setGuesses((g) => {
        if (!(boxId in g)) return g;
        const next = { ...g };
        delete next[boxId];
        return next;
      });
      setOpenId((id) => (id === boxId ? null : id));
    },
    /** Opens the question about a marked box. */
    ask(boxId: string) {
      setOpenId(boxId);
    },
    /** Forgets every mark (a new question, or a new try). */
    reset() {
      setGuesses({});
      setOpenId(null);
    },
  };
}

export type UnsureBoxes = ReturnType<typeof useUnsureBoxes>;
