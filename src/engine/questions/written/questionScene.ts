/**
 * A picture of what a question is about, for the younger levels
 * (game/scenes/QuestionScene.tsx draws it):
 *
 *   balance - an equation as a balance scale, level because both sides weigh
 *             the same: □ + 7 on one pan, 15 on the other
 *   groups  - a times table as groups: 3 plates with 4 cookies on each
 *   share   - a division as sharing: 12 cookies, 3 animals to share them
 *   rounding - numbers on a number line between their tens (or hundreds): which is nearest?
 *   units   - a conversion on the unit staircase (enhetstrappan): from one unit to another, step by step
 */
export type ScaleTerm = { kind: "unknown"; label: string } | { kind: "weight"; value: number };

/** What's in the groups, and what holds each group. */
export type GroupThing = "cookies" | "eggs" | "apples" | "fish" | "flowers" | "stars";
export const GROUP_THINGS: readonly GroupThing[] = ["cookies", "eggs", "apples", "fish", "flowers", "stars"];

export type QuestionScene =
  | { kind: "balance"; left: ScaleTerm[]; right: ScaleTerm[] }
  | { kind: "groups"; groups: number; each: number; thing: GroupThing }
  | { kind: "share"; total: number; among: number; thing: GroupThing }
  | { kind: "rounding"; numbers: { value: number; step: number }[] }
  | { kind: "units"; family: UnitFamily; from: string; to: string; value: number };

/** The unit staircases: length, mass, volume (liters and cubic units together), area, time. */
export type UnitFamily = "length" | "mass" | "volume" | "area" | "time";
