/**
 * Textuppgifter: everyday stories to turn into a calculation - "Anna har 4
 * äpplen och Sara har 3. Hur många har de tillsammans?" - as the national
 * tests ask them, at three levels:
 *
 *   åk 1-3  1.3.1 addition and subtraction in a story; 1.3.2 multiplication, division, two steps
 *   åk 4-6  2.11.1 one step, bigger numbers and decimals; 2.11.2 several steps: money, time, averages, recipes
 *   åk 7-9  3.8.1 percent, rates and proportion; 3.8.2 an equation from the words
 *
 * Each template is a story with its wording in Swedish and English (merged
 * into the dictionaries as "word.<id>" - see i18n/index.ts), names and things
 * picked at random, numbers drawn so the answer comes out right for the
 * level, and a guided step plan like every other question.
 */
import { st, tex, type AdvancedProblem, type SolutionStep } from "./problem";
import { pick, randInt, type Rng } from "../../rng";

export type WordStageId = "1.3.1" | "1.3.2" | "2.11.1" | "2.11.2" | "3.8.1" | "3.8.2";

const NAMES = ["Anna", "Sara", "Ali", "Elias", "Maja", "Noah", "Wilma", "Liam", "Ella", "Omar", "Saga", "Hugo", "Alice", "Leo", "Ebba", "Lucas", "Nora", "Adam", "Selma", "Isak", "Fatima", "Yusuf", "Alva", "Olle"];

/** Things to count, with their names in both languages ("@noun.apple.many" in a template's values). */
export const NOUNS: Record<string, { sv: [string, string]; en: [string, string] }> = {
  apple: { sv: ["äpple", "äpplen"], en: ["apple", "apples"] },
  marble: { sv: ["kula", "kulor"], en: ["marble", "marbles"] },
  book: { sv: ["bok", "böcker"], en: ["book", "books"] },
  pencil: { sv: ["penna", "pennor"], en: ["pencil", "pencils"] },
  sticker: { sv: ["klistermärke", "klistermärken"], en: ["sticker", "stickers"] },
  card: { sv: ["kort", "kort"], en: ["card", "cards"] },
  sweet: { sv: ["godisbit", "godisbitar"], en: ["sweet", "sweets"] },
  ball: { sv: ["boll", "bollar"], en: ["ball", "balls"] },
  balloon: { sv: ["ballong", "ballonger"], en: ["balloon", "balloons"] },
  shell: { sv: ["snäcka", "snäckor"], en: ["shell", "shells"] },
  cookie: { sv: ["kaka", "kakor"], en: ["cookie", "cookies"] },
  toyCar: { sv: ["leksaksbil", "leksaksbilar"], en: ["toy car", "toy cars"] },
};
const NOUN_IDS = Object.keys(NOUNS);

const say = (n: number) => tex(n).replace("{,}", ",");

/** What a template makes from its random draw: the numbers in its words, the answer, the steps. */
interface Made {
  vars: Record<string, string | number>;
  answer: number;
  steps: SolutionStep[];
  unit?: string;
}

interface Template {
  id: string;
  stage: WordStageId;
  sv: string;
  en: string;
  make: (rng: Rng) => Made;
}

/** Three different names, and a thing (its plural and singular as text keys). */
function cast(rng: Rng) {
  const names: string[] = [];
  while (names.length < 3) {
    const n = pick(rng, NAMES);
    if (!names.includes(n)) names.push(n);
  }
  const noun = pick(rng, NOUN_IDS);
  return { n1: names[0], n2: names[1], n3: names[2], things: `@noun.${noun}.many`, thing: `@noun.${noun}.one` };
}

const add = (a: number, b: number) => st("step.word.add", `${tex(a)} + ${tex(b)} = ${tex(a + b)}`);
const sub = (a: number, b: number, key = "step.word.subtract") => st(key, `${tex(a)} - ${tex(b)} = ${tex(a - b)}`);
const mul = (a: number, b: number, key = "step.word.multiply") => st(key, `${tex(a)} \\cdot ${tex(b)} = ${tex(Math.round(a * b * 1e6) / 1e6)}`);
const div = (a: number, b: number, key = "step.word.divide") => st(key, `${tex(a)} / ${tex(b)} = ${tex(Math.round((a / b) * 1e6) / 1e6)}`);
const r6 = (n: number) => Math.round(n * 1e6) / 1e6;

const T = (id: string, stage: WordStageId, sv: string, en: string, make: (rng: Rng) => Made): Template => ({ id, stage, sv, en, make });

export const TEMPLATES: Template[] = [
  // --- Åk 1-3: addition och subtraktion -------------------------------------------
  T("together", "1.3.1", "{n1} har {a} {things} och {n2} har {b} {things}. Hur många {things} har de tillsammans?", "{n1} has {a} {things} and {n2} has {b} {things}. How many {things} do they have together?", (rng) => {
    const [a, b] = [randInt(rng, 2, 30), randInt(rng, 2, 30)];
    return { vars: { ...cast(rng), a, b }, answer: a + b, steps: [add(a, b)] };
  }),
  T("getMore", "1.3.1", "{n1} har {a} {things} och får {b} till av {n2}. Hur många {things} har {n1} nu?", "{n1} has {a} {things} and gets {b} more from {n2}. How many {things} does {n1} have now?", (rng) => {
    const [a, b] = [randInt(rng, 3, 40), randInt(rng, 2, 20)];
    return { vars: { ...cast(rng), a, b }, answer: a + b, steps: [add(a, b)] };
  }),
  T("giveAway", "1.3.1", "{n1} har {a} {things} och ger bort {b}. Hur många {things} har {n1} kvar?", "{n1} has {a} {things} and gives away {b}. How many {things} does {n1} have left?", (rng) => {
    const a = randInt(rng, 10, 50);
    const b = randInt(rng, 2, a - 2);
    return { vars: { ...cast(rng), a, b }, answer: a - b, steps: [sub(a, b)] };
  }),
  T("onTheTable", "1.3.1", "Det ligger {a} {things} på bordet. {n1} tar {b} av dem. Hur många {things} ligger kvar?", "There are {a} {things} on the table. {n1} takes {b} of them. How many {things} are left?", (rng) => {
    const a = randInt(rng, 8, 40);
    const b = randInt(rng, 2, a - 1);
    return { vars: { ...cast(rng), a, b }, answer: a - b, steps: [sub(a, b)] };
  }),
  T("howManyMoreHas", "1.3.1", "{n1} har {a} {things} och {n2} har {b} {things}. Hur många fler {things} har {n1}?", "{n1} has {a} {things} and {n2} has {b} {things}. How many more {things} does {n1} have?", (rng) => {
    const b = randInt(rng, 2, 30);
    const a = b + randInt(rng, 2, 25);
    return { vars: { ...cast(rng), a, b }, answer: a - b, steps: [sub(a, b, "step.word.difference")] };
  }),
  T("needMore", "1.3.1", "{n1} har {a} {things} men vill ha {b}. Hur många fler {things} behöver {n1}?", "{n1} has {a} {things} but wants {b}. How many more {things} does {n1} need?", (rng) => {
    const a = randInt(rng, 2, 30);
    const b = a + randInt(rng, 2, 25);
    return { vars: { ...cast(rng), a, b }, answer: b - a, steps: [sub(b, a, "step.word.difference")] };
  }),
  T("threeFriends", "1.3.1", "{n1} har {a} {things}, {n2} har {b} och {n3} har {c}. Hur många {things} har de tillsammans?", "{n1} has {a} {things}, {n2} has {b} and {n3} has {c}. How many {things} do they have together?", (rng) => {
    const [a, b, c] = [randInt(rng, 2, 20), randInt(rng, 2, 20), randInt(rng, 2, 20)];
    return { vars: { ...cast(rng), a, b, c }, answer: a + b + c, steps: [add(a, b), add(a + b, c)] };
  }),
  T("bus", "1.3.1", "På bussen sitter {a} personer. Vid hållplatsen kliver {b} av och {c} på. Hur många sitter på bussen nu?", "There are {a} people on the bus. At the stop, {b} get off and {c} get on. How many are on the bus now?", (rng) => {
    const a = randInt(rng, 10, 40);
    const b = randInt(rng, 2, a - 2);
    const c = randInt(rng, 2, 15);
    return { vars: { a, b, c }, answer: a - b + c, steps: [sub(a, b), add(a - b, c)] };
  }),
  T("pagesLeft", "1.3.1", "En bok har {a} sidor. {n1} har läst {b} sidor. Hur många sidor är kvar att läsa?", "A book has {a} pages. {n1} has read {b} pages. How many pages are left to read?", (rng) => {
    const a = randInt(rng, 30, 99);
    const b = randInt(rng, 5, a - 5);
    return { vars: { ...cast(rng), a, b }, answer: a - b, steps: [sub(a, b)] };
  }),
  T("olderBy", "1.3.1", "{n1} är {a} år. {n2} är {b} år äldre än {n1}. Hur gammal är {n2}?", "{n1} is {a} years old. {n2} is {b} years older than {n1}. How old is {n2}?", (rng) => {
    const [a, b] = [randInt(rng, 4, 12), randInt(rng, 2, 30)];
    return { vars: { ...cast(rng), a, b }, answer: a + b, steps: [add(a, b)] };
  }),
  T("youngerBy", "1.3.1", "{n1} är {a} år. {n2} är {b} år yngre än {n1}. Hur gammal är {n2}?", "{n1} is {a} years old. {n2} is {b} years younger than {n1}. How old is {n2}?", (rng) => {
    const a = randInt(rng, 8, 40);
    const b = randInt(rng, 2, a - 2);
    return { vars: { ...cast(rng), a, b }, answer: a - b, steps: [sub(a, b)] };
  }),
  T("iceCream", "1.3.1", "{n1} har {a} kr och köper en glass för {b} kr. Hur många kronor har {n1} kvar?", "{n1} has {a} kr and buys an ice cream for {b} kr. How many kronor does {n1} have left?", (rng) => {
    const a = randInt(rng, 20, 100);
    const b = randInt(rng, 8, Math.min(35, a - 2));
    return { vars: { ...cast(rng), a, b }, answer: a - b, steps: [sub(a, b, "step.word.change")] };
  }),
  T("pocketMoney", "1.3.1", "{n1} har sparat {a} kr och får {b} kr i veckopeng. Hur många kronor har {n1} nu?", "{n1} has saved {a} kr and gets {b} kr in pocket money. How many kronor does {n1} have now?", (rng) => {
    const [a, b] = [randInt(rng, 10, 80), randInt(rng, 10, 30)];
    return { vars: { ...cast(rng), a, b }, answer: a + b, steps: [add(a, b)] };
  }),
  T("classSize", "1.3.1", "I klassen går {a} flickor och {b} pojkar. Hur många elever går i klassen?", "There are {a} girls and {b} boys in the class. How many pupils are in the class?", (rng) => {
    const [a, b] = [randInt(rng, 8, 16), randInt(rng, 8, 16)];
    return { vars: { a, b }, answer: a + b, steps: [add(a, b)] };
  }),
  T("tower", "1.3.1", "{n1} bygger ett torn av {a} klossar. {b} klossar ramlar ner. Hur många klossar står kvar?", "{n1} builds a tower of {a} blocks. {b} blocks fall down. How many blocks are still standing?", (rng) => {
    const a = randInt(rng, 10, 40);
    const b = randInt(rng, 2, a - 3);
    return { vars: { ...cast(rng), a, b }, answer: a - b, steps: [sub(a, b)] };
  }),
  T("birds", "1.3.1", "Det sitter {a} fåglar i ett träd. {b} flyger iväg och sedan kommer {c} nya. Hur många fåglar sitter i trädet nu?", "There are {a} birds in a tree. {b} fly away and then {c} new ones arrive. How many birds are in the tree now?", (rng) => {
    const a = randInt(rng, 8, 30);
    const b = randInt(rng, 2, a - 2);
    const c = randInt(rng, 2, 12);
    return { vars: { a, b, c }, answer: a - b + c, steps: [sub(a, b), add(a - b, c)] };
  }),
  T("collection", "1.3.1", "{n1} samlar på {things} och har {a}. På födelsedagen får {n1} {b} och {c} till. Hur många har {n1} nu?", "{n1} collects {things} and has {a}. On {n1}'s birthday, {n1} gets {b} and {c} more. How many does {n1} have now?", (rng) => {
    const [a, b, c] = [randInt(rng, 5, 40), randInt(rng, 2, 10), randInt(rng, 2, 10)];
    return { vars: { ...cast(rng), a, b, c }, answer: a + b + c, steps: [add(a, b), add(a + b, c)] };
  }),

  T("lost", "1.3.1", "{n1} hade {a} {things}. Nu har {n1} bara {b} kvar. Hur många {things} har {n1} tappat bort?", "{n1} had {a} {things}. Now {n1} has only {b} left. How many {things} has {n1} lost?", (rng) => {
    const a = randInt(rng, 10, 40);
    const b = randInt(rng, 2, a - 2);
    return { vars: { ...cast(rng), a, b }, answer: a - b, steps: [sub(a, b, "step.word.difference")] };
  }),

  // --- Åk 1-3: multiplikation, division, två steg ------------------------------------------------
  T("bags", "1.3.2", "{n1} har {a} påsar med {b} {things} i varje påse. Hur många {things} är det sammanlagt?", "{n1} has {a} bags with {b} {things} in each bag. How many {things} are there altogether?", (rng) => {
    const [a, b] = [randInt(rng, 2, 6), randInt(rng, 2, 10)];
    return { vars: { ...cast(rng), a, b }, answer: a * b, steps: [mul(a, b)] };
  }),
  T("shareEqually", "1.3.2", "{n1} delar {a} {things} lika mellan {b} kompisar. Hur många {things} får varje kompis?", "{n1} shares {a} {things} equally among {b} friends. How many {things} does each friend get?", (rng) => {
    const [b, k] = [randInt(rng, 2, 6), randInt(rng, 2, 10)];
    return { vars: { ...cast(rng), a: b * k, b }, answer: k, steps: [div(b * k, b)] };
  }),
  T("teams", "1.3.2", "{a} barn ska delas in i lag med {b} barn i varje lag. Hur många lag blir det?", "{a} children are put into teams of {b}. How many teams are there?", (rng) => {
    const [b, k] = [randInt(rng, 2, 6), randInt(rng, 2, 8)];
    return { vars: { a: b * k, b }, answer: k, steps: [div(b * k, b)] };
  }),
  T("dogLegs", "1.3.2", "I parken springer {a} hundar. Hur många ben har hundarna tillsammans?", "{a} dogs are running in the park. How many legs do the dogs have together?", (rng) => {
    const a = randInt(rng, 2, 9);
    return { vars: { a }, answer: 4 * a, steps: [mul(a, 4)] };
  }),
  T("bikeWheels", "1.3.2", "Det står {a} cyklar i cykelstället. Hur många hjul är det?", "There are {a} bikes in the bike rack. How many wheels are there?", (rng) => {
    const a = randInt(rng, 3, 15);
    return { vars: { a }, answer: 2 * a, steps: [mul(a, 2)] };
  }),
  T("priceOfSome", "1.3.2", "En {thing} kostar {a} kr. Hur många kronor kostar {b} {things}?", "One {thing} costs {a} kr. How many kronor do {b} {things} cost?", (rng) => {
    const [a, b] = [randInt(rng, 2, 10), randInt(rng, 2, 6)];
    return { vars: { ...cast(rng), a, b }, answer: a * b, steps: [mul(b, a, "step.word.price")] };
  }),
  T("twiceAsMany", "1.3.2", "{n1} har {a} {things}. {n2} har dubbelt så många. Hur många {things} har {n2}?", "{n1} has {a} {things}. {n2} has twice as many. How many {things} does {n2} have?", (rng) => {
    const a = randInt(rng, 3, 25);
    return { vars: { ...cast(rng), a }, answer: 2 * a, steps: [mul(a, 2)] };
  }),
  T("half", "1.3.2", "{n1} har {a} {things} och ger hälften till {n2}. Hur många {things} får {n2}?", "{n1} has {a} {things} and gives half to {n2}. How many {things} does {n2} get?", (rng) => {
    const a = 2 * randInt(rng, 2, 20);
    return { vars: { ...cast(rng), a }, answer: a / 2, steps: [div(a, 2)] };
  }),
  T("rowsInBox", "1.3.2", "I en ask ligger {a} rader med {b} {things} i varje rad. Hur många {things} ligger i asken?", "A box holds {a} rows with {b} {things} in each row. How many {things} are in the box?", (rng) => {
    const [a, b] = [randInt(rng, 2, 6), randInt(rng, 2, 8)];
    return { vars: { ...cast(rng), a, b }, answer: a * b, steps: [mul(a, b)] };
  }),
  T("change", "1.3.2", "{n1} köper {a} {things} för {b} kr styck och betalar med {c} kr. Hur många kronor får {n1} tillbaka?", "{n1} buys {a} {things} at {b} kr each and pays with {c} kr. How many kronor does {n1} get back?", (rng) => {
    const [a, b] = [randInt(rng, 2, 5), randInt(rng, 2, 9)];
    const c = a * b < 20 ? 20 : a * b < 50 ? 50 : 100;
    return { vars: { ...cast(rng), a, b, c }, answer: c - a * b, steps: [mul(a, b, "step.word.price"), sub(c, a * b, "step.word.change")] };
  }),
  T("pagesWeek", "1.3.2", "{n1} läser {a} sidor varje dag. Hur många sidor läser {n1} på en vecka?", "{n1} reads {a} pages every day. How many pages does {n1} read in a week?", (rng) => {
    const a = randInt(rng, 2, 10);
    return { vars: { ...cast(rng), a }, answer: 7 * a, steps: [mul(a, 7)] };
  }),
  T("weeksToDays", "1.3.2", "{n1} ska vara på läger i {a} veckor. Hur många dagar är det?", "{n1} is going to camp for {a} weeks. How many days is that?", (rng) => {
    const a = randInt(rng, 2, 6);
    return { vars: { ...cast(rng), a }, answer: 7 * a, steps: [mul(a, 7)] };
  }),
  T("socks", "1.3.2", "{n1} har {a} par strumpor. Hur många strumpor är det?", "{n1} has {a} pairs of socks. How many socks is that?", (rng) => {
    const a = randInt(rng, 3, 12);
    return { vars: { ...cast(rng), a }, answer: 2 * a, steps: [mul(a, 2)] };
  }),
  T("eggCartons", "1.3.2", "{a} ägg ska läggas i kartonger med {b} ägg i varje. Hur många kartonger behövs?", "{a} eggs are packed in cartons of {b}. How many cartons are needed?", (rng) => {
    const b = pick(rng, [6, 10, 12]);
    const k = randInt(rng, 2, 6);
    return { vars: { a: b * k, b }, answer: k, steps: [div(b * k, b)] };
  }),
  T("moreThanThenTotal", "1.3.2", "{n1} har {a} {things}. {n2} har {b} fler än {n1}. Hur många {things} har de tillsammans?", "{n1} has {a} {things}. {n2} has {b} more than {n1}. How many {things} do they have together?", (rng) => {
    const [a, b] = [randInt(rng, 3, 20), randInt(rng, 2, 10)];
    return { vars: { ...cast(rng), a, b }, answer: a + a + b, steps: [add(a, b), add(a, a + b)] };
  }),
  T("plates", "1.3.2", "På {a} tallrikar ligger det {b} {things} på varje. {n1} äter {c}. Hur många {things} är kvar?", "There are {b} {things} on each of {a} plates. {n1} eats {c}. How many {things} are left?", (rng) => {
    const [a, b] = [randInt(rng, 2, 5), randInt(rng, 2, 6)];
    const c = randInt(rng, 1, a * b - 1);
    return { vars: { ...cast(rng), a, b, c }, answer: a * b - c, steps: [mul(a, b), sub(a * b, c)] };
  }),
  T("legsChickensCows", "1.3.2", "På en bondgård finns {a} hönor och {b} kor. Hur många ben har djuren tillsammans?", "On a farm there are {a} hens and {b} cows. How many legs do the animals have together?", (rng) => {
    const [a, b] = [randInt(rng, 2, 8), randInt(rng, 2, 6)];
    return { vars: { a, b }, answer: 2 * a + 4 * b, steps: [mul(a, 2), mul(b, 4), add(2 * a, 4 * b)] };
  }),

  // --- Åk 4-6: ett steg, större tal och decimaltal -----------------------------------------------
  T("schoolPupils", "2.11.1", "En skola har {a} elever på lågstadiet och {b} på mellanstadiet. Hur många elever har skolan?", "A school has {a} pupils in the lower years and {b} in the middle years. How many pupils does the school have?", (rng) => {
    const [a, b] = [randInt(rng, 120, 480), randInt(rng, 120, 480)];
    return { vars: { a, b }, answer: a + b, steps: [add(a, b)] };
  }),
  T("bucketLitres", "2.11.1", "En hink rymmer {a} liter. Hur många liter rymmer {b} hinkar? Skriv bara talet.", "A bucket holds {a} litres. How many litres do {b} buckets hold? Write just the number.", (rng) => {
    const [a, b] = [pick(rng, [2.5, 3.5, 4.5, 5.5, 1.5]), randInt(rng, 2, 8)];
    return { vars: { a: say(a), b }, answer: r6(a * b), steps: [mul(a, b)] };
  }),
  T("applesPerKg", "2.11.1", "Äpplen kostar {a} kr per kilo. Hur många kronor kostar {b} kg äpplen?", "Apples cost {a} kr per kilo. How many kronor do {b} kg of apples cost?", (rng) => {
    const [a, b] = [randInt(rng, 15, 35), pick(rng, [2, 3, 1.5, 2.5, 0.5])];
    return { vars: { a, b: say(b) }, answer: r6(a * b), steps: [mul(b, a, "step.word.price")] };
  }),
  T("shareMoney", "2.11.1", "{a} kr ska delas lika mellan {b} personer. Hur många kronor får var och en?", "{a} kr is shared equally among {b} people. How many kronor does each get?", (rng) => {
    const [b, k] = [randInt(rng, 2, 8), randInt(rng, 15, 120)];
    return { vars: { a: b * k, b }, answer: k, steps: [div(b * k, b)] };
  }),
  T("warmer", "2.11.1", "På morgonen är det {a} grader. Till lunch har det blivit {b} grader varmare. Hur varmt är det vid lunch?", "In the morning it is {a} degrees. By lunch it has become {b} degrees warmer. How warm is it at lunch?", (rng) => {
    const [a, b] = [randInt(rng, -8, 12), randInt(rng, 3, 12)];
    return { vars: { a, b }, answer: a + b, steps: [add(a, b)] };
  }),
  T("colder", "2.11.1", "Termometern visar {a} grader. Under natten blir det {b} grader kallare. Vad visar termometern på morgonen?", "The thermometer shows {a} degrees. During the night it gets {b} degrees colder. What does it show in the morning?", (rng) => {
    const [a, b] = [randInt(rng, -3, 8), randInt(rng, 4, 14)];
    return { vars: { a, b }, answer: a - b, steps: [sub(a, b)] };
  }),
  T("album", "2.11.1", "{n1} har {a} frimärken och sätter in {b} på varje sida i ett album. Hur många sidor fylls?", "{n1} has {a} stamps and puts {b} on each page of an album. How many pages are filled?", (rng) => {
    const [b, k] = [randInt(rng, 6, 12), randInt(rng, 4, 15)];
    return { vars: { ...cast(rng), a: b * k, b }, answer: k, steps: [div(b * k, b)] };
  }),
  T("walking", "2.11.1", "{n1} går {a} km på en timme. Hur många km går {n1} på {b} timmar?", "{n1} walks {a} km in an hour. How many km does {n1} walk in {b} hours?", (rng) => {
    const [a, b] = [pick(rng, [4, 5, 4.5, 3.5]), randInt(rng, 2, 5)];
    return { vars: { ...cast(rng), a: say(a), b }, answer: r6(a * b), unit: "km", steps: [mul(a, b)] };
  }),
  T("busTickets", "2.11.1", "Ett busskort kostar {a} kr. Hur många kronor kostar {b} busskort?", "A bus pass costs {a} kr. How many kronor do {b} bus passes cost?", (rng) => {
    const [a, b] = [randInt(rng, 25, 95), randInt(rng, 3, 12)];
    return { vars: { a, b }, answer: a * b, steps: [mul(b, a, "step.word.price")] };
  }),
  T("bakeryRolls", "2.11.1", "Ett bageri bakar {a} bullar och lägger dem i påsar med {b} i varje. Hur många påsar blir det?", "A bakery bakes {a} buns and puts them in bags of {b}. How many bags are there?", (rng) => {
    const [b, k] = [pick(rng, [4, 5, 6, 8, 10, 12]), randInt(rng, 5, 30)];
    return { vars: { a: b * k, b }, answer: k, steps: [div(b * k, b)] };
  }),
  T("runLaps", "2.11.1", "Ett varv runt idrottsplatsen är {a} m. {n1} springer {b} varv. Hur många meter springer {n1}?", "One lap of the sports ground is {a} m. {n1} runs {b} laps. How many metres does {n1} run?", (rng) => {
    const [a, b] = [pick(rng, [200, 250, 400, 350]), randInt(rng, 2, 8)];
    return { vars: { ...cast(rng), a, b }, answer: a * b, unit: "m", steps: [mul(a, b)] };
  }),
  T("heightDifference", "2.11.1", "{n1} är {a} m lång och {n2} är {b} m lång. Hur många meter längre är {n1}?", "{n1} is {a} m tall and {n2} is {b} m tall. How many metres taller is {n1}?", (rng) => {
    const b = randInt(rng, 120, 160) / 100;
    const a = r6(b + randInt(rng, 3, 25) / 100);
    return { vars: { ...cast(rng), a: say(a), b: say(b) }, answer: r6(a - b), unit: "m", steps: [sub(a, b, "step.word.difference")] };
  }),
  T("savingsGoal", "2.11.1", "{n1} vill köpa ett spel för {a} kr och har {b} kr. Hur många kronor fattas?", "{n1} wants to buy a game for {a} kr and has {b} kr. How many kronor are missing?", (rng) => {
    const a = randInt(rng, 150, 600);
    const b = randInt(rng, 50, a - 20);
    return { vars: { ...cast(rng), a, b }, answer: a - b, steps: [sub(a, b, "step.word.difference")] };
  }),
  T("trainSeats", "2.11.1", "Ett tåg har {a} vagnar med {b} platser i varje. Hur många platser har tåget?", "A train has {a} carriages with {b} seats in each. How many seats does the train have?", (rng) => {
    const [a, b] = [randInt(rng, 3, 9), randInt(rng, 40, 90)];
    return { vars: { a, b }, answer: a * b, steps: [mul(a, b)] };
  }),
  T("juiceGlasses", "2.11.1", "En kanna rymmer {a} dl saft. Hur många glas à {b} dl kan man fylla? Skriv bara talet.", "A jug holds {a} dl of juice. How many {b} dl glasses can it fill? Write just the number.", (rng) => {
    const [b, k] = [pick(rng, [1.5, 2, 2.5, 3]), randInt(rng, 4, 12)];
    return { vars: { a: say(r6(b * k)), b: say(b) }, answer: k, steps: [div(r6(b * k), b)] };
  }),
  T("fractionSpent", "2.11.1", "{n1} har {a} kr och använder {p}/{q} av pengarna till en tröja. Hur många kronor kostar tröjan?", "{n1} has {a} kr and spends {p}/{q} of the money on a jumper. How many kronor does the jumper cost?", (rng) => {
    const q = pick(rng, [2, 3, 4, 5]);
    const p = randInt(rng, 1, q - 1);
    const part = randInt(rng, 20, 100);
    return { vars: { ...cast(rng), a: q * part, p, q }, answer: p * part, steps: [st("step.onePart", `\\frac{${q * part}}{${q}} = ${part}`, { whole: q * part, d: q }), ...(p > 1 ? [st("step.manyParts", `${part} \\cdot ${p} = ${p * part}`, { n: p })] : [])] };
  }),

  // --- Åk 4-6: flera steg: pengar, tid, medelvärde, recept ------------------------------------------
  T("shoppingNote", "2.11.2", "{n1} köper {a} {things} för {b} kr styck och betalar med en {c}-lapp. Hur många kronor får {n1} tillbaka?", "{n1} buys {a} {things} at {b} kr each and pays with a {c} kr note. How many kronor does {n1} get back?", (rng) => {
    const [a, b] = [randInt(rng, 2, 8), randInt(rng, 12, 45)];
    const c = [100, 200, 500].find((n) => n > a * b)!;
    return { vars: { ...cast(rng), a, b, c }, answer: c - a * b, steps: [mul(a, b, "step.word.price"), sub(c, a * b, "step.word.change")] };
  }),
  T("movieLength", "2.11.2", "Filmen börjar kl. {h1}.{m1} och slutar kl. {h2}.{m2}. Hur många minuter är filmen?", "The film starts at {h1}.{m1} and ends at {h2}.{m2}. How many minutes long is the film?", (rng) => {
    const h1 = randInt(rng, 13, 19);
    const start = h1 * 60 + pick(rng, [0, 10, 15, 20, 30, 40, 45]);
    const length = randInt(rng, 8, 16) * 10 + pick(rng, [0, 5]);
    const end = start + length;
    const two = (n: number) => String(n).padStart(2, "0");
    return {
      vars: { h1, m1: two(start % 60), h2: Math.floor(end / 60), m2: two(end % 60) },
      answer: length,
      unit: "min",
      steps: [st("step.word.minutesBetween", `${tex(end)} - ${tex(start)} = ${length}`)],
    };
  }),
  T("averageRun", "2.11.2", "{n1} sprang 60 meter tre gånger. Tiderna blev {a}, {b} och {c} sekunder. Vad var medeltiden?", "{n1} ran 60 metres three times. The times were {a}, {b} and {c} seconds. What was the mean time?", (rng) => {
    for (;;) {
      const [a, b, c] = [randInt(rng, 9, 14), randInt(rng, 9, 14), randInt(rng, 9, 14)];
      if ((a + b + c) % 3 !== 0) continue;
      return { vars: { ...cast(rng), a, b, c }, answer: (a + b + c) / 3, unit: "s", steps: [add(a, b), add(a + b, c), div(a + b + c, 3, "step.word.average")] };
    }
  }),
  T("averageScore", "2.11.2", "På fyra prov fick {n1} {a}, {b}, {c} och {d} poäng. Vad är medelvärdet?", "On four tests {n1} scored {a}, {b}, {c} and {d} points. What is the mean?", (rng) => {
    for (;;) {
      const v = [randInt(rng, 10, 30), randInt(rng, 10, 30), randInt(rng, 10, 30), randInt(rng, 10, 30)];
      const sum = v.reduce((x, y) => x + y, 0);
      if (sum % 4 !== 0) continue;
      return { vars: { ...cast(rng), a: v[0], b: v[1], c: v[2], d: v[3] }, answer: sum / 4, steps: [st("step.word.total", `${v.join(" + ")} = ${sum}`), div(sum, 4, "step.word.average")] };
    }
  }),
  T("fence", "2.11.2", "En rektangulär trädgård är {a} m lång och {b} m bred. Hur många meter staket behövs runt hela trädgården?", "A rectangular garden is {a} m long and {b} m wide. How many metres of fence are needed all the way round?", (rng) => {
    const [a, b] = [randInt(rng, 6, 30), randInt(rng, 4, 20)];
    return { vars: { a, b }, answer: 2 * (a + b), unit: "m", steps: [add(a, b), mul(a + b, 2, "step.word.bothSides")] };
  }),
  T("floorCost", "2.11.2", "Ett golv är {a} m långt och {b} m brett. Golvmattan kostar {c} kr per kvadratmeter. Vad kostar mattan till hela golvet?", "A floor is {a} m long and {b} m wide. The flooring costs {c} kr per square metre. How much does flooring for the whole floor cost?", (rng) => {
    const [a, b, c] = [randInt(rng, 3, 8), randInt(rng, 2, 6), randInt(rng, 10, 30) * 10];
    return { vars: { a, b, c }, answer: a * b * c, steps: [mul(a, b, "step.word.area"), mul(a * b, c, "step.word.price")] };
  }),
  T("recipe", "2.11.2", "Ett recept för {a} personer behöver {b} dl mjöl. Hur många dl mjöl behövs till {c} personer? Skriv bara talet.", "A recipe for {a} people needs {b} dl of flour. How many dl of flour are needed for {c} people? Write just the number.", (rng) => {
    const a = pick(rng, [2, 4, 6]);
    const b = pick(rng, [2, 3, 4, 5, 6]);
    const c = a * pick(rng, [2, 3]) / (rng() < 0.3 ? 2 : 1);
    return { vars: { a, b, c }, answer: r6((b * c) / a), steps: [st("step.word.scaleRecipe", `${b} \\cdot ${c} / ${a} = ${tex(r6((b * c) / a))}`)] };
  }),
  T("unitPrice", "2.11.2", "{a} burkar kostar {b} kr. Hur många kronor kostar {c} burkar?", "{a} tins cost {b} kr. How many kronor do {c} tins cost?", (rng) => {
    const [a, each, c] = [randInt(rng, 2, 6), randInt(rng, 8, 25), randInt(rng, 3, 12)];
    return { vars: { a, b: a * each, c }, answer: each * c, steps: [div(a * each, a, "step.word.perOne"), mul(each, c, "step.word.price")] };
  }),
  T("saveWeeks", "2.11.2", "{n1} vill köpa en cykel för {a} kr och har redan {b} kr. {n1} sparar {c} kr i veckan. Hur många veckor tar det innan {n1} har råd?", "{n1} wants to buy a bike for {a} kr and already has {b} kr. {n1} saves {c} kr a week. How many weeks until {n1} can afford it?", (rng) => {
    const [c, weeks] = [randInt(rng, 5, 15) * 10, randInt(rng, 4, 15)];
    const b = randInt(rng, 2, 30) * 10;
    return { vars: { ...cast(rng), a: b + c * weeks, b, c }, answer: weeks, steps: [sub(b + c * weeks, b, "step.word.difference"), div(c * weeks, c)] };
  }),
  T("cinemaTickets", "2.11.2", "En biobiljett kostar {a} kr för barn och {b} kr för vuxna. Vad kostar det för {c} barn och {d} vuxna?", "A cinema ticket costs {a} kr for a child and {b} kr for an adult. How much is it for {c} children and {d} adults?", (rng) => {
    const [a, b, c, d] = [randInt(rng, 6, 10) * 10, randInt(rng, 10, 15) * 10, randInt(rng, 2, 5), randInt(rng, 1, 3)];
    return { vars: { a, b, c, d }, answer: a * c + b * d, steps: [mul(c, a, "step.word.price"), mul(d, b, "step.word.price"), add(a * c, b * d)] };
  }),
  T("yearlyMoney", "2.11.2", "{n1} får {a} kr i veckopeng och använder {b} kr av dem varje vecka. Hur många kronor har {n1} sparat efter {c} veckor?", "{n1} gets {a} kr pocket money a week and spends {b} kr of it. How many kronor has {n1} saved after {c} weeks?", (rng) => {
    const a = randInt(rng, 5, 15) * 10;
    const b = randInt(rng, 1, a / 10 - 1) * 10;
    const c = randInt(rng, 3, 12);
    return { vars: { ...cast(rng), a, b, c }, answer: (a - b) * c, steps: [sub(a, b), mul(a - b, c)] };
  }),
  T("bookDays", "2.11.2", "En bok har {a} sidor. {n1} har redan läst {b} sidor och läser {c} sidor om dagen. Hur många dagar till tar det att läsa ut boken?", "A book has {a} pages. {n1} has already read {b} pages and reads {c} pages a day. How many more days until the book is finished?", (rng) => {
    const [c, days, b] = [randInt(rng, 10, 30), randInt(rng, 3, 12), randInt(rng, 20, 80)];
    return { vars: { ...cast(rng), a: b + c * days, b, c }, answer: days, steps: [sub(b + c * days, b), div(c * days, c)] };
  }),
  T("tempDifference", "2.11.2", "På natten var det {a} grader och mitt på dagen {b} grader. Hur många grader varmare var det på dagen?", "At night it was {a} degrees and at midday {b} degrees. How many degrees warmer was it in the day?", (rng) => {
    const [a, b] = [randInt(rng, -12, -1), randInt(rng, 2, 15)];
    return { vars: { a, b }, answer: b - a, steps: [sub(b, a, "step.word.difference")] };
  }),
  T("trainTrip", "2.11.2", "Tåget går kl. {h1}.{m1} och kommer fram kl. {h2}.{m2}. Hur många minuter tar resan?", "The train leaves at {h1}.{m1} and arrives at {h2}.{m2}. How many minutes does the journey take?", (rng) => {
    const h1 = randInt(rng, 6, 18);
    const start = h1 * 60 + pick(rng, [5, 12, 25, 34, 47, 50]);
    const length = randInt(rng, 35, 160);
    const end = start + length;
    const two = (n: number) => String(n).padStart(2, "0");
    return { vars: { h1, m1: two(start % 60), h2: Math.floor(end / 60), m2: two(end % 60) }, answer: length, unit: "min", steps: [st("step.word.minutesBetween", `${tex(end)} - ${tex(start)} = ${length}`)] };
  }),
  T("packsNeeded", "2.11.2", "Klassen ska ha {a} pennor. Pennorna säljs i paket med {b} och ett paket kostar {c} kr. Vad kostar pennorna?", "The class needs {a} pencils. They're sold in packs of {b} and a pack costs {c} kr. How much do the pencils cost?", (rng) => {
    const [b, packs, c] = [pick(rng, [5, 6, 8, 10, 12]), randInt(rng, 2, 6), randInt(rng, 15, 40)];
    return { vars: { a: b * packs, b, c }, answer: packs * c, steps: [div(b * packs, b), mul(packs, c, "step.word.price")] };
  }),
  T("busBoth", "2.11.2", "En buss tar {a} passagerare. {b} elever och {c} lärare ska åka. Hur många platser blir över?", "A bus takes {a} passengers. {b} pupils and {c} teachers are going. How many seats are left over?", (rng) => {
    const a = pick(rng, [45, 50, 55, 60]);
    const c = randInt(rng, 2, 4);
    const b = randInt(rng, 20, a - c - 1);
    return { vars: { a, b, c }, answer: a - b - c, steps: [add(b, c), sub(a, b + c)] };
  }),
  T("gardenSquare", "2.11.2", "En kvadratisk rabatt har omkretsen {a} m. Hur många kvadratmeter är rabatten?", "A square flower bed has a perimeter of {a} m. How many square metres is the bed?", (rng) => {
    const s = randInt(rng, 2, 12);
    return { vars: { a: 4 * s }, answer: s * s, steps: [div(4 * s, 4, "step.word.side"), mul(s, s, "step.word.area")] };
  }),
  T("candyShare", "2.11.2", "{n1} och {n2} köper {a} {things} tillsammans för {b} kr. De delar lika på kostnaden. Hur många kronor betalar var och en?", "{n1} and {n2} buy {a} {things} together for {b} kr. They split the cost equally. How many kronor does each pay?", (rng) => {
    const each = randInt(rng, 8, 60);
    return { vars: { ...cast(rng), a: randInt(rng, 4, 20), b: 2 * each }, answer: each, steps: [div(2 * each, 2)] };
  }),

  T("schoolRide", "2.11.2", "{n1} har {a} km till skolan. Hur många km cyklar {n1} fram och tillbaka på {b} skoldagar?", "{n1} lives {a} km from school. How many km does {n1} cycle there and back in {b} school days?", (rng) => {
    const [a, b] = [pick(rng, [1.5, 2, 2.5, 3, 3.5, 4]), randInt(rng, 2, 5)];
    return { vars: { ...cast(rng), a: say(a), b }, answer: r6(2 * a * b), unit: "km", steps: [mul(a, 2, "step.word.thereAndBack"), mul(r6(2 * a), b)] };
  }),

  // --- Åk 7-9: procent, hastighet och proportionalitet -------------------------------------------
  T("trainHours", "3.8.1", "Ett tåg kör med medelhastigheten {v} km/h. Hur många timmar tar det att köra {s} km?", "A train runs at an average speed of {v} km/h. How many hours does it take to travel {s} km?", (rng) => {
    const [v, t] = [randInt(rng, 6, 20) * 10, pick(rng, [1.5, 2, 2.5, 3, 4, 0.5])];
    return { vars: { v, s: say(r6(v * t)) }, answer: t, unit: "h", steps: [div(r6(v * t), v, "step.timeFormula")] };
  }),
  T("discount", "3.8.1", "En jacka kostar {a} kr. Den säljs med {p} % rabatt. Vad kostar jackan nu?", "A jacket costs {a} kr. It's on sale at {p} % off. How much does the jacket cost now?", (rng) => {
    const [a, p] = [randInt(rng, 4, 20) * 50, pick(rng, [10, 20, 25, 30, 40, 50])];
    const off = (a * p) / 100;
    return { vars: { a, p }, answer: a - off, steps: [mul(a, p / 100, "step.word.percentOf"), sub(a, off, "step.word.discount")] };
  }),
  T("priceRise", "3.8.1", "Ett busskort kostar {a} kr. Priset höjs med {p} %. Vad blir det nya priset?", "A bus pass costs {a} kr. The price goes up by {p} %. What is the new price?", (rng) => {
    const [a, p] = [randInt(rng, 6, 30) * 20, pick(rng, [5, 10, 15, 20, 25])];
    const rise = r6((a * p) / 100);
    return { vars: { a, p }, answer: r6(a + rise), steps: [mul(a, p / 100, "step.word.percentOf"), add(a, rise)] };
  }),
  T("percentOfClass", "3.8.1", "I en klass med {a} elever cyklar {b} till skolan. Hur många procent av eleverna cyklar?", "In a class of {a} pupils, {b} cycle to school. What percentage of the pupils cycle?", (rng) => {
    const a = pick(rng, [20, 25, 40, 50]);
    const b = randInt(rng, 2, a - 2);
    return { vars: { a, b }, answer: b / a, steps: [st("step.word.partOfWhole", `\\frac{${b}}{${a}} = ${tex(b / a)} = ${tex((100 * b) / a)} \\%`)] };
  }),
  T("savingsInterest", "3.8.1", "{n1} sätter in {a} kr på ett konto med {p} % ränta per år. Hur mycket finns på kontot efter ett år?", "{n1} puts {a} kr in an account with {p} % interest a year. How much is in the account after a year?", (rng) => {
    const [a, p] = [randInt(rng, 2, 20) * 500, pick(rng, [1, 2, 3, 4, 5])];
    const interest = (a * p) / 100;
    return { vars: { ...cast(rng), a, p }, answer: a + interest, steps: [mul(a, p / 100, "step.word.percentOf"), add(a, interest)] };
  }),
  T("bikeSpeed", "3.8.1", "{n1} cyklar {a} km på {t} timmar. Vilken är medelhastigheten i km/h?", "{n1} cycles {a} km in {t} hours. What is the average speed in km/h?", (rng) => {
    const [v, t] = [randInt(rng, 10, 25), pick(rng, [0.5, 1.5, 2, 2.5, 3])];
    return { vars: { ...cast(rng), a: say(r6(v * t)), t: say(t) }, answer: v, unit: "km/h", steps: [div(r6(v * t), t, "step.speedFormula")] };
  }),
  T("fuelCost", "3.8.1", "En bil drar {a} liter bensin per mil. Bensinen kostar {b} kr per liter. Vad kostar bensinen för en resa på {c} mil?", "A car uses {a} litres of petrol per Swedish mile. Petrol costs {b} kr a litre. How much does the petrol cost for a {c} mile trip?", (rng) => {
    const [a, b, c] = [pick(rng, [0.5, 0.6, 0.8]), randInt(rng, 17, 22), randInt(rng, 5, 30)];
    const litres = r6(a * c);
    return { vars: { a: say(a), b, c }, answer: r6(litres * b), steps: [mul(a, c, "step.word.litresNeeded"), mul(litres, b, "step.word.price")] };
  }),
  T("juiceMix", "3.8.1", "Saft blandas med 1 del saft och {k} delar vatten. Hur många dl saft behövs till {v} dl färdig dryck? Skriv bara talet.", "Squash is mixed with 1 part squash and {k} parts water. How many dl of squash are needed for {v} dl of drink? Write just the number.", (rng) => {
    const k = randInt(rng, 3, 7);
    const s = randInt(rng, 1, 5);
    return { vars: { k, v: s * (k + 1) }, answer: s, steps: [add(1, k), div(s * (k + 1), k + 1)] };
  }),
  T("mapDistance", "3.8.1", "På en karta i skala 1:{k} är en väg {cm} cm lång. Hur många kilometer är vägen?", "On a map at scale 1:{k}, a road is {cm} cm long. How many kilometres is the road?", (rng) => {
    const [k, cm] = [pick(rng, [10000, 20000, 50000, 100000]), randInt(rng, 2, 12)];
    const real = cm * k;
    return { vars: { k, cm }, answer: real / 100000, unit: "km", steps: [{ ...mul(cm, k, "step.scaleMultiply"), guideVars: { k } }, div(real, 100000, "step.word.cmToKm")] };
  }),
  T("comparisonPrice", "3.8.1", "Ett paket med {a} g flingor kostar {b} kr. Vilket är jämförpriset i kr per kg?", "A {a} g packet of cereal costs {b} kr. What is the price per kg?", (rng) => {
    const [a, perKg] = [pick(rng, [200, 250, 500]), randInt(rng, 3, 12) * 10];
    return { vars: { a, b: r6((perKg * a) / 1000) }, answer: perKg, steps: [div(1000, a, "step.word.howManyFit"), mul(1000 / a, r6((perKg * a) / 1000), "step.word.price")] };
  }),
  T("townGrowth", "3.8.1", "En ort har {a} invånare. Antalet ökar med {p} %. Hur många invånare blir det?", "A town has {a} inhabitants. The number grows by {p} %. How many inhabitants will there be?", (rng) => {
    const [a, p] = [randInt(rng, 10, 90) * 100, pick(rng, [2, 3, 4, 5, 10])];
    const more = (a * p) / 100;
    return { vars: { a, p }, answer: a + more, steps: [mul(a, p / 100, "step.word.percentOf"), add(a, more)] };
  }),
  T("hourlyWage", "3.8.1", "{n1} tjänar {a} kr i timmen och jobbar {h} timmar. Hur mycket tjänar {n1}?", "{n1} earns {a} kr an hour and works {h} hours. How much does {n1} earn?", (rng) => {
    const [a, h] = [randInt(rng, 110, 180), pick(rng, [4, 5, 6, 7.5, 8, 3.5])];
    return { vars: { ...cast(rng), a, h: say(h) }, answer: r6(a * h), steps: [mul(a, h, "step.word.price")] };
  }),
  T("shareRatio", "3.8.1", "{n1}, {n2} och {n3} delar {a} kr i förhållandet 1:2:3. Hur många kronor får {n3}?", "{n1}, {n2} and {n3} share {a} kr in the ratio 1:2:3. How many kronor does {n3} get?", (rng) => {
    const part = randInt(rng, 10, 90) * 10;
    return { vars: { ...cast(rng), a: 6 * part }, answer: 3 * part, steps: [div(6 * part, 6, "step.word.parts"), mul(part, 3)] };
  }),
  T("neededAverage", "3.8.1", "{n1} vill ha medelvärdet {m} poäng på fyra prov. På de tre första fick {n1} {a}, {b} och {c}. Hur många poäng behövs på det fjärde?", "{n1} wants a mean of {m} points over four tests. On the first three {n1} got {a}, {b} and {c}. How many points are needed on the fourth?", (rng) => {
    for (;;) {
      const m = randInt(rng, 14, 22);
      const [a, b, c] = [randInt(rng, 10, 25), randInt(rng, 10, 25), randInt(rng, 10, 25)];
      const d = 4 * m - (a + b + c);
      if (d < 5 || d > 30) continue;
      return { vars: { ...cast(rng), m, a, b, c }, answer: d, steps: [mul(4, m, "step.word.totalNeeded"), sub(4 * m, a + b + c)] };
    }
  }),
  T("vat", "3.8.1", "En vara kostar {a} kr utan moms. Momsen är 25 %. Vad kostar varan med moms?", "An item costs {a} kr without VAT. VAT is 25 %. How much does it cost with VAT?", (rng) => {
    const a = randInt(rng, 2, 40) * 20;
    return { vars: { a }, answer: a * 1.25, steps: [mul(a, 1.25, "step.word.changeFactor")] };
  }),
  T("salePercent", "3.8.1", "Ett par skor sänks från {a} kr till {b} kr. Hur många procent är sänkningen?", "A pair of shoes is reduced from {a} kr to {b} kr. By what percentage has the price gone down?", (rng) => {
    const [a, p] = [randInt(rng, 4, 16) * 50, pick(rng, [10, 20, 25, 30, 40, 50])];
    const b = a - (a * p) / 100;
    return { vars: { a, b }, answer: p / 100, steps: [sub(a, b, "step.word.difference"), st("step.word.partOfWhole", `\\frac{${a - b}}{${a}} = ${tex(p / 100)} = ${p} \\%`)] };
  }),

  // --- Åk 7-9: ekvationer från text ----------------------------------------------------------------
  T("eqAges", "3.8.2", "{n1} är {d} år äldre än {n2}. Tillsammans är de {s} år. Hur gammal är {n2}?", "{n1} is {d} years older than {n2}. Together they are {s} years old. How old is {n2}?", (rng) => {
    const [x, d] = [randInt(rng, 5, 30), randInt(rng, 2, 12)];
    const s = 2 * x + d;
    return { vars: { ...cast(rng), d, s }, answer: x, steps: [st("step.word.equation", `x + x + ${d} = ${s}`), st("step.word.collect", `2x = ${s - d}`), st("step.word.solve", `x = ${x}`)] };
  }),
  T("eqTwice", "3.8.2", "{n1} har dubbelt så många {things} som {n2}. Tillsammans har de {s}. Hur många har {n2}?", "{n1} has twice as many {things} as {n2}. Together they have {s}. How many does {n2} have?", (rng) => {
    const x = randInt(rng, 4, 40);
    return { vars: { ...cast(rng), s: 3 * x }, answer: x, steps: [st("step.word.equation", `x + 2x = ${3 * x}`), st("step.word.collect", `3x = ${3 * x}`), st("step.word.solve", `x = ${x}`)] };
  }),
  T("eqThink", "3.8.2", "Jag tänker på ett tal. Multiplicerar jag det med {a} och lägger till {b} får jag {c}. Vilket tal tänker jag på?", "I'm thinking of a number. If I multiply it by {a} and add {b}, I get {c}. What's my number?", (rng) => {
    const [x, a, b] = [randInt(rng, 2, 15), randInt(rng, 2, 9), randInt(rng, 1, 20)];
    return { vars: { a, b, c: a * x + b }, answer: x, steps: [st("step.word.equation", `${a}x + ${b} = ${a * x + b}`), st("step.subtractBoth", `${a}x = ${a * x}`, { n: b }), st("step.divideBoth", `x = ${x}`, { n: a })] };
  }),
  T("eqThinkDivide", "3.8.2", "Jag tänker på ett tal. Delar jag det med {a} och drar bort {b} får jag {c}. Vilket tal tänker jag på?", "I'm thinking of a number. If I divide it by {a} and take away {b}, I get {c}. What's my number?", (rng) => {
    const [a, c, b] = [randInt(rng, 2, 6), randInt(rng, 1, 12), randInt(rng, 1, 10)];
    const x = a * (b + c);
    return { vars: { a, b, c }, answer: x, steps: [st("step.word.equation", `\\frac{x}{${a}} - ${b} = ${c}`), st("step.addBoth", `\\frac{x}{${a}} = ${b + c}`, { n: b }), st("step.word.multiplyBoth", `x = ${x}`, { n: a })] };
  }),
  T("eqRectangle", "3.8.2", "En rektangel är {d} cm längre än den är bred. Omkretsen är {p} cm. Hur bred är rektangeln?", "A rectangle is {d} cm longer than it is wide. Its perimeter is {p} cm. How wide is the rectangle?", (rng) => {
    const [x, d] = [randInt(rng, 2, 15), randInt(rng, 1, 10)];
    const p = 2 * (2 * x + d);
    return { vars: { d, p }, answer: x, unit: "cm", steps: [st("step.word.equation", `2x + 2(x + ${d}) = ${p}`), st("step.word.collect", `4x + ${2 * d} = ${p}`), st("step.subtractBoth", `4x = ${4 * x}`, { n: 2 * d }), st("step.divideBoth", `x = ${x}`, { n: 4 })] };
  }),
  T("eqTickets", "3.8.2", "En biobiljett kostar {a} kr. {n1} köper biljetter och popcorn för {b} kr och betalar {s} kr totalt. Hur många biljetter köper {n1}?", "A cinema ticket costs {a} kr. {n1} buys tickets and popcorn for {b} kr and pays {s} kr in total. How many tickets does {n1} buy?", (rng) => {
    const [a, x, b] = [randInt(rng, 8, 14) * 10, randInt(rng, 2, 6), randInt(rng, 3, 9) * 5];
    return { vars: { ...cast(rng), a, b, s: a * x + b }, answer: x, steps: [st("step.word.equation", `${a}x + ${b} = ${a * x + b}`), st("step.subtractBoth", `${a}x = ${a * x}`, { n: b }), st("step.divideBoth", `x = ${x}`, { n: a })] };
  }),
  T("eqPhone", "3.8.2", "Ett mobilabonnemang kostar {a} kr i månaden plus {b} kr per GB. En månad blev räkningen {s} kr. Hur många GB användes?", "A phone plan costs {a} kr a month plus {b} kr per GB. One month the bill was {s} kr. How many GB were used?", (rng) => {
    const [a, b, x] = [randInt(rng, 5, 20) * 10, randInt(rng, 5, 30), randInt(rng, 2, 15)];
    return { vars: { a, b, s: a + b * x }, answer: x, steps: [st("step.word.equation", `${a} + ${b}x = ${a + b * x}`), st("step.subtractBoth", `${b}x = ${b * x}`, { n: a }), st("step.divideBoth", `x = ${x}`, { n: b })] };
  }),
  T("eqSiblings", "3.8.2", "Tre syskon är tillsammans {s} år. Det mellersta är {d} år äldre än det yngsta, och det äldsta är {e} år äldre än det mellersta. Hur gammalt är det yngsta?", "Three siblings are {s} years old together. The middle one is {d} years older than the youngest, and the eldest is {e} years older than the middle one. How old is the youngest?", (rng) => {
    const [x, d, e] = [randInt(rng, 2, 12), randInt(rng, 1, 5), randInt(rng, 1, 5)];
    const s = 3 * x + 2 * d + e;
    return { vars: { s, d, e }, answer: x, steps: [st("step.word.equation", `x + (x + ${d}) + (x + ${d + e}) = ${s}`), st("step.word.collect", `3x + ${2 * d + e} = ${s}`), st("step.subtractBoth", `3x = ${3 * x}`, { n: 2 * d + e }), st("step.divideBoth", `x = ${x}`, { n: 3 })] };
  }),
  T("eqCoins", "3.8.2", "{n1} har lika många femkronor som tiokronor, sammanlagt {s} kr. Hur många tiokronor har {n1}?", "{n1} has as many 5-kronor coins as 10-kronor coins, {s} kr in all. How many 10-kronor coins does {n1} have?", (rng) => {
    const x = randInt(rng, 2, 20);
    return { vars: { ...cast(rng), s: 15 * x }, answer: x, steps: [st("step.word.equation", `5x + 10x = ${15 * x}`), st("step.word.collect", `15x = ${15 * x}`), st("step.divideBoth", `x = ${x}`, { n: 15 })] };
  }),
  T("eqConsecutive", "3.8.2", "Summan av tre heltal som följer efter varandra är {s}. Vilket är det minsta talet?", "Three whole numbers in a row add up to {s}. What is the smallest of them?", (rng) => {
    const x = randInt(rng, 3, 60);
    return { vars: { s: 3 * x + 3 }, answer: x, steps: [st("step.word.equation", `x + (x + 1) + (x + 2) = ${3 * x + 3}`), st("step.word.collect", `3x + 3 = ${3 * x + 3}`), st("step.subtractBoth", `3x = ${3 * x}`, { n: 3 }), st("step.divideBoth", `x = ${x}`, { n: 3 })] };
  }),
  T("eqTaxi", "3.8.2", "En taxiresa kostar {a} kr i startavgift och {b} kr per km. En resa kostade {s} kr. Hur många km var resan?", "A taxi ride costs {a} kr to start and {b} kr per km. A ride cost {s} kr. How many km was the ride?", (rng) => {
    const [a, b, x] = [randInt(rng, 4, 9) * 10, randInt(rng, 12, 25), randInt(rng, 3, 20)];
    return { vars: { a, b, s: a + b * x }, answer: x, unit: "km", steps: [st("step.word.equation", `${a} + ${b}x = ${a + b * x}`), st("step.subtractBoth", `${b}x = ${b * x}`, { n: a }), st("step.divideBoth", `x = ${x}`, { n: b })] };
  }),
  T("eqThreeTimesMore", "3.8.2", "{n1} har {d} fler {things} än {n2}, och {n3} har tre gånger så många som {n2}. Tillsammans har de {s}. Hur många har {n2}?", "{n1} has {d} more {things} than {n2}, and {n3} has three times as many as {n2}. Together they have {s}. How many does {n2} have?", (rng) => {
    const [x, d] = [randInt(rng, 2, 15), randInt(rng, 1, 10)];
    const s = 5 * x + d;
    return { vars: { ...cast(rng), d, s }, answer: x, steps: [st("step.word.equation", `x + (x + ${d}) + 3x = ${s}`), st("step.word.collect", `5x + ${d} = ${s}`), st("step.subtractBoth", `5x = ${5 * x}`, { n: d }), st("step.divideBoth", `x = ${x}`, { n: 5 })] };
  }),
  T("eqGym", "3.8.2", "Ett gym tar {a} kr i medlemsavgift och {b} kr per besök. {n1} betalade {s} kr på ett år. Hur många gånger tränade {n1}?", "A gym charges {a} kr membership plus {b} kr per visit. {n1} paid {s} kr in a year. How many times did {n1} train?", (rng) => {
    const [a, b, x] = [randInt(rng, 2, 6) * 100, randInt(rng, 2, 6) * 10, randInt(rng, 10, 60)];
    return { vars: { ...cast(rng), a, b, s: a + b * x }, answer: x, steps: [st("step.word.equation", `${a} + ${b}x = ${a + b * x}`), st("step.subtractBoth", `${b}x = ${b * x}`, { n: a }), st("step.divideBoth", `x = ${x}`, { n: b })] };
  }),
  T("eqAngles", "3.8.2", "I en triangel är en vinkel {a}°. De två andra vinklarna är lika stora. Hur stor är var och en av dem?", "In a triangle, one angle is {a}°. The other two angles are equal. How big is each of them?", (rng) => {
    const x = randInt(rng, 20, 80);
    return { vars: { a: 180 - 2 * x }, answer: x, steps: [st("step.word.equation", `2x + ${180 - 2 * x} = 180`), st("step.subtractBoth", `2x = ${2 * x}`, { n: 180 - 2 * x }), st("step.divideBoth", `x = ${x}`, { n: 2 })] };
  }),
];

/** Each template's wording as a dictionary entry, and the things' names - merged into the language dictionaries (i18n/index.ts). */
export function wordTexts(locale: "sv" | "en"): Record<string, string> {
  const out: Record<string, string> = {};
  for (const tpl of TEMPLATES) out[`word.${tpl.id}`] = tpl[locale];
  for (const [id, noun] of Object.entries(NOUNS)) {
    out[`noun.${id}.one`] = noun[locale][0];
    out[`noun.${id}.many`] = noun[locale][1];
  }
  return out;
}

function generate(stage: WordStageId) {
  const own = TEMPLATES.filter((tpl) => tpl.stage === stage);
  return (rng: Rng): AdvancedProblem => {
    const tpl = pick(rng, own);
    // Not when a step before the last already comes out at the answer (2 · 5 = 10, then 20 − 10 = 10): it would look done too early.
    let made = tpl.make(rng);
    const early = (m: Made) => m.steps.slice(0, -1).some((s) => s.line.split("=").pop()!.trim() === tex(m.answer));
    for (let tries = 0; early(made) && tries < 50; tries++) made = tpl.make(rng);
    return {
      stageId: stage,
      kind: "expression",
      promptKey: `word.${tpl.id}`,
      promptVars: made.vars,
      display: "",
      answer: { kind: "value", value: made.answer },
      tipKey: `word.tip.${stage}`,
      firstStep: made.steps[0].line,
      solution: made.steps.map((s) => s.line),
      steps: made.steps,
      ...(made.unit ? { unit: made.unit } : {}),
    };
  };
}

export const WORD_GENERATORS: Record<WordStageId, (rng: Rng) => AdvancedProblem> = {
  "1.3.1": generate("1.3.1"),
  "1.3.2": generate("1.3.2"),
  "2.11.1": generate("2.11.1"),
  "2.11.2": generate("2.11.2"),
  "3.8.1": generate("3.8.1"),
  "3.8.2": generate("3.8.2"),
};
