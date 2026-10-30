// Chapter 4: the battery tank. The 3B at 4 bits; each Ask spends an hour of a picker's questions, and the tank on the
// crate's back drains by their energy (planning numbers scaled from MELTing point's measurement, battery.ts). Long
// replies run the tank dry before the shift ends; short ones leave most of it.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { CRATE_PARTS } from '../../components/scenes/phoneCrateScene';
import { HANDHELD, sizeOf } from '../../lib/on-device/memory';
import { levelAfter, repliesPerCharge, SHIFT, type Length } from '../../lib/on-device/battery';
import { Outcome } from '../tool-calling/kit';
import { CrateStage, Fact, LengthRadios, PLANNING } from './kit';
import { num } from '../../lib/format';

const MODULE = 'on-device',
  ID = '04-battery-tank';
export const PARTS = CRATE_PARTS;
const B3 = sizeOf('3b'),
  BITS = 4,
  HOURS = HANDHELD.shiftHours,
  PER_HOUR = HANDHELD.questionsPerHour;
const pct = (x: number) => `${Math.round(x * 100)}%`;
export const levelOf = (len: Length, hours: number) => levelAfter(B3, BITS, len, hours);

export interface S {
  length: Length;
  hours: number;
  p1: number | null;
  quiz: number | null;
}

export const P1 = {
  question: `${HOURS} hours of long replies on one charge?`,
  options: ['It lasts, with charge to spare', 'It runs dry before the shift ends', 'It empties exactly at the end'],
};
export const OUTCOME = repliesPerCharge(B3, BITS, 'long') < SHIFT ? 1 : 0;

export const QUIZ = {
  question: 'The assistant’s answers run long and the handhelds die by lunch. What is the cheapest fix?',
  options: [
    'Keep replies short: the energy grows with every token written',
    'Use a bigger model, so each answer is better',
    'Give the model more context, so pickers ask fewer follow-ups',
  ],
  correct: 0,
  explanation: 'Each token reads every weight once, so a reply’s energy is its tokens times the energy per token.',
  why: [
    'Right: fewer tokens out means fewer passes over the weights, so less battery per reply.',
    'A bigger model reads more bytes per token, so every reply costs more battery, not less.',
    'More context costs memory and work on every reply; it doesn’t make answers shorter.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'hour',
    focus: 'ask',
    visibleControls: ['ask'],
    narration: 'A reply costs its tokens times the energy per token. The tank on the crate is the battery.',
    act: 'Ask for an hour of long replies.',
    say: { block: 'tank', text: 'Battery' },
    predicate: s => s.hours >= 1,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `An hour is ${PER_HOUR} questions: the tank is down to ${pct(levelOf('long', 1))}.`,
    act: 'Predict a whole shift.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'shift',
    focus: 'ask',
    visibleControls: ['ask'],
    narration: 'Your pick is locked.',
    act: `Keep asking, an hour at a time, to the end of the shift: ${HOURS} hours.`,
    predicate: s => s.length === 'long' && s.hours >= HOURS,
  },
  {
    id: 'short',
    focus: 'length',
    visibleControls: ['out1', 'length', 'ask'],
    narration: `Long replies: ${num(repliesPerCharge(B3, BITS, 'long'))} replies per charge, short of a shift’s ${num(SHIFT)}.`,
    act: 'Switch to short replies and ask for an hour.',
    predicate: s => s.length === 'short' && s.hours >= 1,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['length', 'ask', 'more', 'quiz'],
    narration: `Short replies: ${num(repliesPerCharge(B3, BITS, 'short'))} per charge. Fewer tokens out is the cheapest battery saving.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What does every token written cost?',
  },
];

export default function BatteryTank() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ length: 'long', hours: 0, p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => (
        <CrateStage
          say={say}
          pack={{ size: '3b', bits: BITS, level: levelOf(state.length, state.hours) }}
          caption={`The ${B3.name} at ${BITS} bits after ${state.hours} of ${HOURS} hours of ${state.length} replies. ${PLANNING}`}
        />
      )}
      controls={{
        length: ({ state, apply, sync, focused }) => (
          // a new length starts a fresh charge
          <LengthRadios
            value={state.length}
            onChange={length => (focused ? apply : sync)({ ...state, length, hours: 0 })}
          />
        ),
        // each hour is progress toward the step, never a miss
        ask: ({ state, sync }) => (
          <div className="od-actions">
            <button
              type="button"
              className="big"
              disabled={state.hours >= HOURS}
              onClick={() => sync({ ...state, hours: Math.min(HOURS, state.hours + 1) })}
            >
              {`Ask: one hour of ${state.length} replies`}
            </button>
          </div>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        more: () => <Fact id="melt-energy" />,
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
