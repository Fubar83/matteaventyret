import { useState } from "react";
import { checkHands, hourAngle, minuteAngle, spokenTime, type ClockProblem } from "../engine/clock";
import { t } from "../i18n";
import { ClockFace } from "./ClockFace";
import { DigitalClock } from "./DigitalClock";
import { HelpLadder } from "./HelpLadder";
import { SkyScene } from "./SkyScene";
import type { QuestionOutcome } from "./questionOutcome";

/** "halv sex", "fem i halv tre" - the time in words, in the current language. */
export function timeInWords(h: number, m: number): string {
  const s = spokenTime(h, m);
  return t(s.key, { h: t(`clock.hour.${s.hour}`), n: t(`clock.hour.${s.next}`) });
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

/**
 * Ställ klockan: the time is given - in words ("halv sex") or on a digital
 * clock (17.30) - and the child drags the two hands there. The minute hand
 * snaps (to fives, or whole minutes) and has to be exactly right; the hour
 * hand only near enough (see engine/clock.ts). A wrong try says which hand
 * is off and where it should be; help goes from a tip to the minute hand
 * marked, to the answer shown on the clock.
 */
export function ClockPlayer({ problem, onSolved }: { problem: ClockProblem; onSolved: (outcome: QuestionOutcome) => void }) {
  const [hourDeg, setHourDeg] = useState(hourAngle(problem.start.h, problem.start.m));
  const [minuteDeg, setMinuteDeg] = useState(minuteAngle(problem.start.m));
  const [attempts, setAttempts] = useState(0);
  const [helpUsed, setHelpUsed] = useState(0);
  const [message, setMessage] = useState<{ text: string; tone: "good" | "bad" } | null>(null);
  const [wrongHand, setWrongHand] = useState<"hour" | "minute" | null>(null);
  const [state, setState] = useState<"working" | "solved" | "shown">("working");

  const { h, m } = problem;
  const afternoon = h >= 13 || h === 0;
  const outcome = (shown: boolean): QuestionOutcome => ({
    helped: helpUsed > 0 || attempts >= 2 || shown,
    fullSetup: true,
    wrongFirstAttempts: attempts >= 1 ? 1 : 0,
    hintUsed: attempts >= 2,
    miniTutorialUsed: shown,
  });

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
      onSolved(outcome(false));
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
      <SkyScene hour={(((hourDeg / 30) % 12) + (problem.sky >= 12 ? 12 : 0))}>
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
        <button type="button" onClick={() => onSolved(outcome(true))} className="h-12 px-6 rounded-xl bg-emerald-600 text-white font-bold shadow">
          {t("placeValue.next")}
        </button>
      )}
    </div>
  );
}
