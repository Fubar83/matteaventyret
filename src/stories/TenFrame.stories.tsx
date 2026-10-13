import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { stageIds } from "./catalog";
import { firstMatching, QuestionStory, questionArgTypes } from "./QuestionStory";
import { TEN_FRAME } from "./variants";

const LEVELS = stageIds("TenFrame.stories.tsx");

/**
 * Tiorutan: tap counters into the ten frame - to show a number, to fill up to ten, and
 * over ten in two frames.
 */
const meta = {
  title: "Frågor/Tiorutan",
  component: QuestionStory,
  args: { stage: LEVELS[0], seed: 1, onSolved: fn() },
  argTypes: questionArgTypes(LEVELS),
} satisfies Meta<typeof QuestionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

const story = (name: string, match: (typeof TEN_FRAME)[keyof typeof TEN_FRAME]): Story => ({ name, args: { ...firstMatching(LEVELS, match), match } });

export const ValfriNiva: Story = { name: "Valfri nivå" };

export const Visa: Story = story("Visa talet", TEN_FRAME.show);
export const TillTio: Story = story("Till tio", TEN_FRAME.toTen);
export const OverTio: Story = story("Över tiotalet", TEN_FRAME.overTen);
