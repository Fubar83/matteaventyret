import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { stageIds } from "./catalog";
import { firstMatching, QuestionStory, questionArgTypes } from "./QuestionStory";
import { CHOICE } from "./variants";

const LEVELS = stageIds("Choice.stories.tsx");

/**
 * Välj rätt: single-choice questions from förskoleklass to åk 9 - counting,
 * patterns, comparing, fractions, shapes, measuring, tables and charts,
 * chance, graphs, percent, geometry and programming. A wrong pick says why
 * it isn't right.
 */
const meta = {
  title: "Frågor/Välj rätt",
  component: QuestionStory,
  args: { stage: LEVELS[0], seed: 1, onSolved: fn() },
  argTypes: questionArgTypes(LEVELS),
} satisfies Meta<typeof QuestionStory>;

export default meta;
type Story = StoryObj<typeof meta>;

const story = (name: string, match: (typeof CHOICE)[keyof typeof CHOICE]): Story => ({ name, args: { ...firstMatching(LEVELS, match), match } });

export const ValfriNiva: Story = { name: "Valfri nivå" };

export const Rakna: Story = story("Räkna", CHOICE.count);
export const RaknaVilkenBild: Story = story("Räkna: vilken bild?", CHOICE.countWhich);
export const FlerFarre: Story = story("Fler, färre, lika många", CHOICE.moreOrFewer);
export const HurMangaFler: Story = story("Hur många fler?", CHOICE.howManyMore);
export const ForeEfter: Story = story("Före och efter", CHOICE.beforeAfter);
export const Mellan: Story = story("Talet mellan", CHOICE.between);
export const KonVem: Story = story("Ordningstal: vem står trea?", CHOICE.queueWho);
export const KonPlats: Story = story("Ordningstal: vilken plats?", CHOICE.queuePlace);
export const Monster: Story = story("Mönster", CHOICE.pattern);
export const Lagesord: Story = story("Lägesord", CHOICE.shelf);
export const LagesordMellan: Story = story("Lägesord: mellan", CHOICE.shelfBetween);
export const Band: Story = story("Längst och kortast", CHOICE.ribbons);
export const Balansvag: Story = story("Tyngst och lättast", CHOICE.balance);
export const StorreMindre: Story = story("Större än, mindre än", CHOICE.compare);
export const UddaEllerJamnt: Story = story("Udda eller jämnt?", CHOICE.parity);
export const VilketArUdda: Story = story("Vilket är udda/jämnt?", CHOICE.parityWhich);
export const BrakHurStorDel: Story = story("Bråk: hur stor del?", CHOICE.fractionHowMuch);
export const BrakVilkenBild: Story = story("Bråk: vilken bild?", CHOICE.fractionWhichPicture);
export const DelAvAntal: Story = story("Bråk: del av antal", CHOICE.partOf);
export const PizzaKvar: Story = story("Pizza: hur mycket är kvar?", CHOICE.pizzaLeft);
export const Chokladkaka: Story = story("Chokladkakan", CHOICE.chocolate);
export const DelaPizza: Story = story("Dela en pizza lika", CHOICE.sharePizza);
export const VemFickMest: Story = story("Vem fick mest?", CHOICE.whoGetsMost);
export const LikaStoraBrak: Story = story("Lika stora bråk", CHOICE.equalWhich);
export const LikaStoraBrakRutan: Story = story("Lika stora bråk: talet i rutan", CHOICE.equalMissing);
export const PizzaTillsammans: Story = story("Pizza: tillsammans och kvar", CHOICE.pizzaTogether);
export const DelAvChokladkaka: Story = story("Del av en chokladkaka", CHOICE.chocolatePart);
export const BlandadForm: Story = story("Fler än en pizza (blandad form)", CHOICE.mixedNumber);
export const FormensNamn: Story = story("Formens namn", CHOICE.shapeName);
export const VilkenForm: Story = story("Vilken bild är formen?", CHOICE.shapeWhichPicture);
export const Symmetri: Story = story("Symmetri", CHOICE.symmetry);
export const KalenderDagar: Story = story("Kalendern: dagar", CHOICE.calendarDays);
export const KalenderManader: Story = story("Kalendern: månader", CHOICE.calendarMonths);
export const KalenderHurManga: Story = story("Kalendern: hur många?", CHOICE.calendarHowMany);
export const SakertMojligt: Story = story("Säkert, möjligt, omöjligt", CHOICE.chanceWords);
export const StorstChans: Story = story("Störst chans", CHOICE.chanceMost);
export const DecimalPositioner: Story = story("Decimaltalens positioner", CHOICE.decimalPlace);
export const TioHundraTusen: Story = story("· och / med 10, 100, 1000", CHOICE.tenPowers);
export const StorleksordnaDecimaltal: Story = story("Storleksordna decimaltal", CHOICE.orderDecimals);
export const Termometern: Story = story("Termometern", CHOICE.thermometer);
export const Kallast: Story = story("Kallast/varmast", CHOICE.coldest);
export const SannolikhetTarning: Story = story("Sannolikhet: tärning", CHOICE.probabilityDie);
export const SannolikhetPase: Story = story("Sannolikhet: påse/snurra", CHOICE.probabilityBag);
export const RobotVarHamnar: Story = story("Programmering: var hamnar roboten?", CHOICE.robotWhere);
export const RobotVilketProgram: Story = story("Programmering: vilket program?", CHOICE.robotWhich);
export const LoopVarHamnar: Story = story("Loopar: var hamnar roboten?", CHOICE.loopWhere);
export const LoopHurMangaSteg: Story = story("Loopar: hur många steg?", CHOICE.loopSteps);
export const Koksvag: Story = story("Köksvågen", CHOICE.kitchenScale);
export const Kilogram: Story = story("Gram och kilogram", CHOICE.kilograms);
export const Litermatt: Story = story("Litermåttet", CHOICE.jug);
export const TillEnLiter: Story = story("Hur mycket till en liter?", CHOICE.jugToLitre);
export const Streckrakning: Story = story("Streckräkning", CHOICE.tally);
export const CirkeldiagramBrak: Story = story("Cirkeldiagram: bråk", CHOICE.pieFraction);
export const CirkeldiagramProcent: Story = story("Cirkeldiagram: procent", CHOICE.piePercent);
export const CirkeldiagramAntal: Story = story("Cirkeldiagram: hur många?", CHOICE.pieHowMany);
export const TidtabellNar: Story = story("Tidtabell: när är bussen där?", CHOICE.busWhen);
export const TidtabellVilkenBuss: Story = story("Tidtabell: vilken buss?", CHOICE.busWhich);
export const ProportionellGraf: Story = story("Proportionalitet: läs av grafen", CHOICE.proportionalGraph);
export const ProportionellVilken: Story = story("Proportionalitet: vilken graf?", CHOICE.proportionalWhich);
export const VinkelTyp: Story = story("Vinkeltyper", CHOICE.angleKind);
export const VinkelStorlek: Story = story("Ungefär hur stor vinkel?", CHOICE.angleSize);
export const SkalaKarta: Story = story("Skala: kartan", CHOICE.scaleMap);
export const SkalaForstoring: Story = story("Skala: förstoring", CHOICE.scaleBigger);
export const VillkorJamnt: Story = story("Villkor: jämnt eller udda", CHOICE.codeIfElse);
export const VillkorPoang: Story = story("Villkor: större än", CHOICE.codeScore);
export const LoopMedan: Story = story("Loopar: medan", CHOICE.codeLoop);
export const ByteVariabler: Story = story("Variabler: byta värden", CHOICE.codeSwap);
export const Kvadratrotter: Story = story("Kvadratrötter", CHOICE.squareRoots);
export const Procentenheter: Story = story("Procentenheter", CHOICE.percentagePoints);
export const Ranta: Story = story("Ränta på ränta", CHOICE.interest);
export const Olikheter: Story = story("Olikheter", CHOICE.inequality);
export const RataLinjen: Story = story("Grafer och formler", CHOICE.lineFormula);
export const TabellFormel: Story = story("Tabell och formel", CHOICE.tableFormula);
export const Stickor: Story = story("Mönster med stickor", CHOICE.sticks);
export const Likformighet: Story = story("Likformighet", CHOICE.similar);
export const Vinklar: Story = story("Vertikalvinklar och sidovinklar", CHOICE.crossing);
export const Begransningsarea: Story = story("Begränsningsarea", CHOICE.surfaceArea);
export const MedelvardeMedian: Story = story("Medelvärde eller median?", CHOICE.meanOrMedian);
export const MissvisandeDiagram: Story = story("Missvisande diagram", CHOICE.misleadingChart);
export const DiagramHurMycket: Story = story("Missvisande diagram: hur mycket egentligen?", CHOICE.chartHowMuch);
export const SaknadRad: Story = story("Programmering: vilken rad saknas?", CHOICE.missingLine);
export const Gradskiva: Story = story("Mät med gradskiva", CHOICE.protractor);
export const AreaRutatPapper: Story = story("Area på rutat papper: triangel", CHOICE.areaOnPaper);
export const AreaParallellogram: Story = story("Area på rutat papper: parallellogram", CHOICE.parallelogramOnPaper);
export const Kubnat: Story = story("Kubens nät", CHOICE.cubeNets);
export const InteKubnat: Story = story("Inte ett kubnät", CHOICE.notCubeNet);
export const Kongruens: Story = story("Kongruens", CHOICE.congruent);
export const Rimligt: Story = story("Rimligt svar", CHOICE.reasonable);
export const RimligtPris: Story = story("Rimligt pris", CHOICE.reasonablePrice);
export const Primtalsfaktorisering: Story = story("Primtalsfaktorisering", CHOICE.primeFactors);
export const Rea: Story = story("Rea", CHOICE.sale);
export const UtanMoms: Story = story("Pris utan moms", CHOICE.vatRemove);
export const Amortering: Story = story("Amortering", CHOICE.loanMonthly);
export const Laneranta: Story = story("Ränta på lån", CHOICE.loanInterest);
export const Uppskatta: Story = story("Uppskatta antal", CHOICE.estimate);
export const BudgetOver: Story = story("Budget: blir över", CHOICE.budgetLeft);
export const BudgetManader: Story = story("Budget: spara", CHOICE.budgetMonths);
export const BudgetHyra: Story = story("Budget: hyrans andel", CHOICE.budgetRent);
export const TrigExakt: Story = story("Trigonometri: exakta värden", CHOICE.trigExact);
export const TrigVinkel: Story = story("Trigonometri: vilken vinkel?", CHOICE.trigAngle);
export const TrigTriangel: Story = story("Trigonometri: ur triangeln", CHOICE.trigTriangle);
export const TrigSupplement: Story = story("sin v = sin(180° − v)", CHOICE.trigSupplement);
export const TrigKomplement: Story = story("cos v = sin(90° − v)", CHOICE.trigComplement);
export const TrigNegativ: Story = story("cos(−v) och sin(−v)", CHOICE.trigNegative);
export const TrigPythagoras: Story = story("cos v ur sin v", CHOICE.trigPythagoras);
export const TrigTan: Story = story("tan v = sin v / cos v", CHOICE.trigTan);
export const TrigKvadrater: Story = story("sin² v + cos² v", CHOICE.trigSquares);
export const Potenslagar: Story = story("Potenslagar", CHOICE.powerLaws);
export const Rotregler: Story = story("Räkneregler för rötter", CHOICE.rootRules);
export const MinusParentes: Story = story("Minus framför parentes", CHOICE.minusBracket);
export const Brakuttryck: Story = story("Förenkla bråkuttryck", CHOICE.algebraFractions);
export const LosaUt: Story = story("Lösa ut ur formler", CHOICE.rearrange);
export const Exponenter: Story = story("Negativa och rationella exponenter", CHOICE.exponents);
export const Logaritmlagar: Story = story("Logaritmlagar", CHOICE.logLaws);
export const Liter: Story = story("Liter och kubikdecimeter", CHOICE.litres);
