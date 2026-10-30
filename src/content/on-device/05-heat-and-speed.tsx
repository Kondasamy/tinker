// Chapter 5: heat and speed. Rush sends ten replies back to back on the 3B at 4 bits: the handheld writes at its
// bandwidth over the weights' bytes for the burst it can cool, then throttles (planning numbers, battery.ts; a phone
// study saw the same slowdown, cited). Long replies run hot and the crate glows; short ones finish cool.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { CRATE_PARTS } from '../../components/scenes/phoneCrateScene';
import { HANDHELD, sizeOf } from '../../lib/on-device/memory';
import { RUSH, rush, speed, type Length } from '../../lib/on-device/battery';
import { Outcome } from '../tool-calling/kit';
import { CrateStage, Fact, LengthRadios, PLANNING } from './kit';

const MODULE = 'on-device',
  ID = '05-heat-and-speed';
export const PARTS = CRATE_PARTS;
const B3 = sizeOf('3b'),
  BITS = 4;
export const rushOf = (len: Length) => rush(B3, BITS, len);
const sec = (x: number) => `${Math.round(x)} seconds`;
const LONG = rushOf('long'),
  SHORT = rushOf('short');

export interface S {
  length: Length;
  rushed: Length[];
  p1: number | null;
  quiz: number | null;
}
const hotNow = (s: S) => s.rushed.includes(s.length) && rushOf(s.length).hot;

export const P1 = {
  question: `${RUSH} short replies back to back instead. Will the handheld throttle?`,
  options: ['No: the work ends before it heats up', 'Yes, just the same', 'Yes, and sooner'],
};
export const OUTCOME = SHORT.hot ? 1 : 0;

export const QUIZ = {
  question: 'Pickers say the assistant slows through a busy hour, then is quick again after a break. Why?',
  options: [
    'The handheld throttles when hot: steady work heats it, a break cools it',
    'The model forgets its weights under load',
    'The warehouse network gets busy',
  ],
  correct: 0,
  explanation: 'A phone sheds only so much heat, so sustained work makes it slow down until it cools.',
  why: [
    'Right: a hot phone lowers its own speed, and a pause lets it cool back to full speed.',
    'The weights stay in memory, unchanged, however hard the handheld works.',
    'The model is on the handheld, so no network sits between the picker and the reply.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'rush-long',
    focus: 'rush',
    visibleControls: ['rush'],
    narration: `Each token reads every weight, so the ${B3.name} writes about ${Math.round(speed(B3, BITS))} tokens per second while cool.`,
    act: `Rush ${RUSH} long replies.`,
    say: { block: 'picker', text: 'Rush hour' },
    predicate: s => s.rushed.includes('long'),
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `${sec(LONG.seconds)}, not ${sec(LONG.coolSeconds)}: after ${HANDHELD.burstSeconds} seconds hot, throttling cuts its speed.`,
    act: 'Predict short replies.',
    say: { block: 'crate', text: 'Too hot' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'rush-short',
    focus: 'length',
    visibleControls: ['length', 'rush'],
    narration: 'Your pick is locked.',
    act: 'Switch to short replies and rush.',
    predicate: s => s.length === 'short' && s.rushed.includes('short'),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'length', 'rush', 'more', 'quiz'],
    narration: `${RUSH} short replies: ${sec(SHORT.seconds)}, still cool. Short replies save heat as well as battery.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What happens to a phone that keeps working without a pause?',
  },
];

export default function HeatAndSpeed() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ length: 'long', rushed: [], p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => {
        const r = rushOf(state.length),
          done = state.rushed.includes(state.length);
        return (
          <CrateStage
            say={say}
            pack={{ size: '3b', bits: BITS, hot: hotNow(state) }}
            caption={
              done
                ? `${RUSH} ${state.length} replies: ${sec(r.seconds)}${r.hot ? `, throttled after ${HANDHELD.burstSeconds}` : ', cool throughout'}. ${PLANNING}`
                : `The ${B3.name} at ${BITS} bits, cool. ${PLANNING}`
            }
          />
        );
      }}
      controls={{
        length: ({ state, apply, sync, focused }) => (
          <LengthRadios value={state.length} onChange={length => (focused ? apply : sync)({ ...state, length })} />
        ),
        rush: ({ state, sync }) => (
          <div className="od-actions">
            <button
              type="button"
              className="big"
              onClick={() =>
                sync({
                  ...state,
                  rushed: state.rushed.includes(state.length) ? state.rushed : [...state.rushed, state.length],
                })
              }
            >
              {`Rush ${RUSH} ${state.length} replies`}
            </button>
          </div>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        more: () => (
          <>
            <Fact id="melt-heat" />
            <Fact id="apple-3b" />
            <p className="note in-note">{`The handheld’s ${Math.round(speed(B3, BITS))} tokens a second and its ${HANDHELD.burstSeconds}-second cool burst are planning numbers; the phones above were measured.`}</p>
          </>
        ),
        quiz: ({ state, apply, sync }) => (
          <Quiz
            {...QUIZ}
            unsure
            value={state.quiz}
            onAnswer={(_, q) => apply({ ...state, quiz: q })}
            onUnsure={() => sync({ ...state, quiz: UNSURE })}
          />
        ),
      }}
    />
  );
}
