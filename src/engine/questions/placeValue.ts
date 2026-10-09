/** Positionssystemet (1.1.1): what a digit in a four-digit number is worth - the 6 in 6 435 is 6 000. */
import { digitAt } from "../digits";
import { randInt, type Rng } from "../rng";
import { questionType } from "./questionType";

export type PlaceValueStageId = "1.1.1";

export interface PlaceValueProblem {
  stageId: PlaceValueStageId;
  kind: "placeValue";
  number: number;
  /** The column asked about: 0 the ones, 3 the thousands. */
  columnAsked: number;
  answer: number;
}

function placeValue(rng: Rng): PlaceValueProblem {
  const number = randInt(rng, 1000, 9999);
  const columnAsked = randInt(rng, 0, 3);
  return { stageId: "1.1.1", kind: "placeValue", number, columnAsked, answer: digitAt(number, columnAsked) * 10 ** columnAsked };
}

export const PLACE_VALUE_QUESTIONS = questionType({
  id: "placeValue",
  kinds: ["placeValue"],
  levels: { "1.1.1": placeValue },
  key: (p) => `pv:${p.number}:${p.columnAsked}`,
});
