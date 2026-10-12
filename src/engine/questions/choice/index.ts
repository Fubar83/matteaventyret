/**
 * Single-choice questions: recognise, compare, pick - one question type,
 * its levels gathered from the topic modules here; the model they share is
 * problem.ts.
 *
 * How it works, and what must stay true: docs/question-types/choice.md.
 */
import { questionType } from "../questionType";
import { CHANCE_CHOICES, type ChanceChoiceStageId } from "./chance";
import { CODE_CHOICES, type CodeChoiceStageId } from "./code";
import { DATA_CHOICES, type DataChoiceStageId } from "./data";
import { EARLY_CHOICES, type EarlyChoiceStageId } from "./early";
import { EVERYDAY_CHOICES, type EverydayChoiceStageId } from "./everyday";
import { FRACTION_CHOICES, type FractionChoiceStageId } from "./fractions";
import { FUNCTION_CHOICES, type FunctionChoiceStageId } from "./functions";
import { GEOMETRY_CHOICES, type GeometryChoiceStageId } from "./geometry";
import { MEASURING_CHOICES, type MeasuringChoiceStageId } from "./measuring";
import { NUMBER_CHOICES, type NumberChoiceStageId } from "./numbers";
import { PERCENT_CHOICES, type PercentChoiceStageId } from "./percent";
import { optionKey } from "./problem";
import { PROGRAMMING_CHOICES, type ProgrammingChoiceStageId } from "./programming";
import { SHAPE_CHOICES, type ShapeChoiceStageId } from "./shapes";

/** Every single-choice question's level. */
export type ChoiceStageId =
  | EarlyChoiceStageId
  | NumberChoiceStageId
  | FractionChoiceStageId
  | ShapeChoiceStageId
  | MeasuringChoiceStageId
  | EverydayChoiceStageId
  | DataChoiceStageId
  | ChanceChoiceStageId
  | FunctionChoiceStageId
  | PercentChoiceStageId
  | GeometryChoiceStageId
  | ProgrammingChoiceStageId
  | CodeChoiceStageId;

export const CHOICE_QUESTIONS = questionType({
  id: "choice",
  kinds: ["choice"],
  levels: {
    ...EARLY_CHOICES,
    ...NUMBER_CHOICES,
    ...FRACTION_CHOICES,
    ...SHAPE_CHOICES,
    ...MEASURING_CHOICES,
    ...EVERYDAY_CHOICES,
    ...DATA_CHOICES,
    ...CHANCE_CHOICES,
    ...FUNCTION_CHOICES,
    ...PERCENT_CHOICES,
    ...GEOMETRY_CHOICES,
    ...PROGRAMMING_CHOICES,
    ...CODE_CHOICES,
  },
  key: (p) => `choice:${p.stageId}:${JSON.stringify(p.prompt)}:${p.display ?? ""}:${JSON.stringify(p.scene ?? null)}:${optionKey(p.options[p.correct])}`,
});
