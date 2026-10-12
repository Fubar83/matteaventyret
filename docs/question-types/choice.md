# Single choice — `choice`

"Välj rätt": a question, usually a picture, and 2–4 options to pick from. It's
for what is recognised, compared or followed rather than worked out and
written: is 37 odd, which sign goes between 47 and 74, how much of the circle
is coloured, which picture is a cylinder, where does the robot end up, how
likely is red, what does the program print. Förskoleklass to åk 9.

The wrong options are the mistakes children make, and picking one says
**why it isn't right**. Picking 3/1 for 3 of 4 coloured parts says "you
compared the coloured parts with the others"; picking 0,45 as bigger than 0,5
says "compare the tenths first".

## Levels

Topic modules in `engine/questions/choice/`:

| Level | Title | Module | Asks |
|---|---|---|---|
| 0.1.1 | Räkna | `early.ts` | how many things (1–10, in rows of five); which picture shows n (n ≥ 2) |
| 0.1.2 | Fler, färre, lika många | `early.ts` | groups A and B: where more, where fewer, or the same; how many more |
| 0.1.3 | Före och efter | `early.ts` | the number after or before n (0–20, on a number line), between a and a + 2 |
| 0.1.4 | Ordningstal | `early.ts` | animals queueing to a flag: who is third, which place the frog has — the slip is counting from the wrong end |
| 0.2.1 | Mönster | `early.ts` | shapes repeating (AB, AAB, ABB, ABC, AABB, by shape, colour or both): which comes next |
| 0.3.1 | Lägesord | `early.ts` | a 3 × 3 shelf: what is under, over, left or right of a thing; between two |
| 0.3.2 | Längst och tyngst | `early.ts` | the longest or shortest of three ribbons over squares (not always starting together); the heavier or lighter thing on a balance, or the same |
| 1.8.2 | Större än, mindre än | `numbers.ts` | 47 □ 74: <, > or = — digits swapped, same tens, equal, up to 1000 |
| 1.8.3 | Udda och jämna tal | `numbers.ts` | is n odd or even; which of four is odd (even) |
| 1.9.1 | Bråk: halva, tredjedel, fjärdedel | `fractions.ts` | how much is coloured (circle, bar, square; 2–4 parts, sometimes 6 or 8); which picture shows a half, a third, a quarter, three quarters, two thirds; del av antal — a quarter of 12, with the sharing picture |
| 1.9.2 | Bråk: pizza och choklad | `fractions.ts` | how much of a pizza is left or eaten (2–8 slices, the eaten ones gone from the plate); how much of a chocolate bar is eaten; k friends share a pizza — how much each one gets |
| 1.9.3 | Bråk: vem fick mest? | `fractions.ts` | two named children's pizza: one slice each of pizzas cut differently (1/3 or 1/5), slices of the same size (3/8 or 5/8), or the same amount cut differently (1/2 and 2/4); options are the two names and "Lika mycket" |
| 1.2.3 | Former och kroppar | `shapes.ts` | a plane figure's or solid's name; which picture is a cylinder (the lookalikes first: cone for cylinder, circle for sphere) |
| 1.2.4 | Symmetri | `shapes.ts` | is the dashed line a line of symmetry (a figure on a 6×6 grid, mirrored or with one square off) |
| 1.5.8 | Kalendern | `everyday.ts` | the day in n days or n days ago, the month after or before, how many days in a week (months in a year, …) |
| 1.10.2 | Väga: vågen | `measuring.ts` | a kitchen scale's needle in grams (ticks of 50 or 100 g); 1 500 g in kg |
| 1.10.3 | Litermått | `measuring.ts` | a jug in dl; how much more makes 1 litre; more or less than half a litre |
| 1.13.1 | Streckräkning | `data.ts` | tally marks in bundles of five: how many, which most, two rows together |
| 1.11.1 | Slumpen: säkert, möjligt, omöjligt | `chance.ts` | certain, possible or impossible to get a colour from a bag or spinner; which colour is most likely |
| 2.16.1 | Decimaltalens positionssystem | `numbers.ts` | what the highlighted digit is worth in 3,47 or 12,305 |
| 2.16.2 | Gånger och delat med 10, 100, 1000 | `numbers.ts` | 3,5 · 100, 42 / 1000 |
| 2.16.3 | Storleksordna decimaltal | `numbers.ts` | the biggest or smallest of four decimals |
| 2.17.1 | Negativa tal: termometern | `numbers.ts` | a thermometer, n degrees warmer or colder; the coldest or warmest of four |
| 2.6.5 | Lika stora bråk | `fractions.ts` | which fraction is as much as 2/3 (with its pizza); the number missing in 1/2 = □/8 — slips: adding instead of multiplying, changing one number only |
| 2.6.6 | Bråk i vardagen | `fractions.ts` | 2/8 + 3/8 of a pizza eaten together, or what's left (the slip: adding the denominators); 2/3 of a 12-square chocolate bar in squares; 11 slices of pizzas cut in 4 as a mixed number (2 3/4) |
| 2.8.6 | Cirkeldiagram | `data.ts` | a pie (in 4, 8, 10 or 20 parts, faint lines at each): the part as a fraction or percent, how many of n pupils, which most |
| 2.9.7 | Tidtabeller | `data.ts` | a bus timetable: when a bus is at a stop, how long a trip takes (across the hour), the latest bus to be there in time |
| 2.11.3 | Proportionalitet i grafer | `functions.ts` | a price line through the origin: the cost of x kg, what y kr buys, the price per kg; which of four graphs is proportional |
| 2.12.2 | Vinkeltyper | `measuring.ts` | spetsig, rät, trubbig or rak; about how big (the slip: the angle on the other side of the arm) |
| 2.12.3 | Skala: förstora och förminska | `measuring.ts` | a map in 1:1000 (centimetres to metres), a drawing in 1:20, an insect drawn 5:1 |
| 2.19.3 | Programmering: villkor | `code.ts` | om … annars: halve an even number, change an odd one; "Vinst!" only for more points than needed (equal isn't more); counting the even numbers in a loop |
| 2.18.1 | Sannolikhet | `chance.ts` | the chance as a fraction: marbles, a spinner, a die |
| 1.12.1 | Programmering: följ instruktionerna | `programming.ts` | where an arrow program takes the robot (lettered squares); which program goes to the star — Lgr22 åk 1–3's step-by-step instructions |
| 2.19.2 | Programmering med loopar | `programming.ts` | a program with "upprepa n gånger": where it ends up, how many steps |
| 3.1.4 | Kvadratrötter | `numbers.ts` | √49; between which whole numbers √50 lies; x² = 49 has two solutions |
| 3.2.3 | Procentenheter | `percent.ts` | from 4 % to 5 %: 1 procentenhet, 25 percent — and which the question asks for |
| 3.2.4 | Ränta | `percent.ts` | a year's interest added (1,03, not 1,3); two years of ränta på ränta |
| 3.3.8 | Olikheter | `functions.ts` | which number makes 3x − 2 > 10 true; solve 2x + 1 < 9, and −2x > 6 (the sign turns) |
| 3.4.9 | Likformighet | `geometry.ts` | x in the bigger of two similar triangles (the slip: adding the difference) |
| 3.4.10 | Vertikalvinklar och sidovinklar | `geometry.ts` | two lines crossing: v opposite or beside a given angle |
| 3.4.11 | Begränsningsarea | `geometry.ts` | a box's surface area (each pair of faces twice), a cube's |
| 3.7.3 | Medelvärde eller median? | `data.ts` | salaries or race times with an outlier: which measure is typical, which value is the outlier, what removing it does to the mean or median |
| 3.7.4 | Missvisande diagram | `data.ts` | three bar charts of the same sales: which misleads (an axis cut above 0), which is fair; C looks 3 times A — how many percent bigger is it really |
| 3.9.2 | Programmering: vilken rad saknas? | `code.ts` | a program with a line missing (?????) and what it should print: the sum (s = s + i, not + 1), doubling (x · 2, not + 2), counting even numbers (the condition on i, not the counter) |
| 3.9.1 | Programmering: variabler och loopar | `code.ts` | doubling in a loop, a running sum over i, medan (while), and a = b; b = a — not a swap |
| 3.10.1 | Grafer och formler | `functions.ts` | a line on a grid: its formula y = kx + m, its k, its m, a y off it |
| 3.10.2 | Tabeller och mönster | `functions.ts` | the formula for an x–y table; matchsticks in figure n, and in figure 100 |

## The question

`ChoiceProblem` (`engine/questions/choice/problem.ts`):

| Field | |
|---|---|
| `prompt` | the question: an i18n key and its values (`ChoiceText`) |
| `display` | the task shown big in LaTeX, when there is one ("47 \\quad \\square \\quad 74") |
| `scene` | the picture (`engine/questions/scene.ts`): a fraction, a shape, a thermometer, a robot grid… |
| `options` | each is words (`text`), a number or sign (`latex`), characters as they are (`plain`, for letters and arrows), or a small picture (`scene`) |
| `correct` | the right option's index |
| `whyNot` | why each wrong option is wrong (null for the right one, or where there's nothing better than "try again") |
| `tip`, `explanation` | the help ladder: a tip, then the explanation of the right answer |

Two questions are the same when their level, prompt, display, picture and
right option are.

## How it's made

- **`shuffledOptions(rng, right, slips)`**: the right option and its slips,
  most likely first. Duplicates (by `optionKey`) and number slips worth the
  same as the right one (`optionValue`: 4/8 for 2/4) are dropped, up to 4
  are kept, then shuffled. A level whose slips can coincide (1/2 of 12: half
  of them are 6 or 12) lists spare ones last. Each slip carries its reason, which follows it through
  the shuffle.
- **`fixedOptions(...)`**: where the order is the meaning (<, >, =; udda,
  jämnt; säkert, möjligt, omöjligt; A–D for squares).
- Numbers are LaTeX in Swedish notation (`tex`: 3{,}5). A probability is the
  count over the total as counted (3/6 for an even number on a die). **No
  wrong option is worth the same as the right one** (3/6 and 1/2 never both
  appear).
- Particular choices:
  - **Ordering decimals** is built so "longer is bigger" picks wrong: the
    biggest is the shortest (0,6 > 0,58), the smallest the longest (0,057).
  - **Symmetry** mirrors half a figure; for "no", one mirrored square is taken
    away, its mirror left, and sometimes one is added.
  - **Pizza and chocolate** never offer a wrong part that is a whole or more
    (5/5, 12/10) where the question is about part of one pizza; the
    upside-down slip (3/1) is the exception, on purpose. Mixed numbers are
    `2\,\dfrac{3}{4}`.
  - **Programs in words** (`code.ts`) are a `code` scene whose lines are
    i18n keys (`code.*`), so the same program reads "om tal är jämnt:" and "if
    number is even:". Variable names that are words are keys too
    (`@code.var.number`).
  - **Förskoleklass** questions have three options, mostly in a fixed order
    (A, B, Lika många), and pictures that never show the answer: no numbers
    on the things, no places in the queue.
  - **Programming** uses absolute arrows (↑ ↓ ← →), each one square. A program
    stays on the 5 × 5 grid all the way. The lettered squares are where the
    slips lead: a step missed, left/right or up/down swapped, a loop run once
    or one time too many.

## How it's played

`game/questions/choice/ChoicePlayer.tsx`:

- The picture (`QuestionScene`), the question, the display, then the options
  as buttons. Picture options are drawn small with `ScenePicture`.
- A wrong pick is struck out and says its `whyNot`. After **two** wrong picks
  among four options (**one** among two or three) the answer is shown with
  its explanation, and Nästa moves on.
- Right: the explanation is shown under the options.
- Help ladder: the tip, then the explanation.
- Stars: `triedOutcome` — nothing to set up, so ★★★ is right the first time.

## The pictures

`engine/questions/scene.ts` defines them; `game/scenes/` draws them. Written
questions can use them too.

| Scene | Drawn by | |
|---|---|---|
| `fraction` | `MeasurePictures.tsx` | circle, bar or square in equal parts, some coloured |
| `pizza` | `FoodPictures.tsx` | one or more pizzas on plates, cut in equal slices; eaten slices leave a dashed gap, `taken` slices are pulled out and outlined green, `label` names whose it is |
| `chocolate` | `FoodPictures.tsx` | a bar of rows × columns squares, the eaten ones empty |
| `count` | `EarlyPictures.tsx` | things in rows of five; two groups as A and B |
| `queue`, `pattern`, `shelf` | `EarlyPictures.tsx` | animals (Kenney sprites) to a flag; shapes and a dashed ?; a three-shelf bookcase |
| `lengths`, `weigh` | `EarlyPictures.tsx` | lettered ribbons over squares; a balance, the heavier side down |
| `kitchenScale`, `jug` | `MeasurePictures.tsx` | a dial in grams (numbered every 100 g, 200 g past 1 000); a jug marked every dl, numbered every 2 dl and 1 l |
| `tally`, `pie`, `timetable` | `DataPictures.tsx` | a table of tally marks; a pie chart and its legend; a bus timetable |
| `bars` | `DataPictures.tsx` | a bar chart of A, B, C, its axis from `from` (0, or cut above it) — small as an option |
| `graph` | `DataPictures.tsx` | a coordinate system, grid lines every step, lines clipped to it; small and unlabelled as an option |
| `code` | `DataPictures.tsx` | a numbered program, blocks indented, conditions and loops coloured |
| `angle`, `crossing`, `similar`, `cuboid` | `GeometryPictures.tsx` | an angle and its arc; two crossing lines with an angle given and v; two similar triangles to scale; a box with its measures |
| `thermometer` | `MeasurePictures.tsx` | −20 to 20 °C, a tick every degree, numbers every 5, zero marked |
| `numberLine`, `ruler` | `MeasurePictures.tsx` | used by written levels (`written.md`) |
| `shape` | `ShapePictures.tsx` | 6 plane figures and 6 solids, the solids' hidden edges dashed |
| `symmetry` | `ShapePictures.tsx` | squares on a grid, the dashed line |
| `chance` | `ShapePictures.tsx` | a bag of marbles, a spinner, a die |
| `robot` | `RobotGrid.tsx` | the grid, the robot, lettered squares or a star, and the program as arrow cards (a loop in a bracket) |

## Must stay true

- Every level: 2–4 options, all different, the right one among them, a
  reason slot for each (`engine/__tests__/choice.test.ts`).
- The right option really is right: the sign fits, the fraction is the
  coloured parts over all, the comma moves as many places as the zeros, the
  chance is the count over the total, the pizza part is the slices over all
  the slices, who gets most is who has the bigger fraction (and "Lika
  mycket" turns up). No wrong probability or fraction has the same value
  (`choice.test.ts`).
- Part of a chocolate bar always has at least 3 options; a pizza part never
  offers a whole pizza or more as a wrong answer (`choice.test.ts`).
- Ordering decimals never rewards "longer is bigger" (`choice.test.ts`).
- Förskoleklass to åk 9: each new level's right option is worked out again
  from its picture or numbers — the count, the place from the flag, the
  repeating part of a pattern, the shelf, the needle, the timetable column,
  the pie's parts, the line's k and m, the inequality put to the test, and
  each program run by a small interpreter (`choice.test.ts`).
- A missing line: only the right option, put in its place, makes the program
  print what the question says; a misleading chart is the one cut above 0
  (`choice.test.ts`).
- Symmetry: "yes" exactly when every square has its mirror image, about half
  the time (`choice.test.ts`).
- Programming: the right letter is where the program takes the robot, and
  every square is on the grid (`choice.test.ts`).
- Every text a question uses exists in both languages with its placeholders
  filled: question, options, reasons, tip, explanation, and the words in their
  values ("@weekday.2") (`game/__tests__/content.test.ts`).

## Known gaps

- No drag-and-drop: ordering several numbers, sorting shapes into groups.
- The programs use absolute arrows. Turning ("vänd höger", forward) is the
  next step up.
