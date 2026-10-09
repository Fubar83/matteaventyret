import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { stageIds } from "./catalog";
import { firstMatching, QuestionStory, questionArgTypes, type QuestionStoryProps } from "./QuestionStory";
import { SHOP, type ShopMode } from "./variants";

const LEVELS = stageIds("Shop.stories.tsx");

type Args = QuestionStoryProps & { mode: ShopMode | "any" };

/** Affären: pay exactly from your wallet, give change from the till, or pick a shopping list and pay. */
const meta = {
  title: "Frågor/Affären",
  component: QuestionStory,
  render: ({ mode, ...props }) => <QuestionStory {...props} match={mode === "any" ? undefined : SHOP[mode]} />,
  args: { stage: LEVELS[0], seed: 1, mode: "any", onSolved: fn() },
  argTypes: {
    ...questionArgTypes(LEVELS),
    mode: {
      name: "Uppgift",
      control: { type: "select", labels: { any: "Vilken som helst", pay: "Betala jämnt", change: "Ge växel", basket: "Handla efter lista" } },
      options: ["any", ...Object.keys(SHOP)],
    },
  },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ValfriNiva: Story = { name: "Valfri nivå" };
export const BetalaJamnt: Story = { name: "Betala jämnt", args: { mode: "pay", ...firstMatching(LEVELS, SHOP.pay) } };
export const GeVaxel: Story = { name: "Ge växel", args: { mode: "change", ...firstMatching(LEVELS, SHOP.change) } };
export const HandlaEfterLista: Story = { name: "Handla efter lista", args: { mode: "basket", ...firstMatching(LEVELS, SHOP.basket) } };
