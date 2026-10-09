import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { stageIds } from "./catalog";
import { firstMatching, QuestionStory, questionArgTypes } from "./QuestionStory";
import { STATISTICS } from "./variants";

const LEVELS = stageIds("Statistics.stories.tsx");

/** Lägesmått: medelvärde, median och typvärde of a list of numbers, written on the board. */
const meta = {
  title: "Frågor/Statistik",
  component: QuestionStory,
  args: { stage: LEVELS[0], seed: 1, onSolved: fn() },
  argTypes: questionArgTypes(LEVELS),
} satisfies Meta<typeof QuestionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ValfriNiva: Story = { name: "Valfri nivå" };
export const Medelvarde: Story = { name: "Medelvärde", args: { ...firstMatching(LEVELS, STATISTICS.mean), match: STATISTICS.mean } };
export const Median: Story = { name: "Median", args: { ...firstMatching(LEVELS, STATISTICS.median), match: STATISTICS.median } };
export const Typvarde: Story = { name: "Typvärde", args: { ...firstMatching(LEVELS, STATISTICS.mode), match: STATISTICS.mode } };
