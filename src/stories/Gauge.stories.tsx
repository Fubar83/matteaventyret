import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { stageIds } from "./catalog";
import { firstMatching, QuestionStory, questionArgTypes } from "./QuestionStory";
import { GAUGE } from "./variants";

const LEVELS = stageIds("Gauge.stories.tsx");

/**
 * Ställ in: drag the water in a measuring jug, or a thermometer's red line,
 * to what's asked - read off the scale, as the number isn't shown.
 */
const meta = {
  title: "Frågor/Ställ in",
  component: QuestionStory,
  args: { stage: LEVELS[0], seed: 1, onSolved: fn() },
  argTypes: questionArgTypes(LEVELS),
} satisfies Meta<typeof QuestionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

const story = (name: string, match: (typeof GAUGE)[keyof typeof GAUGE]): Story => ({ name, args: { ...firstMatching(LEVELS, match), match } });

export const ValfriNiva: Story = { name: "Valfri nivå" };

export const KannaDl: Story = story("Kannan: deciliter", GAUGE.jugDl);
export const KannaTill: Story = story("Kannan: häll i mer", GAUGE.jugMore);
export const KannaLiter: Story = story("Kannan i liter", GAUGE.jugLitres);
export const Recept: Story = story("Receptet", GAUGE.recipe);
export const Termometer: Story = story("Termometern", GAUGE.thermometer);
export const Kallare: Story = story("Kallare", GAUGE.colder);
export const Varmare: Story = story("Varmare", GAUGE.warmer);
