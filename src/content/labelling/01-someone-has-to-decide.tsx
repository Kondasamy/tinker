// Chapter 1: someone has to decide. One ticket on the table, three labellers. The reader predicts how many holes the
// three will pick, files it themselves, and the three slips land in three different holes (before chapter 3's
// guideline, so t022 is the pinned three-way ticket). Links Evals, where people's labels are the reference.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { LABEL_PARTS } from '../../components/scenes/pigeonholeScene';
import { type Intent, labellerOf, nameOf, ticketOf } from '../../lib/labelling/story';
import pinned from '../../../data/labelling/pinned.json' with { type: 'json' };
import { Outcome } from '../tool-calling/kit';
import { RackStage, SortTicket, StandInNote, picksOf } from './kit';

const MODULE = 'labelling',
  ID = '01-someone-has-to-decide';
export const PARTS = LABEL_PARTS;
const T = ticketOf(pinned.threeWay);
// before the guideline: on this ticket the three pick three different holes
export const PICKS = picksOf(T.id, false);
/** how many different holes the three picked: the prediction's outcome is that many, less one */
export const HOLES = new Set(Object.values(PICKS)).size;

interface S {
  p1: number | null;
  filed: Intent | null;
  quiz: number | null;
}

export const P1 = {
  question: 'Three careful labellers each file this ticket. How many different holes do they pick?',
  options: ['One: they all agree', 'Two', 'Three: every one differs'],
};
export const OUTCOME = HOLES - 1;

export const QUIZ = {
  question: 'Two careful labellers file the same ticket in different holes. What does that tell you?',
  options: [
    'The ticket reads more than one way, so the team needs a rule',
    'One of them is careless and should go',
    'The ticket is useless and should be thrown out',
  ],
  correct: 0,
  explanation: 'A label is a judgement: careful people read an unclear ticket differently until a rule settles it.',
  why: [
    'Right: both readings are fair until the team says which one counts.',
    'Careful people split on unclear tickets too; carelessness shows up on clear ones.',
    'Tickets like this are the real ones customers send, and the model must route them.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'Three labellers file tickets into five pigeonholes, one per intent. Each picks a hole for this ticket.',
    act: 'Predict first.',
    say: { block: 'ticket', text: 'One ticket' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'sort',
    focus: 'sort',
    visibleControls: ['sort'],
    narration: 'Your pick is locked. Read the ticket as a labeller would: which label fits?',
    act: 'File it: click a hole, or press 1 to 5.',
    say: { block: 'rack', text: 'Five holes' },
    predicate: s => s.filed !== null,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'sort', 'quiz'],
    narration: `Three people, ${HOLES} holes. A label is a judgement, and these labels become the answer key Larkspur grades against.`,
    act: 'One question to finish.',
    say: { block: 'mira', text: 'Another reading' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Is the ticket clear about whether money or the item should come back?',
  },
];

function Stage({ s, say }: { s: S; say?: { block: string; text: string } }) {
  return (
    <RackStage
      rack={{ ticket: T, picks: s.filed ? PICKS : undefined, mine: s.filed, drop: !!s.filed, say }}
      guided={false}
      caption={
        s.filed
          ? `You: ${nameOf(s.filed)}. ${Object.entries(PICKS)
              .map(([l, p]) => `${labellerOf(l as keyof typeof PICKS).name}: ${nameOf(p)}`)
              .join('. ')}.`
          : 'One ticket on the table, five holes on the rack.'
      }
    />
  );
}

export default function SomeoneHasToDecide() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, filed: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => <Stage s={state} say={say} />}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        sort: ({ state, apply }) => (
          <SortTicket
            ticket={T}
            filed={state.filed}
            picks={state.filed ? PICKS : undefined}
            onFile={i => apply({ ...state, filed: i })}
          />
        ),
        quiz: ({ state, apply, sync }) => (
          <>
            <StandInNote />
            <p className="note lb-note">
              In <a href="/evals/04-judge-the-judge/">Evals</a>, people’s labels are the answer key a grader is checked
              against.
            </p>
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
