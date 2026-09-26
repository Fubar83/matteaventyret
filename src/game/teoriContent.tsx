import { ArrowDown, Box, Dot, DotGroup, Row, TenBundle } from "./TeoriVisuals";

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
  | "statisticsMode";

export interface TeoriSlide {
  /** i18n key for the narration text - see i18n/sv.json, en.json. */
  textKey: string;
  render: () => React.ReactNode;
}

// Every topic below walks through one concrete worked example (the exact
// numbers from the build brief's own "Addition"/"Subtraction: uppställning"
// sections, where given), using the same box-and-dot visual language the
// child will meet again in Exempel/Uppgift - not abstract shapes with no
// connection to what they're about to do.

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
  {
    textKey: "teori.additionBasic.1",
    render: () => (
      <div className="flex flex-col items-center gap-1">
        <Row>
          <Box>3</Box>
          <Box tone="highlight">4</Box>
        </Row>
        <Row>
          <Box>1</Box>
          <Box tone="highlight">2</Box>
        </Row>
      </div>
    ),
  },
  {
    textKey: "teori.additionBasic.2",
    render: () => (
      <div className="flex flex-col items-center gap-1">
        <Row>
          <Box tone="new">4</Box>
          <Box tone="new">6</Box>
        </Row>
      </div>
    ),
  },
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
  {
    textKey: "teori.additionCarry.1",
    render: () => (
      <div className="flex flex-col items-center gap-1">
        <Row>
          <Box>4</Box>
          <Box tone="highlight">7</Box>
        </Row>
        <Row>
          <Box>3</Box>
          <Box tone="highlight">8</Box>
        </Row>
      </div>
    ),
  },
  {
    textKey: "teori.additionCarry.2",
    render: () => (
      <div className="flex items-center gap-3">
        <DotGroup count={7} tone="sky" />
        <span className="text-lg font-bold text-slate-400">+</span>
        <DotGroup count={8} tone="orange" />
      </div>
    ),
  },
  {
    textKey: "teori.additionCarry.3",
    render: () => (
      <div className="flex items-center gap-3">
        <TenBundle />
        <div className="flex flex-wrap gap-1 w-10">
          {Array.from({ length: 5 }, (_, i) => (
            <Dot key={i} tone="emerald" />
          ))}
        </div>
      </div>
    ),
  },
  {
    textKey: "teori.additionCarry.4",
    render: () => (
      <div className="flex flex-col items-center gap-1">
        <Row>
          <Box size="sm" tone="new">
            1
          </Box>
          <Box size="sm" tone="muted" />
        </Row>
        <Row>
          <Box>4</Box>
          <Box>7</Box>
        </Row>
        <Row>
          <Box>3</Box>
          <Box>8</Box>
        </Row>
        <div className="w-full border-t-2 border-slate-700" />
        <Row>
          <Box tone="muted">?</Box>
          <Box tone="new">5</Box>
        </Row>
      </div>
    ),
  },
  {
    textKey: "teori.additionCarry.5",
    render: () => (
      <Row>
        <Box tone="new">8</Box>
        <Box tone="new">5</Box>
      </Row>
    ),
  },
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
  {
    textKey: "teori.multiplicationBasic.1",
    render: () => (
      <div className="flex flex-col items-center gap-1">
        <Row>
          <Box>2</Box>
          <Box tone="highlight">3</Box>
        </Row>
        <Row>
          <Box tone="muted" />
          <Box tone="highlight">3</Box>
        </Row>
      </div>
    ),
  },
  {
    textKey: "teori.multiplicationBasic.2",
    render: () => (
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          <DotGroup count={3} tone="sky" />
          <DotGroup count={3} tone="sky" />
          <DotGroup count={3} tone="sky" />
        </div>
        <Row>
          <Box tone="muted">?</Box>
          <Box tone="new">9</Box>
        </Row>
      </div>
    ),
  },
  {
    textKey: "teori.multiplicationBasic.3",
    render: () => (
      <Row>
        <Box tone="new">6</Box>
        <Box tone="new">9</Box>
      </Row>
    ),
  },
];

const multiplicationCarry: TeoriSlide[] = [
  {
    textKey: "teori.multiplicationCarry.1",
    render: () => (
      <div className="flex flex-col items-center gap-1">
        <Row>
          <Box>4</Box>
          <Box tone="highlight">7</Box>
        </Row>
        <Row>
          <Box tone="muted" />
          <Box tone="highlight">6</Box>
        </Row>
      </div>
    ),
  },
  {
    textKey: "teori.multiplicationCarry.2",
    render: () => <div className="text-2xl font-bold text-slate-700">7 · 6 = 42</div>,
  },
  {
    textKey: "teori.multiplicationCarry.3",
    render: () => (
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center gap-1">
          <Box tone="new">4</Box>
          <span className="text-xs text-slate-500">tiotal</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Box tone="new">2</Box>
          <span className="text-xs text-slate-500">ental</span>
        </div>
      </div>
    ),
  },
  {
    textKey: "teori.multiplicationCarry.4",
    render: () => (
      <div className="flex flex-col items-center gap-1">
        <Row>
          <Box size="sm" tone="new">
            4
          </Box>
          <Box size="sm" tone="muted" />
        </Row>
        <Row>
          <Box>4</Box>
          <Box>7</Box>
        </Row>
        <Row>
          <Box tone="muted" />
          <Box>6</Box>
        </Row>
        <div className="w-full border-t-2 border-slate-700" />
        <Row>
          <Box tone="muted">?</Box>
          <Box tone="new">2</Box>
        </Row>
      </div>
    ),
  },
  {
    textKey: "teori.multiplicationCarry.5",
    render: () => (
      <Row>
        <Box tone="new">2</Box>
        <Box tone="new">8</Box>
        <Box tone="new">2</Box>
      </Row>
    ),
  },
];

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

export const TEORI_SLIDES: Record<TeoriTopic, TeoriSlide[]> = {
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
    case "2.3.3":
    case "2.3.4":
      return "decimalColumn";
    case "2.7.1":
      return "statisticsMean";
    case "2.7.2":
      return "statisticsMedian";
    case "2.7.3":
      return "statisticsMode";
    default:
      return "additionBasic";
  }
}
