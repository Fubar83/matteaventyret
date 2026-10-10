/**
 * Positionssystemet (1.1.1): what a digit in a four-digit number is worth - the 6 in 6 435 is 6 000.
 *
 * How it works, and what must stay true: docs/question-types/placeValue.md.
 */
import { digitAt } from "../digits";
import { randInt, type Rng } from "../rng";
import { questionType, retry } from "./questionType";

export type PlaceValueStageId = "1.1.1";

export interface PlaceValueProblem {
  stageId: PlaceValueStageId;
  kind: "placeValue";
  number: number;
  /** The column asked about: 0 the ones, 3 the thousands. */
  columnAsked: number;
  answer: number;
}

/** Never about a 0: "what is the 0 worth in 4 039?" has nothing to show in the blocks and nothing to count. */
const placeValue = (rng: Rng) =>
  retry("1.1.1", (): PlaceValueProblem | null => {
    const number = randInt(rng, 1000, 9999);
    const columnAsked = randInt(rng, 0, 3);
    const digit = digitAt(number, columnAsked);
    return digit === 0 ? null : { stageId: "1.1.1", kind: "placeValue", number, columnAsked, answer: digit * 10 ** columnAsked };
  });

export const PLACE_VALUE_QUESTIONS = questionType({
  id: "placeValue",
  kinds: ["placeValue"],
  levels: { "1.1.1": placeValue },
  key: (p) => `pv:${p.number}:${p.columnAsked}`,
});
