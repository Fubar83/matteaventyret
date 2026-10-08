import { ADVANCED_TEORI, BASIC_EXTRAS, type AdvancedTopic } from "./teoriAdvanced";
import { GEOMETRY_TEORI, type GeometryTopic } from "./teoriGeometry";
import { DIVISION_TEORI, type DivisionTopic } from "./teoriDivision";
import { MULTIPLICATION_TEORI, type MultiplicationTopic } from "./teoriMultiplication";
import { EXAM_TEORI, type ExamTopic } from "./teoriExam";
import { BASIC_TEORI, type BasicTopic } from "./teoriBasic";
import { planGuided, type GuidedOperator } from "../mathinput/guidedPlan";
import { ArrowDown, Box, Row } from "./TeoriVisuals";
import { PlanFigure } from "./TrappanFigure";
import { Tex } from "./Tex";

export type TeoriTopic =
  | "placeValue"
  | "additionBasic"
  | "subtractionBasic"
  | "additionCarry"
  | "subtractionBorrow"
  | "subtractionZero"
  | "multiplicationBasic"
  | "multiplicationCarry"
  | "decimalColumn"
  | "statisticsMean"
  | "statisticsMedian"
  | "statisticsMode"
  | "chartReading"
  | AdvancedTopic
  | GeometryTopic
  | DivisionTopic
  | MultiplicationTopic
  | ExamTopic
  | BasicTopic;

export interface TeoriSlide {
  /** i18n key for the narration text - see i18n/sv.json, en.json. */
  textKey: string;
  render: () => React.ReactNode;
  /**
   * What the slide is: the idea (with a picture), a step of the worked example,
   * a common mistake, or a quick "Testa själv" question. Unset: the first
   * slide of a topic is its idea, the rest are steps.
   */
  kind?: "concept" | "step" | "mistake" | "check";
  /** For a "Testa själv": the choices, and which is right. Not graded - the child just can't go on with a wrong one picked. */
  check?: { options: string[]; correct: number };
}

// Every topic below walks through one concrete worked example (the exact
// numbers from the build brief's own "Addition"/"Subtraction: uppställning"
// sections, where given), using the same box-and-dot visual language the
// child will meet again in Exempel/Uppgift - not abstract shapes with no
// connection to what they're about to do.

/** A column addition or multiplication as it's written on the board, filled in up to box `until` (the last `fresh` moves highlighted). */
const column = (operator: GuidedOperator, top: number, bottom: number, until: string, fresh = 1) => (
  <PlanFigure plan={planGuided(operator, top, bottom)} until={until} fresh={fresh} maxWidth={200} />
);

const placeValue: TeoriSlide[] = [
  {
    textKey: "teori.placeValue.1",
    render: () => (
      <Row>
        {[4, 5, 0, 6].map((d, i) => (
          <Box key={i}>{d}</Box>
        ))}
      </Row>
    ),
  },
  {
    textKey: "teori.placeValue.2",
    render: () => (
      <div className="flex flex-col items-center gap-2">
        <Row>
          <Box>4</Box>
          <Box tone="highlight">5</Box>
          <Box>0</Box>
          <Box>6</Box>
        </Row>
        <ArrowDown />
        <span className="text-lg font-bold text-amber-700">500</span>
      </div>
    ),
  },
];

const additionBasic: TeoriSlide[] = [
  { textKey: "teori.additionBasic.1", render: () => column("+", 34, 12, "") },
  { textKey: "teori.additionBasic.2", render: () => column("+", 34, 12, "s:0") },
  { textKey: "teori.additionBasic.3", render: () => column("+", 34, 12, "s:1") },
];

const subtractionBasic: TeoriSlide[] = [
  {
    textKey: "teori.subtractionBasic.1",
    render: () => (
      <div className="flex flex-col items-center gap-1">
        <Row>
          <Box>5</Box>
          <Box tone="highlight">8</Box>
        </Row>
        <Row>
          <Box>2</Box>
          <Box tone="highlight">3</Box>
        </Row>
      </div>
    ),
  },
  {
    textKey: "teori.subtractionBasic.2",
    render: () => (
      <Row>
        <Box tone="new">3</Box>
        <Box tone="new">5</Box>
      </Row>
    ),
  },
];

const additionCarry: TeoriSlide[] = [
  { textKey: "teori.additionCarry.1", render: () => column("+", 47, 38, "") },
  { textKey: "teori.additionCarry.2", render: () => column("+", 47, 38, "s:0") },
  { textKey: "teori.additionCarry.3", render: () => column("+", 47, 38, "c:1") },
  { textKey: "teori.additionCarry.4", render: () => column("+", 47, 38, "s:1") },
];

const subtractionBorrow: TeoriSlide[] = [
  {
    textKey: "teori.subtractionBorrow.1",
    render: () => (
      <div className="flex flex-col items-center gap-1">
        <Row>
          <Box>5</Box>
          <Box tone="highlight">2</Box>
        </Row>
        <Row>
          <Box>2</Box>
          <Box tone="highlight">7</Box>
        </Row>
      </div>
    ),
  },
  {
    textKey: "teori.subtractionBorrow.2",
    render: () => (
      <div className="flex items-center gap-2 text-2xl font-bold text-rose-500">
        <span>2</span>
        <span>−</span>
        <span>7</span>
        <span className="ml-2 text-rose-600">✕</span>
      </div>
    ),
  },
  {
    textKey: "teori.subtractionBorrow.3",
    render: () => (
      <div className="flex flex-col items-center gap-1">
        <Row>
          <Box size="sm" tone="muted" />
          <div className="flex gap-0.5">
            <Box size="sm" tone="new">
              1
            </Box>
            <Box size="sm" tone="new">
              0
            </Box>
          </div>
        </Row>
        <Row>
          <Box tone="struck">5</Box>
          <Box>2</Box>
        </Row>
        <Row>
          <Box size="sm" tone="new">
            4
          </Box>
          <Box size="sm" tone="muted" />
        </Row>
      </div>
    ),
  },
  {
    textKey: "teori.subtractionBorrow.4",
    render: () => (
      <Row>
        <Box tone="new">2</Box>
        <Box tone="new">5</Box>
      </Row>
    ),
  },
];

const subtractionZero: TeoriSlide[] = [
  {
    textKey: "teori.subtractionZero.1",
    render: () => (
      <div className="flex flex-col items-center gap-1">
        <Row>
          <Box>1</Box>
          <Box>0</Box>
          <Box>0</Box>
          <Box tone="highlight">3</Box>
        </Row>
        <Row>
          <Box tone="muted" />
          <Box>4</Box>
          <Box>5</Box>
          <Box tone="highlight">7</Box>
        </Row>
      </div>
    ),
  },
  {
    textKey: "teori.subtractionZero.2",
    render: () => (
      <Row>
        <Box>1</Box>
        <Box tone="struck">0</Box>
        <Box tone="struck">0</Box>
        <Box tone="muted">3</Box>
      </Row>
    ),
  },
  {
    textKey: "teori.subtractionZero.3",
    render: () => (
      <div className="flex flex-col items-center gap-1">
        <Row>
          <Box tone="muted" />
          <Box size="sm" tone="new">
            9
          </Box>
          <Box size="sm" tone="new">
            9
          </Box>
          <Box tone="muted" />
        </Row>
        <Row>
          <Box tone="struck">1</Box>
          <Box tone="struck">0</Box>
          <Box tone="struck">0</Box>
          <Box>3</Box>
        </Row>
      </div>
    ),
  },
  {
    textKey: "teori.subtractionZero.4",
    render: () => (
      <Row>
        <Box tone="muted" />
        <Box tone="new">5</Box>
        <Box tone="new">4</Box>
        <Box tone="new">6</Box>
      </Row>
    ),
  },
];

const multiplicationBasic: TeoriSlide[] = [
  { textKey: "teori.multiplicationBasic.1", render: () => column("×", 23, 3, "") },
  { textKey: "teori.multiplicationBasic.2", render: () => column("×", 23, 3, "p0:0") },
  { textKey: "teori.multiplicationBasic.3", render: () => column("×", 23, 3, "p0:1") },
];

const multiplicationCarry: TeoriSlide[] = [
  { textKey: "teori.multiplicationCarry.1", render: () => column("×", 47, 6, "") },
  { textKey: "teori.multiplicationCarry.2", render: () => column("×", 47, 6, "p0:0") },
  { textKey: "teori.multiplicationCarry.3", render: () => column("×", 47, 6, "m0:1") },
  { textKey: "teori.multiplicationCarry.4", render: () => column("×", 47, 6, "p0:2", 2) },
];

const DEC_SUB = String.raw`\begin{array}{r} 5{,}2 \\ -\;1{,}8 \\ \hline 3{,}4 \end{array}`;
const DEC_FILL = String.raw`\begin{array}{r} 3{,}5\textcolor{#0284c7}{0} \\ +\;1{,}25 \\ \hline 4{,}75 \end{array}`;

const decimalColumn: TeoriSlide[] = [
  {
    textKey: "teori.decimalColumn.1",
    render: () => (
      <div className="flex flex-col items-center gap-1">
        <Row>
          <Box>4</Box>
          <span className="text-xl font-bold text-slate-400 self-end pb-2">,</span>
          <Box tone="highlight">7</Box>
        </Row>
        <Row>
          <Box>2</Box>
          <span className="text-xl font-bold text-slate-400 self-end pb-2">,</span>
          <Box tone="highlight">5</Box>
        </Row>
      </div>
    ),
  },
  {
    textKey: "teori.decimalColumn.2",
    render: () => (
      <div className="flex flex-col items-center gap-2">
        <Box size="sm" tone="new">
          1
        </Box>
        <span className="text-lg font-bold text-slate-700">7 + 5 = 12</span>
      </div>
    ),
  },
  {
    textKey: "teori.decimalColumn.3",
    render: () => (
      <Row>
        <Box tone="new">7</Box>
        <span className="text-xl font-bold text-slate-400 self-end pb-2">,</span>
        <Box tone="new">2</Box>
      </Row>
    ),
  },
  // Subtraction the same way, and numbers with different decimals filled out with zeros first.
  { textKey: "teori.decimalColumn.4", render: () => <Tex latex={DEC_SUB} block className="text-2xl" /> },
  { textKey: "teori.decimalColumn.5", render: () => <Tex latex={DEC_FILL} block className="text-2xl" /> },
];

const statisticsMean: TeoriSlide[] = [
  {
    textKey: "teori.statisticsMean.1",
    render: () => (
      <Row>
        <Box>4</Box>
        <Box>7</Box>
        <Box>9</Box>
        <Box>12</Box>
      </Row>
    ),
  },
  {
    textKey: "teori.statisticsMean.2",
    render: () => (
      <div className="flex flex-col items-center gap-2">
        <span className="text-lg font-bold text-slate-700">4 + 7 + 9 + 12 = 32</span>
        <span className="text-lg font-bold text-slate-700">32 : 4 = 8</span>
        <Box tone="new">8</Box>
      </div>
    ),
  },
];

const statisticsMedian: TeoriSlide[] = [
  {
    textKey: "teori.statisticsMedian.1",
    render: () => (
      <Row>
        <Box>3</Box>
        <Box>5</Box>
        <Box tone="highlight">6</Box>
        <Box>8</Box>
        <Box>10</Box>
      </Row>
    ),
  },
  {
    textKey: "teori.statisticsMedian.2",
    render: () => (
      <div className="flex flex-col items-center gap-2">
        <span className="text-sm text-slate-500">2 tal till vänster, 2 tal till höger</span>
        <Box tone="new">6</Box>
      </div>
    ),
  },
];

const statisticsMode: TeoriSlide[] = [
  {
    textKey: "teori.statisticsMode.1",
    render: () => (
      <Row>
        <Box>2</Box>
        <Box>3</Box>
        <Box>3</Box>
        <Box tone="highlight">5</Box>
        <Box tone="highlight">5</Box>
        <Box tone="highlight">5</Box>
        <Box>8</Box>
      </Row>
    ),
  },
  {
    textKey: "teori.statisticsMode.2",
    render: () => (
      <div className="flex flex-col items-center gap-2">
        <span className="text-sm text-slate-500">5:an är med tre gånger - flest av alla</span>
        <Box tone="new">5</Box>
      </div>
    ),
  },
];

const chartReading: TeoriSlide[] = [
  {
    textKey: "teori.chartReading.1",
    render: () => (
      <div className="flex items-end gap-4" style={{ height: 100 }}>
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm font-bold text-slate-700">3</span>
          <div className="w-10 bg-sky-400 rounded-t" style={{ height: 40 }} />
          <span className="text-xs text-slate-600">Äpplen</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm font-bold text-slate-700">7</span>
          <div className="w-10 bg-sky-400 rounded-t" style={{ height: 90 }} />
          <span className="text-xs text-slate-600">Bananer</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm font-bold text-slate-700">5</span>
          <div className="w-10 bg-sky-400 rounded-t" style={{ height: 65 }} />
          <span className="text-xs text-slate-600">Päron</span>
        </div>
      </div>
    ),
  },
  {
    textKey: "teori.chartReading.2",
    render: () => (
      <div className="flex flex-col items-center gap-2">
        <span className="text-sm text-slate-500">Den högsta stapeln har flest - här är det bananer, 7 stycken.</span>
        <Box tone="new">7</Box>
      </div>
    ),
  },
];

const BASIC_TOPICS = {
  placeValue,
  additionBasic,
  subtractionBasic,
  additionCarry,
  subtractionBorrow,
  subtractionZero,
  multiplicationBasic,
  multiplicationCarry,
  decimalColumn,
  statisticsMean,
  statisticsMedian,
  statisticsMode,
  chartReading,
};

/** Every åk 1-6 topic: its worked example (the first slide the idea, the rest its steps), then a common mistake and a quick check. */
const withExtras = (topic: keyof typeof BASIC_TOPICS): TeoriSlide[] => [
  ...BASIC_TOPICS[topic].map((slide, i): TeoriSlide => ({ ...slide, kind: slide.kind ?? (i === 0 ? "concept" : "step") })),
  ...(BASIC_EXTRAS[topic] ?? []),
];

export const TEORI_SLIDES: Record<TeoriTopic, TeoriSlide[]> = {
  ...(Object.fromEntries(Object.keys(BASIC_TOPICS).map((topic) => [topic, withExtras(topic as keyof typeof BASIC_TOPICS)])) as Record<keyof typeof BASIC_TOPICS, TeoriSlide[]>),
  ...ADVANCED_TEORI,
  ...GEOMETRY_TEORI,
  ...DIVISION_TEORI,
  ...MULTIPLICATION_TEORI,
  ...EXAM_TEORI,
  ...BASIC_TEORI,
};

export function topicForStage(stageId: string): TeoriTopic {
  switch (stageId) {
    case "1.1.1":
      return "placeValue";
    case "1.1.2":
      return "additionBasic";
    case "1.1.3":
      return "subtractionBasic";
    case "1.1.4":
    case "1.1.6":
      return "additionCarry";
    case "1.1.5":
      return "subtractionBorrow";
    case "1.1.7":
      return "subtractionZero";
    case "2.1.1":
      return "multiplicationBasic";
    case "2.1.2":
    case "2.1.3":
      return "multiplicationCarry";
    case "2.1.4":
      return "multiplicationTwoDigit";
    case "2.1.5":
      return "multiplicationDecimal";
    case "2.1.6":
      return "multiplicationDecimalDecimal";
    case "2.3.3":
    case "2.3.4":
      return "decimalColumn";
    case "2.5.1":
    case "2.5.2":
      return "divisionTrappan";
    case "2.5.4":
      return "divisionTwoDigit";
    case "2.5.8":
      return "divisionRest";
    case "2.5.3":
      return "divisionDecimals";
    case "2.5.5":
      return "divisionDecimalDividend";
    case "2.5.6":
      return "divisionDecimalDivisor";
    case "2.5.7":
      return "divisionRounding";
    case "2.6.1":
      return "fractionOf";
    case "2.6.2":
      return "fractionSimplify";
    case "2.6.3":
      return "fractionAddSub";
    case "2.6.4":
      return "fractionConvert";
    case "2.9.1":
      return "unitsLengthMass";
    case "2.9.2":
      return "unitsVolume";
    case "2.9.3":
      return "unitsTime";
    case "2.10.1":
      return "orderOfOperations";
    case "2.10.2":
      return "rounding";
    case "3.5.1":
      return "fractionMulDiv";
    case "3.6.1":
      return "speed";
    case "3.6.2":
      return "scale";
    case "3.7.1":
      return "probability";
    case "3.7.2":
      return "probabilityTwo";
    case "3.4.7":
      return "volumePrism";
    case "3.4.8":
      return "volumeRound";
    case "3.3.7":
      return "sequences";
    case "4.1.3":
      return "systems";
    case "1.3.1":
    case "1.3.2":
      return "wordYoung";
    case "2.11.1":
    case "2.11.2":
      return "wordMiddle";
    case "3.8.1":
      return "wordOlder";
    case "3.8.2":
      return "wordEquations";
    case "1.4.1":
      return "timesTables";
    case "1.4.2":
      return "divisionFacts";
    case "1.4.3":
      return "missingNumber";
    case "1.5.1":
    case "1.5.3":
    case "1.5.4":
    case "1.5.5":
    case "1.5.6":
    case "1.5.7":
      return "clock";
    case "1.5.2":
    case "2.9.5":
      return "duration";
    case "1.6.1":
      return "money";
    case "1.6.2":
    case "1.6.4":
      return "shopPay";
    case "1.6.3":
    case "2.9.6":
      return "shopChange";
    case "1.2.2":
      return "shapeCount";
    case "2.12.1":
      return "angles";
    case "2.13.1":
      return "coordinates";
    case "2.14.1":
      return "equationsYoung";
    case "2.15.1":
      return "primes";
    case "2.10.3":
      return "estimation";
    case "2.9.4":
      return "areaUnits";
    case "2.7.1":
      return "statisticsMean";
    case "2.7.2":
      return "statisticsMedian";
    case "2.7.3":
      return "statisticsMode";
    case "2.8.1":
    case "2.8.2":
    case "2.8.3":
      return "chartReading";
    case "3.1.1":
      return "negativeNumbers";
    case "3.1.2":
      return "powers";
    case "3.1.3":
      return "scientific";
    case "3.2.1":
      return "percent";
    case "3.2.2":
      return "changeFactor";
    case "3.3.1":
      return "simplify";
    case "3.3.2":
      return "equations";
    case "3.3.3":
      return "equationsBoth";
    case "3.3.4":
      return "squareRules";
    case "3.3.5":
      return "conjugateRule";
    case "3.3.6":
      return "quadraticBasics";
    case "1.2.1":
      return "perimeter";
    case "2.4.1":
      return "rectangleArea";
    case "2.4.2":
      return "triangleArea";
    case "2.4.3":
      return "parallelogram";
    case "2.4.4":
      return "compositeBasic";
    case "3.4.3":
      return "circle";
    case "3.4.4":
      return "trapezoid";
    case "3.4.5":
      return "compositeCircle";
    case "3.4.6":
      return "inverseArea";
    case "4.2.2":
      return "sector";
    case "4.2.3":
      return "areaSine";
    case "3.4.1":
      return "pythagoras";
    case "3.4.2":
      return "linear";
    case "4.1.1":
      return "pq";
    case "4.1.2":
      return "logarithms";
    case "4.2.1":
      return "trigonometry";
    case "4.3.1":
      return "derivative";
    case "4.3.2":
      return "integral";
    default:
      return "additionBasic";
  }
}
