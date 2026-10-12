import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { stageIds } from "./catalog";
import { firstMatching, QuestionStory, questionArgTypes } from "./QuestionStory";
import { CONSTRUCT } from "./variants";

const LEVELS = stageIds("Construct.stories.tsx");

/**
 * Konstruera: drawing with ruler, protractor and compasses by tapping - a line of
 * a given length, an angle, a triangle from three sides.
 */
const meta = {
  title: "Frågor/Konstruera",
  component: QuestionStory,
  args: { stage: LEVELS[0], seed: 1, onSolved: fn() },
  argTypes: questionArgTypes(LEVELS),
} satisfies Meta<typeof QuestionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

const story = (name: string, match: (typeof CONSTRUCT)[keyof typeof CONSTRUCT]): Story => ({ name, args: { ...firstMatching(LEVELS, match), match } });

export const ValfriNiva: Story = { name: "Valfri nivå" };

export const Stracka: Story = story("Sträcka från 0", CONSTRUCT.lineFromZero);
export const StrackaInneILinjalen: Story = story("Sträcka inne i linjalen", CONSTRUCT.lineFromInside);
export const VinkelHoger: Story = story("Vinkel, första benet åt höger", CONSTRUCT.angleRight);
export const VinkelVanster: Story = story("Vinkel, första benet åt vänster", CONSTRUCT.angleLeft);
export const Triangel: Story = story("Triangel", CONSTRUCT.triangle);
