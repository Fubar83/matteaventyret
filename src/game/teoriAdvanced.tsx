/**
 * Theory for åk 7-9 and gymnasiet, and the "Vanligt fel" / "Testa själv"
 * slides every åk 1-6 topic ends with. Pictures are small SVGs in the same
 * spirit as TeoriVisuals: a number line, a triangle, a line, a curve - never
 * decoration, always the thing the slide is about.
 */
import type { ReactNode } from "react";
import { Balance, BarWithScale, Box, Graph, NumberLine, PercentGrid, RightTriangle, Row, SquareRuleSquare } from "./TeoriVisuals";
import { Tex } from "./Tex";
import type { TeoriSlide } from "./teoriContent";

export type AdvancedTopic =
  | "negativeNumbers"
  | "powers"
  | "scientific"
  | "percent"
  | "changeFactor"
  | "simplify"
  | "equations"
  | "equationsBoth"
  | "squareRules"
  | "conjugateRule"
  | "quadraticBasics"
  | "pythagoras"
  | "linear"
  | "pq"
  | "logarithms"
  | "trigonometry"
  | "derivative"
  | "integral";

export const big = (latex: string): ReactNode => <Tex latex={latex} block className="text-xl" />;
export const crossed = (latex: string): ReactNode => (
  <span className="relative inline-block px-2">
    <Tex latex={latex} block className="text-xl" />
    <span className="absolute inset-x-0 top-1/2 h-0.5 bg-rose-500 -rotate-6" />
  </span>
);

export const concept = (textKey: string, render: () => ReactNode): TeoriSlide => ({ textKey, render, kind: "concept" });
export const step = (textKey: string, render: () => ReactNode): TeoriSlide => ({ textKey, render, kind: "step" });
export const mistake = (textKey: string, render: () => ReactNode): TeoriSlide => ({ textKey, render, kind: "mistake" });
export const check = (textKey: string, render: () => ReactNode, options: string[], correct: number): TeoriSlide => ({ textKey, render, kind: "check", check: { options, correct } });

// --- Åk 7-9 and gymnasiet ------------------------------------------------

const k = (topic: AdvancedTopic, n: number) => `teori.adv.${topic}.${n}`;

export const ADVANCED_TEORI: Record<AdvancedTopic, TeoriSlide[]> = {
  negativeNumbers: [
    concept(k("negativeNumbers", 1), () => <NumberLine />),
    step(k("negativeNumbers", 2), () => big("4 - (-2) = 4 + 2 = 6")),
    step(k("negativeNumbers", 3), () => big("(-3) \\cdot (-4) = 12 \\qquad (-3) \\cdot 4 = -12")),
    mistake(k("negativeNumbers", 4), () => crossed("-3 - 5 = -2")),
    check(k("negativeNumbers", 5), () => big("-2 + 7"), ["−9", "5", "9"], 1),
  ],
  powers: [
    concept(k("powers", 1), () => big("2^{3} = 2 \\cdot 2 \\cdot 2 = 8")),
    step(k("powers", 2), () => big("5^{2} = 25 \\qquad 10^{3} = 1000")),
    mistake(k("powers", 3), () => crossed("2^{3} = 2 \\cdot 3")),
    check(k("powers", 4), () => big("3^{2}"), ["6", "9", "32"], 1),
  ],
  scientific: [
    concept(k("scientific", 1), () => big("45\\,000 = 4{,}5 \\cdot 10^{4}")),
    step(k("scientific", 2), () => big("3{,}2 \\cdot 10^{3} = 3\\,200")),
    step(k("scientific", 3), () => big("7 \\cdot 10^{-2} = 0{,}07")),
    mistake(k("scientific", 4), () => crossed("10^{3} = 30")),
    check(k("scientific", 5), () => big("6 \\cdot 10^{2}"), ["60", "600", "6 000"], 1),
  ],
  percent: [
    concept(k("percent", 1), () => <PercentGrid filled={25} />),
    step(k("percent", 2), () => big("25\\,\\% \\text{ av } 80 = 0{,}25 \\cdot 80 = 20")),
    mistake(k("percent", 3), () => crossed("25\\,\\% \\text{ av } 80 = 25 \\cdot 80")),
    check(k("percent", 4), () => big("10\\,\\% \\text{ av } 50"), ["5", "10", "500"], 0),
  ],
  changeFactor: [
    concept(k("changeFactor", 1), () => big("100\\,\\% + 15\\,\\% = 115\\,\\% = 1{,}15")),
    step(k("changeFactor", 2), () => big("200 \\cdot 1{,}15 = 230")),
    step(k("changeFactor", 3), () => big("200 \\cdot 0{,}80 = 160")),
    mistake(k("changeFactor", 4), () => crossed("+5\\,\\% \\;\\rightarrow\\; 1{,}5")),
    check(k("changeFactor", 5), () => big("-10\\,\\%"), ["0,1", "0,9", "1,1"], 1),
  ],
  simplify: [
    concept(k("simplify", 1), () => big("3x + 2x = 5x")),
    step(k("simplify", 2), () => big("4x + 3 + 2x - 1 = 6x + 2")),
    mistake(k("simplify", 3), () => crossed("3x + 2 = 5x")),
    check(k("simplify", 4), () => big("5x - 2x"), ["3", "3x", "7x"], 1),
  ],
  equations: [
    concept(k("equations", 1), () => <Balance />),
    step(k("equations", 2), () => big("\\begin{aligned} 3x + 5 &= 20 \\\\ 3x &= 15 \\\\ x &= 5 \\end{aligned}")),
    step(k("equations", 3), () => big("3 \\cdot 5 + 5 = 20 \\;\\checkmark")),
    mistake(k("equations", 4), () => crossed("3x = 15 \\;\\Rightarrow\\; x = 15 - 3")),
    check(k("equations", 5), () => big("2x = 12"), ["x = 6", "x = 10", "x = 24"], 0),
  ],
  equationsBoth: [
    concept(k("equationsBoth", 1), () => big("5x - 3 = 2x + 9")),
    step(k("equationsBoth", 2), () => big("\\begin{aligned} 5x - 2x &= 9 + 3 \\\\ 3x &= 12 \\\\ x &= 4 \\end{aligned}")),
    mistake(k("equationsBoth", 3), () => crossed("x + 3 = 7 \\;\\Rightarrow\\; x = 7 + 3")),
    check(k("equationsBoth", 4), () => big("4x = 2x + 6"), ["x = 2", "x = 3", "x = 6"], 1),
  ],
  squareRules: [
    concept(k("squareRules", 1), () => <SquareRuleSquare />),
    step(k("squareRules", 2), () => big("(a + b)^{2} = a^{2} + 2ab + b^{2} \\qquad (a - b)^{2} = a^{2} - 2ab + b^{2}")),
    step(k("squareRules", 3), () => big("(x + 3)^{2} = x^{2} + 2 \\cdot x \\cdot 3 + 3^{2} = x^{2} + 6x + 9")),
    step(k("squareRules", 4), () => big("31^{2} = (30 + 1)^{2} = 900 + 60 + 1 = 961")),
    mistake(k("squareRules", 5), () => crossed("(x + 3)^{2} = x^{2} + 9")),
    check(k("squareRules", 6), () => big("(x - 5)^{2}"), ["x² − 10x + 25", "x² − 25", "x² + 25"], 0),
  ],
  conjugateRule: [
    concept(k("conjugateRule", 1), () => big("(a + b)(a - b) = a^{2} - b^{2}")),
    step(k("conjugateRule", 2), () => big("(a + b)(a - b) = a^{2} - ab + ab - b^{2} = a^{2} - b^{2}")),
    step(k("conjugateRule", 3), () => big("x^{2} - 49 = x^{2} - 7^{2} = (x + 7)(x - 7)")),
    step(k("conjugateRule", 4), () => big("21 \\cdot 19 = (20 + 1)(20 - 1) = 400 - 1 = 399")),
    mistake(k("conjugateRule", 5), () => crossed("(x + 4)(x - 4) = x^{2} - 8x - 16")),
    check(k("conjugateRule", 6), () => big("(x + 6)(x - 6)"), ["x² − 36", "x² + 36", "x² − 12x − 36"], 0),
  ],
  quadraticBasics: [
    concept(k("quadraticBasics", 1), () => big("x^{2} = 25 \\;\\Rightarrow\\; x = \\pm 5")),
    step(k("quadraticBasics", 2), () => big("3x^{2} = 48 \\;\\Rightarrow\\; x^{2} = 16 \\;\\Rightarrow\\; x = \\pm 4")),
    step(k("quadraticBasics", 3), () => big("x^{2} - 6x = 0 \\;\\Rightarrow\\; x(x - 6) = 0 \\;\\Rightarrow\\; x_{1} = 0,\\; x_{2} = 6")),
    step(k("quadraticBasics", 4), () => big("(x - 2)(x + 5) = 0 \\;\\Rightarrow\\; x_{1} = 2,\\; x_{2} = -5")),
    mistake(k("quadraticBasics", 5), () => crossed("x^{2} = 25 \\;\\Rightarrow\\; x = 5")),
    check(k("quadraticBasics", 6), () => big("x^{2} + 4x = 0"), ["x = 0 och x = −4", "x = 4", "x = −4"], 0),
  ],
  pythagoras: [
    concept(k("pythagoras", 1), () => <RightTriangle />),
    step(k("pythagoras", 2), () => big("c^{2} = a^{2} + b^{2}")),
    step(k("pythagoras", 3), () => big("c^{2} = 3^{2} + 4^{2} = 25 \\qquad c = \\sqrt{25} = 5")),
    mistake(k("pythagoras", 4), () => crossed("c = a + b")),
    check(k("pythagoras", 5), () => big("a = 6,\\; b = 8"), ["10", "14", "100"], 0),
  ],
  linear: [
    concept(k("linear", 1), () => (
      <Graph f={(x) => 2 * x + 1}>
        <circle cx={110} cy={85 - 12} r={4} fill="#f59e0b" />
      </Graph>
    )),
    step(k("linear", 2), () => big("y = 2 \\cdot 3 + 1 = 7")),
    step(k("linear", 3), () => big("k = \\frac{\\Delta y}{\\Delta x} = \\frac{7 - 3}{3 - 1} = 2")),
    mistake(k("linear", 4), () => crossed("k = \\frac{\\Delta x}{\\Delta y}")),
    check(k("linear", 5), () => big("y = 3x - 2,\\; x = 2"), ["4", "6", "1"], 0),
  ],
  pq: [
    concept(k("pq", 1), () => (
      <Graph f={(x) => 0.5 * (x - 2) * (x + 4) / 2}>
        <circle cx={110 + 2 * 22} cy={85} r={4} fill="#f59e0b" />
        <circle cx={110 - 4 * 22} cy={85} r={4} fill="#f59e0b" />
      </Graph>
    )),
    step(k("pq", 2), () => big("x = -\\frac{p}{2} \\pm \\sqrt{\\left(\\frac{p}{2}\\right)^{2} - q}")),
    step(k("pq", 3), () => big("x^{2} + 2x - 8 = 0: \\quad x = -1 \\pm \\sqrt{1 + 8} = -1 \\pm 3")),
    step(k("pq", 6), () => big("2x^{2} + 4x = 16 \\;\\Rightarrow\\; 2x^{2} + 4x - 16 = 0 \\;\\Rightarrow\\; x^{2} + 2x - 8 = 0")),
    mistake(k("pq", 4), () => crossed("x = \\frac{p}{2} \\pm \\dots")),
    check(k("pq", 5), () => big("x^{2} - 5x + 6 = 0"), ["2 och 3", "−2 och −3", "1 och 6"], 0),
  ],
  logarithms: [
    concept(k("logarithms", 1), () => big("10^{3} = 1000 \\iff \\lg 1000 = 3")),
    step(k("logarithms", 2), () => big("\\lg 100 = 2 \\qquad \\lg 10 = 1 \\qquad \\lg 1 = 0")),
    step(k("logarithms", 3), () => big("10^{x} = 1000 \\;\\Rightarrow\\; x = \\lg 1000 = 3")),
    mistake(k("logarithms", 4), () => crossed("\\lg 1000 = \\frac{1000}{10}")),
    check(k("logarithms", 5), () => big("\\lg 10\\,000"), ["4", "1 000", "40"], 0),
  ],
  trigonometry: [
    concept(k("trigonometry", 1), () => <RightTriangle showAngle />),
    step(k("trigonometry", 2), () => big("\\sin v = \\frac{a}{c} \\quad \\cos v = \\frac{b}{c} \\quad \\tan v = \\frac{a}{b}")),
    step(k("trigonometry", 3), () => big("a = c \\cdot \\sin v = 10 \\cdot \\sin 30^{\\circ} = 10 \\cdot 0{,}5 = 5")),
    mistake(k("trigonometry", 4), () => crossed("\\sin v = \\frac{\\text{närliggande}}{\\text{hypotenusan}}")),
    check(k("trigonometry", 5), () => big("\\cos 60^{\\circ}"), ["0,5", "1", "0"], 0),
  ],
  derivative: [
    concept(k("derivative", 1), () => (
      <Graph f={(x) => (x * x) / 3 - 2}>
        <line x1={110 + 0.5 * 22} y1={85 - (-2 + 2 / 3 - 4 / 3) * 12} x2={110 + 3.5 * 22} y2={85 - (-2 + 2 / 3 + 8 / 3) * 12} stroke="#f59e0b" strokeWidth={2.5} />
        <circle cx={110 + 2 * 22} cy={85 - (4 / 3 - 2) * 12} r={4} fill="#f59e0b" />
      </Graph>
    )),
    step(k("derivative", 2), () => big("f(x) = x^{n} \\;\\Rightarrow\\; f'(x) = n \\cdot x^{n-1}")),
    step(k("derivative", 3), () => big("f(x) = 3x^{2} + 2x + 5 \\;\\Rightarrow\\; f'(x) = 6x + 2")),
    mistake(k("derivative", 4), () => crossed("(x^{3})' = 3x^{3}")),
    check(k("derivative", 5), () => big("f(x) = x^{2}"), ["2x", "x", "2x²"], 0),
  ],
  integral: [
    concept(k("integral", 1), () => (
      <Graph f={(x) => (x * x) / 4 + 0.5}>
        <polygon
          points={[`${110},${85}`, ...Array.from({ length: 21 }, (_, i) => i * 0.15).map((x) => `${110 + x * 22},${85 - (x * x / 4 + 0.5) * 12}`), `${110 + 3 * 22},${85}`].join(" ")}
          fill="#c4b5fd"
          opacity={0.7}
        />
      </Graph>
    )),
    step(k("integral", 2), () => big("\\int_{a}^{b} f(x)\\,dx = F(b) - F(a)")),
    step(k("integral", 3), () => big("\\int_{0}^{2} 3x^{2}\\,dx = \\left[x^{3}\\right]_{0}^{2} = 8 - 0 = 8")),
    mistake(k("integral", 4), () => crossed("F(a) - F(b)")),
    check(k("integral", 5), () => big("\\int_{0}^{1} 2x\\,dx"), ["1", "2", "0"], 0),
  ],
};

// --- "Vanligt fel" and "Testa själv" for åk 1-6 ----------------------------

export const BASIC_EXTRAS: Record<string, TeoriSlide[]> = {
  placeValue: [
    mistake("teori.placeValue.mistake", () => (
      <Row>
        {[4, 5, 0, 6].map((d, i) => (
          <Box key={i} tone={i === 1 ? "highlight" : "plain"}>
            {d}
          </Box>
        ))}
      </Row>
    )),
    check("teori.placeValue.check", () => (
      <Row>
        {[3, 7, 4, 2].map((d, i) => (
          <Box key={i} tone={i === 1 ? "highlight" : "plain"}>
            {d}
          </Box>
        ))}
      </Row>
    ), ["7", "70", "700"], 2),
  ],
  additionBasic: [mistake("teori.additionBasic.mistake", () => crossed("23 + 14 = 91")), check("teori.additionBasic.check", () => big("23 + 14"), ["37", "27", "47"], 0)],
  subtractionBasic: [mistake("teori.subtractionBasic.mistake", () => crossed("47 - 15 = 72")), check("teori.subtractionBasic.check", () => big("47 - 15"), ["32", "62", "22"], 0)],
  additionCarry: [mistake("teori.additionCarry.mistake", () => crossed("47 + 38 = 75")), check("teori.additionCarry.check", () => big("26 + 17"), ["43", "33", "313"], 0)],
  subtractionBorrow: [mistake("teori.subtractionBorrow.mistake", () => crossed("52 - 27 = 35")), check("teori.subtractionBorrow.check", () => big("43 - 18"), ["25", "35", "31"], 0)],
  subtractionZero: [mistake("teori.subtractionZero.mistake", () => crossed("100 - 1 = 109")), check("teori.subtractionZero.check", () => big("100 - 1"), ["99", "109", "90"], 0)],
  multiplicationBasic: [mistake("teori.multiplicationBasic.mistake", () => crossed("23 \\cdot 3 = 9")), check("teori.multiplicationBasic.check", () => big("32 \\cdot 2"), ["64", "34", "62"], 0)],
  multiplicationCarry: [mistake("teori.multiplicationCarry.mistake", () => crossed("47 \\cdot 6 = 242")), check("teori.multiplicationCarry.check", () => big("15 \\cdot 4"), ["60", "40", "420"], 0)],
  decimalColumn: [
    mistake("teori.decimalColumn.mistake", () => crossed("\\begin{array}{cccc} 4 & , & 7 & 5 \\\\ & 2 & , & 5 \\end{array}")),
    check("teori.decimalColumn.check", () => big("1{,}5 + 2{,}3"), ["3,8", "38", "4,8"], 0),
  ],
  statisticsMean: [mistake("teori.statisticsMean.mistake", () => big("\\frac{4 + 7 + 9 + 12}{4} = \\frac{32}{4} = 8")), check("teori.statisticsMean.check", () => big("2,\\;4,\\;6"), ["4", "12", "6"], 0)],
  statisticsMedian: [mistake("teori.statisticsMedian.mistake", () => big("7,\\; 1,\\; 4 \\;\\rightarrow\\; 1,\\; 4,\\; 7")), check("teori.statisticsMedian.check", () => big("7,\\; 1,\\; 4"), ["4", "1", "7"], 0)],
  statisticsMode: [mistake("teori.statisticsMode.mistake", () => big("3,\\; 5,\\; 3,\\; 8")), check("teori.statisticsMode.check", () => big("3,\\; 5,\\; 3,\\; 8"), ["3", "8", "5"], 0)],
  chartReading: [
    mistake("teori.chartReading.mistake", () => <BarWithScale value={10} />),
    check("teori.chartReading.check", () => <BarWithScale value={10} />, ["10", "5", "15"], 0),
  ],
};
