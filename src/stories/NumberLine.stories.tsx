import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { stageIds } from "./catalog";
import { firstMatching, QuestionStory, questionArgTypes } from "./QuestionStory";
import { NUMBER_LINE } from "./variants";

const LEVELS = stageIds("NumberLine.stories.tsx");

/**
 * Tallinjen: tap where a number goes - whole numbers, numbers between the
 * tens, fractions, decimals, negative numbers, and irrational ones to estimate.
 */
const meta = {
  title: "Frågor/Tallinjen",
  component: QuestionStory,
  args: { stage: LEVELS[0], seed: 1, onSolved: fn() },
  argTypes: questionArgTypes(LEVELS),
} satisfies Meta<typeof QuestionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

const story = (name: string, match: (typeof NUMBER_LINE)[keyof typeof NUMBER_LINE]): Story => ({ name, args: { ...firstMatching(LEVELS, match), match } });

export const ValfriNiva: Story = { name: "Valfri nivå" };

export const TillTio: Story = story("Till tio", NUMBER_LINE.toTen);
export const TillHundra: Story = story("Till 100", NUMBER_LINE.toHundred);
export const TillTusen: Story = story("Till 1000", NUMBER_LINE.toThousand);
export const Brak: Story = story("Bråk", NUMBER_LINE.fraction);
export const BrakForbiEtt: Story = story("Bråk förbi 1", NUMBER_LINE.fractionPastOne);
export const Tiondelar: Story = story("Tiondelar", NUMBER_LINE.tenths);
export const Hundradelar: Story = story("Hundradelar", NUMBER_LINE.hundredths);
export const NegativaTal: Story = story("Negativa tal", NUMBER_LINE.negative);
export const Uppskatta: Story = story("Uppskatta", NUMBER_LINE.estimate);
export const InzoomadDecimal: Story = story("Inzoomad: hundradelar", NUMBER_LINE.zoomedDecimal);
export const InzoomadHeltal: Story = story("Inzoomad: ental", NUMBER_LINE.zoomedWhole);
export const DubbelTallinje: Story = story("Dubbel tallinje", NUMBER_LINE.double);
export const Tidslinje: Story = story("Tidslinjen: klockslag", NUMBER_LINE.time);
export const TidslinjeSlutar: Story = story("Tidslinjen: när slutar den?", NUMBER_LINE.ends);
