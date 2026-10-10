import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { stageIds } from "./catalog";
import { firstMatching, phaseControl, QuestionStory, questionArgTypes } from "./QuestionStory";
import { COLUMN } from "./variants";

const LEVELS = stageIds("ColumnQuestions.stories.tsx");

/** Uppställning: addition, subtraktion and multiplikation in columns - in each phase, Guidat to Fritt. */
const meta = {
  title: "Frågor/Uppställning",
  component: QuestionStory,
  args: { stage: LEVELS[0], seed: 1, phase: "fritt", onSolved: fn() },
  argTypes: { ...questionArgTypes(LEVELS), phase: phaseControl },
} satisfies Meta<typeof QuestionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ValfriNiva: Story = { name: "Valfri nivå" };

export const Addition: Story = { args: { ...firstMatching(LEVELS, COLUMN.addition), match: COLUMN.addition } };
export const Subtraktion: Story = { args: { ...firstMatching(LEVELS, COLUMN.subtraction), match: COLUMN.subtraction } };
export const Multiplikation: Story = { args: { ...firstMatching(LEVELS, COLUMN.multiplication), match: COLUMN.multiplication } };
export const Decimaltal: Story = { args: { ...firstMatching(LEVELS, COLUMN.decimals), match: COLUMN.decimals } };
/** 3,5 + 1,25: the missing hundredth is a faint 0 to think of. */
export const OlikaAntalDecimaler: Story = { name: "Olika antal decimaler", args: { ...firstMatching(LEVELS, COLUMN.differentDecimals), match: COLUMN.differentDecimals } };

/** The phases: told where to start and what comes next, then choosing the order, then on your own. */
export const Guidat: Story = { args: { phase: "guidat" } };
export const EgenOrdning: Story = { name: "Egen ordning", args: { phase: "egenOrdning" } };
export const Fritt: Story = { args: { phase: "fritt" } };
