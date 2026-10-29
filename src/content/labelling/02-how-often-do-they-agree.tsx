// Chapter 2: how often do they agree? The reader predicts how often two people agree by luck, sorts a few pool tickets
// beside the three labellers (the holes' tallies build), then opens the Matrix tab over the whole pool, before the
// guideline: agreement, agreement by luck and Cohen's kappa, pair by pair.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { LABEL_PARTS } from '../../components/scenes/pigeonholeScene';
import { agreement, chance, kappa } from '../../lib/labelling/agree';
import { type LabellerId, POOL, indexOf, labellerOf, labelsOf } from '../../lib/labelling/story';
import { Outcome } from '../tool-calling/kit';
import {
  Fact,
  Maths,
  PAIRS,
  type Pair,
  RUN0,
  RackStage,
  type Run,
  SortRun,
  StandInNote,
  type View,
  pct,
  runRack,
} from './kit';

const MODULE = 'labelling',
  ID = '02-how-often-do-they-agree';
export const PARTS = LABEL_PARTS;
const SORT = POOL.slice(0, 6);
const [ROSA, MIRA, TOM] = (['rosa', 'mira', 'tom'] as const).map(id => labellerOf(id).name);
/** a labeller's labels on the pool, before the guideline */
const pool = (id: LabellerId) => {
  const all = labelsOf(id, false);
  return POOL.map(t => all[indexOf(t.id)]);
};
const two = (x: number) => x.toFixed(2);
export const RM = { agree: agreement(pool('rosa'), pool('mira')), luck: chance(pool('rosa'), pool('mira')) };
export const KAPPA = {
  rm: kappa(pool('rosa'), pool('mira')),
  rt: kappa(pool('rosa'), pool('tom')),
};

interface S {
  p1: number | null;
  run: Run;
  view: View;
  pair: Pair;
  quiz: number | null;
}

export const P1 = {
  question: 'With five holes, how often would two labellers agree by luck alone?',
  options: ['About 1 ticket in 5', 'Almost never', 'About half the time'],
};
/** 1 in 5 when the luck rate rounds to a fifth */
export const OUTCOME = Math.round(RM.luck * 5) === 1 ? 0 : 2;

export const QUIZ = {
  question: 'Two reviewers each mark 9 emails in 10 “not spam”, and agree on 90%. Why is their kappa low?',
  options: [
    'Saying “not spam” to almost everything agrees most of the time by luck',
    'Kappa ignores the emails both reviewers marked the same',
    'Kappa only works with five labels',
  ],
  correct: 0,
  explanation: 'When one label is common, two people agree on it by luck; kappa counts only the agreement above that.',
  why: [
    'Right: by luck they would agree on 82%, so 90% is only a little above it.',
    'Kappa starts from those agreements and then takes away the share luck explains.',
    'Kappa works with any number of labels, two or more.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `${ROSA} and ${MIRA} file ${pct(RM.agree)} of the pool tickets in the same hole: that is their agreement.`,
    act: 'Predict first.',
    say: { block: 'rack', text: 'Same hole?' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'sort',
    focus: 'sort',
    visibleControls: ['sort'],
    narration: 'Your pick is locked. Sort a few yourself: three slips drop beside yours, and the holes keep count.',
    act: 'Sort three tickets.',
    say: { block: 'refund', text: 'Slips pile up' },
    predicate: s => s.run.count >= 3,
    hint: 'Pick a hole for the ticket, then press Next ticket.',
  },
  {
    id: 'matrix',
    focus: 'stage',
    visibleControls: ['out1'],
    narration: `By luck, they would agree on ${pct(RM.luck)}. Kappa counts only the agreement above luck.`,
    act: 'Open the Matrix tab.',
    predicate: s => s.view === 'matrix',
  },
  {
    id: 'pair',
    focus: 'stage',
    visibleControls: ['out1'],
    narration: `${ROSA} and ${MIRA}: kappa ${two(KAPPA.rm)}, the outlined diagonal holding most tickets. ${TOM} works fast.`,
    act: `Switch to ${ROSA} · ${TOM}.`,
    predicate: s => s.pair[0] === 'rosa' && s.pair[1] === 'tom',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: `${ROSA} and ${TOM}: kappa ${two(KAPPA.rt)}. Near 1, agreement you can trust; near 0, no better than luck.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'If both say “not spam” nine times in ten, how often do they match without reading?',
  },
];

function Stage({ s, set }: { s: S; set: (s: S) => void }) {
  return (
    <RackStage
      rack={runRack(SORT, s.run, false)}
      guided={false}
      view={s.view}
      onView={view => set({ ...s, view })}
      pair={s.pair}
      onPair={pair => set({ ...s, pair })}
      caption={
        s.view === 'matrix'
          ? `All ${POOL.length} pool tickets, before any written rule.`
          : `Ticket ${Math.min(s.run.at, SORT.length - 1) + 1} of ${SORT.length}; each hole’s pill counts its slips.`
      }
    />
  );
}

export default function HowOftenDoTheyAgree() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, run: RUN0, view: 'scene', pair: PAIRS[0], quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, focus }) => <Stage s={state} set={focus === 'stage' ? apply : sync} />}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        sort: ({ state, apply, sync }) => (
          <SortRun
            tickets={SORT}
            run={state.run}
            guided={false}
            onFile={run => apply({ ...state, run })}
            onNext={run => sync({ ...state, run })}
          />
        ),
        quiz: ({ state, apply, sync }) => (
          <>
            <Maths>
              <p>
                {`Kappa = (agreement − luck) ÷ (1 − luck). For ${ROSA} and ${MIRA}: (${two(RM.agree)} − ${two(RM.luck)}) ÷ (1 − ${two(RM.luck)}) = ${two(KAPPA.rm)}. Luck is, for each hole, the chance both picked it, added up.`}
              </p>
            </Maths>
            <Fact id="kappa" />
            <StandInNote />
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
