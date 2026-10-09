import { useMemo, useState } from "react";
import { generateProblem, type GeneratedProblem, type StageId } from "../engine/generator";
import { makeRng } from "../engine/rng";
import { questionStars } from "../engine/scoring";
import type { Phase } from "../engine/types";
import { t } from "../i18n";
import { QuestionPlayer } from "../game/QuestionPlayer";
import type { QuestionOutcome } from "../game/questionOutcome";
import { STAGES } from "../game/stages";

export interface QuestionStoryProps {
  /** The level the question comes from. */
  stage: StageId;
  /** Which of the level's questions: the same seed always gives the same one. */
  seed: number;
  /** A column question's phase. */
  phase?: Phase;
  /** The round's first question: the guided boards start with the digits to trace. */
  first?: boolean;
  /** A guided board (trappan, multiplication) opened at this step, the ones before it done. */
  startAt?: number;
  /** Called when the question is solved (the stars it earned) - shown under it too. */
  onSolved?: (outcome: QuestionOutcome) => void;
  /** Only questions like this (a clock question to read, a shop where change is given): the first seed from `seed` on that makes one. */
  match?: (problem: GeneratedProblem) => boolean;
  /** A question given outright instead of generated (your own numbers). */
  problem?: GeneratedProblem;
}

/** How far on from the seed to look for a question that matches. */
const SEARCH = 500;

/** The first seed from `seed` on whose question matches - or null when the level never makes one. */
export function seedMatching(stage: StageId, seed: number, match: (p: GeneratedProblem) => boolean): number | null {
  for (let s = seed; s < seed + SEARCH; s++) if (match(generateProblem(stage, makeRng(s)))) return s;
  return null;
}

/** The first level (in `stages`) and seed that make a question like this - for a story's defaults. */
export function firstMatching(stages: readonly StageId[], match: (p: GeneratedProblem) => boolean): { stage: StageId; seed: number } {
  for (const stage of stages) {
    const seed = seedMatching(stage, 1, match);
    if (seed !== null) return { stage, seed };
  }
  throw new Error("No level makes a question like that");
}

/**
 * A question in a story: generated from a level and a seed (or given), shown
 * with the same player as in a round (QuestionPlayer), and what it earned
 * once solved.
 */
export function QuestionStory({ stage, seed, phase = "fritt", first = false, startAt, onSolved, match, problem: given }: QuestionStoryProps) {
  const meta = STAGES.find((s) => s.id === stage);
  const used = useMemo(() => (given || !match ? seed : seedMatching(stage, seed, match)), [given, match, stage, seed]);
  const problem = useMemo(() => given ?? (used === null ? null : generateProblem(stage, makeRng(used))), [given, stage, used]);
  const [solved, setSolved] = useState<QuestionOutcome | null>(null);
  if (!meta) return <p className="text-rose-700">Okänd nivå {stage}</p>;
  if (!problem) return <p className="text-slate-600">Nivå {stage} ({t(meta.titleKey)}) gör inte den här sortens fråga.</p>;

  return (
    <>
      <p className="text-xs text-slate-500 text-center">
        {stage} · {t(meta.titleKey)} · {given ? "egna tal" : `seed ${used}`}
      </p>
      <QuestionPlayer
        key={`${stage}|${used}|${phase}|${first}|${startAt}|${JSON.stringify(given ?? null)}`}
        problem={problem}
        level={meta.writingLevel}
        phase={phase}
        first={first}
        startAt={startAt}
        onSolved={(o) => {
          setSolved(o);
          onSolved?.(o);
        }}
      />
      {solved && (
        <p role="status" className="text-sm font-semibold text-emerald-700">
          Löst: {"★".repeat(questionStars(solved))} {solved.helped ? "(med hjälp)" : ""}
        </p>
      )}
    </>
  );
}

/** A setting that isn't one: left out of the controls. */
export const hidden = { table: { disable: true } };

/** The settings every question story has: the level (of the story file's levels) and the seed - the rest hidden unless a story shows them. */
export function questionArgTypes(ids: readonly StageId[]) {
  const labels = Object.fromEntries(ids.map((id) => [id, `${id} · ${t(STAGES.find((s) => s.id === id)!.titleKey)}`]));
  return {
    stage: { name: "Nivå", control: { type: "select" as const, labels }, options: [...ids] },
    seed: { name: "Seed", control: { type: "number" as const, min: 1, step: 1 } },
    phase: hidden,
    first: hidden,
    startAt: hidden,
    match: hidden,
    problem: hidden,
    onSolved: hidden,
  };
}

/** The phase setting (column questions). */
export const phaseControl = {
  name: "Fas",
  control: { type: "inline-radio" as const, labels: { guidat: "Guidat", egenOrdning: "Egen ordning", fritt: "Fritt" } },
  options: ["guidat", "egenOrdning", "fritt"],
};

/** The first-question setting (the guided boards trace the digits). */
export const firstControl = { name: "Första frågan (spåra siffror)", control: { type: "boolean" as const } };

/** The opened-at-step setting (the guided boards): empty starts from the beginning. */
export const startAtControl = { name: "Börja på steg", control: { type: "number" as const, min: 0, step: 1 } };
