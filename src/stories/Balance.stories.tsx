import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { stageIds } from "./catalog";
import { firstMatching, QuestionStory, questionArgTypes } from "./QuestionStory";
import { BALANCE } from "./variants";

const LEVELS = stageIds("Balance.stories.tsx");

/**
 * Ekvationsvågen: an equation as a balance - take the same off both pans, share
 * both equally, until x stands alone; each step written as an equation.
 */
const meta = {
  title: "Frågor/Ekvationsvågen",
  component: QuestionStory,
  args: { stage: LEVELS[0], seed: 1, onSolved: fn() },
  argTypes: questionArgTypes(LEVELS),
} satisfies Meta<typeof QuestionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

const story = (name: string, match: (typeof BALANCE)[keyof typeof BALANCE]): Story => ({ name, args: { ...firstMatching(LEVELS, match), match } });

export const ValfriNiva: Story = { name: "Valfri nivå" };

export const XPlusB: Story = story("x + b = c", BALANCE.plain);
export const Dela: Story = story("ax + b = c", BALANCE.share);
export const XPaBadaSidor: Story = story("x på båda sidor", BALANCE.both);
