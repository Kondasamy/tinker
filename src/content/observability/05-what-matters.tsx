// Chapter 5: which ones matter (R12.5). The day's modes, counted, beside the team's harm rating for each (with its
// reason). The reader predicts whether the most frequent mode comes first, then picks the mode to fix; the puzzle
// accepts every mode tied for the highest count × harm (TOP). Counts come from the hand-written traces; harm ratings are
// the team's judgement, and the copy says so.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { puzzle, Verdict } from '../../components/quiz/Puzzle';
import { FAILED, MODE_IDS, modeOf, type ModeId } from '../../lib/observability/traces';
import { DAY1_COUNTS, TOP, mostFrequent, ranked } from '../../lib/observability/coding';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { Chips, Fact, MODE_SHORT, MODULE, ObsStage, binsOf, modeName, wallOf, type View } from './kit';

const ID = '05-what-matters';
const FREQ = mostFrequent(DAY1_COUNTS),
  BEST = ranked(DAY1_COUNTS)[0];
export const P1 = {
  question: `“${modeName(FREQ)}” happened ${DAY1_COUNTS[FREQ]} times, more than any other mode. Is it the one to fix first?`,
  options: [
    'Yes: fix the most frequent failure first',
    'Not yet: weigh how often against how much harm each does',
    'Fix whichever the first note was about',
  ],
};
export const OUT1 = TOP.includes(FREQ) ? 0 : 1;

const QUIZ = {
  question:
    'A booking assistant fails two ways: 30 times a week it asks the customer to repeat their dates, and 3 times it books the wrong day. The team rates the wrong booking far more harmful. What decides which to fix first?',
  options: [
    'The count alone: 30 beats 3',
    'How often each happens times how much harm it does',
    'Whichever is quickest to fix, always',
  ],
  correct: 1,
  explanation: 'Frequency and harm together decide the order.',
  why: [
    'A repeated question is annoying; a wrong booking costs a trip. Count alone ignores that.',
    'Right. As here: the old passages were not the most common failure, but they did the most harm.',
    'Effort matters, but a quick fix for a harmless failure leaves the costly one in front of customers.',
  ],
};

interface S {
  fix: ModeId | '';
  p1: number | null;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['table', 'p1'],
    narration: `The team can fix one failure mode this week. The table counts each mode over yesterday’s ${FAILED.length} failed traces, and gives the team’s rating of how much harm one failure does, from 1 to 3, with the reason. Before you choose:`,
    predicate: s => s.p1 !== null,
  },
  puzzle<S>({
    id: 'pick',
    focus: 'pick',
    visibleControls: ['out1', 'table', 'pick'],
    narration:
      'Pick the mode to fix first: the one that removes the most harm, counting how often it happens and how much each one hurts.',
    broken: s => ({ ...s, fix: '' }),
    verdict: s => !!s.fix && TOP.includes(s.fix),
    solution: s => ({ ...s, fix: TOP[0] }),
    hint: 'Multiply each mode’s count by its harm.',
  }),
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['table', 'facts', 'quiz'],
    narration: `${modeName(BEST.mode)}: ${BEST.count} traces at harm ${BEST.harm}, a score of ${BEST.score}, against ${DAY1_COUNTS[FREQ] * modeOf(FREQ).harm} for the most frequent mode. A confident, cited, wrong answer is worse than “I don’t know”. The counts come from this module’s hand-written traces and the ratings are the team’s judgement, so this shows the method, not a benchmark. One question to finish.`,
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What two things does the table weigh?',
  },
];

function Table({ s, scores }: { s: S; scores: boolean }) {
  return (
    <table className="tc-ledger">
      <caption>Yesterday’s failure modes</caption>
      <thead>
        <tr>
          <th scope="col">Mode</th>
          <th scope="col">Count</th>
          <th scope="col">Harm</th>
          {scores && <th scope="col">Count × harm</th>}
        </tr>
      </thead>
      <tbody>
        {MODE_IDS.map(m => (
          <tr key={m} data-changed={s.fix === m || undefined}>
            <th scope="row">
              {modeName(m)}
              <span className="ob-why">{modeOf(m).why}</span>
            </th>
            <td>{DAY1_COUNTS[m]}</td>
            <td>{modeOf(m).harm}</td>
            {scores && <td>{DAY1_COUNTS[m] * modeOf(m).harm}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function WhatMatters() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ fix: '', p1: null, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state }) => (
        <ObsStage
          room={{
            cards: wallOf(FAILED),
            bins: binsOf(DAY1_COUNTS, state.fix),
            board: state.fix ? `FIX FIRST: ${MODE_SHORT[state.fix]}` : undefined,
          }}
          caption={
            <>
              <span className="lbl">Bins, front left to right</span>
              <span>{MODE_IDS.map(m => `${modeName(m)}: ${DAY1_COUNTS[m]}`).join(' · ')}</span>
            </>
          }
        />
      )}
      controls={{
        table: ({ state }) => <Table s={state} scores={state.p1 !== null && !!state.fix && TOP.includes(state.fix)} />,
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUT1} />,
        pick: ({ state, apply }) => (
          <div className="tc-bench">
            <Chips
              label="Fix first"
              items={MODE_IDS}
              name={modeName}
              value={state.fix || null}
              pick={fix => apply({ ...state, fix })}
            />
            {state.fix && (
              <p className="tc-status" role="status">
                <Verdict fixed={TOP.includes(state.fix)} /> Fixing “{modeName(state.fix)}” removes{' '}
                {DAY1_COUNTS[state.fix]} failures at harm {modeOf(state.fix).harm}:{' '}
                {DAY1_COUNTS[state.fix] * modeOf(state.fix).harm}.
              </p>
            )}
          </div>
        ),
        facts: () => (
          <>
            <Fact id="error-analysis" />
            <Fact id="saturation" />
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
