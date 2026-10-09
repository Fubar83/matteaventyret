import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { stageIds } from "./catalog";
import { firstMatching, QuestionStory, questionArgTypes } from "./QuestionStory";
import { CHARTS } from "./variants";

const LEVELS = stageIds("Charts.stories.tsx");

/** Diagram: read a bar, the difference between two, or the sum of all. */
const meta = {
  title: "Frågor/Diagram",
  component: QuestionStory,
  args: { stage: LEVELS[0], seed: 1, onSolved: fn() },
  argTypes: questionArgTypes(LEVELS),
} satisfies Meta<typeof QuestionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ValfriNiva: Story = { name: "Valfri nivå" };
export const AvlasEnStapel: Story = { name: "Avläs en stapel", args: { ...firstMatching(LEVELS, CHARTS.lookup), match: CHARTS.lookup } };
export const Skillnad: Story = { name: "Skillnad", args: { ...firstMatching(LEVELS, CHARTS.difference), match: CHARTS.difference } };
export const Summa: Story = { name: "Summa", args: { ...firstMatching(LEVELS, CHARTS.sum), match: CHARTS.sum } };
