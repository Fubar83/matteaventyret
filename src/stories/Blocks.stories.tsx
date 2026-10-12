import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { stageIds } from "./catalog";
import { firstMatching, QuestionStory, questionArgTypes } from "./QuestionStory";
import { BLOCKS } from "./variants";

const LEVELS = stageIds("Blocks.stories.tsx");

/**
 * Bygg talet: base-ten blocks - build a number, change a ten into ten ones to
 * take away, build a decimal from wholes, tenths and hundredths.
 */
const meta = {
  title: "Frågor/Bygg talet",
  component: QuestionStory,
  args: { stage: LEVELS[0], seed: 1, onSolved: fn() },
  argTypes: questionArgTypes(LEVELS),
} satisfies Meta<typeof QuestionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

const story = (name: string, match: (typeof BLOCKS)[keyof typeof BLOCKS]): Story => ({ name, args: { ...firstMatching(LEVELS, match), match } });

export const ValfriNiva: Story = { name: "Valfri nivå" };

export const TillTjugo: Story = story("Till 20", BLOCKS.toTwenty);
export const Tresiffriga: Story = story("Tresiffriga tal", BLOCKS.threeDigits);
export const Vaxla: Story = story("Växla och ta bort", BLOCKS.exchange);
export const Decimaltal: Story = story("Decimaltal", BLOCKS.decimals);
