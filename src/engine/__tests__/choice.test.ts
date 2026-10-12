import { describe, expect, it } from "vitest";
import { CHOICE_QUESTIONS } from "../questions/choice";
import { optionKey, type ChoiceOption, type ChoiceProblem } from "../questions/choice/problem";
import { runProgram, type CodeLine, type QuestionScene } from "../questions/scene";
import { SORT_QUESTIONS } from "../questions/sort";
import { makeRng } from "../rng";

const N = 300;
const all = (stage: keyof typeof CHOICE_QUESTIONS.levels, seed = 1) => {
  const rng = makeRng(seed);
  return Array.from({ length: N }, () => CHOICE_QUESTIONS.levels[stage](rng));
};
/** A number option's value: "3{,}5", "-2", "\\frac{3}{4}". */
function valueOf(o: ChoiceOption): number {
  if (!("latex" in o)) throw new Error("not a number");
  const frac = o.latex.match(/^(-)?(?:(\d+)\\,)?\\d?frac\{(\d+)\}\{(\d+)\}$/);
  if (frac) return (frac[1] ? -1 : 1) * (Number(frac[2] ?? 0) + Number(frac[3]) / Number(frac[4]));
  return Number(o.latex.replace("{,}", "."));
}
const right = (p: ChoiceProblem) => p.options[p.correct];
const scene = <K extends QuestionScene["kind"]>(p: ChoiceProblem, kind: K) => {
  if (p.scene?.kind !== kind) throw new Error(`expected a ${kind}`);
  return p.scene as Extract<QuestionScene, { kind: K }>;
};

describe("every single-choice level", () => {
  it("offers 2-4 different options, the right one among them, and a reason (or none) for each", () => {
    for (const stage of Object.keys(CHOICE_QUESTIONS.levels) as (keyof typeof CHOICE_QUESTIONS.levels)[]) {
      for (const p of all(stage)) {
        expect(p.options.length, stage).toBeGreaterThanOrEqual(2);
        expect(p.options.length, stage).toBeLessThanOrEqual(4);
        expect(new Set(p.options.map(optionKey)).size, stage).toBe(p.options.length);
        expect(p.correct, stage).toBeGreaterThanOrEqual(0);
        expect(p.correct, stage).toBeLessThan(p.options.length);
        expect(p.whyNot ?? [], stage).toHaveLength(p.options.length);
        expect(p.whyNot?.[p.correct] ?? null, stage).toBeNull();
      }
    }
  });
});

describe("numbers", () => {
  it("1.8.2: the sign fits the numbers", () => {
    for (const p of all("1.8.2")) {
      const [a, b] = p.display!.split("\\quad \\square \\quad").map((x) => Number(x.trim()));
      expect(["<", ">", "="][p.correct]).toBe(a < b ? "<" : a > b ? ">" : "=");
    }
  });

  it("1.9.1: the right fraction is the coloured parts over all the parts, and no wrong option is worth the same", () => {
    for (const p of all("1.9.1")) {
      if (p.scene?.kind === "fraction") {
        expect(valueOf(right(p))).toBeCloseTo(p.scene.shaded / p.scene.parts);
        p.options.forEach((o, i) => i !== p.correct && expect(valueOf(o)).not.toBeCloseTo(valueOf(right(p))));
      } else if (p.scene?.kind === "share") {
        // Del av antal: s/p of n, shared out in p.
        const [s, parts] = String(p.prompt.vars!.name).replace("@fraction.", "").split("-").map(Number);
        expect(parts).toBe(p.scene.among);
        expect(valueOf(right(p))).toBe((p.scene.total / parts) * s);
      } else {
        // A picture to pick: only the right picture shows the fraction asked for.
        const values = p.options.map((o) => ("scene" in o && o.scene.kind === "fraction" ? o.scene.shaded / o.scene.parts : NaN));
        expect(values.filter((v) => Math.abs(v - values[p.correct]) < 1e-9)).toHaveLength(1);
      }
    }
  });

  it("2.16.2: the comma moves as many places as the zeros", () => {
    for (const p of all("2.16.2")) {
      const [n, op, f] = p.display!.split(" ");
      const x = Number(n.replace("{,}", "."));
      expect(valueOf(right(p))).toBeCloseTo(op === "\\cdot" ? x * Number(f) : x / Number(f), 9);
    }
  });

  it("2.16.3: the right one is the biggest (or smallest), and longer isn't always right", () => {
    let longestRight = 0;
    for (const p of all("2.16.3")) {
      const values = p.options.map(valueOf);
      const want = p.prompt.key.endsWith("biggest") ? Math.max(...values) : Math.min(...values);
      expect(values[p.correct]).toBe(want);
      const digits = p.options.map((o) => ("latex" in o ? o.latex.length : 0));
      if (digits[p.correct] === Math.max(...digits) && p.prompt.key.endsWith("biggest")) longestRight++;
    }
    expect(longestRight).toBe(0);
  });

  it("2.17.1: warmer is up, colder is down", () => {
    for (const p of all("2.17.1")) {
      if (p.scene?.kind !== "thermometer") continue;
      const { d } = p.prompt.vars as { d: number };
      const t = scene(p, "thermometer").value;
      expect(valueOf(right(p))).toBe(p.prompt.key.endsWith("warmer") ? t + d : t - d);
    }
  });
});

describe("shapes", () => {
  it("1.2.4: 'yes' exactly when every square has its mirror image", () => {
    let yes = 0;
    for (const p of all("1.2.4")) {
      const s = scene(p, "symmetry");
      const has = (c: number, r: number) => s.cells.some(([x, y]) => x === c && y === r);
      const mirror = ([c, r]: [number, number]): [number, number] => (s.line === "vertical" ? [2 * s.at - 1 - c, r] : [c, 2 * s.at - 1 - r]);
      const symmetric = s.cells.every((cell) => has(...mirror(cell)));
      expect(p.correct).toBe(symmetric ? 0 : 1);
      if (symmetric) yes++;
    }
    expect(yes / N).toBeGreaterThan(0.3);
    expect(yes / N).toBeLessThan(0.7);
  });
});

describe("chance", () => {
  it("2.18.1: the right chance is the count over the total, and no other option is worth as much", () => {
    for (const p of all("2.18.1")) {
      const v = valueOf(right(p));
      p.options.forEach((o, i) => i !== p.correct && expect(Math.abs(valueOf(o) - v)).toBeGreaterThan(1e-9));
      if (p.scene?.kind === "chance" && p.scene.device !== "die") {
        const total = p.scene.colors.reduce((s, c) => s + c.count, 0);
        const asked = p.scene.colors.find((c) => `@color.${c.color}` === p.prompt.vars?.color)!;
        expect(v).toBeCloseTo(asked.count / total);
      }
    }
  });
});

describe("programming", () => {
  it("the right letter is where the program takes the robot - and every square stays on the grid", () => {
    for (const stage of ["1.12.1", "2.19.2"] as const) {
      for (const p of all(stage)) {
        const s = scene(p, "robot");
        if (s.letters.length > 0 && s.program) {
          const end = runProgram(s.start, s.program);
          const letter = (right(p) as { plain: string }).plain;
          expect(s.letters.find((l) => l.letter === letter)!.at, stage).toEqual(end);
          for (const l of s.letters) expect(l.at[0] >= 0 && l.at[0] < s.w && l.at[1] >= 0 && l.at[1] < s.h, stage).toBe(true);
        }
        if (s.star) expect(s.star[0] >= 0 && s.star[0] < s.w && s.star[1] >= 0 && s.star[1] < s.h).toBe(true);
      }
    }
  });
});

describe("what an option can be", () => {
  it("every probability offered is between 0 and 1, never 1/1", () => {
    for (const stage of ["2.18.1"] as const)
      for (const p of all(stage)) for (const o of p.options) expect(valueOf(o) > 0 && valueOf(o) < 1, `${stage}: ${(o as { latex: string }).latex}`).toBe(true);
  });

  it("a temperature to count to is on the thermometer", () => {
    for (const p of all("2.17.1")) if (p.scene?.kind === "thermometer") expect(Math.abs(valueOf(right(p)))).toBeLessThanOrEqual(20);
  });
});

describe("loops", () => {
  it("a loop's moves never undo each other", () => {
    const opposite = { up: "down", down: "up", left: "right", right: "left" } as const;
    for (const p of all("2.19.2")) {
      const loop = scene(p, "robot").program!.find((s) => typeof s !== "string") as { moves: (keyof typeof opposite)[] };
      if (loop.moves.length === 2) expect(loop.moves[1]).not.toBe(opposite[loop.moves[0]]);
    }
  });
});

describe("fractions with pizza and chocolate", () => {
  /** No wrong option is worth what the right one is - 2/4 and 1/2 never both. */
  const noTwins = (p: ChoiceProblem) => p.options.forEach((o, i) => i !== p.correct && expect(Math.abs(valueOf(o) - valueOf(right(p)))).toBeGreaterThan(1e-9));

  it("1.9.2: what's left or eaten of the pizza, what's eaten of the bar, one share of a pizza", () => {
    for (const p of all("1.9.2")) {
      noTwins(p);
      if (p.scene?.kind === "chocolate") {
        const { rows, cols, eaten } = p.scene;
        expect(valueOf(right(p))).toBeCloseTo(eaten / (rows * cols));
      } else {
        const [pizza] = scene(p, "pizza").pizzas;
        const want = p.prompt.key.endsWith("Left") ? pizza.left : p.prompt.key.endsWith("Eaten") ? pizza.slices - pizza.left : 1;
        expect(valueOf(right(p))).toBeCloseTo(want / pizza.slices);
      }
    }
  });

  it("1.9.3: the one with more pizza - or the same, cut differently", () => {
    let same = 0;
    for (const p of all("1.9.3")) {
      const [a, b] = scene(p, "pizza").pizzas.map((z) => z.taken! / z.slices);
      expect(p.correct).toBe(Math.abs(a - b) < 1e-9 ? 2 : a > b ? 0 : 1);
      if (p.correct === 2) same++;
    }
    expect(same).toBeGreaterThan(0);
  });

  it("2.6.5: the right fraction is worth the same as the one asked about; the missing number makes them equal", () => {
    for (const p of all("2.6.5")) {
      const [, s, q] = p.display!.match(/^\\dfrac\{(\d+)\}\{(\d+)\}/)!.map(Number);
      if (p.prompt.key.endsWith("which")) {
        noTwins(p);
        expect(valueOf(right(p))).toBeCloseTo(s / q);
      } else {
        const P = Number(p.display!.match(/\\dfrac\{\\square\}\{(\d+)\}/)![1]);
        expect(valueOf(right(p)) / P).toBeCloseTo(s / q);
      }
    }
  });

  it("2.6.6: pizza eaten together adds the numerators; slices on the table make whole pizzas and a part", () => {
    for (const p of all("2.6.6")) {
      if (p.scene?.kind === "pizza") {
        noTwins(p);
        const pizzas = p.scene.pizzas;
        const slices = pizzas[0].slices;
        if (p.prompt.key.endsWith("mixed")) expect(valueOf(right(p))).toBeCloseTo(pizzas.reduce((n, z) => n + z.left, 0) / slices);
        else {
          const eaten = slices - pizzas[0].left;
          expect(valueOf(right(p))).toBeCloseTo((p.prompt.key.endsWith("together") ? eaten : pizzas[0].left) / slices);
          // 5/5 or 12/10 would be a whole pizza or more, not a part of one.
          for (const o of p.options) expect(valueOf(o)).toBeLessThan(1);
          expect(p.options.length).toBeGreaterThanOrEqual(3);
        }
      } else {
        // Part of a chocolate bar: never just a coin toss, not even for 1/2.
        expect(p.options.length).toBeGreaterThanOrEqual(3);
      }
    }
  });
});

// --- Förskoleklass to åk 9 -------------------------------------------------------------

/** A measure or a sum written out - "350 g", "1,5 kg", "2 121,80 kr", "08:15" - as a number (minutes for a time). */
function amount(o: ChoiceOption): number {
  if ("latex" in o) return valueOf(o);
  if (!("plain" in o)) throw new Error("not an amount");
  const clock = o.plain.match(/^(\d\d):(\d\d)$/);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);
  return Number(o.plain.replace(/(\d) (?=\d)/g, "$1").replace(",", ".").match(/^-?[\d.]+/)![0]);
}
const key = (o: ChoiceOption) => ("text" in o ? o.text.key : "");
const vars = (p: ChoiceProblem) => (p.prompt.vars ?? {}) as Record<string, number | string>;

describe("förskoleklass", () => {
  it("0.1.1: the number of things - or the one picture with that many", () => {
    for (const p of all("0.1.1")) {
      if (p.scene) expect(valueOf(right(p))).toBe(scene(p, "count").groups[0].n);
      else {
        const counts = p.options.map((o) => ("scene" in o && o.scene.kind === "count" ? o.scene.groups[0].n : -1));
        expect(counts[p.correct]).toBe(vars(p).n);
        expect(counts.filter((n) => n === vars(p).n)).toHaveLength(1);
      }
    }
  });

  it("0.1.2: more, fewer or the same - and how many more", () => {
    for (const p of all("0.1.2")) {
      const [a, b] = scene(p, "count").groups.map((g) => g.n);
      if (p.prompt.key.endsWith("howManyMore")) expect(valueOf(right(p))).toBe(Math.abs(a - b));
      else {
        const fewer = p.prompt.key.endsWith("fewer");
        expect(p.correct).toBe(a === b ? 2 : (a > b) !== fewer ? 0 : 1);
      }
    }
  });

  it("0.1.3: the number after, before, between", () => {
    for (const p of all("0.1.3")) {
      const v = vars(p) as Record<string, number>;
      const want = p.prompt.key.endsWith("after") ? v.n + 1 : p.prompt.key.endsWith("before") ? v.n - 1 : v.a + 1;
      expect(valueOf(right(p))).toBe(want);
    }
  });

  it("0.1.4: places in the queue are counted from the flag", () => {
    for (const p of all("0.1.4")) {
      const { animals } = scene(p, "queue");
      if (p.prompt.key.endsWith("who")) {
        const place = Number(String(vars(p).ord).split(".")[1]);
        expect(key(right(p))).toBe(`animal.${animals[place - 1]}`);
      } else {
        const animal = String(vars(p).animal).replace("@animal.", "");
        expect(key(right(p))).toBe(`ordinal.${animals.indexOf(animal as never) + 1}`);
      }
    }
  });

  it("0.2.1: the next shape continues the repeating part - and only one option does", () => {
    const same = (a: { shape: string; color: string }, b: { shape: string; color: string }) => a.shape === b.shape && a.color === b.color;
    for (const p of all("0.2.1")) {
      const row = scene(p, "pattern").items;
      const period = [2, 3, 4].find((k) => row.every((it, i) => i < k || same(it, row[i - k])))!;
      const next = row[row.length - period];
      const items = p.options.map((o) => ("scene" in o && o.scene.kind === "pattern" ? o.scene.items[0] : null)!);
      expect(same(items[p.correct], next)).toBe(true);
      expect(items.filter((it) => same(it, next))).toHaveLength(1);
    }
  });

  it("0.3.1: what's under, over, beside or between is what the shelf has there", () => {
    const step = { under: [1, 0], over: [-1, 0], left: [0, -1], right: [0, 1] } as const;
    for (const p of all("0.3.1")) {
      const { rows } = scene(p, "shelf");
      const find = (thing: string) => {
        for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) if (rows[r][c] === thing) return [r, c];
        throw new Error(`no ${thing}`);
      };
      const v = vars(p) as Record<string, string>;
      const name = (s: string) => s.replace("@thing.", "");
      let want: string | null;
      if (p.prompt.key.endsWith("between")) {
        const [r, c] = find(name(v.a));
        want = rows[r][c + 1];
      } else {
        const [r, c] = find(name(v.thing));
        const [dr, dc] = step[v.where.replace("@where.", "") as keyof typeof step];
        want = rows[r + dr][c + dc];
      }
      expect(key(right(p))).toBe(`thing.${want}`);
    }
  });

  it("0.3.2: the longest ribbon in squares, the heavier side of the balance", () => {
    for (const p of all("0.3.2")) {
      if (p.scene?.kind === "lengths") {
        const lengths = p.scene.ribbons.map((r) => r.length);
        expect(lengths[p.correct]).toBe(p.prompt.key.endsWith("shortest") ? Math.min(...lengths) : Math.max(...lengths));
      } else {
        const { heavier } = scene(p, "weigh");
        const lightest = p.prompt.key.endsWith("lightest");
        expect(p.correct).toBe(heavier === "same" ? 2 : (heavier === "left") !== lightest ? 0 : 1);
      }
    }
  });
});

describe("measuring and data", () => {
  it("1.10.2: the needle's grams, and grams in kilograms", () => {
    for (const p of all("1.10.2")) {
      const { grams } = scene(p, "kitchenScale");
      expect(amount(right(p))).toBeCloseTo(p.prompt.key.endsWith("inKg") ? grams / 1000 : grams);
    }
  });

  it("1.10.3: the jug in dl, what's missing to a litre, more or less than half", () => {
    for (const p of all("1.10.3")) {
      const { dl } = scene(p, "jug");
      if (p.prompt.key.endsWith("read")) expect(amount(right(p))).toBe(dl);
      else if (p.prompt.key.endsWith("toLitre")) expect(amount(right(p))).toBe(10 - dl);
      else expect(p.correct).toBe(dl > 5 ? 0 : dl < 5 ? 1 : 2);
    }
  });

  it("2.12.2: the kind of angle, and about how big it is", () => {
    const kinds = ["acute", "right", "obtuse", "straight"];
    for (const p of all("2.12.2")) {
      const { degrees } = scene(p, "angle");
      if (p.prompt.key.endsWith("kind")) expect(kinds[p.correct]).toBe(degrees < 90 ? "acute" : degrees === 90 ? "right" : degrees < 180 ? "obtuse" : "straight");
      else {
        expect(amount(right(p))).toBe(degrees);
        p.options.forEach((o, i) => i !== p.correct && expect(Math.abs(amount(o) - degrees)).toBeGreaterThanOrEqual(10));
      }
    }
  });

  it("2.12.3: scale - map distances in metres, drawings made bigger or smaller", () => {
    for (const p of all("2.12.3")) {
      const v = vars(p) as Record<string, number>;
      const want = p.prompt.key.endsWith("map") ? (v.d * v.s) / 100 : p.prompt.key.endsWith("drawing") ? v.b * v.k : v.b / v.k;
      expect(amount(right(p))).toBe(want);
    }
  });

  it("1.13.1: tally marks counted, the most votes, two rows together", () => {
    for (const p of all("1.13.1")) {
      const { rows } = scene(p, "tally");
      const count = (x: string | number) => rows.find((r) => `@${r.label}` === x)!.count;
      const v = vars(p);
      if (p.prompt.key.endsWith("howMany")) expect(valueOf(right(p))).toBe(count(v.x));
      else if (p.prompt.key.endsWith("together")) expect(valueOf(right(p))).toBe(count(v.x) + count(v.y));
      else expect(key(right(p))).toBe(rows.reduce((a, b) => (b.count > a.count ? b : a)).label);
    }
  });

  it("2.8.6: the pie's part as a fraction or percent, as pupils, and the biggest", () => {
    for (const p of all("2.8.6")) {
      const { sectors, total } = scene(p, "pie");
      const v = vars(p);
      const parts = v.x ? sectors.find((s) => `@${s.label}` === v.x)!.parts : 0;
      if (p.prompt.key.endsWith("fraction")) expect(valueOf(right(p))).toBeCloseTo(parts / total);
      else if (p.prompt.key.endsWith("percent")) expect(amount(right(p))).toBeCloseTo((100 * parts) / total);
      else if (p.prompt.key.endsWith("howMany")) expect(valueOf(right(p))).toBe((Number(v.n) * parts) / total);
      else expect(key(right(p))).toBe(sectors.reduce((a, b) => (b.parts > a.parts ? b : a)).label);
      expect(sectors.reduce((s, x) => s + x.parts, 0)).toBe(total);
    }
  });

  it("2.9.7: the timetable read along the right bus, and the latest bus that's in time", () => {
    for (const p of all("2.9.7")) {
      const { stops, times } = scene(p, "timetable");
      const v = vars(p) as Record<string, string>;
      const minutes = (t: string) => amount({ plain: t });
      if (p.prompt.key.endsWith("when")) {
        const d = times[0].indexOf(v.t);
        expect(right(p)).toEqual({ plain: times[stops.indexOf(v.to)][d] });
      } else if (p.prompt.key.endsWith("howLong")) {
        const [a, b] = [stops.indexOf(v.from), stops.indexOf(v.to)];
        expect(amount(right(p))).toBe(minutes(times[b][0]) - minutes(times[a][0]));
      } else {
        const row = times[stops.indexOf(v.to)].map(minutes);
        const latest = row.filter((t) => t <= minutes(v.by)).length - 1;
        expect(p.correct).toBe(latest);
      }
    }
  });

  it("3.7.3: the median for typical values with an outlier; the outlier is the far one", () => {
    for (const p of all("3.7.3")) {
      const values = p.display!.split(" \\quad ").map(Number);
      const biggest = Math.max(...values);
      const rest = values.filter((x) => x !== biggest);
      expect(biggest).toBeGreaterThan(2 * Math.max(...rest));
      if (p.prompt.key.endsWith("which")) expect(key(right(p))).toBe("choice.typical.median");
      if (p.prompt.key.endsWith("outlier")) expect(valueOf(right(p))).toBe(biggest);
      if (p.prompt.key.endsWith("remove.mean")) expect(key(right(p))).toBe("choice.typical.lower");
    }
  });
});

/** y = kx + m read back from its LaTeX: y = 2x - 3, y = -\frac{1}{2}x + 1, s = 3n + 2. */
function parseLine(latex: string): { k: number; m: number } {
  const f = latex.match(/^\w = (-)?(?:\\frac\{(\d+)\}\{(\d+)\}|(\d+))?([a-z])?(?: ([+-]) (\d+))?$/);
  if (!f) throw new Error(`not a line: ${latex}`);
  const [, minus, num, den, whole, v, sign, m] = f;
  if (!v) return { k: 0, m: Number(`${minus ?? ""}${whole}`) };
  const size = num ? Number(num) / Number(den) : whole ? Number(whole) : 1;
  return { k: (minus ? -1 : 1) * size, m: m ? (sign === "-" ? -1 : 1) * Number(m) : 0 };
}

describe("graphs, formulas and inequalities", () => {
  it("2.11.3: prices off a line through the origin; the proportional graph is straight through (0, 0)", () => {
    for (const p of all("2.11.3")) {
      if (!p.scene) {
        const pts = (right(p) as { scene: Extract<QuestionScene, { kind: "graph" }> }).scene.lines[0].points;
        expect(pts[0]).toEqual([0, 0]);
        continue;
      }
      const k = scene(p, "graph").lines[0].points[1][1] / 6;
      const v = vars(p) as Record<string, number>;
      const want = p.prompt.key.endsWith("cost") ? k * v.x : p.prompt.key.endsWith("buys") ? v.y / k : k;
      expect(amount(right(p))).toBeCloseTo(want);
    }
  });

  it("3.10.1: the formula, k, m and a y all fit the line drawn", () => {
    for (const p of all("3.10.1")) {
      const [[x0, y0], [x1, y1]] = scene(p, "graph").lines[0].points;
      const k = (y1 - y0) / (x1 - x0);
      const m = y0 - k * x0;
      const r = right(p) as { latex: string };
      if (p.prompt.key.endsWith("formula")) {
        const line = parseLine(r.latex);
        expect(line.k).toBeCloseTo(k);
        expect(line.m).toBeCloseTo(m);
      } else if (p.prompt.key.endsWith(".k")) expect(valueOf(r)).toBeCloseTo(k);
      else if (p.prompt.key.endsWith(".m")) expect(valueOf(r)).toBeCloseTo(m);
      else expect(valueOf(r)).toBeCloseTo(k * Number(vars(p).x) + m);
    }
  });

  it("3.10.2: the formula fits every column of the table; the sticks fit figures 1 to 3", () => {
    for (const p of all("3.10.2")) {
      const v = vars(p) as Record<string, number>;
      if (p.display) {
        const ys = p.display.split("\\hline y & ")[1].split(" \\end")[0].split(" & ").map(Number);
        const { k, m } = parseLine((right(p) as { latex: string }).latex);
        ys.forEach((y, x) => expect(k * x + m).toBe(y));
      } else if (p.prompt.key.endsWith("formula")) {
        const { k, m } = parseLine((right(p) as { latex: string }).latex);
        [v.a, v.b, v.c].forEach((s, i) => expect(k * (i + 1) + m).toBe(s));
      } else {
        const d = v.b - v.a;
        expect(valueOf(right(p))).toBe(v.a + d * (v.n - 1));
      }
    }
  });

  it("3.3.8: the number makes the inequality true, the solution is the right side - and no wrong number is true", () => {
    for (const p of all("3.3.8")) {
      const [, lhs, sign, c] = p.display!.match(/^(.*) ([<>]) (-?\d+)$/)!;
      const { k, m } = parseLine(`y = ${lhs}`);
      const holds = (x: number) => (sign === ">" ? k * x + m > Number(c) : k * x + m < Number(c));
      if (p.prompt.key.endsWith("which")) p.options.forEach((o, i) => expect(holds(valueOf(o)), String(i)).toBe(i === p.correct));
      else {
        const [, s, b] = (right(p) as { latex: string }).latex.match(/^x ([<>]) (-?\d+)$/)!;
        for (const d of [0.5, 3]) {
          expect(holds(Number(b) + d)).toBe(s === ">");
          expect(holds(Number(b) - d)).toBe(s === "<");
        }
      }
    }
  });
});

describe("percent, roots and geometry, åk 7-9", () => {
  it("3.1.4: the root of a square, the whole numbers around a root, both solutions", () => {
    for (const p of all("3.1.4")) {
      // The number under the root, or on the right of x^2 = 49.
      const n = Number(p.display!.match(/(\d+)\}?$/)![1]);
      const r = right(p);
      const textVars = ("text" in r ? r.text.vars : {}) as Record<string, number>;
      if (p.prompt.key.endsWith("value")) expect(valueOf(r) ** 2).toBe(n);
      else if (p.prompt.key.endsWith("whichBetween")) expect(textVars.a ** 2 < n && n < textVars.b ** 2).toBe(true);
      else expect(textVars.n ** 2).toBe(n);
    }
  });

  it("3.2.3: percentage points are the difference, percent the difference over where it started", () => {
    for (const p of all("3.2.3")) {
      const { a, b } = vars(p) as Record<string, number>;
      const r = right(p);
      if (p.prompt.key.includes("howMany")) expect("text" in r && r.text.vars?.n).toBe(Math.abs(b - a));
      else expect(amount(r)).toBe((100 * Math.abs(b - a)) / a);
    }
  });

  it("3.2.4: a year's interest added, and two years of interest on interest", () => {
    for (const p of all("3.2.4")) {
      const v = vars(p);
      const k = Number(String(v.k).replace(/\s/g, ""));
      const f = 1 + Number(v.r) / 100;
      expect(amount(right(p))).toBeCloseTo(p.prompt.key.endsWith("oneYear") ? k * f : k * f * f, 1);
    }
  });

  it("3.4.9: x is the matching small side times the scale", () => {
    for (const p of all("3.4.9")) {
      const s = scene(p, "similar");
      const asked = s.big.indexOf("x");
      expect(amount(right(p))).toBeCloseTo(s.sides[asked] * s.k);
      const known = s.big.findIndex((x) => typeof x === "number");
      expect(s.big[known]).toBeCloseTo(s.sides[known] * s.k);
    }
  });

  it("3.4.10: opposite angles are equal, angles side by side make 180°", () => {
    for (const p of all("3.4.10")) {
      const { degrees, given, asked } = scene(p, "crossing");
      const at = (i: number) => (i % 2 === 0 ? degrees : 180 - degrees);
      expect(amount(right(p))).toBe(at(asked));
      expect(given).not.toBe(asked);
    }
  });

  it("3.4.11: the surface area is every face, each pair twice", () => {
    for (const p of all("3.4.11")) {
      const { l, w, h } = scene(p, "cuboid");
      expect(amount(right(p))).toBe(2 * (l * w + l * h + w * h));
    }
  });
});

/** Runs a program of `code` lines - the meaning each line's key has - and gives what it prints. */
function runCode(lines: readonly CodeLine[]): (number | string)[] {
  const env: Record<string, number> = {};
  const out: (number | string)[] = [];
  const val = (x: string | number | undefined) => (typeof x === "number" ? x : env[x!]);
  const blockEnd = (from: number, indent: number) => {
    let to = from;
    while (to < lines.length && lines[to].indent > indent) to++;
    return to;
  };
  const exec = (from: number, to: number) => {
    let i = from;
    while (i < to) {
      const { key: k, vars: v = {}, indent } = lines[i];
      const end = blockEnd(i + 1, indent);
      if (k === "code.set") env[v.v as string] = val(v.n);
      else if (k === "code.setOp") {
        const [a, b] = [val(v.w), val(v.n)];
        env[v.v as string] = v.op === "+" ? a + b : v.op === "·" ? a * b : v.op === "/" ? a / b : a - b;
      } else if (k === "code.print") out.push(val(v.v));
      else if (k === "code.printTwo") out.push(val(v.v), val(v.w));
      else if (k === "code.printText") out.push(String(v.s));
      else if (k === "code.ifEven" || k === "code.ifGreater") {
        const yes = k === "code.ifEven" ? val(v.v) % 2 === 0 : val(v.v) > Number(v.n);
        const hasElse = end < to && lines[end].key === "code.else" && lines[end].indent === indent;
        const elseEnd = hasElse ? blockEnd(end + 1, indent) : end;
        if (yes) exec(i + 1, end);
        else if (hasElse) exec(end + 1, elseEnd);
        i = elseEnd;
        continue;
      } else if (k === "code.repeat") for (let r = 0; r < Number(v.n); r++) exec(i + 1, end);
      else if (k === "code.for") for (env[v.v as string] = Number(v.a); env[v.v as string] <= Number(v.b); env[v.v as string]++) exec(i + 1, end);
      else if (k === "code.while") while (val(v.v) < Number(v.n)) exec(i + 1, end);
      else throw new Error(`unknown line ${k}`);
      i = end;
    }
  };
  exec(0, lines.length);
  return out;
}

describe("programs", () => {
  it("2.19.3 and 3.9.1: the right option is what the program prints", () => {
    for (const stage of ["2.19.3", "3.9.1"] as const) {
      for (const p of all(stage)) {
        const out = runCode(scene(p, "code").lines);
        const r = right(p);
        if ("latex" in r) expect(out, stage).toEqual([valueOf(r)]);
        else if ("text" in r && r.text.key === "code.out.ab") expect(out).toEqual([r.text.vars!.a, r.text.vars!.b]);
        else expect(out).toEqual([`@${(r as { text: { key: string } }).text.key}`]);
      }
    }
  });
});

describe("misleading charts and missing lines", () => {
  it("3.7.4: the misleading chart is the one cut above 0; the fair one starts at 0; C's real increase over A", () => {
    const from = (o: ChoiceOption) => ("scene" in o && o.scene.kind === "bars" ? o.scene.from : NaN);
    for (const p of all("3.7.4")) {
      if (p.prompt.key.endsWith("misleading")) p.options.forEach((o, i) => expect(from(o) > 0).toBe(i === p.correct));
      else if (p.prompt.key.endsWith("fair")) p.options.forEach((o, i) => expect(from(o) === 0).toBe(i === p.correct));
      else {
        const [a, , c] = scene(p, "bars").values;
        expect(amount(right(p))).toBe(((c - a) / a) * 100);
      }
    }
  });

  it("3.9.2: only the right line makes the program print what it should", () => {
    for (const p of all("3.9.2")) {
      const lines = scene(p, "code").lines;
      const at = lines.findIndex((l) => l.key === "code.missing");
      const n = Number(vars(p).n);
      const want = p.prompt.key.endsWith("sum") ? [(n * (n + 1)) / 2] : p.prompt.key.endsWith("count") ? [Math.floor(n / 2)] : String(vars(p).list).split(", ").map(Number);
      p.options.forEach((o, i) => {
        const { key: k, vars: v } = (o as { text: { key: string; vars: CodeLine["vars"] } }).text;
        const program = lines.map((l, j) => (j === at ? { indent: l.indent, key: k, vars: v } : l));
        expect(JSON.stringify(runCode(program)) === JSON.stringify(want), `${k} ${JSON.stringify(v)}`).toBe(i === p.correct);
      });
    }
  });
});

describe("batch five: measuring, geometry, numbers, money", () => {
  it("2.12.4: the reading is on the scale that starts at the first arm", () => {
    for (const p of all("2.12.4")) expect(amount(right(p))).toBe(scene(p, "protractor").degrees);
  });

  it("2.4.7: the area is half the box round a triangle, base times height for a parallelogram", () => {
    for (const p of all("2.4.7")) {
      const pts = scene(p, "gridShape").points;
      const twice = Math.abs(pts.reduce((s, [x, y], i) => s + x * pts[(i + 1) % pts.length][1] - pts[(i + 1) % pts.length][0] * y, 0));
      expect(valueOf(right(p))).toBe(twice / 2);
    }
  });

  it("2.4.8: the net that folds into a cube has no 2 × 2 block and no five in a row - and the others do", () => {
    const folds = (cells: [number, number][]) => {
      const has = (c: number, r: number) => cells.some(([x, y]) => x === c && y === r);
      const block = cells.some(([c, r]) => has(c + 1, r) && has(c, r + 1) && has(c + 1, r + 1));
      const five = cells.some(([c, r]) => [1, 2, 3, 4].every((d) => has(c + d, r)) || [1, 2, 3, 4].every((d) => has(c, r + d)));
      return cells.length === 6 && !block && !five;
    };
    for (const p of all("2.4.8")) {
      const nets = p.options.map((o) => ("scene" in o && o.scene.kind === "net" ? o.scene.cells : []));
      const want = p.prompt.key.endsWith("whichNot") ? false : true;
      nets.forEach((n, i) => expect(folds(n), JSON.stringify(n)).toBe(i === p.correct ? want : !want));
    }
  });

  it("3.4.15: the congruent triangle has the same three sides; the others don't", () => {
    const sorted = (s: number[]) => [...s].sort((x, y) => x - y).join();
    for (const p of all("3.4.15")) {
      const sides = sorted(scene(p, "triangle").sides);
      p.options.forEach((o, i) => expect(sorted(("scene" in o && o.scene.kind === "triangle" ? o.scene.sides : []) as number[]) === sides).toBe(i === p.correct));
    }
  });

  it("2.10.4: the reasonable answer is the product; the others are ten times off or a sum", () => {
    for (const p of all("2.10.4")) {
      if (p.display) {
        const [a, b] = p.display.split(" \\cdot ").map(Number);
        expect(amount(right(p))).toBe(a * b);
      } else {
        const v = vars(p) as Record<string, string>;
        const num = (s: string) => Number(s.replace(/\s/g, "").replace(",", "."));
        expect(amount(right(p))).toBeCloseTo(num(v.kg) * num(v.p), 2);
      }
    }
  });

  it("2.15.4: the factorisation is all primes and multiplies to the number; no wrong one is both", () => {
    const isPrime = (n: number) => n > 1 && Array.from({ length: n - 2 }, (_, i) => i + 2).every((d) => n % d !== 0);
    for (const p of all("2.15.4")) {
      const n = Number(p.display);
      const ok = (o: ChoiceOption) => {
        const fs = (o as { latex: string }).latex.split(" \\cdot ").map(Number);
        return fs.every(isPrime) && fs.reduce((x, y) => x * y, 1) === n;
      };
      p.options.forEach((o, i) => expect(ok(o)).toBe(i === p.correct));
    }
  });

  it("3.2.5: the sale price, the price with VAT, and the price without (divided by 1,25)", () => {
    for (const p of all("3.2.5")) {
      const v = vars(p) as Record<string, number>;
      const want = p.prompt.key.endsWith("sale.prompt") ? v.k * (1 - v.p / 100) : p.prompt.key.endsWith("add") ? v.k * 1.25 : v.k / 1.25;
      expect(amount(right(p))).toBeCloseTo(want, 2);
    }
  });

  it("3.2.6: the monthly repayment, and a month's interest", () => {
    for (const p of all("3.2.6")) {
      const v = vars(p) as Record<string, string | number>;
      const k = Number(String(v.k).replace(/\s/g, ""));
      const want = p.prompt.key.endsWith("amortise") ? k / (12 * Number(v.y)) : (k * Number(v.r)) / 100 / 12;
      expect(amount(right(p))).toBeCloseTo(want, 2);
    }
  });

  it("2.9.11: litres are the volume in dm³", () => {
    for (const p of all("2.9.11")) {
      const { l, w, h, unit } = scene(p, "cuboid");
      expect(amount(right(p))).toBeCloseTo(unit === "cm" ? (l * w * h) / 1000 : l * w * h, 6);
    }
  });
});

describe("ordering a program", () => {
  it("3.9.3: in the answer's order the program prints the number asked", () => {
    const rng = makeRng(1);
    for (let i = 0; i < 300; i++) {
      const p = SORT_QUESTIONS.levels["3.9.3"](rng);
      const lines = p.answer.map((k) => {
        const o = p.items[k] as { text: { key: string; vars: CodeLine["vars"] } };
        return { indent: 0, key: o.text.key, vars: o.text.vars };
      });
      expect(runCode(lines)).toEqual([Number(p.prompt.vars!.r)]);
    }
  });
});

describe("estimating and a budget", () => {
  const of = (stage: "1.8.8" | "3.2.7") => {
    const rng = makeRng(5);
    return Array.from({ length: 300 }, () => CHOICE_QUESTIONS.levels[stage](rng));
  };
  const amount = (o: ChoiceOption) => Number(("text" in o ? o.text.vars!.n : ("plain" in o ? o.plain : "")).toString().replace(/[^\d,]/g, "").replace(",", "."));

  it("1.8.8: the jar holds the count, the right estimate is the nearest ten, and the others are far off", () => {
    for (const p of of("1.8.8")) {
      const n = p.scene?.kind === "jar" ? p.scene.at.length : 0;
      expect(n).toBeGreaterThanOrEqual(15);
      const values = p.options.map(amount);
      expect(values[p.correct]).toBe(Math.round(n / 10) * 10);
      values.forEach((v, i) => i !== p.correct && expect(v <= n / 3 || v >= n * 2.5).toBe(true));
      // Every thing can be seen: none lies on another.
      const at = (p.scene as Extract<QuestionScene, { kind: "jar" }>).at;
      for (let i = 0; i < at.length; i++) for (let j = i + 1; j < at.length; j++) expect(Math.hypot(at[i][0] - at[j][0], at[i][1] - at[j][1])).toBeGreaterThan(0.05);
    }
  });

  it("3.2.7: the right answer is what the budget says", () => {
    for (const p of of("3.2.7")) {
      const scene = p.scene as Extract<QuestionScene, { kind: "budget" }>;
      const salary = scene.income[0].kr;
      const out = scene.costs.reduce((s, c) => s + c.kr, 0);
      const right = p.options[p.correct];
      if (p.prompt.key === "choice.budget.left") expect(amount(right)).toBe(salary - out);
      if (p.prompt.key === "choice.budget.months") {
        const price = Number(String(p.prompt.vars!.p).replace(/\D/g, ""));
        expect(amount(right)).toBe(Math.ceil(price / (salary - out)));
      }
      if (p.prompt.key === "choice.budget.rentShare") expect(amount(right)).toBe((100 * scene.costs[0].kr) / salary);
      expect(new Set(p.options.map(optionKey)).size).toBe(p.options.length);
    }
  });
});
