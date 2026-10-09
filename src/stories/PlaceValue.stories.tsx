import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { stageIds } from "./catalog";
import { QuestionStory, questionArgTypes } from "./QuestionStory";

const LEVELS = stageIds("PlaceValue.stories.tsx");

/** Positionssystemet: which digit sits in the asked column. */
const meta = {
  title: "Frågor/Positionssystemet",
  component: QuestionStory,
  args: { stage: LEVELS[0], seed: 1, onSolved: fn() },
  argTypes: questionArgTypes(LEVELS),
} satisfies Meta<typeof QuestionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ValfriNiva: Story = { name: "Valfri nivå" };
