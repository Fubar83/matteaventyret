import { useEffect, useRef, useState } from "react";
import { digitsOf } from "../engine/digits";
import type { FactProblem } from "../engine/speedTest";
import { generateFact, medalFor } from "../engine/speedTest";
import { makeRng } from "../engine/rng";
import { AnswerBoard } from "./draw/AnswerBoard";

const ROUND_SECONDS = 60;

interface BlixtrundaScreenProps {
  bestScore: number;
  onFinish: (correctCount: number) => void;
  onExit: () => void;
}

const MEDAL_LABEL: Record<string, string> = { gold: "Guld", silver: "Silver", bronze: "Brons", none: "" };

export function BlixtrundaScreen({ bestScore, onFinish, onExit }: BlixtrundaScreenProps) {
  const rngRef = useRef(makeRng(Date.now()));
  const [fact, setFact] = useState<FactProblem>(() => generateFact(rngRef.current));
  const [factKey, setFactKey] = useState(0);
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
    setFact(generateFact(rngRef.current));
    setFactKey((k) => k + 1);
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
    <div className="flex flex-col items-center gap-6 py-8">
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
      </div>
      <AnswerBoard length={digitsOf(fact.answer).length} resetToken={factKey} onSubmit={(value) => nextFact(value === fact.answer)} />
    </div>
  );
}
