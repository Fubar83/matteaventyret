import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { stageIds } from "./catalog";
import { firstMatching, QuestionStory, questionArgTypes } from "./QuestionStory";
import { UNIT_CIRCLE } from "./variants";

const LEVELS = stageIds("UnitCircle.stories.tsx");

/**
 * Enhetscirkeln: drag the point round the circle - cos v along the x-axis, sin v
 * up the y-axis, the exact values marked - to an angle, to an exact value, in
 * radians.
 */
const meta = {
  title: "Frågor/Enhetscirkeln",
  component: QuestionStory,
  args: { stage: LEVELS[0], seed: 1, onSolved: fn() },
  argTypes: questionArgTypes(LEVELS),
} satisfies Meta<typeof QuestionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

const story = (name: string, match: (typeof UNIT_CIRCLE)[keyof typeof UNIT_CIRCLE]): Story => ({ name, args: { ...firstMatching(LEVELS, match), match } });

export const ValfriNiva: Story = { name: "Valfri nivå" };

export const Vinkel: Story = story("En vinkel", UNIT_CIRCLE.angle);
export const Tecken: Story = story("Tecknen", UNIT_CIRCLE.signs);
export const ExaktVarde: Story = story("Ett exakt värde", UNIT_CIRCLE.value);
export const SammaVarde: Story = story("Samma sinus eller cosinus", UNIT_CIRCLE.same);
export const Radianer: Story = story("Radianer", UNIT_CIRCLE.radians);
