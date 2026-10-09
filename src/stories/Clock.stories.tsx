import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { stageIds } from "./catalog";
import { firstMatching, QuestionStory, questionArgTypes, type QuestionStoryProps } from "./QuestionStory";
import { CLOCK, type ClockTask } from "./variants";

const LEVELS = stageIds("Clock.stories.tsx");

type Args = QuestionStoryProps & { task: ClockTask | "any" };

/** Klockan: read the hands ("halv 2", "fem i halv 6"), set them, or set a digital clock - each level its own times and faces. */
const meta = {
  title: "Frågor/Klockan",
  component: QuestionStory,
  render: ({ task, ...props }) => <QuestionStory {...props} match={task === "any" ? undefined : CLOCK[task]} />,
  args: { stage: LEVELS[0], seed: 1, task: "any", onSolved: fn() },
  argTypes: {
    ...questionArgTypes(LEVELS),
    task: {
      name: "Uppgift",
      control: {
        type: "select",
        labels: { any: "Vilken som helst", read: "Läs klockan", setHandsFromWords: "Ställ visarna (i ord)", setHandsFromDigital: "Ställ visarna (från digital)", setDigital: "Ställ den digitala klockan" },
      },
      options: ["any", ...Object.keys(CLOCK)],
    },
  },
} satisfies Meta<Args>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ValfriNiva: Story = { name: "Valfri nivå" };
export const LasKlockan: Story = { name: "Läs klockan", args: { task: "read", ...firstMatching(LEVELS, CLOCK.read) } };
export const StallVisarnaFranOrd: Story = { name: "Ställ visarna (i ord)", args: { task: "setHandsFromWords", ...firstMatching(LEVELS, CLOCK.setHandsFromWords) } };
export const StallVisarnaFranDigital: Story = { name: "Ställ visarna (från digital)", args: { task: "setHandsFromDigital", ...firstMatching(LEVELS, CLOCK.setHandsFromDigital) } };
export const StallDigitalaKlockan: Story = { name: "Ställ den digitala klockan", args: { task: "setDigital", ...firstMatching(LEVELS, CLOCK.setDigital) } };
