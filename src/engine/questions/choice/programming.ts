/**
 * Programming - a robot on a grid, moved by a program of arrows, as
 * single-choice questions:
 *
 *   1.12.1 följ instruktionerna (Lgr22 åk 1-3: stegvisa instruktioner som grund
 *          för programmering) - where does the robot end up? which program takes it to the star?
 *   2.19.2 loopar (åk 4-6: algoritmer och programmering) - a program with
 *          "upprepa": where does it end up, how many steps?
 *
 * The squares to pick among are where the usual slips take the robot: a
 * step missed, left and right mixed up, a loop done once.
 */
import { pick, randInt, shuffle, type Rng } from "../../rng";
import { runProgram, type Move, type ProgramStep } from "../scene";
import { fixedOptions, shuffledOptions, text, type ChoiceProblem, type ChoiceText, type Slip } from "./problem";

export type ProgrammingChoiceStageId = "1.12.1" | "2.19.2";

const W = 5;
const H = 5;
const MOVES: readonly Move[] = ["up", "down", "left", "right"];
const ARROW: Record<Move, string> = { up: "↑", down: "↓", left: "←", right: "→" };
const LETTERS = ["A", "B", "C", "D"];

const inside = ([x, y]: [number, number]) => x >= 0 && x < W && y >= 0 && y < H;
const same = (a: [number, number], b: [number, number]) => a[0] === b[0] && a[1] === b[1];
const mirrorX: Record<Move, Move> = { up: "up", down: "down", left: "right", right: "left" };
const mirrorY: Record<Move, Move> = { up: "down", down: "up", left: "left", right: "right" };
const OPPOSITE: Record<Move, Move> = { up: "down", down: "up", left: "right", right: "left" };
const mapMoves = (program: readonly ProgramStep[], f: (m: Move) => Move): ProgramStep[] => program.map((s) => (typeof s === "string" ? f(s) : { ...s, moves: s.moves.map(f) }));

/** A program as it's written: "→ → ↑", "3 × (→ ↑)". */
export function programText(program: readonly ProgramStep[]): string {
  return program.map((s) => (typeof s === "string" ? ARROW[s] : `${s.repeat} × (${s.moves.map((m) => ARROW[m]).join(" ")})`)).join(" ");
}

/** Every square a program passes - inside the grid all the way? */
function staysInside(start: [number, number], program: readonly ProgramStep[]): boolean {
  const flat: Move[] = program.flatMap((s) => (typeof s === "string" ? [s] : Array.from({ length: s.repeat }, () => s.moves).flat()));
  let at = start;
  for (const m of flat) {
    at = runProgram(at, [m]);
    if (!inside(at)) return false;
  }
  return true;
}

/** A start and a program that stays on the grid and ends somewhere else. */
function walk(rng: Rng, make: () => ProgramStep[]): { start: [number, number]; program: ProgramStep[]; end: [number, number] } {
  for (;;) {
    const start: [number, number] = [randInt(rng, 0, W - 1), randInt(rng, 0, H - 1)];
    const program = make();
    const end = runProgram(start, program);
    if (staysInside(start, program) && !same(start, end)) return { start, program, end };
  }
}

/**
 * Lettered squares: the end and where the slips lead (the ones on the grid,
 * not the end or each other), topped up with nearby squares - shuffled
 * under A-D. The options are the letters, in order.
 */
function letteredEnd(rng: Rng, start: [number, number], end: [number, number], slips: { program: ProgramStep[]; why: ChoiceText }[]) {
  const squares: { at: [number, number]; why: ChoiceText | null }[] = [{ at: end, why: null }];
  const taken = (p: [number, number]) => squares.some((s) => same(s.at, p)) || same(p, start);
  for (const s of slips) {
    const at = runProgram(start, s.program);
    if (squares.length < 4 && inside(at) && !taken(at)) squares.push({ at, why: s.why });
  }
  while (squares.length < 4) {
    const at: [number, number] = [randInt(rng, 0, W - 1), randInt(rng, 0, H - 1)];
    if (!taken(at)) squares.push({ at, why: text("choice.robot.whyCount") });
  }
  const order = shuffle(rng, squares);
  const correct = order.findIndex((s) => s.why === null);
  return {
    letters: order.map((s, i) => ({ at: s.at, letter: LETTERS[i] })),
    ...fixedOptions(
      LETTERS.map((l) => ({ plain: l })),
      correct,
      order.map((s) => s.why)
    ),
  };
}

/** 1.12.1: a program of 3-6 arrows - where does it take the robot? Or which program goes to the star? */
function followProgram(rng: Rng): ChoiceProblem {
  const { start, program, end } = walk(rng, () => Array.from({ length: randInt(rng, 3, 6) }, () => pick(rng, MOVES)));
  const slips = [
    { program: program.slice(0, -1), why: text("choice.robot.whyMissed") },
    { program: mapMoves(program, (m) => mirrorX[m]), why: text("choice.robot.whyLeftRight") },
    { program: mapMoves(program, (m) => mirrorY[m]), why: text("choice.robot.whyUpDown") },
    { program: program.slice(1), why: text("choice.robot.whyMissed") },
    { program: [...program, program[program.length - 1]], why: text("choice.robot.whyExtra") },
  ];
  if (rng() < 0.6) {
    const l = letteredEnd(rng, start, end, slips);
    return {
      stageId: "1.12.1",
      kind: "choice",
      prompt: text("choice.robot.whereEnds"),
      scene: { kind: "robot", w: W, h: H, start, program, letters: l.letters },
      options: l.options,
      correct: l.correct,
      whyNot: l.whyNot,
      tip: text("choice.robot.tip"),
      explanation: text("choice.robot.explainEnds", { program: programText(program) }),
    };
  }
  // Which program: the right one among programs that end elsewhere.
  const wrong: Slip[] = slips
    .filter((s) => s.program.length > 0 && !same(runProgram(start, s.program), end))
    .map((s) => ({ option: { plain: programText(s.program) }, why: s.why }));
  return {
    stageId: "1.12.1",
    kind: "choice",
    prompt: text("choice.robot.whichProgram"),
    scene: { kind: "robot", w: W, h: H, start, letters: [], star: end },
    ...shuffledOptions(rng, { plain: programText(program) }, wrong),
    tip: text("choice.robot.tipWhich"),
    explanation: text("choice.robot.explainWhich", { program: programText(program) }),
  };
}

/** 2.19.2: a loop - "upprepa 3 gånger: → ↑" - and a move or two around it. */
function loops(rng: Rng): ChoiceProblem {
  const { start, program, end } = walk(rng, () => {
    const repeat = randInt(rng, 2, 4);
    // A loop that gets somewhere: two moves never undo each other (↓ ↑).
    const first = pick(rng, MOVES);
    const body = rng() < 0.5 ? [first] : [first, pick(rng, MOVES.filter((m) => m !== OPPOSITE[first]))];
    const loop: ProgramStep = { repeat, moves: body };
    const extra = rng() < 0.6 ? [pick(rng, MOVES)] : [];
    return rng() < 0.5 ? [loop, ...extra] : [...extra, loop];
  });
  const loop = program.find((s): s is Extract<ProgramStep, { repeat: number }> => typeof s !== "string")!;
  const withRepeat = (n: number) => program.map((s) => (typeof s === "string" ? s : { ...s, repeat: n }));
  if (rng() < 0.65) {
    const slips = [
      { program: withRepeat(1), why: text("choice.robot.whyOnce", { n: loop.repeat }) },
      { program: withRepeat(loop.repeat + 1), why: text("choice.robot.whyRepeat", { n: loop.repeat }) },
      { program: withRepeat(loop.repeat - 1), why: text("choice.robot.whyRepeat", { n: loop.repeat }) },
      { program: program.filter((s) => typeof s !== "string"), why: text("choice.robot.whyMissed") },
      { program: mapMoves(program, (m) => mirrorX[m]), why: text("choice.robot.whyLeftRight") },
    ];
    const l = letteredEnd(rng, start, end, slips);
    return {
      stageId: "2.19.2",
      kind: "choice",
      prompt: text("choice.robot.whereEnds"),
      scene: { kind: "robot", w: W, h: H, start, program, letters: l.letters },
      options: l.options,
      correct: l.correct,
      whyNot: l.whyNot,
      tip: text("choice.robot.tipLoop"),
      explanation: text("choice.robot.explainLoop", { n: loop.repeat, moves: loop.moves.map((m) => ARROW[m]).join(" "), program: programText(program) }),
    };
  }
  // How many steps in all.
  const steps = program.reduce((sum, s) => sum + (typeof s === "string" ? 1 : s.repeat * s.moves.length), 0);
  const outside = program.length - 1;
  const count = (n: number) => ({ latex: String(n) });
  return {
    stageId: "2.19.2",
    kind: "choice",
    prompt: text("choice.robot.howManySteps"),
    scene: { kind: "robot", w: W, h: H, start, program, letters: [] },
    ...shuffledOptions(rng, count(steps), [
      { option: count(loop.moves.length + outside), why: text("choice.robot.whyOnce", { n: loop.repeat }) },
      { option: count(loop.repeat + outside), why: text("choice.robot.whyLoopSteps", { k: loop.moves.length }) },
      { option: count(steps + loop.moves.length), why: text("choice.robot.whyRepeat", { n: loop.repeat }) },
      { option: count(steps - 1), why: text("choice.robot.whyCount") },
      { option: count(steps + 1), why: text("choice.robot.whyCount") },
    ]),
    tip: text("choice.robot.tipLoop"),
    explanation: text("choice.robot.explainSteps", { n: loop.repeat, k: loop.moves.length, outside, steps }),
  };
}

export const PROGRAMMING_CHOICES: Record<ProgrammingChoiceStageId, (rng: Rng) => ChoiceProblem> = {
  "1.12.1": followProgram,
  "2.19.2": loops,
};
