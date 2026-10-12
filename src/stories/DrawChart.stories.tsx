import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { stageIds } from "./catalog";
import { firstMatching, QuestionStory, questionArgTypes } from "./QuestionStory";
import { DRAW_CHART } from "./variants";

const LEVELS = stageIds("DrawChart.stories.tsx");

/**
 * Rita diagrammet: drag bars - or a line's points - to the numbers in a
 * tally or a table, reading the scale, as the chart doesn't write them.
 */
const meta = {
  title: "Frågor/Rita diagrammet",
  component: QuestionStory,
  args: { stage: LEVELS[0], seed: 1, onSolved: fn() },
  argTypes: questionArgTypes(LEVELS),
} satisfies Meta<typeof QuestionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

const story = (name: string, match: (typeof DRAW_CHART)[keyof typeof DRAW_CHART]): Story => ({ name, args: { ...firstMatching(LEVELS, match), match } });

export const ValfriNiva: Story = { name: "Valfri nivå" };

export const Streck: Story = story("Från streck", DRAW_CHART.tally);
export const Tabell: Story = story("Från en tabell", DRAW_CHART.table);
export const Linje: Story = story("Linjediagram", DRAW_CHART.line);
export const LinjeMinus: Story = story("Linjediagram under 0", DRAW_CHART.lineMinus);
