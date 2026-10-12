import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { stageIds } from "./catalog";
import { firstMatching, QuestionStory, questionArgTypes } from "./QuestionStory";
import { PROGRAM } from "./variants";

const LEVELS = stageIds("Program.stories.tsx");

/**
 * Programmera roboten: put arrow cards (and loops) together by dragging or
 * tapping, press Kör and watch the robot walk it - to the star, round rocks,
 * past every gem.
 */
const meta = {
  title: "Frågor/Programmera roboten",
  component: QuestionStory,
  args: { stage: LEVELS[0], seed: 1, onSolved: fn() },
  argTypes: questionArgTypes(LEVELS),
} satisfies Meta<typeof QuestionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

const story = (name: string, match: (typeof PROGRAM)[keyof typeof PROGRAM]): Story => ({ name, args: { ...firstMatching(LEVELS, match), match } });

export const ValfriNiva: Story = { name: "Valfri nivå" };

export const TillStjarnan: Story = story("Till stjärnan", PROGRAM.toTheStar);
export const MedLoopar: Story = story("Med loopar", PROGRAM.loops);
export const Diamanter: Story = story("Samla diamanterna", PROGRAM.gems);
