# Programming the robot — `program`

"Programmera roboten": the child writes the program. Arrow cards, and from
åk 4–6 loops ("upprepa n gånger"), are put together by dragging or tapping.
Kör runs the program, and the robot walks it square by square. Lgr22 asks for
programs that are *made* in every stage, not only read. The single-choice
robot levels (1.12.1, 2.19.2 in `choice`) read programs; these write them.

## Levels

`engine/questions/program/index.ts`:

| Level | Title | Grid | Task | Cards |
|---|---|---|---|---|
| 1.12.2 | Programmera roboten | 5 × 5 | to the star, 3–7 steps; a rock or more in the straight way | no limit (16 fit on screen) |
| 2.19.4 | Programmera med loopar | 6 × 6 | to the star along a line and a turn (`a × →`, `b × ↓`), or a staircase (`n × (→ ↓)`, `n × (→ → ↓)`) | as many as that program |
| 3.9.4 | Programmera: samla diamanterna | 7 × 7 | three gems on the way, then the star: a loop of 2–3 moves done 3–4 times, and a move or a second loop | as many as that program |

## The question

`ProgramProblem`: `w`, `h`, `start`, `star`, `rocks`, `gems`, `loops` (is
there a loop card), `maxCards` (a loop is a card, and so is each move in it;
`null` for no limit), `solution` (a program that does it, shown at the end).
Any program that does it is right — `checkProgram`. It doesn't have to be
`solution`.

`checkProgram` says why one doesn't do it, the way the robot showed it:
empty, too many cards, off the grid, into a rock, gems missed, past the star,
or stopped elsewhere. `runRobot` gives the squares the robot stands on; it
stops before the square it would crash into.

## How it's made

- **1.12.2**: start and star 3–6 squares apart (Manhattan); 3–5 rocks, at
  least one inside the rectangle between them. The shortest way round the
  rocks (`shortestWay`, a breadth-first search) is 3–7 moves, and it's the
  solution.
- **2.19.4**: the solution is drawn first, from a start that keeps it on the
  grid; the star is where it ends. 2–4 rocks are placed beside the path, so a
  wrong turn bumps into one. The card limit is the solution's size, and the
  shortest way written out without loops is longer than that, so the loop
  is needed.
- **3.9.4**: as 2.19.4, plus three gems on distinct squares of the path. The
  shortest way past all three gems (in any order) to the star, written out,
  is at least 3 moves longer than the limit.

## How it's played

`game/questions/program/ProgramPlayer.tsx`:

- **The board**: the robot 🤖, rocks 🪨, gems 💎 and the star ⭐ on a
  chequered grid.
- **The palette**: ↑ ↓ ← → (and 🔁 Upprepa). Drag a card into the program or
  into a loop, or tap it. A tap goes to the chosen place, which is the program
  or a loop (tap a loop to choose it; tap the program's empty space to go
  back). A new loop is chosen at once. It repeats 2 times; − and + set 2–9.
- **The program**: tap a card, or drag it back to the palette, to take it
  away; × takes away a loop. With a limit, "Kort: n av max" shows the count,
  and a card that doesn't fit isn't added ("använd en loop").
- **Kör**: the robot walks a square every 340 ms, with a tap sound, and
  leaves a dotted trail. A gem it passes fades. A crash shows 💥, and the
  robot shakes (`anim-robot-bump`; not with reduced motion). It's judged
  when it stops. Changing the program puts the robot back at the start.
- After **three** runs that don't do it, `solution` is put in the program and
  the robot walks it. Stars: `triedOutcome` — ★★★ is the first run working.

## Must stay true

- Every question's own `solution` does it within the limit; nothing stands
  on anything else (`engine/__tests__/program.test.ts`).
- With a limit, no program without loops fits: 2.19.4's shortest way and
  3.9.4's gem tour are longer than `maxCards`.
- The robot never goes through a rock or off the grid, and the reasons match
  what it showed.
- Every level plays to the end on screen, built by taps
  (`game/__tests__/newTypesPlay.test.tsx`).
