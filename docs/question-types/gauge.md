# Setting an instrument — `gauge`

"Ställ in": drag the water in a measuring jug, or a thermometer's red line,
to what's asked. The single-choice levels (1.10.3 Litermått, 2.17.1
Termometern) read an instrument; these set one. The number isn't shown,
because reading the scale is the task.

## Levels

`engine/questions/gauge/index.ts`:

| Level | Title | Instrument | Asks |
|---|---|---|---|
| 1.10.5 | Häll upp | a 1-litre jug, a line every dl, numbered every 2 dl ("1 l" at the top) | n dl (mostly odd: between the numbers); half a litre; there's a little, pour in n dl more |
| 2.9.12 | Mät upp i liter | a 2-litre jug, a line every dl, numbered every 0,5 l | 1,3 l; 7 dl on a jug marked in litres; a recipe for 4 made for 2, 6 or 8 |
| 2.17.4 | Ställ termometern | −20 to 20 °C, a line every degree, numbered every 5 | set a temperature (never on a number); n degrees warmer or colder, mostly across 0 |

## The question

`GaugeProblem`: `instrument` (`jug`, `thermometer`), the scale `min`–`max`
in ticks (decilitres or degrees), `labelEvery`, `labels` (how the numbers
are written: `dl`, `l` or `deg`), `start` (where it stands at first),
`target`, `change` (a change asked for, so its wrong way can be named).
Values are whole ticks, so nothing is a floating-point guess.
`gaugeText` writes a value as the scale does ("1,3 l", "−4 °C").

## How it's made

- **1.10.5**: n dl is odd 70 % of the time, so it's read off the lines
  between the numbers. "More" starts at 2–6 dl and adds 2 dl or more.
- **2.9.12**: amounts are 3–19 dl and never a whole half-litre (which would
  be on a number). The recipe: a dl for 4 people, made for 2, 6 or 8, kept
  when it's a whole number of decilitres up to 2 litres and different from a.
- **2.17.4**: a temperature to set is never a multiple of 5, and starts
  somewhere else. A change is 3–12 degrees, starts and ends off 0, and
  crosses 0 at least 70 % of the time.

## How it's played

`game/questions/gauge/GaugePlayer.tsx`:

- **Drag** anywhere on the picture (`useDragPoint`): the water or the red
  line follows the finger, snapping to a tick, with a short transition.
  ▲ ▼ move one tick, for the last bit and for the keyboard.
- For a change, a grey mark ("förut", "nu") stays where it started, to count
  from.
- **Rätta**. A wrong setting says only which way (`gaugeWhy`), unless it's a
  known slip: the other way ("kallare betyder nedåt", "häll i, inte ut"),
  one off across 0 ("räkna 0 som ett steg"), or not moved at all. After
  **two** wrong checks it's set right and turns green, with the explanation.
- Stars: `triedOutcome` — ★★★ is right at the first check.

## Must stay true

- The target is on the scale and isn't where it starts; a change's target is
  start + change; a plain reading at 2.9.12 and 2.17.4 is never on a number
  (`engine/__tests__/gauge.test.ts`).
- The number set is never shown while working.
- Every level plays to the end on screen (`game/__tests__/newTypesPlay.test.tsx`).
