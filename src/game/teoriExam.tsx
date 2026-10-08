/**
 * Theory for the national-test topics (engine/examTopics.ts): the idea on a
 * small example, a worked step, the usual mistake and a quick "Testa själv".
 */
import type { TeoriSlide } from "./teoriContent";
import { big, check, concept, crossed, mistake, step } from "./teoriAdvanced";

export type ExamTopic =
  | "fractionOf"
  | "fractionSimplify"
  | "fractionAddSub"
  | "fractionConvert"
  | "unitsLengthMass"
  | "unitsVolume"
  | "unitsTime"
  | "orderOfOperations"
  | "rounding"
  | "fractionMulDiv"
  | "speed"
  | "scale"
  | "probability"
  | "probabilityTwo"
  | "volumePrism"
  | "volumeRound"
  | "sequences"
  | "systems"
  | "wordYoung"
  | "wordMiddle"
  | "wordOlder"
  | "wordEquations";

const k = (topic: ExamTopic, n: number) => `teori.exam.${topic}.${n}`;

export const EXAM_TEORI: Record<ExamTopic, TeoriSlide[]> = {
  fractionOf: [
    concept(k("fractionOf", 1), () => big("\\frac{3}{4} \\text{ av } 20")),
    step(k("fractionOf", 2), () => big("20 / 4 = 5 \\qquad 5 \\cdot 3 = 15")),
    mistake(k("fractionOf", 3), () => crossed("\\frac{3}{4} \\text{ av } 20 = 20 / 3")),
    check(k("fractionOf", 4), () => big("\\frac{2}{5} \\text{ av } 30"), ["12", "6", "15"], 0),
  ],
  fractionSimplify: [
    concept(k("fractionSimplify", 1), () => big("\\frac{12}{18} = \\frac{2}{3}")),
    step(k("fractionSimplify", 2), () => big("\\frac{12}{18} = \\frac{12 / 6}{18 / 6} = \\frac{2}{3}")),
    mistake(k("fractionSimplify", 3), () => crossed("\\frac{12}{18} = \\frac{6}{9} \\;\\text{(klart?)}")),
    check(k("fractionSimplify", 4), () => big("\\frac{15}{20}"), ["3/4", "5/10", "3/5"], 0),
  ],
  fractionAddSub: [
    concept(k("fractionAddSub", 1), () => big("\\frac{1}{3} + \\frac{1}{4} = \\frac{4}{12} + \\frac{3}{12}")),
    step(k("fractionAddSub", 2), () => big("\\frac{4}{12} + \\frac{3}{12} = \\frac{7}{12}")),
    mistake(k("fractionAddSub", 3), () => crossed("\\frac{1}{3} + \\frac{1}{4} = \\frac{2}{7}")),
    check(k("fractionAddSub", 4), () => big("\\frac{1}{2} + \\frac{1}{4}"), ["3/4", "2/6", "1/3"], 0),
  ],
  fractionConvert: [
    concept(k("fractionConvert", 1), () => big("\\frac{3}{4} = 3 / 4 = 0{,}75 = 75\\ \\%")),
    step(k("fractionConvert", 2), () => big("40\\ \\% = \\frac{40}{100} = \\frac{2}{5}")),
    mistake(k("fractionConvert", 3), () => crossed("0{,}5 = 5\\ \\%")),
    check(k("fractionConvert", 4), () => big("\\frac{1}{4}"), ["25 %", "14 %", "40 %"], 0),
  ],
  unitsLengthMass: [
    concept(k("unitsLengthMass", 1), () => big("1\\ \\text{m} = 10\\ \\text{dm} = 100\\ \\text{cm} = 1000\\ \\text{mm}")),
    step(k("unitsLengthMass", 2), () => big("3{,}5\\ \\text{m} = 3{,}5 \\cdot 100\\ \\text{cm} = 350\\ \\text{cm}")),
    mistake(k("unitsLengthMass", 3), () => crossed("2\\ \\text{kg} = 200\\ \\text{g}")),
    check(k("unitsLengthMass", 4), () => big("4{,}2\\ \\text{km} = \\;?\\ \\text{m}"), ["4200", "420", "42"], 0),
  ],
  unitsVolume: [
    concept(k("unitsVolume", 1), () => big("1\\ \\text{l} = 10\\ \\text{dl} = 100\\ \\text{cl} = 1000\\ \\text{ml}")),
    step(k("unitsVolume", 2), () => big("1\\ \\text{dm}^{3} = 1\\ \\text{l} \\qquad 1\\ \\text{cm}^{3} = 1\\ \\text{ml}")),
    mistake(k("unitsVolume", 3), () => crossed("3\\ \\text{dl} = 300\\ \\text{l}")),
    check(k("unitsVolume", 4), () => big("2{,}5\\ \\text{l} = \\;?\\ \\text{dl}"), ["25", "250", "2,5"], 0),
  ],
  unitsTime: [
    concept(k("unitsTime", 1), () => big("1\\ \\text{h} = 60\\ \\text{min} \\qquad 1\\ \\text{min} = 60\\ \\text{s}")),
    step(k("unitsTime", 2), () => big("2{,}5\\ \\text{h} = 2{,}5 \\cdot 60\\ \\text{min} = 150\\ \\text{min}")),
    mistake(k("unitsTime", 3), () => crossed("1{,}5\\ \\text{h} = 1\\ \\text{h}\\ 50\\ \\text{min}")),
    check(k("unitsTime", 4), () => big("1\\ \\text{h}\\ 20\\ \\text{min} = \\;?\\ \\text{min}"), ["80", "120", "72"], 0),
  ],
  orderOfOperations: [
    concept(k("orderOfOperations", 1), () => big("3 + 4 \\cdot 5 = 3 + 20 = 23")),
    step(k("orderOfOperations", 2), () => big("(3 + 4) \\cdot 5 = 7 \\cdot 5 = 35")),
    mistake(k("orderOfOperations", 3), () => crossed("3 + 4 \\cdot 5 = 7 \\cdot 5 = 35")),
    check(k("orderOfOperations", 4), () => big("10 - 6 / 2"), ["7", "2", "8"], 0),
  ],
  rounding: [
    concept(k("rounding", 1), () => big("3\\,476 \\approx 3\\,500")),
    step(k("rounding", 2), () => big("2{,}3\\underline{4}8 \\approx 2{,}3 \\qquad 2{,}3\\underline{5}1 \\approx 2{,}4")),
    mistake(k("rounding", 3), () => crossed("4{,}96 \\approx 4{,}10")),
    check(k("rounding", 4), () => big("7{,}85 \\;\\text{till en decimal}"), ["7,9", "7,8", "8,0"], 0),
  ],
  fractionMulDiv: [
    concept(k("fractionMulDiv", 1), () => big("\\frac{2}{3} \\cdot \\frac{3}{4} = \\frac{6}{12} = \\frac{1}{2}")),
    step(k("fractionMulDiv", 2), () => big("\\frac{2}{3} \\div \\frac{4}{5} = \\frac{2}{3} \\cdot \\frac{5}{4} = \\frac{10}{12} = \\frac{5}{6}")),
    mistake(k("fractionMulDiv", 3), () => crossed("\\frac{2}{3} \\div \\frac{4}{5} = \\frac{2}{3} \\cdot \\frac{4}{5}")),
    check(k("fractionMulDiv", 4), () => big("\\frac{1}{2} \\cdot \\frac{2}{5}"), ["1/5", "2/7", "3/10"], 0),
  ],
  speed: [
    concept(k("speed", 1), () => big("s = v \\cdot t \\qquad v = \\frac{s}{t} \\qquad t = \\frac{s}{v}")),
    step(k("speed", 2), () => big("v = 80\\ \\text{km/h},\\ t = 2{,}5\\ \\text{h}: \\quad s = 80 \\cdot 2{,}5 = 200\\ \\text{km}")),
    mistake(k("speed", 3), () => crossed("1\\ \\text{h}\\ 30\\ \\text{min} = 1{,}3\\ \\text{h}")),
    check(k("speed", 4), () => big("s = 150\\ \\text{km},\\ t = 3\\ \\text{h}: \\; v = \\;?"), ["50 km/h", "450 km/h", "153 km/h"], 0),
  ],
  scale: [
    concept(k("scale", 1), () => big("1 : 500")),
    step(k("scale", 2), () => big("4\\ \\text{cm} \\cdot 500 = 2000\\ \\text{cm} = 20\\ \\text{m}")),
    mistake(k("scale", 3), () => crossed("4\\ \\text{cm} \\cdot 500 = 2000\\ \\text{m}")),
    check(k("scale", 4), () => big("1 : 100,\\; 3\\ \\text{cm}"), ["3 m", "30 m", "300 m"], 0),
  ],
  probability: [
    concept(k("probability", 1), () => big("P = \\frac{\\text{gynnsamma}}{\\text{möjliga}}")),
    step(k("probability", 2), () => big("P(\\text{sexa}) = \\frac{1}{6}")),
    mistake(k("probability", 3), () => crossed("3\\ \\text{röda},\\ 5\\ \\text{blå}: \\; P(\\text{röd}) = \\frac{3}{5}")),
    check(k("probability", 4), () => big("2\\ \\text{röda},\\ 6\\ \\text{blå}: \\; P(\\text{röd})"), ["1/4", "1/3", "2/6"], 0),
  ],
  probabilityTwo: [
    concept(k("probabilityTwo", 1), () => big("P(\\text{krona, krona}) = \\frac{1}{2} \\cdot \\frac{1}{2} = \\frac{1}{4}")),
    step(k("probabilityTwo", 2), () => big("6 \\cdot 6 = 36 \\;\\text{utfall}")),
    mistake(k("probabilityTwo", 3), () => crossed("P(\\text{två sexor}) = \\frac{1}{6} + \\frac{1}{6}")),
    check(k("probabilityTwo", 4), () => big("P(\\text{två sexor})"), ["1/36", "1/12", "2/6"], 0),
  ],
  volumePrism: [
    concept(k("volumePrism", 1), () => big("V = B \\cdot h")),
    step(k("volumePrism", 2), () => big("V = 5 \\cdot 3 \\cdot 4 = 60\\ \\text{cm}^{3}")),
    mistake(k("volumePrism", 3), () => crossed("V = 5 + 3 + 4 = 12\\ \\text{cm}^{3}")),
    check(k("volumePrism", 4), () => big("\\text{kub, sidan } 3\\ \\text{cm}"), ["27 cm³", "9 cm³", "18 cm³"], 0),
  ],
  volumeRound: [
    concept(k("volumeRound", 1), () => big("V_{\\text{cylinder}} = \\pi r^{2} h \\qquad V_{\\text{kon}} = \\frac{\\pi r^{2} h}{3} \\qquad V_{\\text{klot}} = \\frac{4 \\pi r^{3}}{3}")),
    step(k("volumeRound", 2), () => big("r = 2,\\ h = 5: \\quad V = \\pi \\cdot 2^{2} \\cdot 5 = \\pi \\cdot 20 \\approx 3{,}14 \\cdot 20 = 62{,}8\\ \\text{cm}^{3}")),
    mistake(k("volumeRound", 3), () => crossed("V = \\pi \\cdot 2 \\cdot 5")),
    check(k("volumeRound", 4), () => big("\\text{kon: } r = 3,\\ h = 4"), ["37,7 cm³", "113,1 cm³", "12,6 cm³"], 0),
  ],
  sequences: [
    concept(k("sequences", 1), () => big("3,\\ 7,\\ 11,\\ 15,\\ \\ldots \\quad (+4)")),
    step(k("sequences", 2), () => big("\\text{plats } n: \\; 3 + (n - 1) \\cdot 4 = 4n - 1")),
    mistake(k("sequences", 3), () => crossed("\\text{plats } 20: \\; 20 \\cdot 4 = 80")),
    check(k("sequences", 4), () => big("2,\\ 5,\\ 8,\\ 11,\\ \\ldots \\; \\text{plats } 10"), ["29", "30", "32"], 0),
  ],
  wordYoung: [
    concept(k("wordYoung", 1), () => big("4 + 3 = 7")),
    step(k("wordYoung", 2), () => big("\text{tillsammans} \to + \qquad \text{kvar} \to - \qquad \text{varje} \to \cdot")),
    mistake(k("wordYoung", 3), () => crossed("12 + 5 = 17 \;\text{(kvar?)}")),
    check(k("wordYoung", 4), () => big("\text{12 kakor, 5 äts upp}"), ["7", "17", "60"], 0),
  ],
  wordMiddle: [
    concept(k("wordMiddle", 1), () => big("3 \cdot 25 = 75 \qquad 100 - 75 = 25")),
    step(k("wordMiddle", 2), () => big("\text{medelvärde} = \frac{\text{summan}}{\text{antalet}}")),
    mistake(k("wordMiddle", 3), () => crossed("14.20 \to 16.05: \; 16{,}05 - 14{,}20 = 1{,}85")),
    check(k("wordMiddle", 4), () => big("\text{4 glassar à 15 kr, betalar 100 kr}"), ["40 kr", "60 kr", "85 kr"], 0),
  ],
  wordOlder: [
    concept(k("wordOlder", 1), () => big("20\ \% \text{ av } 600 = 0{,}2 \cdot 600 = 120")),
    step(k("wordOlder", 2), () => big("600 - 120 = 480 \qquad (0{,}8 \cdot 600 = 480)")),
    mistake(k("wordOlder", 3), () => crossed("600 - 20 = 580")),
    check(k("wordOlder", 4), () => big("\text{400 kr, 25 \% rabatt}"), ["300 kr", "375 kr", "100 kr"], 0),
  ],
  wordEquations: [
    concept(k("wordEquations", 1), () => big("x + (x + 3) = 15")),
    step(k("wordEquations", 2), () => big("2x + 3 = 15 \;\Rightarrow\; 2x = 12 \;\Rightarrow\; x = 6")),
    mistake(k("wordEquations", 3), () => crossed("x + 3 = 15")),
    check(k("wordEquations", 4), () => big("3x + 4 = 19"), ["x = 5", "x = 7", "x = 15"], 0),
  ],
  systems: [
    concept(k("systems", 1), () => big("\\begin{cases} y = 2x + 1 \\\\ y = -x + 7 \\end{cases}")),
    step(k("systems", 2), () => big("2x + 1 = -x + 7 \\;\\Rightarrow\\; 3x = 6 \\;\\Rightarrow\\; x = 2,\\ y = 5")),
    mistake(k("systems", 3), () => crossed("x = 2 \\;\\text{(och y?)}")),
    check(k("systems", 4), () => big("\\begin{cases} x + y = 5 \\\\ x - y = 1 \\end{cases}"), ["x = 3, y = 2", "x = 2, y = 3", "x = 4, y = 1"], 0),
  ],
};
