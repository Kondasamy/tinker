// Chapter 2: rooms and a doorman. Each layer is a floor of eight experts (rooms) with a router (the doorman) that
// scores them all for each token; only the top two run. The reader predicts where a token goes, picks one, reads the
// doorman's scores in the Router tab, then a second token, which visits other rooms.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { EXPERTS, promptOf, quote, roomName } from '../../lib/mixture-of-experts/routes';
import { ROOMS_PARTS } from '../../components/scenes/officeRoomsScene';
import pinned from '../../../data/mixture-of-experts/pinned.json' with { type: 'json' };
import { Outcome } from '../tool-calling/kit';
import { Fact, RoomsStage, ToyNote, type View } from './kit';

const MODULE = 'mixture-of-experts',
  ID = '02-rooms-and-a-doorman';
export const PARTS = ROOMS_PARTS;
export const PROMPT = promptOf(pinned.chapters.doorman);

export interface S {
  p1: number | null;
  sel: number | null;
  first: number | null;
  view: View;
  quiz: number | null;
}

export const P1 = {
  question: `The doorman scores all ${EXPERTS} rooms for a token. Where does the token go?`,
  options: ['To the two best-scored rooms', 'To every room scored above half', 'To all rooms, weighted by score'],
};

export const QUIZ = {
  question: 'A model has 64 experts per layer and routes top-2. How many experts work on one token in one layer?',
  options: ['2', '64, each a little', '32: half of them'],
  correct: 0,
  explanation: 'Top-2 means the router keeps its two best-scored experts; the other 62 skip that token.',
  why: [
    'Right: the router scores all 64 and only the best two run.',
    'Scoring every expert is cheap; running every expert is what top-2 avoids.',
    'Top-2 is a count of experts, not a share of them.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `Each floor holds ${EXPERTS} rooms, the experts. Its doorman, the router, scores every room for each token.`,
    act: 'Predict first.',
    say: { block: 'doorman', text: 'The router' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'route',
    focus: 'stage',
    visibleControls: ['p1'],
    narration: 'Your pick is locked. Larkspur’s toy experts model runs live in your browser.',
    act: 'Pick a token in the strip.',
    say: { block: 'belt', text: 'Pick one' },
    predicate: s => s.sel !== null,
  },
  {
    id: 'scores',
    focus: 'tab',
    visibleControls: ['out1', 'fact', 'tab'],
    narration: 'Top-2: only the two best-scored rooms run, and their answers mix by the doorman’s scores.',
    act: 'Open the Router tab.',
    say: { block: 'rooms', text: 'Two rooms lit' },
    predicate: s => s.view === 'router',
  },
  {
    id: 'floors',
    focus: 'stage',
    visibleControls: [],
    narration: 'Each floor is a layer with its own doorman, so a token can visit other rooms upstairs.',
    act: 'Pick another token.',
    say: { block: 'upstairs', text: 'Floor 2' },
    predicate: s => s.sel !== null && s.sel !== s.first,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: 'Each token runs through two rooms per floor, picked by that floor’s doorman.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'The router scores every expert. How many does top-2 run?',
  },
];

export default function RoomsAndADoorman() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, sel: null, first: null, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, focus, say }) => (
        <RoomsStage
          say={say}
          ids={PROMPT.ids}
          sel={state.sel}
          view={state.view}
          onView={view => (focus === 'tab' ? apply : sync)({ ...state, view })}
          onPick={i => (focus === 'stage' ? apply : sync)({ ...state, sel: i, first: state.first ?? i })}
          caption={live => {
            if (!live || live.pos === null) return `“${PROMPT.text}”`;
            const rooms = live.pass.routes.map(
              (l, f) => `floor ${f + 1}: ${l[live.pos!].experts.map(roomName).join(' and ')}`,
            );
            return `${quote(PROMPT.ids[live.pos])} goes to ${rooms.join('; ')}.`;
          }}
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={0} />,
        fact: () => (
          <>
            <ToyNote />
            <Fact id="shazeer-2017" />
          </>
        ),
        tab: ({ state, apply }) => (
          <button type="button" className="chip" onClick={() => apply({ ...state, view: 'router' })}>
            Open the Router tab
          </button>
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
