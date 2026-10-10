/**
 * The written questions' model: what a question is (WrittenProblem - its
 * task, the answer written work is checked against, the help ladder, and a
 * figure, picture or unit where it has one), and the helpers the topic
 * modules write their tasks and solutions with. The levels themselves are in
 * the topic modules (advanced.ts, basicTopics.ts, examTopics.ts,
 * geometry.ts, wordProblems.ts); index.ts makes them one question type.
 */
import type { AdvancedStageId } from "./advanced";
import type { BasicStageId } from "./basicTopics";
import type { ExamStageId } from "./examTopics";
import type { Figure, GeometryStageId } from "./geometry";
import type { QuestionScene } from "./questionScene";
import type { WordStageId } from "./wordProblems";

/** Every written question's level. */
export type WrittenStageId = AdvancedStageId | BasicStageId | ExamStageId | GeometryStageId | WordStageId;

/** The answer, in a form that can be checked against written work (see mathinput/workCheck.ts's Answer). */
export type AnswerSpec =
  /**
   * `approx`: a rounded answer (π, sin), written with "=" or "≈" - right
   * when it's the exact value (`exact`, when known) worked out and rounded
   * correctly, with π taken as 3,14 allowed (see workCheck.ts).
   */
  | { kind: "value"; value: number; approx?: boolean; exact?: number; piAs314?: number; fraction?: boolean }
  | { kind: "solutions"; variable: string; values: number[] }
  /**
   * `latex` is the expected expression, in the form the evaluator reads ("6x + 2").
   * `form`: how it has to be written - "expanded" (no brackets left: utveckla) or
   * "factored" (a product: faktorisera) - not just anything equal to it.
   */
  | { kind: "expression"; variable: string; latex: string; form?: "expanded" | "factored" }
  /** An equation system's solution, one value per variable. */
  | { kind: "system"; variables: string[]; values: number[] };

export interface WrittenProblem {
  stageId: WrittenStageId;
  kind: "expression";
  /** i18n key for the question's wording ("adv.prompt.*"), and its values. */
  promptKey: string;
  promptVars?: Record<string, string | number>;
  /** The task, shown big (LaTeX). Empty when the words say it all. */
  display: string;
  answer: AnswerSpec;
  /** The help ladder: a tip (i18n key), then the first step, then the whole solution (LaTeX lines). */
  tipKey: string;
  firstStep: string;
  solution: string[];
  /** Geometry (geometry.ts): the shape, its measurements marked. */
  figure?: Figure;
  /** A picture of the question for the younger levels: a balance, groups of things, things shared out. */
  scene?: QuestionScene;
  /** Geometry: the answer's unit ("cm", "m²") - written after the answer, it isn't part of the number. */
  unit?: string;
  /** The solution as guided steps (training mode: one box per step) - without, stepsOf makes them from `solution`. */
  steps?: SolutionStep[];
  /**
   * Only the result counts - a fact to know, like the times tables: no steps
   * to write, just the answer, picked among `choices` (the right one and the
   * usual slips) or written (QuickAnswer.tsx).
   */
  answerOnly?: { choices: number[] };
}

/** One step of a guided solution: what to do in it (i18n "step.*" and its values), and the step written out - what its help shows. */
export interface SolutionStep {
  guideKey: string;
  guideVars?: Record<string, string | number>;
  line: string;
}

export const st = (guideKey: string, line: string, guideVars?: Record<string, string | number>): SolutionStep => ({ guideKey, guideVars, line });

/**
 * A problem's guided steps: its own, or one per line of its worked solution
 * (the task restated first is left out - it's already shown) with a general
 * guide: start from the formula and the given numbers, then work it out.
 */
export function stepsOf(p: WrittenProblem): SolutionStep[] {
  if (p.steps && p.steps.length > 0) return p.steps;
  const lines = p.solution.filter((line, i) => !(i === 0 && line === p.display && p.solution.length > 1));
  return lines.map((line, i) => st(i === 0 ? "step.first" : i === lines.length - 1 ? "step.finish" : "step.next", line.replace(/^\s*=\s*/, "")));
}

/** A number the Swedish way, for LaTeX: 3{,}5 and −4. */
export function tex(n: number): string {
  const s = Number.isInteger(n) ? String(n) : String(Math.round(n * 1e6) / 1e6);
  return s.replace(".", "{,}");
}

/** A number as written in a task's LaTeX or a figure's label: 8, 4{,}5, 4,5, 12\,500. */
const NUMBER = /\d+(?:\\,\d{3})*(?:(?:\{,\}|[.,])\d+)?/g;

/**
 * The numbers a question gives: its task, its figure's measurements, its
 * wording's values - and the numbers its worked solution passes through
 * (48 on the way to 24), so any right way there is explained. π problems add
 * 3,14, the value most people use for it. (For pointing out a written number
 * that came from nowhere - mathinput/workCheck.ts's unknownNumbers.)
 */
export function givenNumbers(p: WrittenProblem): number[] {
  const texts = [p.display, p.firstStep, ...p.solution, ...(p.figure?.labels.map((l) => l.text) ?? []), ...Object.values(p.promptVars ?? {}).map(String)];
  const out = texts.flatMap((text) => [...text.matchAll(NUMBER)].map((m) => Number(m[0].replace(/\\,/g, "").replace(/\{,\}|,/, "."))));
  if (texts.some((text) => text.includes("\\pi"))) out.push(3.14);
  return out.filter((n) => Number.isFinite(n));
}

/** In parentheses when negative - what follows an operator. */
export function par(n: number): string {
  return n < 0 ? `(${tex(n)})` : tex(n);
}

/** "+ 3" or "- 3" - a signed term after something. */
export function signed(n: number): string {
  return n < 0 ? `- ${tex(-n)}` : `+ ${tex(n)}`;
}

/** a·x with a coefficient: "x", "-x", "3x". */
export function coef(a: number, x = "x"): string {
  if (a === 1) return x;
  if (a === -1) return `-${x}`;
  return `${tex(a)}${x}`;
}
