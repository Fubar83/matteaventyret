import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { stageIds } from "./catalog";
import { firstMatching, QuestionStory, questionArgTypes } from "./QuestionStory";
import { SHARE_OUT } from "./variants";

const LEVELS = stageIds("ShareOut.stories.tsx");

/**
 * Dela lika: deal things from the bowl onto the animals' plates until it's fair -
 * all of it, or with some left over.
 */
const meta = {
  title: "Frågor/Dela lika",
  component: QuestionStory,
  args: { stage: LEVELS[0], seed: 1, onSolved: fn() },
  argTypes: questionArgTypes(LEVELS),
} satisfies Meta<typeof QuestionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

const story = (name: string, match: (typeof SHARE_OUT)[keyof typeof SHARE_OUT]): Story => ({ name, args: { ...firstMatching(LEVELS, match), match } });

export const ValfriNiva: Story = { name: "Valfri nivå" };

export const Jamnt: Story = story("Utan rest", SHARE_OUT.exact);
export const MedRest: Story = story("Med rest", SHARE_OUT.rest);
