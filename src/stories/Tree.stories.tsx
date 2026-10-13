import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { stageIds } from "./catalog";
import { firstMatching, QuestionStory, questionArgTypes } from "./QuestionStory";
import { TREE } from "./variants";

const LEVELS = stageIds("Tree.stories.tsx");

/**
 * Träddiagram: each branch's probability dragged onto it, then multiply along the
 * path - with the marble put back, or kept.
 */
const meta = {
  title: "Frågor/Träddiagram",
  component: QuestionStory,
  args: { stage: LEVELS[0], seed: 1, onSolved: fn() },
  argTypes: questionArgTypes(LEVELS),
} satisfies Meta<typeof QuestionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

const story = (name: string, match: (typeof TREE)[keyof typeof TREE]): Story => ({ name, args: { ...firstMatching(LEVELS, match), match } });

export const ValfriNiva: Story = { name: "Valfri nivå" };

export const Tillbaka: Story = story("Med återläggning", TREE.back);
export const Kvar: Story = story("Utan återläggning", TREE.kept);
export const EnAvVarje: Story = story("En av varje", TREE.mixed);
