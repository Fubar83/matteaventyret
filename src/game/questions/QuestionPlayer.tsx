import type { ReactNode } from "react";
import type { GeneratedProblem, QuestionKind } from "../../engine/generator";
import type { ColumnProblem } from "../../engine/questions/column";
import type { Phase } from "../../engine/types";
import type { WritingLevel } from "../../recognition/levels";
import { BalancePlayer } from "./balance/BalancePlayer";
import { BlocksPlayer } from "./blocks/BlocksPlayer";
import { ChartPlayer } from "./chart/ChartPlayer";
import { ChoicePlayer } from "./choice/ChoicePlayer";
import { ClockPlayer } from "./clock/ClockPlayer";
import { ColumnProblemPlayer, type ColumnProblemSummary } from "./column/ColumnProblemPlayer";
import { ConstructPlayer } from "./construct/ConstructPlayer";
import { ExperimentPlayer } from "./experiment/ExperimentPlayer";
import { GridCellsPlayer, GridPointsPlayer } from "./grid/GridPlayer";
import { MatchPlayer } from "./match/MatchPlayer";
import { MulPlayer } from "./multiplication/MulPlayer";
import { NumberLinePlayer } from "./numberLine/NumberLinePlayer";
import { PlaceValuePlayer } from "./placeValue/PlaceValuePlayer";
import type { QuestionOutcome } from "./questionOutcome";
import { ShopPlayer } from "./shop/ShopPlayer";
import { SortGroupsPlayer, SortOrderPlayer } from "./sort/SortPlayer";
import { StatisticsPlayer } from "./statistics/StatisticsPlayer";
import { TrappanPlayer } from "./trappan/TrappanPlayer";
import { ExpressionPlayer } from "./written/ExpressionPlayer";

/** What a question's player is given - each takes what it needs. */
export interface QuestionPlayerProps<P extends GeneratedProblem = GeneratedProblem> {
  problem: P;
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

type Player<K extends QuestionKind> = (props: QuestionPlayerProps<Extract<GeneratedProblem, { kind: K }>>) => ReactNode;

const column = ({ problem, phase = "fritt", onSolved, onColumnSolved }: QuestionPlayerProps<ColumnProblem>) => (
  <ColumnProblemPlayer problem={problem} phase={phase} onSolved={onColumnSolved ?? onSolved} />
);

/**
 * The player for each kind of question there is. A new kind made in the
 * engine (engine/questions/) doesn't type-check until it has one here.
 */
const PLAYERS: { [K in QuestionKind]: Player<K> } = {
  placeValue: ({ problem, onSolved }) => <PlaceValuePlayer problem={problem} onSolved={onSolved} />,
  columnAdd: column,
  columnSub: column,
  columnMul: column,
  // Kort division has its own board layout, not yet wired into a player - no stage uses it (see stages.ts).
  shortDiv: () => null,
  statistics: ({ problem, level, onSolved }) => <StatisticsPlayer problem={problem} level={level} onSolved={onSolved} />,
  chart: ({ problem, level, onSolved }) => <ChartPlayer problem={problem} level={level} onSolved={onSolved} />,
  trappan: ({ problem, first = false, startAt, onSolved }) => <TrappanPlayer problem={problem} onSolved={onSolved} first={first} startAt={startAt} />,
  mulGuided: ({ problem, first = false, startAt, onSolved }) => <MulPlayer problem={problem} onSolved={onSolved} first={first} startAt={startAt} />,
  clock: ({ problem, onSolved }) => <ClockPlayer problem={problem} onSolved={onSolved} />,
  shop: ({ problem, onSolved }) => <ShopPlayer problem={problem} onSolved={onSolved} />,
  expression: ({ problem, level, onSolved }) => <ExpressionPlayer problem={problem} level={level} onSolved={onSolved} />,
  choice: ({ problem, onSolved }) => <ChoicePlayer problem={problem} onSolved={onSolved} />,
  sortGroups: ({ problem, onSolved }) => <SortGroupsPlayer problem={problem} onSolved={onSolved} />,
  sortOrder: ({ problem, onSolved }) => <SortOrderPlayer problem={problem} onSolved={onSolved} />,
  placeOnLine: ({ problem, onSolved }) => <NumberLinePlayer problem={problem} onSolved={onSolved} />,
  gridCells: ({ problem, onSolved }) => <GridCellsPlayer problem={problem} onSolved={onSolved} />,
  gridPoints: ({ problem, onSolved }) => <GridPointsPlayer problem={problem} onSolved={onSolved} />,
  match: ({ problem, onSolved }) => <MatchPlayer problem={problem} onSolved={onSolved} />,
  buildNumber: ({ problem, onSolved }) => <BlocksPlayer problem={problem} onSolved={onSolved} />,
  balanceSolve: ({ problem, onSolved }) => <BalancePlayer problem={problem} onSolved={onSolved} />,
  experiment: ({ problem, onSolved }) => <ExperimentPlayer problem={problem} onSolved={onSolved} />,
  construct: ({ problem, onSolved }) => <ConstructPlayer problem={problem} onSolved={onSolved} />,
};

/** Every kind of question a player can be picked for. */
export const QUESTION_KINDS = Object.keys(PLAYERS) as QuestionKind[];

/** The question on screen: the player for its kind. Used by a round (RoundScreen) and by the stories. */
export function QuestionPlayer(props: QuestionPlayerProps) {
  const Player = PLAYERS[props.problem.kind] as (props: QuestionPlayerProps) => ReactNode;
  return <Player {...props} />;
}
