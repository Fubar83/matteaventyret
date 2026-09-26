import { useEffect, useRef, useState } from "react";
import { digitsOf } from "../engine/digits";
import type { FactProblem } from "../engine/speedTest";
import { generateFact, medalFor } from "../engine/speedTest";
import { makeRng } from "../engine/rng";
import { t } from "../i18n";
import type { Stroke } from "../recognition/preprocess";
import { DigitCanvas } from "./DigitCanvas";
import { Numpad } from "./Numpad";

const ROUND_SECONDS = 60;
const HAND_CELL_PX = 56;

interface BlixtrundaScreenProps {
  bestScore: number;
  inputMode?: "numpad" | "handwriting";
  onFinish: (correctCount: number) => void;
  onExit: () => void;
}

const MEDAL_LABEL: Record<string, string> = { gold: "Guld", silver: "Silver", bronze: "Brons", none: "" };

/** Same free-answer handwriting cell as StatisticsPlayer's/ChartPlayer's (candidate for a shared future component). */
function HandwrittenDigitCell({
  value,
  disabled,
  onSettled,
}: {
  value: number | undefined;
  disabled: boolean;
  onSettled: (strokes: Stroke[], canvasSize: number) => void;
}) {
  if (value !== undefined) {
    return (
      <div className="w-12 h-14 flex items-center justify-center rounded-md border-2 border-emerald-400 bg-emerald-50 text-emerald-700 text-2xl font-bold">
        {value}
      </div>
    );
  }
  return (
    <div className={disabled ? "opacity-40 pointer-events-none" : ""}>
      <DigitCanvas size={HAND_CELL_PX} compact onSettled={(strokes) => onSettled(strokes, HAND_CELL_PX)} />
    </div>
  );
}

export function BlixtrundaScreen({ bestScore, inputMode = "numpad", onFinish, onExit }: BlixtrundaScreenProps) {
  const rngRef = useRef(makeRng(Date.now()));
  const [fact, setFact] = useState<FactProblem>(() => generateFact(rngRef.current));
  const [factKey, setFactKey] = useState(0);
  const [typed, setTyped] = useState("");
  const [handDigits, setHandDigits] = useState<(number | undefined)[]>(() => Array(digitsOf(fact.answer).length).fill(undefined));
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const [pendingGuesses, setPendingGuesses] = useState<[number, number] | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);
  const [correctCount, setCorrectCount] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          setDone(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [done]);

  useEffect(() => {
    if (done) onFinish(correctCount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  function nextFact(gotCorrect: boolean) {
    if (gotCorrect) setCorrectCount((c) => c + 1);
    const next = generateFact(rngRef.current);
    setFact(next);
    setFactKey((k) => k + 1);
    setTyped("");
    setHandDigits(Array(digitsOf(next.answer).length).fill(undefined));
    setPendingIndex(null);
    setPendingGuesses(null);
  }

  function submit() {
    if (typed === "") return;
    nextFact(Number(typed) === fact.answer);
  }

  function applyHandDigit(index: number, digit: number) {
    const next = [...handDigits];
    next[index] = digit;
    setHandDigits(next);
    if (next.every((d) => d !== undefined)) nextFact(Number(next.join("")) === fact.answer);
  }

  async function handleDigitStrokes(index: number, strokes: Stroke[], canvasSize: number) {
    const { recognizeDigitStrokes } = await import("../recognition/recognizer");
    const result = await recognizeDigitStrokes(strokes, canvasSize);
    if (result.confident) {
      applyHandDigit(index, result.digit);
    } else {
      setPendingIndex(index);
      setPendingGuesses([result.topTwo.first.digit, result.topTwo.second.digit]);
    }
  }

  function resolvePending(digit: number) {
    if (pendingIndex === null) return;
    const index = pendingIndex;
    setPendingIndex(null);
    setPendingGuesses(null);
    applyHandDigit(index, digit);
  }

  if (done) {
    const medal = medalFor(correctCount);
    return (
      <div className="flex flex-col items-center gap-4 py-16">
        <h2 className="text-2xl font-bold text-slate-800">Tiden är slut!</h2>
        <p className="text-slate-600">{correctCount} rätt</p>
        {medal !== "none" && <p className="text-xl font-bold text-amber-500">{MEDAL_LABEL[medal]}medalj!</p>}
        {correctCount > bestScore && <p className="text-emerald-600 font-semibold">Nytt rekord!</p>}
        <button type="button" onClick={onExit} className="h-12 px-6 rounded-xl bg-slate-200 text-slate-700 font-bold">
          Tillbaka
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-center gap-6 lg:gap-12 py-8">
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-6 text-sm text-slate-500">
          <button type="button" onClick={onExit} className="underline">
            Tillbaka
          </button>
          <span className="font-bold text-slate-700">{secondsLeft}s</span>
          <span>Rätt: {correctCount}</span>
          <span>Rekord: {bestScore}</span>
        </div>
        <div className="text-4xl font-bold text-slate-800">
          {fact.a} {fact.op === "add" ? "+" : "-"} {fact.b} =
          {inputMode !== "handwriting" && <> {typed || "?"}</>}
        </div>
        {inputMode === "handwriting" && (
          <div className="flex flex-col items-center gap-2" key={factKey}>
            <div className="flex gap-1">
              {handDigits.map((d, i) => (
                <HandwrittenDigitCell key={i} value={d} disabled={pendingIndex !== null && pendingIndex !== i} onSettled={(strokes, canvasSize) => handleDigitStrokes(i, strokes, canvasSize)} />
              ))}
            </div>
            {pendingIndex !== null && pendingGuesses && (
              <div className="flex flex-col items-center gap-1">
                <p className="text-xs text-slate-500">{t("ui.didYouMean")}</p>
                <div className="flex gap-2">
                  {pendingGuesses.map((d) => (
                    <button key={d} type="button" onClick={() => resolvePending(d)} className="w-11 h-11 rounded-xl bg-sky-500 text-white text-xl font-bold">
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {inputMode === "numpad" && (
        <Numpad onDigit={(d) => setTyped((p) => (p.length >= 2 ? p : p + d))} onDelete={() => setTyped((p) => p.slice(0, -1))} onSubmit={submit} />
      )}
    </div>
  );
}
