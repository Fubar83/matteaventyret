/**
 * Single-choice questions: a question, often a picture (scene.ts), and a few
 * options to pick from - words (udda, jämnt), symbols (<, >), numbers and
 * fractions (LaTeX), arrows, or pictures. For what is recognised or compared
 * rather than worked out and written: is it odd or even, which shape is a
 * cylinder, where does the robot end up, how likely is red.
 *
 * The wrong options are the mistakes children make, and each can say why it
 * isn't right (`whyNot`).
 */
import type { ChoiceStageId } from ".";
import type { QuestionScene } from "../scene";
import { tex } from "../written/problem";

/** A text in the game's languages: an i18n key ("choice.*"), and its values. */
export interface ChoiceText {
  key: string;
  vars?: Record<string, string | number>;
}

export type ChoiceOption =
  /** Words: "udda", "måndag", "säkert". */
  | { text: ChoiceText }
  /** A number, a fraction, a sign: "\\frac{3}{4}", "0{,}04", "<". */
  | { latex: string }
  /** Characters as they are: a letter, a row of arrows. */
  | { plain: string }
  /** A small picture. */
  | { scene: QuestionScene };

export interface ChoiceProblem {
  stageId: ChoiceStageId;
  kind: "choice";
  prompt: ChoiceText;
  /** The task shown big (LaTeX), when there is one: "47 \\;\\square\\; 74". */
  display?: string;
  scene?: QuestionScene;
  options: ChoiceOption[];
  /** The right option's index. */
  correct: number;
  /** Why each wrong option is wrong, said when it's picked - null for the right one (or nothing better than "try again"). */
  whyNot?: (ChoiceText | null)[];
  /** The help ladder: a tip, then the explanation of the right answer. */
  tip: ChoiceText;
  explanation: ChoiceText;
}

export const text = (key: string, vars?: Record<string, string | number>): ChoiceText => ({ key, vars });

/** A number in Swedish notation (3{,}5, -2) as an option. */
export const numberOption = (n: number): ChoiceOption => ({ latex: tex(n) });
/** A fraction at full size (\dfrac) - inline it would be too small to read on a button. */
export const fractionOption = (s: number, p: number): ChoiceOption => ({ latex: `\\dfrac{${s}}{${p}}` });
/** Characters as they are: "A", "300 g", "08:15". */
export const plainOption = (s: string): ChoiceOption => ({ plain: s });
/** Words, from i18n. */
export const textOption = (key: string, vars?: Record<string, string | number>): ChoiceOption => ({ text: text(key, vars) });

/** How an option is told apart from the others: two options that look the same would make two right answers. */
export function optionKey(o: ChoiceOption): string {
  if ("text" in o) return `t:${o.text.key}:${JSON.stringify(o.text.vars ?? {})}`;
  if ("latex" in o) return `l:${o.latex}`;
  if ("plain" in o) return `p:${o.plain}`;
  return `s:${JSON.stringify(o.scene)}`;
}

/** A number option's value - "3{,}5", "-2", "\\dfrac{3}{4}", "2\\,\\dfrac{3}{4}" - or null when it isn't a number. */
export function optionValue(o: ChoiceOption): number | null {
  if (!("latex" in o)) return null;
  const f = o.latex.match(/^(-)?(?:(\d+)\\,)?\\d?frac\{(\d+)\}\{(\d+)\}$/);
  if (f) return (f[1] ? -1 : 1) * (Number(f[2] ?? 0) + Number(f[3]) / Number(f[4]));
  const n = Number(o.latex.replace("{,}", "."));
  return o.latex.trim() !== "" && Number.isFinite(n) ? n : null;
}

/** A wrong option, and why it's wrong (said when it's picked). */
export interface Slip {
  option: ChoiceOption;
  why?: ChoiceText;
}

/**
 * Options from the right one and its slips: the slips that differ from it
 * and from each other, up to `count` in all, shuffled in - with where the
 * right one ended up, and each wrong one's reason in the same order. List
 * the slips most likely first.
 */
export function shuffledOptions(
  rng: () => number,
  right: ChoiceOption,
  slips: readonly Slip[],
  count = 4
): Pick<ChoiceProblem, "options" | "correct" | "whyNot"> {
  const picked: Slip[] = [{ option: right }];
  const seen = new Set([optionKey(right)]);
  // A wrong number worth as much as the right one (4/8 for 2/4) would be right too - it's left out.
  const rightValue = optionValue(right);
  const worthTheSame = (o: ChoiceOption) => {
    const v = optionValue(o);
    return rightValue !== null && v !== null && Math.abs(v - rightValue) < 1e-9;
  };
  for (const s of slips) {
    if (picked.length >= count) break;
    if (seen.has(optionKey(s.option)) || worthTheSame(s.option)) continue;
    seen.add(optionKey(s.option));
    picked.push(s);
  }
  for (let i = picked.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [picked[i], picked[j]] = [picked[j], picked[i]];
  }
  const correct = picked.findIndex((s) => s.option === right);
  return { options: picked.map((s) => s.option), correct, whyNot: picked.map((s, i) => (i === correct ? null : (s.why ?? null))) };
}

/** Options in a fixed order (<, >, = - or udda, jämnt): no shuffling, the right one by index. */
export function fixedOptions(options: ChoiceOption[], correct: number, why: (ChoiceText | null)[] = []): Pick<ChoiceProblem, "options" | "correct" | "whyNot"> {
  return { options, correct, whyNot: options.map((_, i) => (i === correct ? null : (why[i] ?? null))) };
}
