import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { stageIds } from "./catalog";
import { firstMatching, QuestionStory, questionArgTypes } from "./QuestionStory";
import { SORT } from "./variants";

const LEVELS = stageIds("Sort.stories.tsx");

/**
 * Sortera: tap a thing, then where it goes - into groups (udda and jämna,
 * primtal, a half or more) or in order (smallest first). Rätta keeps what's
 * right and sends the rest back.
 */
const meta = {
  title: "Frågor/Sortera",
  component: QuestionStory,
  args: { stage: LEVELS[0], seed: 1, onSolved: fn() },
  argTypes: questionArgTypes(LEVELS),
} satisfies Meta<typeof QuestionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

const story = (name: string, match: (typeof SORT)[keyof typeof SORT]): Story => ({ name, args: { ...firstMatching(LEVELS, match), match } });

export const ValfriNiva: Story = { name: "Valfri nivå" };

export const SorteraFormer: Story = story("Sortera former", SORT.shapes);
export const UddaJamna: Story = story("Udda och jämna", SORT.oddEven);
export const FigurerKroppar: Story = story("Figurer och kroppar", SORT.planeOrSolid);
export const Primtal: Story = story("Primtal", SORT.primes);
export const BrakKringEnHalv: Story = story("Bråk kring en halv", SORT.aroundAHalf);
export const Rationella: Story = story("Rationella och irrationella tal", SORT.rational);
export const StammerAlltid: Story = story("Stämmer alltid?", SORT.always);
export const FarstTillFlest: Story = story("Färst till flest", SORT.fewestToMost);
export const StorleksordnaTal: Story = story("Storleksordna tal", SORT.numbers);
export const BrakDecimalProcent: Story = story("Bråk, decimaltal och procent", SORT.mixedForms);
export const NegativaTal: Story = story("Negativa tal", SORT.negatives);
export const OlikaEnheter: Story = story("Längder i olika enheter", SORT.units);
export const Grundpotensform: Story = story("Grundpotensform", SORT.standardForm);
export const Venndiagram: Story = story("Venndiagram", SORT.venn);
export const Fyrhorningar: Story = story("Fyrhörningar", SORT.quadrilaterals);
export const OmojligtTillSakert: Story = story("Från omöjligt till säkert", SORT.impossibleToCertain);
export const OrdnaProgrammet: Story = story("Ordna programmet", SORT.program);
export const OrdnaLosningen: Story = story("Ordna lösningen", SORT.solution);
