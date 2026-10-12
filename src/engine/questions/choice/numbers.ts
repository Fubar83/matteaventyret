/**
 * Numbers to recognise and compare, as single-choice questions:
 *
 *   åk 1-3  1.8.2 större än, mindre än (<, >, =)   1.8.3 udda och jämna tal
 *   åk 4-6  2.16.1 decimaltalens positionssystem   2.16.2 gånger och delat med 10, 100, 1000
 *           2.16.3 storleksordna decimaltal        2.17.1 negativa tal: termometern
 *   åk 7-9  3.1.4 kvadratrötter: √49, √50 between 7 and 8, x² = 49
 *
 * The wrong options are the classic mistakes: 3/1 for 3 of 4 parts, 0,45 >
 * 0,5 because it's longer, 3,500 for 3,5 · 100, −3 + 5 = 8.
 */
import { randInt, type Rng } from "../../rng";
import { tex } from "../written/problem";
import { fixedOptions, shuffledOptions, text, type ChoiceOption, type ChoiceProblem, type Slip } from "./problem";

export type NumberChoiceStageId = "1.8.2" | "1.8.3" | "2.16.1" | "2.16.2" | "2.16.3" | "2.17.1" | "3.1.4";

const latex = (s: string): ChoiceOption => ({ latex: s });
const num = (n: number): ChoiceOption => latex(tex(n));
/** A number in running text, the minus sign a real one: −3. */
const say = (n: number) => (n < 0 ? `−${String(-n).replace(".", ",")}` : String(n).replace(".", ","));
const dec = (n: number) => Math.round(n * 1e6) / 1e6;

// --- Åk 1-3 ----------------------------------------------------------------------

/** 1.8.2: 47 □ 74 - the open side of < and > faces the bigger number. */
function compare(rng: Rng): ChoiceProblem {
  const kind = rng();
  let a: number;
  let b: number;
  if (kind < 0.2) {
    a = b = randInt(rng, 2, 99);
  } else if (kind < 0.5) {
    // The digits swapped: 47 and 74 - the tens decide.
    const t = randInt(rng, 1, 9);
    let o = randInt(rng, 1, 9);
    while (o === t) o = randInt(rng, 1, 9);
    [a, b] = [10 * t + o, 10 * o + t];
  } else if (kind < 0.75) {
    // The same tens: the ones decide.
    const t = randInt(rng, 1, 9);
    const o1 = randInt(rng, 0, 9);
    let o2 = randInt(rng, 0, 9);
    while (o2 === o1) o2 = randInt(rng, 0, 9);
    [a, b] = [10 * t + o1, 10 * t + o2];
  } else {
    a = randInt(rng, 0, rng() < 0.5 ? 100 : 1000);
    b = randInt(rng, 0, a > 100 ? 1000 : 100);
    if (a === b) b += 1;
  }
  const relation = a < b ? "less" : a > b ? "more" : "equal";
  const correct = ["less", "more", "equal"].indexOf(relation);
  return {
    stageId: "1.8.2",
    kind: "choice",
    prompt: text("choice.compare.prompt"),
    display: `${a} \\quad \\square \\quad ${b}`,
    ...fixedOptions([latex("<"), latex(">"), latex("=")], correct, [
      text("choice.compare.notLess", { a, b }),
      text("choice.compare.notMore", { a, b }),
      text("choice.compare.notEqual", { a, b }),
    ]),
    tip: text("choice.compare.tip"),
    explanation: text(`choice.compare.explain.${relation}`, { a, b }),
  };
}

/** 1.8.3: odd or even - the last digit tells. */
function parity(rng: Rng): ChoiceProblem {
  if (rng() < 0.6) {
    const n = randInt(rng, 1, rng() < 0.6 ? 99 : 999);
    const even = n % 2 === 0;
    return {
      stageId: "1.8.3",
      kind: "choice",
      prompt: text("choice.parity.prompt", { n }),
      ...fixedOptions([{ text: text("choice.parity.even") }, { text: text("choice.parity.odd") }], even ? 0 : 1),
      tip: text("choice.parity.tip"),
      explanation: text(even ? "choice.parity.explain.even" : "choice.parity.explain.odd", { n, last: n % 10 }),
    };
  }
  // Which one is odd (or even), among three of the other kind.
  const wantEven = rng() < 0.5;
  const of = (even: boolean) => {
    const n = randInt(rng, 5, 99);
    return n % 2 === 0 === even ? n : n + 1;
  };
  const right = of(wantEven);
  const slips: Slip[] = [];
  while (slips.length < 6) slips.push({ option: num(of(!wantEven)) });
  return {
    stageId: "1.8.3",
    kind: "choice",
    prompt: text(wantEven ? "choice.parity.whichEven" : "choice.parity.whichOdd"),
    ...shuffledOptions(rng, num(right), slips),
    tip: text("choice.parity.tip"),
    explanation: text(wantEven ? "choice.parity.explain.even" : "choice.parity.explain.odd", { n: right, last: right % 10 }),
  };
}

// --- Åk 4-6 ----------------------------------------------------------------------

/** A place's value: 1 the ones, -1 the tenths, -2 the hundredths... */
const placeValue = (place: number) => 10 ** place;

/** 2.16.1: what a digit is worth in a decimal number - the 4 in 3,47 is 0,4. */
function decimalPlace(rng: Rng): ChoiceProblem {
  // Distinct digits, so the one asked about is the only one of its kind.
  const intDigits = rng() < 0.6 ? 1 : 2;
  const decDigits = rng() < 0.6 ? 2 : 3;
  const pool = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const digits: number[] = [];
  for (let i = 0; i < intDigits + decDigits; i++) digits.push(pool.splice(randInt(rng, 0, pool.length - 1), 1)[0]);
  const places = digits.map((_, i) => intDigits - 1 - i); // 1, 0, -1, -2, -3
  // Mostly a decimal place: that's what's new.
  const asked = rng() < 0.8 ? randInt(rng, intDigits, digits.length - 1) : randInt(rng, 0, intDigits - 1);
  const d = digits[asked];
  const place = places[asked];
  const shown = digits
    .map((x, i) => (i === asked ? `\\textcolor{#d97706}{${x}}` : String(x)))
    .reduce((s, x, i) => (i === intDigits ? `${s}{,}${x}` : s + x), "");
  const valueAt = (pl: number) => num(dec(d * placeValue(pl)));
  const slips: Slip[] = [place - 1, place + 1, place - 2, place + 2, -place].filter((pl) => pl !== place && pl >= -4 && pl <= 3).map((pl) => ({ option: valueAt(pl), why: text("choice.decimalPlace.why", { d, place: `@decimalPlace.${pl}` }) }));
  return {
    stageId: "2.16.1",
    kind: "choice",
    prompt: text("choice.decimalPlace.prompt", { d }),
    display: shown,
    ...shuffledOptions(rng, valueAt(place), slips),
    tip: text("choice.decimalPlace.tip"),
    explanation: text("choice.decimalPlace.explain", { d, place: `@decimalPlace.${place}`, value: say(dec(d * placeValue(place))) }),
  };
}

/** 2.16.2: · and / with 10, 100, 1000 - the comma moves (and 3,500 is still 3,5). */
function tenPowers(rng: Rng): ChoiceProblem {
  const zeros = randInt(rng, 1, 3);
  const f = 10 ** zeros;
  const times = rng() < 0.55;
  // A number with up to two decimals, not ending in 0.
  const decimals = randInt(rng, 0, 2);
  let scaled = randInt(rng, 2, decimals === 0 ? 99 : 999);
  if (scaled % 10 === 0) scaled += 1;
  const n = dec(scaled / 10 ** decimals);
  const by = (k: number) => dec(times ? n * 10 ** k : n / 10 ** k);
  const slips: Slip[] = [
    { option: num(by(zeros - 1)), why: text("choice.tenPowers.whySteps", { k: zeros }) },
    { option: num(by(zeros + 1)), why: text("choice.tenPowers.whySteps", { k: zeros }) },
    { option: num(dec(times ? n / f : n * f)), why: text(times ? "choice.tenPowers.whyTimes" : "choice.tenPowers.whyDivide") },
  ];
  // Zeros written after the decimals: 3,5 · 100 = "3,500" - the number doesn't change.
  if (times && decimals > 0) slips.unshift({ option: latex(`${tex(n)}${"0".repeat(zeros)}`), why: text("choice.tenPowers.whyZeros", { n: say(n) }) });
  return {
    stageId: "2.16.2",
    kind: "choice",
    prompt: text("choice.tenPowers.prompt"),
    display: `${tex(n)} ${times ? "\\cdot" : "/"} ${f}`,
    ...shuffledOptions(rng, num(by(zeros)), slips),
    tip: text("choice.tenPowers.tip"),
    explanation: text(times ? "choice.tenPowers.explainTimes" : "choice.tenPowers.explainDivide", { n: say(n), f, k: zeros, answer: say(by(zeros)) }),
  };
}

/** 2.16.3: the biggest (or smallest) of four decimals - longer isn't bigger. */
function orderDecimals(rng: Rng): ChoiceProblem {
  const whole = rng() < 0.6 ? 0 : randInt(rng, 1, 9);
  const a = randInt(rng, 3, 8);
  const b = randInt(rng, 1, 9);
  const c = randInt(rng, 1, 9);
  const biggest = rng() < 0.6;
  // The tenths decide, not how many digits there are - so "longer is bigger" picks wrong:
  // the biggest is the shortest (0,6 > 0,58 > 0,579 > 0,05), the smallest the longest (0,057 < 0,6 < 0,58 < 0,5).
  const values = biggest
    ? [dec(whole + a / 10), dec(whole + (a - 1) / 10 + b / 100), dec(whole + (a - 1) / 10 + (b - 1) / 100 + c / 1000), dec(whole + b / 100)]
    : [dec(whole + b / 100 + c / 1000), dec(whole + a / 10), dec(whole + (a - 1) / 10 + b / 100), dec(whole + b / 10)];
  const right = biggest ? Math.max(...values) : Math.min(...values);
  return {
    stageId: "2.16.3",
    kind: "choice",
    prompt: text(biggest ? "choice.orderDecimals.biggest" : "choice.orderDecimals.smallest"),
    ...shuffledOptions(
      rng,
      num(right),
      values.filter((v) => v !== right).map((v) => ({ option: num(v), why: text("choice.orderDecimals.why") }))
    ),
    tip: text("choice.orderDecimals.tip"),
    explanation: text(biggest ? "choice.orderDecimals.explainBiggest" : "choice.orderDecimals.explainSmallest", { n: say(right) }),
  };
}

/** 2.17.1: below zero on a thermometer - warmer, colder, and which is coldest. */
function temperature(rng: Rng): ChoiceProblem {
  if (rng() < 0.7) {
    const t = randInt(rng, -10, 10);
    const d = randInt(rng, 2, 12);
    // Warmer or colder - whichever keeps the answer on the thermometer (−20 to 20), to count along it.
    const warmer = t - d < -20 ? true : t + d > 20 ? false : t < 0 ? rng() < 0.6 : rng() < 0.4;
    const r = warmer ? t + d : t - d;
    const slips: Slip[] = [
      { option: num(warmer ? t - d : t + d), why: text(warmer ? "choice.temp.whyWarmer" : "choice.temp.whyColder") },
      { option: num(-r), why: text("choice.temp.whySign") },
      { option: num(Math.abs(t) + (warmer ? d : -d)), why: text("choice.temp.whySign") },
      { option: num(r + (warmer ? 1 : -1)), why: text("choice.temp.whyCount") },
    ];
    return {
      stageId: "2.17.1",
      kind: "choice",
      prompt: text(warmer ? "choice.temp.warmer" : "choice.temp.colder", { t: say(t), d }),
      scene: { kind: "thermometer", value: t, min: -20, max: 20 },
      ...shuffledOptions(rng, num(r), slips),
      tip: text("choice.temp.tip"),
      explanation: text(warmer ? "choice.temp.explainWarmer" : "choice.temp.explainColder", { t: say(t), d, r: say(r) }),
    };
  }
  // The coldest (or warmest) of four.
  const temps = new Set<number>();
  while (temps.size < 4) temps.add(randInt(rng, -15, 12));
  const list = [...temps];
  const coldest = rng() < 0.6;
  const right = coldest ? Math.min(...list) : Math.max(...list);
  return {
    stageId: "2.17.1",
    kind: "choice",
    prompt: text(coldest ? "choice.temp.coldest" : "choice.temp.warmest"),
    ...shuffledOptions(
      rng,
      num(right),
      list.filter((v) => v !== right).map((v) => ({ option: num(v), why: text(coldest ? "choice.temp.whyColdest" : "choice.temp.whyWarmest") }))
    ),
    tip: text("choice.temp.tip"),
    explanation: text(coldest ? "choice.temp.explainColdest" : "choice.temp.explainWarmest", { n: say(right) }),
  };
}

// --- Åk 7-9 ----------------------------------------------------------------------

/** 3.1.4: square roots - of a square, between which whole numbers, and both solutions of x² = 49. */
function squareRoots(rng: Rng): ChoiceProblem {
  const kind = rng();
  const n = randInt(rng, 3, 12);
  if (kind < 0.4) {
    const sq = n * n;
    return {
      stageId: "3.1.4",
      kind: "choice",
      prompt: text("choice.root.value"),
      display: `\\sqrt{${sq}}`,
      ...shuffledOptions(rng, num(n), [
        { option: num(sq / 2), why: text("choice.root.whyHalf", { sq }) },
        { option: num(n + 1), why: text("choice.root.whyCheck", { n: n + 1, s: (n + 1) ** 2 }) },
        { option: num(n - 1), why: text("choice.root.whyCheck", { n: n - 1, s: (n - 1) ** 2 }) },
        { option: num(sq * sq), why: text("choice.root.whySquare") },
      ]),
      tip: text("choice.root.tip", { sq }),
      explanation: text("choice.root.explain", { n, sq }),
    };
  }
  if (kind < 0.75) {
    // Not a square: √50 is between 7 and 8, since 49 < 50 < 64.
    const x = randInt(rng, n * n + 1, (n + 1) * (n + 1) - 1);
    const between = (a: number) => text("choice.root.between", { a, b: a + 1 });
    const half = Math.floor(x / 2);
    return {
      stageId: "3.1.4",
      kind: "choice",
      prompt: text("choice.root.whichBetween"),
      display: `\\sqrt{${x}}`,
      ...shuffledOptions(rng, { text: between(n) }, [
        { option: { text: between(n + 1) }, why: text("choice.root.whyCheck", { n: n + 1, s: (n + 1) ** 2 }) },
        { option: { text: between(n - 1) }, why: text("choice.root.whyCheck", { n: n, s: n ** 2 }) },
        { option: { text: between(half) }, why: text("choice.root.whyHalf", { sq: x }) },
      ]),
      tip: text("choice.root.tipBetween"),
      explanation: text("choice.root.explainBetween", { x, a: n, b: n + 1, a2: n * n, b2: (n + 1) ** 2 }),
    };
  }
  const sq = n * n;
  return {
    stageId: "3.1.4",
    kind: "choice",
    prompt: text("choice.root.solve"),
    display: `x^2 = ${sq}`,
    ...shuffledOptions(rng, { text: text("choice.root.both", { n }) }, [
      { option: latex(`x = ${n}`), why: text("choice.root.whyBoth", { n }) },
      { option: latex(`x = ${tex(sq / 2)}`), why: text("choice.root.whyHalf", { sq }) },
      { option: latex(`x = -${n}`), why: text("choice.root.whyBoth", { n }) },
    ]),
    tip: text("choice.root.tipSolve"),
    explanation: text("choice.root.explainSolve", { n, sq }),
  };
}

export const NUMBER_CHOICES: Record<NumberChoiceStageId, (rng: Rng) => ChoiceProblem> = {
  "1.8.2": compare,
  "1.8.3": parity,
  "2.16.1": decimalPlace,
  "2.16.2": tenPowers,
  "2.16.3": orderDecimals,
  "2.17.1": temperature,
  "3.1.4": squareRoots,
};
