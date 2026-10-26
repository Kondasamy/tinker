// Chapter 3: what the experts learned. The toy's rooms specialised by kind of token (word starts, punctuation and
// function words, endings, single letters), as measured over its training text (meta.json's top tokens). The reader
// predicts topic or kind, picks tokens and reads the lit rooms' pills, opens every room's favourites, and then reads
// Mixtral's finding, cited apart from the toy's.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { promptOf, quote, roomName } from '../../lib/mixture-of-experts/routes';
import { ROOMS_PARTS } from '../../components/scenes/officeRoomsScene';
import pinned from '../../../data/mixture-of-experts/pinned.json' with { type: 'json' };
import { Outcome } from '../tool-calling/kit';
import { Fact, LearnedTable, RoomsStage, ToyNote } from './kit';

const MODULE = 'mixture-of-experts',
  ID = '03-what-the-experts-learned';
export const PARTS = ROOMS_PARTS;
export const PROMPT = promptOf(pinned.chapters.learned);

export interface S {
  p1: number | null;
  sel: number | null;
  seen: number[];
  table: boolean;
  quiz: number | null;
}

export const P1 = {
  question: 'What did the toy’s rooms end up taking most?',
  options: [
    'Kinds of token: word starts, endings, punctuation',
    'Topics: shipping in one room, billing in another',
    'Nothing in particular: tokens land at random',
  ],
};

export const QUIZ = {
  question: 'A colleague expects their mixture-of-experts model to have a “legal expert”. What should they expect?',
  options: [
    'Experts that split by kinds of token more than by topic',
    'One expert per subject, as the training data was labelled',
    'Experts that swap jobs on every request',
  ],
  correct: 0,
  explanation:
    'Routing is learned token by token, and both the toy and Mixtral split more by kind of token than topic.',
  why: [
    'Right: the router learns per token, and the splits it finds follow syntax and spelling more than subject.',
    'Nobody labels experts; the router learns its own split, and it rarely matches topics.',
    'A trained router sends the same kind of token to the same experts every time.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration:
      'In training, each token kept going to the rooms that helped. Over time each room got its specialisation.',
    act: 'Predict first.',
    say: { block: 'rooms', text: 'Favourites' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'explore',
    focus: 'stage',
    visibleControls: ['p1'],
    narration: 'Your pick is locked. Each lit room’s pill shows the tokens it was sent most in training.',
    act: 'Pick three tokens and read the lit rooms.',
    say: { block: 'belt', text: 'Try a few' },
    predicate: s => s.seen.length >= 3,
  },
  {
    id: 'reveal',
    focus: 'table',
    visibleControls: ['out1', 'table'],
    narration: 'The toy split by kind of token: full stops and “ the” in some rooms, word endings in others.',
    act: 'Show every room.',
    predicate: s => s.table,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['learned', 'quiz'],
    narration: 'That is what Larkspur’s toy measured. A large model’s authors report a similar split, cited below.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Does the router learn by subject, or token by token?',
  },
];

export default function WhatTheExpertsLearned() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, sel: null, seen: [], table: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, focus, say }) => (
        <RoomsStage
          say={say}
          ids={PROMPT.ids}
          sel={state.sel}
          onPick={i =>
            (focus === 'stage' ? apply : sync)({
              ...state,
              sel: i,
              seen: state.seen.includes(i) ? state.seen : [...state.seen, i],
            })
          }
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
        table: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, table: true })}>
            Show every room
          </button>
        ),
        learned: () => (
          <>
            <LearnedTable />
            <ToyNote />
            <Fact id="mixtral-routing" />
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
