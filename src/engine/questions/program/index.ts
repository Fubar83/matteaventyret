/**
 * Programming the robot: the child puts the program together - arrow cards,
 * and from åk 4-6 loops - and runs it, and the robot does exactly what it
 * says, step by step. Writing a program, not only reading one:
 *
 *   åk 1-3  1.12.2 programmera roboten: to the star, round the rocks
 *   åk 4-6  2.19.4 programmera med loopar: to the star with few cards - a loop does the repeating
 *   åk 7-9  3.9.4  samla diamanterna: every gem on the way, then the star, with few cards
 *
 * Any program that does it is right. The card limit is set by a program that
 * needs loops, and no program without loops fits under it.
 *
 * How it works, and what must stay true: docs/question-types/program.md.
 */
import { pick, randInt, shuffle, type Rng } from "../../rng";
import { programText } from "../choice/programming";
import { text, type ChoiceText } from "../choice/problem";
import type { Move, ProgramStep } from "../scene";
import { questionType, retry } from "../questionType";

export type ProgramStageId = "1.12.2" | "2.19.4" | "3.9.4";
/** [column, row], row 0 at the top. */
export type Square = [number, number];

export interface ProgramProblem {
  stageId: ProgramStageId;
  kind: "program";
  w: number;
  h: number;
  start: Square;
  star: Square;
  rocks: Square[];
  /** Squares the robot must pass before it stops on the star. */
  gems: Square[];
  /** Whether there's a loop card ("upprepa"). */
  loops: boolean;
  /** The most cards a program may have - a loop is a card, and so is each move in it. Null: no limit. */
  maxCards: number | null;
  /** A program that does it - shown when the answer is shown. */
  solution: ProgramStep[];
  prompt: ChoiceText;
  tip: ChoiceText;
  explanation: ChoiceText;
}

export const MOVES: readonly Move[] = ["up", "down", "left", "right"];
const STEP: Record<Move, Square> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPPOSITE: Record<Move, Move> = { up: "down", down: "up", left: "right", right: "left" };
const same = (a: Square, b: Square) => a[0] === b[0] && a[1] === b[1];
const has = (list: readonly Square[], s: Square) => list.some((x) => same(x, s));
const stepFrom = ([x, y]: Square, m: Move): Square => [x + STEP[m][0], y + STEP[m][1]];

/** The moves a program makes, loops written out. */
export function flatten(program: readonly ProgramStep[]): Move[] {
  return program.flatMap((s) => (typeof s === "string" ? [s] : Array.from({ length: s.repeat }, () => s.moves).flat()));
}

/** How many cards a program is: one per move, one per loop and one per move in it. */
export function cardCount(program: readonly ProgramStep[]): number {
  return program.reduce((n, s) => n + (typeof s === "string" ? 1 : 1 + s.moves.length), 0);
}

type Board = Pick<ProgramProblem, "w" | "h" | "rocks">;
const inside = (b: Board, [x, y]: Square) => x >= 0 && y >= 0 && x < b.w && y < b.h;

/** What the robot does: the squares it stands on, from the start, and - if it does - where it crashes. */
export function runRobot(p: Board & { start: Square }, program: readonly ProgramStep[]): { path: Square[]; crash: { at: Square; into: "edge" | "rock" } | null } {
  const path: Square[] = [p.start];
  for (const m of flatten(program)) {
    const next = stepFrom(path[path.length - 1], m);
    if (!inside(p, next)) return { path, crash: { at: next, into: "edge" } };
    if (has(p.rocks, next)) return { path, crash: { at: next, into: "rock" } };
    path.push(next);
  }
  return { path, crash: null };
}

/** Whether a program does it - and if not, why, as the robot showed it. */
export function checkProgram(p: ProgramProblem, program: readonly ProgramStep[]): { ok: true } | { ok: false; why: ChoiceText } {
  if (flatten(program).length === 0) return { ok: false, why: text("program.why.empty") };
  if (p.maxCards !== null && cardCount(program) > p.maxCards) return { ok: false, why: text("program.why.tooMany", { n: p.maxCards }) };
  const { path, crash } = runRobot(p, program);
  if (crash) return { ok: false, why: text(crash.into === "edge" ? "program.why.edge" : "program.why.rock") };
  const missed = p.gems.filter((g) => !has(path, g)).length;
  if (missed > 0) return { ok: false, why: text("program.why.gems", { n: missed }) };
  if (!same(path[path.length - 1], p.star)) return { ok: false, why: text(has(path, p.star) ? "program.why.passed" : "program.why.notThere") };
  return { ok: true };
}

/** The fewest moves from a to b round the rocks - and the moves - or null when there's no way. */
export function shortestWay(b: Board, a: Square, to: Square): Move[] | null {
  const key = ([x, y]: Square) => y * b.w + x;
  const from = new Map<number, { prev: Square; move: Move } | null>([[key(a), null]]);
  const queue: Square[] = [a];
  while (queue.length > 0) {
    const at = queue.shift()!;
    if (same(at, to)) {
      const moves: Move[] = [];
      for (let s = at, f = from.get(key(s)); f; s = f.prev, f = from.get(key(s))) moves.unshift(f.move);
      return moves;
    }
    for (const m of MOVES) {
      const next = stepFrom(at, m);
      if (inside(b, next) && !has(b.rocks, next) && !from.has(key(next))) {
        from.set(key(next), { prev: at, move: m });
        queue.push(next);
      }
    }
  }
  return null;
}

const randomSquare = (rng: Rng, w: number, h: number): Square => [randInt(rng, 0, w - 1), randInt(rng, 0, h - 1)];
const turnOf = (rng: Rng, m: Move): Move => pick(rng, MOVES.filter((x) => x !== m && x !== OPPOSITE[m]));

/** Rocks on squares off the path - next to it where they can, so they're in the way of a wrong turn. */
function rocksBeside(rng: Rng, b: { w: number; h: number }, path: Square[], n: number): Square[] {
  const near = shuffle(
    rng,
    path.flatMap((s) => MOVES.map((m) => stepFrom(s, m))).filter((s) => inside({ ...b, rocks: [] }, s) && !has(path, s))
  );
  const rocks: Square[] = [];
  for (const s of near) if (rocks.length < n && !has(rocks, s)) rocks.push(s);
  return rocks;
}

/** 1.12.2: to the star on a 5 × 5 grid, a rock or more in the straight way. */
function toTheStar(rng: Rng): ProgramProblem {
  const w = 5;
  const h = 5;
  return retry("program 1.12.2", () => {
    const start = randomSquare(rng, w, h);
    const star = randomSquare(rng, w, h);
    const distance = Math.abs(start[0] - star[0]) + Math.abs(start[1] - star[1]);
    if (distance < 3 || distance > 6) return null;
    const rocks: Square[] = [];
    const n = randInt(rng, 3, 5);
    while (rocks.length < n) {
      const r = randomSquare(rng, w, h);
      if (!same(r, start) && !same(r, star) && !has(rocks, r)) rocks.push(r);
    }
    // A rock between them, so the way has to be thought out - not just counted.
    const between = (r: Square) => r[0] >= Math.min(start[0], star[0]) && r[0] <= Math.max(start[0], star[0]) && r[1] >= Math.min(start[1], star[1]) && r[1] <= Math.max(start[1], star[1]);
    if (!rocks.some(between)) return null;
    const way = shortestWay({ w, h, rocks }, start, star);
    if (!way || way.length > 7) return null;
    return {
      stageId: "1.12.2",
      kind: "program",
      w,
      h,
      start,
      star,
      rocks,
      gems: [],
      loops: false,
      maxCards: null,
      solution: way,
      prompt: text("program.prompt.star"),
      tip: text("program.tip.star"),
      explanation: text("program.explain", { program: programText(way) }),
    };
  });
}

/** A program made of loops: where it goes from a start that keeps it on the grid. */
function placed(rng: Rng, w: number, h: number, program: ProgramStep[]): { start: Square; path: Square[] } | null {
  const start = randomSquare(rng, w, h);
  const { path, crash } = runRobot({ w, h, rocks: [], start }, program);
  return crash ? null : { start, path };
}

/** 2.19.4: a way that repeats - a long line and a turn, or a staircase - and too few cards to write it out. */
function withLoops(rng: Rng): ProgramProblem {
  const w = 6;
  const h = 6;
  return retry("program 2.19.4", () => {
    const m1 = pick(rng, MOVES);
    const m2 = turnOf(rng, m1);
    const shape = pick(rng, ["line", "stairs", "longStairs"] as const);
    const solution: ProgramStep[] =
      shape === "line"
        ? [{ repeat: randInt(rng, 3, 5), moves: [m1] }, { repeat: randInt(rng, 3, 5), moves: [m2] }]
        : shape === "stairs"
          ? [{ repeat: randInt(rng, 3, 5), moves: [m1, m2] }]
          : [{ repeat: randInt(rng, 2, 3), moves: [m1, m1, m2] }];
    const at = placed(rng, w, h, solution);
    if (!at) return null;
    const star = at.path[at.path.length - 1];
    const rocks = rocksBeside(rng, { w, h }, at.path, randInt(rng, 2, 4));
    const maxCards = cardCount(solution);
    // Written out without a loop the way doesn't fit: the loop is needed.
    const way = shortestWay({ w, h, rocks }, at.start, star);
    if (!way || way.length <= maxCards) return null;
    return {
      stageId: "2.19.4",
      kind: "program",
      w,
      h,
      start: at.start,
      star,
      rocks,
      gems: [],
      loops: true,
      maxCards,
      solution,
      prompt: text("program.prompt.loops", { n: maxCards }),
      tip: text("program.tip.loops"),
      explanation: text("program.explain", { program: programText(solution) }),
    };
  });
}

/** 3.9.4: gems along a way made of a loop or two and a move or two; every gem, then the star, in few cards. */
function collectGems(rng: Rng): ProgramProblem {
  const w = 7;
  const h = 7;
  return retry("program 3.9.4", () => {
    const m1 = pick(rng, MOVES);
    const m2 = turnOf(rng, m1);
    const body = pick(rng, [[m1, m2], [m1, m1, m2], [m1, m2, m2]]);
    const loop: ProgramStep = { repeat: randInt(rng, 3, 4), moves: body };
    const extra = pick(rng, [m1, m2, OPPOSITE[m2]]);
    const solution: ProgramStep[] = pick(rng, [
      [extra, loop],
      [loop, extra],
      [loop, { repeat: randInt(rng, 2, 3), moves: [pick(rng, [m1, m2])] }],
    ]);
    const at = placed(rng, w, h, solution);
    if (!at) return null;
    const star = at.path[at.path.length - 1];
    const along = at.path.slice(1, -1).filter((s) => !same(s, star) && !same(s, at.start));
    const gems = shuffle(rng, along).filter((s, i, all) => all.findIndex((x) => same(x, s)) === i).slice(0, 3);
    if (gems.length < 3) return null;
    const rocks = rocksBeside(rng, { w, h }, at.path, randInt(rng, 2, 3));
    const maxCards = cardCount(solution);
    // The shortest way past every gem to the star, written out, doesn't fit: the loop is needed.
    const b = { w, h, rocks };
    const orders = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
    const tour = Math.min(
      ...orders.map((o) => {
        const stops = [at.start, ...o.map((i) => gems[i]), star];
        return stops.slice(1).reduce((n, s, i) => n + (shortestWay(b, stops[i], s)?.length ?? Infinity), 0);
      })
    );
    // ... by a good bit: the loop saves real work.
    if (tour < maxCards + 3) return null;
    return {
      stageId: "3.9.4",
      kind: "program",
      w,
      h,
      start: at.start,
      star,
      rocks,
      gems,
      loops: true,
      maxCards,
      solution,
      prompt: text("program.prompt.gems", { n: maxCards }),
      tip: text("program.tip.gems"),
      explanation: text("program.explain", { program: programText(solution) }),
    };
  });
}

export const PROGRAM_QUESTIONS = questionType<"program", ProgramProblem, ProgramStageId>({
  id: "program",
  kinds: ["program"],
  levels: {
    "1.12.2": toTheStar,
    "2.19.4": withLoops,
    "3.9.4": collectGems,
  },
  key: (p) => `program:${p.stageId}:${JSON.stringify([p.start, p.star, p.rocks, p.gems])}`,
});
