# The clock — `clock`

Reading and setting clocks, åk 1–3. Each level moves one dial:

- the times: hel och halv → kvart → fem minuter → the minute;
- the faces: every number → only 12-3-6-9 → Roman numerals;
- digital, and the 24-hour clock.

## Levels

| Level | Title | Minutes | Faces | Hours | Tasks |
|---|---|---|---|---|---|
| 1.5.1 | Klockan: hel och halv | :00, :30 | arabic | a day's (7–12 morning, 1–6 afternoon) | read, set from words |
| 1.5.3 | Klockan: kvart | quarters | arabic | a day's | read, set from words |
| 1.5.4 | Klockan: fem minuter | fives | arabic, 12-3-6-9 | a day's | read, set from words |
| 1.5.5 | Digital klocka | fives | + 12-3-6-9 | mornings 6–11 | + digital → hands, hands → digital |
| 1.5.6 | 24-timmarsklockan | fives | + Roman | afternoons and evenings 13–23 | digital → hands, hands → digital |
| 1.5.7 | Klockan på minuten | any minute that isn't a five | all | any | digital → hands, hands → digital |

## The question

`ClockProblem` (`engine/questions/clock.ts`):

| Field | |
|---|---|
| `task` | `read` (pick the time), `setAnalog` (drag the hands), `setDigital` (turn the digital clock) |
| `given` | what the time is given as: `analog`, `words`, or `digital` |
| `h`, `m` | the time. Read and set-from-words: 1–12, as it's said ("halv 6"). With a digital clock: 0–23. |
| `sky` | the time of day, 0–24, for the sky behind the clock |
| `options`, `correct` | reading: four times to pick from, and the right one |
| `face`, `digitalLook` | how the clock looks |
| `snap`, `hourSnap` | where the hands snap: the minute hand every 5 or every 1 minute; the hour hand every 15° (whole and half hours) at first, then 2,5° |
| `start` | where the hands or digits start: somewhere other than the answer |
| `difficulty` | a round goes from its easiest question to its hardest |

Two questions are the same when their time is (`clock:h:m`), so a round
never reads and sets the same time.

## How it's made

- A level picks a task, an hour for its part of the day, a minute and a face.
- **Reading's wrong options are the mistakes children make**
  (`readOptions`): the hour off by one ("halv 1" for halv 2, which says the
  next hour); the minutes mirrored (kvart över ↔ kvart i, fem över halv ↔ fem
  i halv); then the neighbours. They're always among the level's own minutes.
- `difficulty` adds up the minutes (whole < half < quarter < five < any), the
  face (every number < 12-3-6-9 < Roman), and the task (reading < from words
  < from digital < to digital).

## How it's played

`game/questions/clock/ClockPlayer.tsx`, three players by task, each over a
sky (`SkyScene`) that shows the time of day:

- **Read** (`ReadClock`): "Vad är klockan?" Four spoken options ("fem i halv
  6"). A wrong pick says which hand was misread, minutes first. After the
  second wrong pick the answer is shown.
- **Set the hands** (`SetHands`): drag the hands to a time in words or on a
  digital clock (`ClockFace` interactive, or the arrow keys).
  - The hour hand may be off by a quarter of the way between two numbers
    (`HOUR_TOLERANCE`, 7,5°).
  - A wrong answer marks the wrong hand, the minute hand first.
  - **The sky follows the hour hand over two laps a day** (`turnDay`): turning
    past 12 goes on into the next half of the day (11.59 → 12.00 noon), never
    back to midnight. The hand starts in the lap nearer the question's time
    (`dayDegNear`).
- **Set the digital clock** (`SetDigital`, `DigitalClockSetter`): the hours
  and minutes turn like wheels (drag, the arrows, or the arrow keys), set to
  match the hands. Afternoon times must be written the 24-hour way.
- Setting allows three tries, then shows the answer. Stars use
  `triedOutcome`: nothing to set up, so ★★★ is right the first time.

## Must stay true

- Reading's options are four different times among the level's own minutes,
  the right one among them (`engine/__tests__/clock.test.ts`).
- A 12-hour face: 17.30 is set as 5.30 (`checkHands`). The digital clock is
  24-hour.
- The sky never jumps from day to night when the hand passes 12
  (`clock.test.ts`, "two laps").
- A round's questions come easiest first (`generateRound`, `difficulty`).

## Known gaps

- No elapsed time with a clock (how long from 9.40 to 10.15) — that's
  "Hur lång tid?" (1.5.2) and "Tidsskillnader" (2.9.5), written questions.
