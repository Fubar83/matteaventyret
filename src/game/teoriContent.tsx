import { ArrowDown, Box, Dot, DotGroup, Row, TenBundle } from "./TeoriVisuals";

export type TeoriTopic =
  | "placeValue"
  | "additionBasic"
  | "subtractionBasic"
  | "additionCarry"
  | "subtractionBorrow"
  | "subtractionZero";

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

export const TEORI_SLIDES: Record<TeoriTopic, TeoriSlide[]> = {
  placeValue,
  additionBasic,
  subtractionBasic,
  additionCarry,
  subtractionBorrow,
  subtractionZero,
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
    default:
      return "additionBasic";
  }
}
