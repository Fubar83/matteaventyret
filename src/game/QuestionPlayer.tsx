import type { GeneratedProblem } from "../engine/generator";
import type { Phase } from "../engine/types";
import type { WritingLevel } from "../recognition/levels";
import { ChartPlayer } from "./ChartPlayer";
import { ClockPlayer } from "./ClockPlayer";
import { ColumnProblemPlayer, type ColumnProblemSummary } from "./ColumnProblemPlayer";
import { ExpressionPlayer } from "./ExpressionPlayer";
import { MulPlayer } from "./MulPlayer";
import { PlaceValuePlayer } from "./PlaceValuePlayer";
import type { QuestionOutcome } from "./questionOutcome";
import { ShopPlayer } from "./shop/ShopPlayer";
import { StatisticsPlayer } from "./StatisticsPlayer";
import { TrappanPlayer } from "./TrappanPlayer";

/** Every kind of question there is - the stories (src/stories/) must cover each one (see storyCoverage.test.ts). */
export const QUESTION_KINDS = ["placeValue", "statistics", "chart", "expression", "shop", "clock", "mulGuided", "trappan", "columnAdd", "columnSub", "columnMul", "shortDiv"] as const satisfies readonly GeneratedProblem["kind"][];

export interface QuestionPlayerProps {
  problem: GeneratedProblem;
  /** What the handwriting is read as (the stage's writingLevel). */
  level: WritingLevel;
  /** A column question's phase: Guidat, Egen ordning or Fritt. */
  phase?: Phase;
  /** The round's first question - the guided boards start with the digits to trace. */
  first?: boolean;
  /** A guided board (trappan, multiplication) opened at this step, the ones before it done - for the stories. */
  startAt?: number;
  onSolved: (outcome: QuestionOutcome) => void;
  /** A column question reports more than its stars (what the method phases learn from). */
  onColumnSolved?: (summary: ColumnProblemSummary) => void;
}

/** The question on screen: the player for its kind. Used by a round (RoundScreen) and by the stories. */
export function QuestionPlayer({ problem, level, phase = "fritt", first = false, startAt, onSolved, onColumnSolved }: QuestionPlayerProps) {
  switch (problem.kind) {
    case "placeValue":
      return <PlaceValuePlayer problem={problem} onSolved={onSolved} />;
    case "statistics":
      return <StatisticsPlayer problem={problem} level={level} onSolved={onSolved} />;
    case "chart":
      return <ChartPlayer problem={problem} level={level} onSolved={onSolved} />;
    case "expression":
      return <ExpressionPlayer problem={problem} level={level} onSolved={onSolved} first={first} />;
    case "shop":
      return <ShopPlayer problem={problem} onSolved={onSolved} />;
    case "clock":
      return <ClockPlayer problem={problem} onSolved={onSolved} />;
    case "mulGuided":
      return <MulPlayer problem={problem} onSolved={onSolved} first={first} startAt={startAt} />;
    case "trappan":
      return <TrappanPlayer problem={problem} onSolved={onSolved} first={first} startAt={startAt} />;
    case "shortDiv":
      // Kort division has its own board layout, not yet wired into a player - no stage uses it (see stages.ts).
      return null;
    default:
      return <ColumnProblemPlayer problem={problem} phase={phase} onSolved={onColumnSolved ?? onSolved} />;
  }
}
