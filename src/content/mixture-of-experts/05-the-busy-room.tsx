// Chapter 5: the busy room. Each room seats ⌈factor × tokens × 2 / 8⌉ tokens of the batch (one phrase here); the
// crates in front of each room are the tokens the doorman sent it, tomato past its seats. Tokens a full room turns away
// skip its work (the empty route), and the guess reruns without it. The counts are pinned and rerun by the engine test.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { ListRange } from '../../components/story/ListRange';
import { encode } from '../../lib/lm/bpe';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { promptOf, quote } from '../../lib/mixture-of-experts/routes';
import { FACTORS, capacityOf, type Factor } from '../../lib/mixture-of-experts/capacity';
import { ROOMS_PARTS } from '../../components/scenes/officeRoomsScene';
import pinned from '../../../data/mixture-of-experts/pinned.json' with { type: 'json' };
import { Outcome } from '../tool-calling/kit';
import { Fact, RoomsStage, ToyNote } from './kit';

const MODULE = 'mixture-of-experts',
  ID = '05-the-busy-room';
export const PARTS = ROOMS_PARTS;
const C = pinned.capacity;
export const PROMPT = promptOf(C.prompt);
const T = PROMPT.ids.length;
const keyOf = (f: Factor) => (f === null ? 'none' : String(f)) as keyof typeof C.dropped;
/** tokens turned away at a factor (pinned; the engine test reruns them) */
export const droppedAt = (f: Factor) => C.dropped[keyOf(f)];
export const guessAt = (f: Factor) => C.guess[keyOf(f)];

export interface S {
  factor: Factor;
  p1: number | null;
  quiz: number | null;
}
const words = (f: Factor) =>
  f === null ? 'no limit' : `${f} (${capacityOf(f, T)} seats a room, ${droppedAt(f)} turned away)`;

export const P1 = {
  question: `At factor 1 each room seats ${capacityOf(1, T)}. What happens to tokens past a full room’s seats?`,
  options: ['They skip that room’s work', 'They wait for the next batch', 'They go to the next-best room'],
};

export const QUIZ = {
  question: 'An experts model keeps sending most tokens to one busy expert. Which fix spreads them out?',
  options: ['Train with a load-balancing loss', 'Lower the capacity factor', 'Send every token to every expert'],
  correct: 0,
  explanation: 'A load-balancing loss teaches the router to spread tokens, so no expert is swamped.',
  why: [
    'Right: the extra loss rewards the router for even loads across experts.',
    'Fewer seats means even more tokens turned away from the busy expert.',
    'That runs every expert on every token: a dense model, with all the work that saves.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'seats',
    focus: 'factor',
    visibleControls: ['factor'],
    narration: 'Rooms work on a batch at once; each seats only so many tokens: its capacity, set by a capacity factor.',
    act: 'Set the factor to 2.',
    say: { block: 'rooms', text: 'Crates waiting' },
    predicate: s => s.factor === 2,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `At 2, every room seats ${capacityOf(2, T)} of the ${T} tokens, and none is turned away.`,
    act: 'Predict first.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'drop',
    focus: 'factor',
    visibleControls: ['p1', 'factor'],
    narration: 'Your pick is locked.',
    act: 'Set the factor to 1.',
    say: { block: 'belt', text: 'Turned away' },
    predicate: s => s.factor === 1,
  },
  {
    id: 'reveal',
    focus: 'factor',
    visibleControls: ['out1', 'factor'],
    narration: `${droppedAt(1)} dropped tokens skipped a room’s work, and the guess changed to ${quote(encode(guessAt(1))[0])}.`,
    act: 'Raise the factor until none drop.',
    say: { block: 'guess', text: 'New guess' },
    predicate: s => s.factor !== 1 && droppedAt(s.factor) === 0,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['facts', 'quiz'],
    narration:
      'Training adds a load-balancing loss that nudges each doorman to spread tokens, so fewer rooms overflow.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which fix changes where the router sends tokens?',
  },
];

export default function TheBusyRoom() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ factor: null, p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => (
        <RoomsStage
          say={say}
          ids={PROMPT.ids}
          sel={null}
          factor={state.factor}
          caption={live =>
            live?.capped
              ? `“${PROMPT.text}”: ${
                  live.capped.capacity === null ? 'no seat limit' : `${live.capped.capacity} seats a room`
                }, ${live.capped.dropped.length} turned away. Guess ${quote(live.pass.top[0].tok)}.`
              : `“${PROMPT.text}”`
          }
        />
      )}
      controls={{
        factor: ({ state, apply, sync, focused }) => (
          <ListRange
            className="me-range"
            label="Capacity factor"
            list={FACTORS}
            value={state.factor}
            words={words}
            onChange={factor => (focused ? apply : sync)({ ...state, factor })}
          />
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={0} />,
        facts: () => (
          <>
            <Fact id="switch-capacity" />
            <Fact id="switch-balance" />
            <ToyNote />
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
