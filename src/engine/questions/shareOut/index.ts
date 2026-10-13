/**
 * Sharing out by hand - division as dealing things onto plates, one at a
 * time, until it's fair:
 *
 *   åk 1-3  1.4.4 dela lika: 12 cookies, 3 animals - everything shared, the same each
 *           1.4.5 dela med rest: 14 cookies, 4 animals - the same each, and what's left
 *                 is fewer than there are animals
 *
 * How it works, and what must stay true: docs/question-types/shareOut.md.
 */
import { pick, randInt, shuffle, type Rng } from "../../rng";
import { text, type ChoiceText } from "../choice/problem";
import { questionType } from "../questionType";
import { ANIMALS, GROUP_THINGS, type Animal, type GroupThing } from "../scene";

export type ShareOutStageId = "1.4.4" | "1.4.5";

export interface ShareOutProblem {
  stageId: ShareOutStageId;
  kind: "shareOut";
  thing: GroupThing;
  total: number;
  animals: Animal[];
  /** Each one's share, and what's left over (0 for an exact sharing). */
  each: number;
  rest: number;
  prompt: ChoiceText;
  tip: ChoiceText;
  explanation: ChoiceText;
}

/** Whether plates hold a fair share: the same on each, and nothing left that could go round once more. */
export function checkShare(p: ShareOutProblem, plates: number[]): { ok: true } | { ok: false; why: ChoiceText } {
  const left = p.total - plates.reduce((s, n) => s + n, 0);
  if (new Set(plates).size > 1) return { ok: false, why: text("share.why.unequal") };
  if (left >= plates.length) return { ok: false, why: text("share.why.moreToGive", { n: left }) };
  return { ok: true };
}

function make(rng: Rng, stageId: ShareOutStageId, withRest: boolean): ShareOutProblem {
  const n = randInt(rng, 2, withRest ? 4 : 5);
  const each = randInt(rng, 2, withRest ? 5 : 6);
  const rest = withRest ? randInt(rng, 1, n - 1) : 0;
  const total = n * each + rest;
  const thing = pick(rng, GROUP_THINGS);
  return {
    stageId,
    kind: "shareOut",
    thing,
    total,
    animals: shuffle(rng, ANIMALS).slice(0, n),
    each,
    rest,
    prompt: text(withRest ? "share.prompt.rest" : "share.prompt.exact", { total, n, thing: `@countThing.${thing}` }),
    tip: text("share.tip"),
    explanation: text(withRest ? "share.explain.rest" : "share.explain.exact", { total, n, each, rest }),
  };
}

export const SHARE_OUT_QUESTIONS = questionType<"shareOut", ShareOutProblem, ShareOutStageId>({
  id: "shareOut",
  kinds: ["shareOut"],
  levels: {
    "1.4.4": (rng) => make(rng, "1.4.4", false),
    "1.4.5": (rng) => make(rng, "1.4.5", true),
  },
  key: (p) => `shareOut:${p.stageId}:${p.total}:${p.animals.length}`,
});
