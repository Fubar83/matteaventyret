import { useState } from "react";
import { checkHands, hourAngle, minuteAngle, spokenTime, type ClockProblem, type ClockTime } from "../engine/clock";
import { t } from "../i18n";
import { ClockFace } from "./ClockFace";
import { DigitalClock } from "./DigitalClock";
import { DigitalClockSetter } from "./DigitalClockSetter";
import { HelpLadder } from "./HelpLadder";
import { SkyScene } from "./SkyScene";
import type { QuestionOutcome } from "./questionOutcome";

/** "halv 6", "fem i halv 3" - the time in words, the hours as digits, in the current language. */
export function timeInWords(h: number, m: number): string {
  const s = spokenTime(h, m);
  return t(s.key, { h: String(s.hour), n: String(s.next) });
}

/** A time to pick: "klockan 3" on the whole hour (a bare "3" is no answer), else in words. */
function optionText({ h, m }: ClockTime): string {
  return m === 0 ? t("clock.oclock", { h: String(((h + 11) % 12) + 1) }) : timeInWords(h, m);
}

/** Where the hour hand belongs, in words: on 5, or between 5 and 6 (nearer which). */
function hourPlace(h: number, m: number): string {
  const hour = ((h + 11) % 12) + 1;
  const next = (hour % 12) + 1;
  if (m === 0) return t("clock.hourOn", { h: hour });
  return t(m < 30 ? "clock.hourNear" : m === 30 ? "clock.hourHalf" : "clock.hourNearNext", { h: hour, n: next });
}

/** Where the minute hand belongs, in words: on 6, or 2 small ticks after 4. */
function minutePlace(m: number): string {
  if (m % 5 === 0) return t("clock.minuteOn", { n: m === 0 ? 12 : m / 5, m });
  return t("clock.minuteBetween", { n: Math.floor(m / 5) === 0 ? 12 : Math.floor(m / 5), k: m % 5, m });
}

const twoDigits = (n: number) => String(n).padStart(2, "0");

/** A question's stars: help (beyond the first wrong try) or the answer shown costs. */
function outcomeOf(wrong: number, helpUsed: number, shown: boolean): QuestionOutcome {
  return { helped: helpUsed > 0 || wrong >= 2 || shown, fullSetup: true, wrongFirstAttempts: wrong >= 1 ? 1 : 0, hintUsed: wrong >= 2, miniTutorialUsed: shown };
}

/** The tip for a clock question: the level's own, and the 24-hour rule when it's afternoon. */
function tipFor(problem: ClockProblem): string {
  const afternoon = problem.h >= 13 || (problem.h === 0 && problem.given !== "words");
  const base = t(`clock.tip.${problem.stageId}`);
  return afternoon ? `${base} ${t("clock.tip24", { h: problem.h, twelve: ((problem.h + 11) % 12) + 1 })}` : base;
}

/** A clock with hands that only shows the time, in its sky. */
function ShownClock({ problem, size = 260 }: { problem: ClockProblem; size?: number }) {
  return (
    <SkyScene hour={problem.sky}>
      <div className="rounded-full bg-white/30 p-2 backdrop-blur-[2px] shadow-2xl">
        <ClockFace face={problem.face} hourDeg={hourAngle(problem.h, problem.m)} minuteDeg={minuteAngle(problem.m)} size={size} label={t("clock.label")} />
      </div>
    </SkyScene>
  );
}

/**
 * A clock question, one kind of clock at a time (engine/clock.ts):
 * read a clock with hands by picking what it says, drag its hands to a time
 * (in words, or on a digital clock), or set a digital clock to the hands.
 */
export function ClockPlayer({ problem, onSolved }: { problem: ClockProblem; onSolved: (outcome: QuestionOutcome) => void }) {
  if (problem.task === "read") return <ReadClock problem={problem} onSolved={onSolved} />;
  if (problem.task === "setDigital") return <SetDigital problem={problem} onSolved={onSolved} />;
  return <SetHands problem={problem} onSolved={onSolved} />;
}

/** Vad är klockan? A clock with hands, and the time to pick among the usual mistakes - "halv 1" for halv 2, "kvart i" for kvart över. */
function ReadClock({ problem, onSolved }: { problem: ClockProblem; onSolved: (outcome: QuestionOutcome) => void }) {
  const options = problem.options ?? [];
  const correct = problem.correct ?? 0;
  const [wrongPicks, setWrongPicks] = useState<number[]>([]);
  const [helpUsed, setHelpUsed] = useState(0);
  const [state, setState] = useState<"working" | "solved" | "shown">("working");
  const [message, setMessage] = useState<string | null>(null);

  function pick(i: number) {
    if (state !== "working" || wrongPicks.includes(i)) return;
    if (i === correct) {
      setState("solved");
      setMessage(null);
      onSolved(outcomeOf(wrongPicks.length, helpUsed, false));
      return;
    }
    const wrong = [...wrongPicks, i];
    setWrongPicks(wrong);
    if (wrong.length >= 2) {
      setState("shown");
      setMessage(t("clock.readShown", { time: optionText(options[correct]), minute: minutePlace(problem.m), hour: hourPlace(problem.h, problem.m) }));
      return;
    }
    // Which hand was misread: the minutes first, as they're read first.
    const picked = options[i];
    setMessage(picked.m !== problem.m ? t("clock.readWrongMinute", { where: minutePlace(problem.m) }) : t("clock.readWrongHour", { where: hourPlace(problem.h, problem.m) }));
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <p className="text-xl text-slate-800 text-center font-semibold">{t("clock.readPrompt")}</p>
      <ShownClock problem={problem} />
      <div className="grid grid-cols-2 gap-3 w-full max-w-sm" role="group" aria-label={t("clock.readPrompt")}>
        {options.map((o, i) => {
          const isWrong = wrongPicks.includes(i);
          const isRight = state !== "working" && i === correct;
          return (
            <button
              key={`${o.h}:${o.m}`}
              type="button"
              onClick={() => pick(i)}
              disabled={isWrong || state !== "working"}
              className={`min-h-14 px-3 rounded-2xl border-2 text-lg font-bold shadow-sm active:translate-y-0.5 ${
                isRight ? "bg-emerald-100 border-emerald-500 text-emerald-800" : isWrong ? "bg-rose-50 border-rose-300 text-rose-400 line-through" : "bg-white border-sky-300 text-slate-800"
              }`}
            >
              {optionText(o)}
            </button>
          );
        })}
      </div>
      {message && (
        <p role="status" className="text-sm text-center max-w-sm text-slate-700">
          {message}
        </p>
      )}
      {state === "working" && (
        <HelpLadder
          used={helpUsed}
          onUse={setHelpUsed}
          steps={[
            { title: t("help.tip"), content: tipFor(problem) },
            { title: t("help.step"), content: t("clock.helpReadMinute", { where: minutePlace(problem.m) }) },
            { title: t("help.solution"), content: t("clock.helpReadHour", { where: hourPlace(problem.h, problem.m) }) },
          ]}
        />
      )}
      {state === "shown" && (
        <button type="button" onClick={() => onSolved(outcomeOf(wrongPicks.length, helpUsed, true))} className="h-12 px-6 rounded-xl bg-emerald-600 text-white font-bold shadow">
          {t("placeValue.next")}
        </button>
      )}
    </div>
  );
}

/**
 * Från visare till digital: a clock with hands is shown, and the child sets a
 * digital clock to the same time - the hours as the time of day has them
 * (after 12 they go on: 13, 14 ...), the minutes in the level's steps.
 */
function SetDigital({ problem, onSolved }: { problem: ClockProblem; onSolved: (outcome: QuestionOutcome) => void }) {
  const [time, setTime] = useState({ h: problem.start.h, m: problem.start.m - (problem.start.m % problem.snap) });
  const [attempts, setAttempts] = useState(0);
  const [helpUsed, setHelpUsed] = useState(0);
  const [mark, setMark] = useState<"hours" | "minutes" | null>(null);
  const [message, setMessage] = useState<{ text: string; tone: "good" | "bad" } | null>(null);
  const [state, setState] = useState<"working" | "solved" | "shown">("working");
  const { h, m } = problem;
  const afternoon = h >= 13 || h === 0;
  const shownText = `${h}.${twoDigits(m)}`;

  function show() {
    setTime({ h, m });
    setMark(null);
    setState("shown");
    setMessage({ text: t("clock.digitalShown", { time: shownText }), tone: "bad" });
  }

  function check() {
    if (time.h === h && time.m === m) {
      setState("solved");
      setMark(null);
      setMessage({ text: t("clock.right"), tone: "good" });
      onSolved(outcomeOf(attempts, helpUsed, false));
      return;
    }
    const next = attempts + 1;
    setAttempts(next);
    if (next >= 3) {
      show();
      return;
    }
    // The minutes first, as they're read first.
    if (time.m !== m) {
      setMark("minutes");
      setMessage({ text: t(next === 1 ? "clock.digitalWrongMinute" : "clock.digitalWrongMinuteWhere", { where: minutePlace(m), m }), tone: "bad" });
    } else {
      setMark("hours");
      setMessage({ text: t(afternoon ? "clock.digitalWrongHour24" : "clock.digitalWrongHour", { where: hourPlace(h, m) }), tone: "bad" });
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      <p className="text-lg text-slate-800 text-center font-semibold max-w-md">{t(afternoon ? "clock.toDigital24" : "clock.toDigital")}</p>
      <ShownClock problem={problem} size={230} />
      <DigitalClockSetter
        h={time.h}
        m={time.m}
        onChange={(hh, mm) => {
          setTime({ h: hh, m: mm });
          setMark(null);
        }}
        minuteStep={problem.snap}
        look={problem.digitalLook}
        size={260}
        disabled={state !== "working"}
        mark={mark}
      />
      {state === "working" && <p className="text-xs text-slate-500 text-center max-w-sm">{t("clock.digitalHint")}</p>}
      {message && (
        <p role="status" className={`text-sm text-center max-w-sm ${message.tone === "good" ? "text-emerald-700 font-semibold" : "text-slate-700"}`}>
          {message.text}
        </p>
      )}
      {state === "working" && (
        <>
          <button type="button" onClick={check} className="h-12 px-8 rounded-xl bg-sky-500 text-white font-bold shadow">
            {t("clock.check")}
          </button>
          <HelpLadder
            used={helpUsed}
            onUse={setHelpUsed}
            steps={[
              { title: t("help.tip"), content: tipFor(problem) },
              { title: t("help.step"), content: t("clock.helpReadMinute", { where: minutePlace(m) }) },
              { title: t("help.solution"), content: t("clock.digitalShown", { time: shownText }), onReveal: show },
            ]}
          />
        </>
      )}
      {state === "shown" && (
        <button type="button" onClick={() => onSolved(outcomeOf(attempts, helpUsed, true))} className="h-12 px-6 rounded-xl bg-emerald-600 text-white font-bold shadow">
          {t("placeValue.next")}
        </button>
      )}
    </div>
  );
}

/**
 * Ställ klockan: the time is given - in words ("halv 6") or on a digital
 * clock (17.30) - and the child drags the two hands there. The minute hand
 * snaps (to fives, or whole minutes) and has to be exactly right; the hour
 * hand only near enough (see engine/clock.ts). A wrong try says which hand
 * is off and where it should be; help goes from a tip to the minute hand
 * marked, to the answer shown on the clock.
 */
function SetHands({ problem, onSolved }: { problem: ClockProblem; onSolved: (outcome: QuestionOutcome) => void }) {
  const [hourDeg, setHourDeg] = useState(hourAngle(problem.start.h, problem.start.m));
  const [minuteDeg, setMinuteDeg] = useState(minuteAngle(problem.start.m));
  const [attempts, setAttempts] = useState(0);
  const [helpUsed, setHelpUsed] = useState(0);
  const [message, setMessage] = useState<{ text: string; tone: "good" | "bad" } | null>(null);
  const [wrongHand, setWrongHand] = useState<"hour" | "minute" | null>(null);
  const [state, setState] = useState<"working" | "solved" | "shown">("working");

  const { h, m } = problem;
  const afternoon = h >= 13 || h === 0;

  function show() {
    setHourDeg(hourAngle(h, m));
    setMinuteDeg(minuteAngle(m));
    setWrongHand(null);
    setState("shown");
    setMessage({ text: t("clock.shown", { minute: minutePlace(m), hour: hourPlace(h, m) }), tone: "bad" });
  }

  function check() {
    const v = checkHands(hourDeg, minuteDeg, h, m);
    if (v.ok) {
      setState("solved");
      setWrongHand(null);
      setMessage({ text: t("clock.right"), tone: "good" });
      onSolved(outcomeOf(attempts, helpUsed, false));
      return;
    }
    const next = attempts + 1;
    setAttempts(next);
    if (next >= 3) {
      show();
      return;
    }
    // One thing at a time: the minute hand first, as it's set first.
    if (v.minute) {
      setWrongHand("minute");
      setMessage({ text: t(next === 1 ? "clock.wrongMinute" : "clock.wrongMinuteWhere", { where: minutePlace(m), m }), tone: "bad" });
    } else {
      setWrongHand("hour");
      setMessage({ text: t(next === 1 ? "clock.wrongHour" : "clock.wrongHourWhere", { where: hourPlace(h, m) }), tone: "bad" });
    }
  }

  const done = state !== "working";
  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {problem.given === "words" ? (
        <p className="text-xl text-slate-800 text-center font-semibold max-w-md">{t("clock.setWords", { time: timeInWords(h, m) })}</p>
      ) : (
        <>
          <DigitalClock h={h} m={m} look={problem.digitalLook} size={240} />
          <p className="text-slate-700 text-center font-medium max-w-md">{t(afternoon ? "clock.setDigital24" : "clock.setDigital", { h: ((h + 11) % 12) + 1 })}</p>
        </>
      )}
      {/* The sky follows the hands: turn the hour hand, and the sun (or the moon) moves with it - in the half of the day the question is in. */}
      <SkyScene hour={((hourDeg / 30) % 12) + (problem.sky >= 12 ? 12 : 0)}>
        <div className="rounded-full bg-white/30 p-2 backdrop-blur-[2px] shadow-2xl">
          <ClockFace
            face={problem.face}
            hourDeg={hourDeg}
            minuteDeg={minuteDeg}
            size={280}
            label={t("clock.label")}
            interactive={
              done
                ? undefined
                : {
                    onHour: (d) => {
                      setHourDeg(d);
                      if (wrongHand === "hour") setWrongHand(null);
                    },
                    onMinute: (d) => {
                      setMinuteDeg(d);
                      if (wrongHand === "minute") setWrongHand(null);
                    },
                    snapMinutes: problem.snap,
                    hourSnapDeg: problem.hourSnap,
                    mark: wrongHand ?? (helpUsed >= 2 ? "minute" : null),
                  }
            }
          />
        </div>
      </SkyScene>
      {!done && <p className="text-xs text-slate-500 text-center max-w-sm">{t(problem.snap === 5 ? "clock.dragHint5" : "clock.dragHint1")}</p>}
      {message && (
        <p role="status" className={`text-sm text-center max-w-sm ${message.tone === "good" ? "text-emerald-700 font-semibold" : "text-slate-700"}`}>
          {message.text}
        </p>
      )}
      {state === "working" && (
        <>
          <button type="button" onClick={check} className="h-12 px-8 rounded-xl bg-sky-500 text-white font-bold shadow">
            {t("clock.check")}
          </button>
          <HelpLadder
            used={helpUsed}
            onUse={setHelpUsed}
            steps={[
              { title: t("help.tip"), content: afternoon ? `${t("clock.tip")} ${t("clock.tip24", { h, twelve: ((h + 11) % 12) + 1 })}` : t("clock.tip") },
              { title: t("help.step"), content: t("clock.helpMinute", { where: minutePlace(m) }) },
              { title: t("help.solution"), content: t("clock.helpHour", { where: hourPlace(h, m) }), onReveal: show },
            ]}
          />
        </>
      )}
      {state === "shown" && (
        <button type="button" onClick={() => onSolved(outcomeOf(attempts, helpUsed, true))} className="h-12 px-6 rounded-xl bg-emerald-600 text-white font-bold shadow">
          {t("placeValue.next")}
        </button>
      )}
    </div>
  );
}
