/**
 * Skrivna frågor: everything answered by writing on the free board (or, for
 * a fact like the times tables, just the answer) - åk 1's word problems,
 * geometry, the national tests' topics and åk 7-9 to gymnasiet. One question
 * type, its levels gathered from the topic modules; the model they share is
 * problem.ts.
 */
import { questionType } from "../questionType";
import { ADVANCED_GENERATORS } from "./advanced";
import { BASIC_GENERATORS } from "./basicTopics";
import { EXAM_GENERATORS } from "./examTopics";
import { GEOMETRY_GENERATORS } from "./geometry";
import { WORD_GENERATORS } from "./wordProblems";

export const WRITTEN_QUESTIONS = questionType({
  id: "written",
  kinds: ["expression"],
  levels: { ...BASIC_GENERATORS, ...WORD_GENERATORS, ...GEOMETRY_GENERATORS, ...EXAM_GENERATORS, ...ADVANCED_GENERATORS },
  // The worked solution too: a geometry question is all in its figure, with no display to tell two apart.
  key: (p) => `adv:${p.stageId}:${p.display}:${JSON.stringify(p.promptVars ?? {})}:${p.solution.join("|")}`,
});
