import type { Meta, StoryObj } from "@storybook/react-vite";
import { useMemo } from "react";
import { fn } from "storybook/test";
import type { TrappanStageId } from "../engine/trappan";
import { stageIds } from "./catalog";
import { ownDivision } from "./ownNumbers";
import { firstControl, firstMatching, QuestionStory, questionArgTypes, startAtControl, type QuestionStoryProps } from "./QuestionStory";
import { TRAPPAN } from "./variants";

const LEVELS = stageIds("Trappan.stories.tsx");

type Args = QuestionStoryProps & {
  /** A division of your own instead of the level's. */
  own: boolean;
  dividend: string;
  divisor: string;
  answerAs: "exact" | "rounded" | "rest";
  round: number;
};

/** Your own division, or the level's - on the same board. */
function TrappanStory({ own, dividend, divisor, answerAs, round, ...props }: Args) {
  const problem = useMemo(
    () => (own ? ownDivision(props.stage as TrappanStageId, dividend, divisor, answerAs === "rest" ? { withRest: true } : answerAs === "rounded" ? { round } : {}) : undefined),
    [own, props.stage, dividend, divisor, answerAs, round]
  );
  if (own && !problem) return <p className="text-rose-700">Skriv två tal, som 125,25 och 12,7 (nämnaren inte 0).</p>;
  return <QuestionStory {...props} problem={problem ?? undefined} />;
}

const ifOwn = { if: { arg: "own", truthy: true } } as const;

/**
 * Trappan: division worked step by step on a guided board - the commas moved
 * so the divisor is whole, the stairs revealed one by one, and the answer
 * exact, rounded, or with a rest.
 */
const meta = {
  title: "Frågor/Trappan (division)",
  component: QuestionStory,
  render: (args) => <TrappanStory {...args} />,
  args: { stage: LEVELS[0], seed: 1, first: false, own: false, dividend: "125,25", divisor: "12,7", answerAs: "rounded", round: 2, onSolved: fn() },
  argTypes: {
    ...questionArgTypes(LEVELS),
    first: firstControl,
    startAt: startAtControl,
    own: { name: "Egna tal", control: { type: "boolean" } },
    dividend: { name: "Täljare", control: { type: "text" }, ...ifOwn },
    divisor: { name: "Nämnare", control: { type: "text" }, ...ifOwn },
    answerAs: { name: "Svaret", control: { type: "inline-radio", labels: { exact: "Exakt", rounded: "Avrundat", rest: "Med rest" } }, options: ["exact", "rounded", "rest"], ...ifOwn },
    round: { name: "Antal decimaler", control: { type: "number", min: 0, max: 4, step: 1 }, if: { arg: "answerAs", eq: "rounded" } },
  },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ValfriNiva: Story = { name: "Valfri nivå" };

export const Heltal: Story = { args: { ...firstMatching(LEVELS, TRAPPAN.whole), match: TRAPPAN.whole } };
export const DecimaltalITaljaren: Story = { name: "Decimaltal i täljaren", args: { ...firstMatching(LEVELS, TRAPPAN.decimalDividend), match: TRAPPAN.decimalDividend } };
export const DecimaltalINamnaren: Story = { name: "Decimaltal i nämnaren (flytta kommat)", args: { ...firstMatching(LEVELS, TRAPPAN.decimalDivisor), match: TRAPPAN.decimalDivisor } };
export const Avrundat: Story = { args: { ...firstMatching(LEVELS, TRAPPAN.rounded), match: TRAPPAN.rounded } };
export const MedRest: Story = { name: "Med rest", args: { ...firstMatching(LEVELS, TRAPPAN.withRest), match: TRAPPAN.withRest } };

/** Your own numbers: two decimal numbers, rounded - and a whole division with a rest. */
export const EgnaTalTvaDecimaltal: Story = {
  name: "Egna tal: 125,25 ÷ 12,7",
  args: { stage: firstMatching(LEVELS, TRAPPAN.rounded).stage, own: true, dividend: "125,25", divisor: "12,7", answerAs: "rounded", round: 2 },
};
export const EgnaTalMedRest: Story = {
  name: "Egna tal: 158 ÷ 6 med rest",
  args: { stage: firstMatching(LEVELS, TRAPPAN.withRest).stage, own: true, dividend: "158", divisor: "6", answerAs: "rest" },
};

/** The round's first question: the digits are there to trace. */
export const ForstaFragan: Story = { name: "Första frågan (spåra siffror)", args: { first: true } };
/** Opened partway, the steps before done - to look at a later step straight away. */
export const MittIUtrakningen: Story = { name: "Mitt i uträkningen", args: { ...firstMatching(LEVELS, TRAPPAN.decimalDivisor), match: TRAPPAN.decimalDivisor, startAt: 4 } };
