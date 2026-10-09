import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { MODE_KEY } from "../game/questions/written/QuickAnswer";
import { stageIds } from "./catalog";
import { firstMatching, QuestionStory, questionArgTypes, type QuestionStoryProps } from "./QuestionStory";
import { WRITTEN } from "./variants";

const LEVELS = stageIds("WrittenQuestions.stories.tsx");

type Args = QuestionStoryProps & { quickMode: "choose" | "write" };

/**
 * Skrivna frågor: from åk 1's word problems to gymnasiet, written on the free
 * board and checked line by line - or, for facts like the times tables, just
 * the answer, picked or written.
 */
const meta = {
  title: "Frågor/Skrivna frågor",
  component: QuestionStory,
  render: ({ quickMode, ...props }) => {
    // The times tables remember how the player likes to answer - set it the way the setting says.
    try {
      localStorage.setItem(MODE_KEY, quickMode);
    } catch {
      // No storage: it starts as choose.
    }
    return <QuestionStory key={quickMode} {...props} />;
  },
  args: { stage: LEVELS[0], seed: 1, quickMode: "choose", onSolved: fn() },
  argTypes: {
    ...questionArgTypes(LEVELS),
    quickMode: { name: "Bara svaret (gångertabell)", control: { type: "inline-radio", labels: { choose: "Välj svaret", write: "Skriv svaret" } }, options: ["choose", "write"] },
  },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ValfriNiva: Story = { name: "Valfri nivå" };

export const GangertabellValj: Story = { name: "Gångertabell: välj svaret", args: { quickMode: "choose", ...firstMatching(LEVELS, WRITTEN.answerOnly), match: WRITTEN.answerOnly } };
export const GangertabellSkriv: Story = { name: "Gångertabell: skriv svaret", args: { quickMode: "write", ...firstMatching(LEVELS, WRITTEN.answerOnly), match: WRITTEN.answerOnly } };

/** The younger levels' pictures of the question. */
export const BildVag: Story = { name: "Bild: våg", args: { ...firstMatching(LEVELS, WRITTEN.balance), match: WRITTEN.balance } };
export const BildGrupper: Story = { name: "Bild: grupper", args: { ...firstMatching(LEVELS, WRITTEN.groups), match: WRITTEN.groups } };
export const BildDelaLika: Story = { name: "Bild: dela lika", args: { ...firstMatching(LEVELS, WRITTEN.share), match: WRITTEN.share } };
export const BildAvrundning: Story = { name: "Bild: avrundning", args: { ...firstMatching(LEVELS, WRITTEN.rounding), match: WRITTEN.rounding } };
export const BildEnheter: Story = { name: "Bild: enhetstrappan", args: { ...firstMatching(LEVELS, WRITTEN.units), match: WRITTEN.units } };

export const GeometriMedFigur: Story = { name: "Geometri med figur", args: { ...firstMatching(LEVELS, WRITTEN.figure), match: WRITTEN.figure } };
export const SvarMedEnhet: Story = { name: "Svar med enhet", args: { ...firstMatching(LEVELS, WRITTEN.unit), match: WRITTEN.unit } };
