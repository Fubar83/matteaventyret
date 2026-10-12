import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { stageIds } from "./catalog";
import { firstMatching, QuestionStory, questionArgTypes } from "./QuestionStory";
import { GRID } from "./variants";

const LEVELS = stageIds("Grid.stories.tsx");

/**
 * Rutnätet: colour squares (finish a symmetric figure, colour a fraction or a
 * percent, draw a rectangle) or mark points (coordinates, a missing corner,
 * a triangle reflected or moved).
 */
const meta = {
  title: "Frågor/Rutnätet",
  component: QuestionStory,
  args: { stage: LEVELS[0], seed: 1, onSolved: fn() },
  argTypes: questionArgTypes(LEVELS),
} satisfies Meta<typeof QuestionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

const story = (name: string, match: (typeof GRID)[keyof typeof GRID]): Story => ({ name, args: { ...firstMatching(LEVELS, match), match } });

export const ValfriNiva: Story = { name: "Valfri nivå" };

export const SymmetriRitaKlart: Story = story("Symmetri: rita klart", GRID.symmetry);
export const FarglaggBrak: Story = story("Färglägg ett bråk", GRID.fraction);
export const FarglaggProcent: Story = story("Färglägg procent", GRID.percent);
export const RektangelAreaOmkrets: Story = story("Rektangel: area och omkrets", GRID.rectangleBoth);
export const RektangelArea: Story = story("Rektangel: area", GRID.rectangleArea);
export const PrickaIn: Story = story("Pricka in en punkt", GRID.point);
export const FjardeHornet: Story = story("Det fjärde hörnet", GRID.corner);
export const Spegling: Story = story("Spegling", GRID.reflect);
export const Forflyttning: Story = story("Förflyttning", GRID.translate);
export const VridningKvarts: Story = story("Vridning: kvarts varv", GRID.rotateQuarter);
export const VridningHalv: Story = story("Vridning: halvt varv", GRID.rotateHalf);
export const Forstora: Story = story("Förstora en figur", GRID.enlarge);
export const RitaLinjen: Story = story("Rita linjen", GRID.drawLine);
