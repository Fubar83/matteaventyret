import type { Meta, StoryObj } from "@storybook/react-vite";
import { useMemo } from "react";
import { fn } from "storybook/test";
import type { MulGuidedStageId } from "../engine/questions/multiply";
import { stageIds } from "./catalog";
import { ownMultiplication } from "./ownNumbers";
import { firstControl, firstMatching, QuestionStory, questionArgTypes, startAtControl, type QuestionStoryProps } from "./QuestionStory";
import { MULTIPLICATION } from "./variants";

const LEVELS = stageIds("Multiplication.stories.tsx");

type Args = QuestionStoryProps & {
  /** A multiplication of your own instead of the level's. */
  own: boolean;
  a: string;
  b: string;
};

/** Your own multiplication, or the level's - on the same board. */
function MultiplicationStory({ own, a, b, ...props }: Args) {
  const problem = useMemo(() => (own ? ownMultiplication(props.stage as MulGuidedStageId, a, b) : undefined), [own, props.stage, a, b]);
  if (own && !problem) return <p className="text-rose-700">Skriv två tal, som 0,2 och 0,03.</p>;
  return <QuestionStory {...props} problem={problem ?? undefined} />;
}

const ifOwn = { if: { arg: "own", truthy: true } } as const;

/**
 * Multiplikation, guided: a bigger multiplication set up in columns, worked
 * box by box - decimals made whole, multiplied, and the decimals counted back
 * in at the end (0,2 · 0,03 → 2 · 3 = 6 → 0,006).
 */
const meta = {
  title: "Frågor/Multiplikation (guidad)",
  component: QuestionStory,
  render: (args) => <MultiplicationStory {...args} />,
  args: { stage: LEVELS[0], seed: 1, first: false, own: false, a: "0,2", b: "0,03", onSolved: fn() },
  argTypes: {
    ...questionArgTypes(LEVELS),
    first: firstControl,
    startAt: startAtControl,
    own: { name: "Egna tal", control: { type: "boolean" } },
    a: { name: "Första talet", control: { type: "text" }, ...ifOwn },
    b: { name: "Andra talet", control: { type: "text" }, ...ifOwn },
  },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ValfriNiva: Story = { name: "Valfri nivå" };

export const TvasiffrigFaktor: Story = { name: "Tvåsiffrig faktor", args: { ...firstMatching(LEVELS, MULTIPLICATION.twoDigit), match: MULTIPLICATION.twoDigit } };
export const EttDecimaltal: Story = { name: "Ett decimaltal", args: { ...firstMatching(LEVELS, MULTIPLICATION.oneDecimal), match: MULTIPLICATION.oneDecimal } };
export const TvaDecimaltal: Story = { name: "Två decimaltal", args: { ...firstMatching(LEVELS, MULTIPLICATION.bothDecimals), match: MULTIPLICATION.bothDecimals } };

/** Your own numbers: two decimals whose answer needs zeros put in front. */
export const EgnaTal: Story = { name: "Egna tal: 0,2 · 0,03", args: { stage: firstMatching(LEVELS, MULTIPLICATION.bothDecimals).stage, own: true, a: "0,2", b: "0,03" } };

/** The round's first question: the digits are there to trace. */
export const ForstaFragan: Story = { name: "Första frågan (spåra siffror)", args: { first: true } };
/** Opened partway, the steps before done. */
export const MittIUtrakningen: Story = { name: "Mitt i uträkningen", args: { ...firstMatching(LEVELS, MULTIPLICATION.twoDigit), match: MULTIPLICATION.twoDigit, startAt: 3 } };
