import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { stageIds } from "./catalog";
import { firstMatching, QuestionStory, questionArgTypes } from "./QuestionStory";
import { PYRAMID } from "./variants";

const LEVELS = stageIds("Pyramid.stories.tsx");

/**
 * Talpyramider: every brick the sum of the two under it - write the missing ones,
 * adding up or subtracting down; the algebra pyramid's x.
 */
const meta = {
  title: "Frågor/Talpyramider",
  component: QuestionStory,
  args: { stage: LEVELS[0], seed: 1, onSolved: fn() },
  argTypes: questionArgTypes(LEVELS),
} satisfies Meta<typeof QuestionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

const story = (name: string, match: (typeof PYRAMID)[keyof typeof PYRAMID]): Story => ({ name, args: { ...firstMatching(LEVELS, match), match } });

export const ValfriNiva: Story = { name: "Valfri nivå" };

export const Liten: Story = story("Till 20", PYRAMID.small);
export const Bred: Story = story("Fyra i botten", PYRAMID.wide);
export const Subtrahera: Story = story("Subtrahera nedåt", PYRAMID.subtract);
export const Algebra: Story = story("Algebrapyramid", PYRAMID.algebra);
