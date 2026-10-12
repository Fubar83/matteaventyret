import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { stageIds } from "./catalog";
import { firstMatching, QuestionStory, questionArgTypes } from "./QuestionStory";
import { MATCH } from "./variants";

const LEVELS = stageIds("Match.stories.tsx");

/**
 * Para ihop: cards face up, tap two that belong together - a picture and its number,
 * number friends, a clock and its time, a fraction and its percent, an
 * expression and its simplified form, a line and its formula.
 */
const meta = {
  title: "Frågor/Para ihop",
  component: QuestionStory,
  args: { stage: LEVELS[0], seed: 1, onSolved: fn() },
  argTypes: questionArgTypes(LEVELS),
} satisfies Meta<typeof QuestionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

const story = (name: string, match: (typeof MATCH)[keyof typeof MATCH]): Story => ({ name, args: { ...firstMatching(LEVELS, match), match } });

export const ValfriNiva: Story = { name: "Valfri nivå" };

export const AntalOchSiffra: Story = story("Antal och siffra", MATCH.count);
export const Talkamrater: Story = story("Talkamrater", MATCH.friends);
export const Klockor: Story = story("Klockor", MATCH.clocks);
export const BrakDecimalProcent: Story = story("Bråk, decimaltal och procent", MATCH.forms);
export const Enheter: Story = story("Lika mycket i olika enheter", MATCH.units);
export const Uttryck: Story = story("Uttryck", MATCH.expressions);
export const GrafOchFormel: Story = story("Graf och formel", MATCH.graphs);
