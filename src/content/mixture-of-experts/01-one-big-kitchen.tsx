// Chapter 1: one big kitchen. A dense model runs every weight on every token: the sorting office with every room lit
// (the toy run with all eight experts on every token, live). The reader predicts how much of a dense model works per
// token, picks tokens and sees every room light, then splits the kitchen into rooms: two lit per floor.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { fact } from '../../lib/mixture-of-experts/facts';
import { billions } from '../../lib/mixture-of-experts/cards';
import { EXPERTS, promptOf, quote } from '../../lib/mixture-of-experts/routes';
import { ROOMS_PARTS } from '../../components/scenes/officeRoomsScene';
import pinned from '../../../data/mixture-of-experts/pinned.json' with { type: 'json' };
import { Outcome } from '../tool-calling/kit';
import { RoomsStage, ToyNote, posOf } from './kit';

const MODULE = 'mixture-of-experts',
  ID = '01-one-big-kitchen';
export const PARTS = ROOMS_PARTS;
export const PROMPT = promptOf(pinned.chapters.kitchen);
const TOTAL = billions(Number(fact('mixtral-8x7b').value) * 1e9);

export interface S {
  p1: number | null;
  sel: number | null;
  seen: number[];
  dense: boolean;
  quiz: number | null;
}

export const P1 = {
  question: `The vendor’s model holds ${TOTAL} weights. If it were dense, how many would work on each token?`,
  options: [
    `All ${TOTAL}, on every token`,
    'Only the ones that help with that token',
    'About a quarter: the rest rest',
  ],
};

export const QUIZ = {
  question: 'A team swaps its dense model for one twice the size. What happens to the work for each token?',
  options: ['It roughly doubles', 'It stays the same: tokens are the same length', 'It halves: more weights share it'],
  correct: 0,
  explanation: 'In a dense model every weight works on every token, so twice the weights is about twice the work.',
  why: [
    'Right: every weight runs on every token, so the work grows with the size.',
    'The token is the same, but a dense model runs all its weights on it, and there are twice as many.',
    'Weights in a dense model never take turns; each one runs on each token.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'Larkspur’s team starts with a dense model: one big kitchen where every cook works on every token.',
    act: 'Predict first.',
    say: { block: 'rooms', text: 'One kitchen' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'walk',
    focus: 'stage',
    visibleControls: ['p1'],
    narration: 'Your pick is locked. Each weight is a number the model learned; here every room holds some.',
    act: 'Pick three tokens in the strip.',
    say: { block: 'belt', text: 'Every token' },
    predicate: s => s.seen.length >= 3,
  },
  {
    id: 'reveal',
    focus: 'split',
    visibleControls: ['out1', 'split'],
    narration: 'Every room lit for every token. A mixture of experts runs only a few rooms per token instead.',
    act: 'Split the kitchen into rooms.',
    predicate: s => !s.dense,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: `Now two of ${EXPERTS} rooms light on each floor; the rest sit idle for this token.`,
    act: 'One question to finish.',
    say: { block: 'rooms', text: 'Two of eight' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'In a dense model, which weights skip a token?',
  },
];

export default function OneBigKitchen() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, sel: null, seen: [], dense: true, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, focus, say }) => (
        <RoomsStage
          say={say}
          ids={PROMPT.ids}
          sel={state.sel}
          dense={state.dense}
          onPick={i =>
            (focus === 'stage' ? apply : sync)({
              ...state,
              sel: i,
              seen: state.seen.includes(i) ? state.seen : [...state.seen, i],
            })
          }
          caption={() => {
            const pos = posOf(PROMPT.ids, state.sel);
            const tok = pos === null ? 'each token' : quote(PROMPT.ids[pos]);
            return state.dense
              ? `“${PROMPT.text}”: every room works on ${tok}.`
              : `“${PROMPT.text}”: two rooms per floor work on ${tok}.`;
          }}
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={0} />,
        split: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, dense: false })}>
            Split into rooms
          </button>
        ),
        quiz: ({ state, apply, sync }) => (
          <>
            <ToyNote />
            <Quiz
              {...QUIZ}
              unsure
              value={state.quiz}
              onAnswer={(_, q) => apply({ ...state, quiz: q })}
              onUnsure={() => sync({ ...state, quiz: UNSURE })}
            />
          </>
        ),
      }}
    />
  );
}
