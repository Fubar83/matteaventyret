import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { stageIds } from "./catalog";
import { firstMatching, QuestionStory, questionArgTypes } from "./QuestionStory";
import { GRAPH_SHAPE } from "./variants";

const LEVELS = stageIds("GraphShape.stories.tsx");

/**
 * Forma grafen: drag a curve's handles (or step its numbers) until it's the function
 * asked for - a line, a parabola in vertex form, an exponential.
 */
const meta = {
  title: "Frågor/Forma grafen",
  component: QuestionStory,
  args: { stage: LEVELS[0], seed: 1, onSolved: fn() },
  argTypes: questionArgTypes(LEVELS),
} satisfies Meta<typeof QuestionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

const story = (name: string, match: (typeof GRAPH_SHAPE)[keyof typeof GRAPH_SHAPE]): Story => ({ name, args: { ...firstMatching(LEVELS, match), match } });

export const ValfriNiva: Story = { name: "Valfri nivå" };

export const LinjeFormel: Story = story("Linjen: från formeln", GRAPH_SHAPE.lineFormula);
export const LinjeGraf: Story = story("Linjen: från grafen", GRAPH_SHAPE.lineGraph);
export const Parabel: Story = story("Parabeln", GRAPH_SHAPE.parabola);
export const Exponential: Story = story("Exponentialfunktionen", GRAPH_SHAPE.exponential);
