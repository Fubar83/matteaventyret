/**
 * The ten frame (tiorutan): two rows of five, filled with counters - a number
 * seen as "five and some more", and as so many short of ten.
 *
 *   förskoleklass 0.1.9 visa talet: put 7 counters in the frame
 *   åk 1-3        1.7.6 till tio: 6 are there - add until it's 10 (6 + 4 = 10, the equation filling in as you go)
 *                 1.7.7 över tiotalet: 8 + 5 in two frames - move counters until the first is full,
 *                       then it's 10 + 3
 *
 * How it works, and what must stay true: docs/question-types/tenFrame.md.
 */
import { randInt, type Rng } from "../../rng";
import { text, type ChoiceText } from "../choice/problem";
import { questionType } from "../questionType";

export type TenFrameStageId = "0.1.9" | "1.7.6" | "1.7.7";

export interface TenFrameProblem {
  stageId: TenFrameStageId;
  kind: "tenFrame";
  mode: "show" | "toTen" | "overTen";
  /** The counters there from the start: in the first frame (and, over ten, the second's). */
  given: [number, number];
  /** How many counters the frames hold when it's done (show, to ten); over ten, the sum asked. */
  target: number;
  prompt: ChoiceText;
  tip: ChoiceText;
  explanation: ChoiceText;
}

/** The answers to pick among for the sum over ten: the sum, one either side, and ten too few. */
export const sumChoices = (p: TenFrameProblem) => [p.target - 1, p.target, p.target + 1, p.target - 10].sort((a, b) => a - b);

/** 0.1.9: show a number from 1 to 10 - the frame empty. */
function show(rng: Rng): TenFrameProblem {
  const n = randInt(rng, 1, 10);
  return {
    stageId: "0.1.9",
    kind: "tenFrame",
    mode: "show",
    given: [0, 0],
    target: n,
    prompt: text("tf.prompt.show", { n }),
    tip: text(n > 5 ? "tf.tip.showBig" : "tf.tip.show", { n, more: n - 5 }),
    explanation: text(n > 5 ? "tf.explain.showBig" : "tf.explain.show", { n, more: n - 5 }),
  };
}

/** 1.7.6: some are there; add until it's ten - how many that took is the number friend. */
function toTen(rng: Rng): TenFrameProblem {
  const n = randInt(rng, 1, 9);
  return {
    stageId: "1.7.6",
    kind: "tenFrame",
    mode: "toTen",
    given: [n, 0],
    target: 10,
    prompt: text("tf.prompt.toTen", { n }),
    tip: text("tf.tip.toTen"),
    explanation: text("tf.explain.toTen", { n, m: 10 - n }),
  };
}

/** 1.7.7: a + b over ten (6-9 and enough to pass 10): fill the first frame from the second, then it's ten and the rest. */
function overTen(rng: Rng): TenFrameProblem {
  const a = randInt(rng, 6, 9);
  const b = randInt(rng, 11 - a, 9);
  return {
    stageId: "1.7.7",
    kind: "tenFrame",
    mode: "overTen",
    given: [a, b],
    target: a + b,
    prompt: text("tf.prompt.overTen", { a, b }),
    tip: text("tf.tip.overTen", { m: 10 - a }),
    explanation: text("tf.explain.overTen", { a, b, m: 10 - a, r: a + b - 10, s: a + b }),
  };
}

export const TEN_FRAME_QUESTIONS = questionType<"tenFrame", TenFrameProblem, TenFrameStageId>({
  id: "tenFrame",
  kinds: ["tenFrame"],
  levels: {
    "0.1.9": show,
    "1.7.6": toTen,
    "1.7.7": overTen,
  },
  key: (p) => `tenFrame:${p.stageId}:${p.given.join()}:${p.target}`,
});
