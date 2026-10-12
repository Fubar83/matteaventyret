import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { stageIds } from "./catalog";
import { firstMatching, QuestionStory, questionArgTypes } from "./QuestionStory";
import { EXPERIMENT } from "./variants";

const LEVELS = stageIds("Experiment.stories.tsx");

/**
 * Experimentet: guess, then spin or throw ten at a time and watch the results
 * pile up - a spinner, a die's sixes, the sum of two dice.
 */
const meta = {
  title: "Frågor/Experimentet",
  component: QuestionStory,
  args: { stage: LEVELS[0], seed: 1, onSolved: fn() },
  argTypes: questionArgTypes(LEVELS),
} satisfies Meta<typeof QuestionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

const story = (name: string, match: (typeof EXPERIMENT)[keyof typeof EXPERIMENT]): Story => ({ name, args: { ...firstMatching(LEVELS, match), match } });

export const ValfriNiva: Story = { name: "Valfri nivå" };

export const Snurra: Story = story("Snurran", EXPERIMENT.spinner);
export const Tarning: Story = story("Tärningen", EXPERIMENT.die);
export const TvaTarningar: Story = story("Två tärningar", EXPERIMENT.twoDice);
