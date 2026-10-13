import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { stageIds } from "./catalog";
import { firstMatching, QuestionStory, questionArgTypes } from "./QuestionStory";
import { RIGHT_TRIANGLE } from "./variants";

const LEVELS = stageIds("RightTriangle.stories.tsx");

/**
 * Den rätvinkliga triangeln: drag motstående, närliggande and hypotenusa onto
 * the sides seen from v - or the sides' lengths into the fraction for sin,
 * cos or tan.
 */
const meta = {
  title: "Frågor/Rätvinkliga triangeln",
  component: QuestionStory,
  args: { stage: LEVELS[0], seed: 1, onSolved: fn() },
  argTypes: questionArgTypes(LEVELS),
} satisfies Meta<typeof QuestionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

const story = (name: string, match: (typeof RIGHT_TRIANGLE)[keyof typeof RIGHT_TRIANGLE]): Story => ({ name, args: { ...firstMatching(LEVELS, match), match } });

export const ValfriNiva: Story = { name: "Valfri nivå" };

export const NamngeSidorna: Story = story("Namnge sidorna", RIGHT_TRIANGLE.name);
export const ByggSin: Story = story("Bygg sin v", RIGHT_TRIANGLE.sin);
export const ByggCos: Story = story("Bygg cos v", RIGHT_TRIANGLE.cos);
export const ByggTan: Story = story("Bygg tan v", RIGHT_TRIANGLE.tan);
