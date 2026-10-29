// Chapter 5: many votes. Each ticket takes the label most of the three gave. The reader predicts whether the vote beats
// the best single labeller over the pool, then files the pinned minority-right ticket where they think the vote lands:
// the vote lights its hole, and the outvoted labeller had the right answer.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { LABEL_PARTS } from '../../components/scenes/pigeonholeScene';
import { type Intent, labellerOf, nameOf, ticketOf } from '../../lib/labelling/story';
import { majority } from '../../lib/labelling/vote';
import pinned from '../../../data/labelling/pinned.json' with { type: 'json' };
import { Outcome } from '../tool-calling/kit';
import { Fact, RackStage, SortTicket, StandInNote, pct, picksOf } from './kit';

const MODULE = 'labelling',
  ID = '05-many-votes';
export const PARTS = LABEL_PARTS;
export const T = ticketOf(pinned.minority);
export const PICKS = picksOf(T.id);
export const VOTE = majority(Object.values(PICKS));
const [ROSA, TOM] = (['rosa', 'tom'] as const).map(id => labellerOf(id).name);
const ACC = pinned.accuracy;

interface S {
  p1: number | null;
  filed: Intent | null;
  quiz: number | null;
}

export const P1 = {
  question: `Over the pool, is the vote of all three right more often than ${ROSA} alone?`,
  options: ['Yes, a little more often', 'About the same', `No: ${TOM} drags it down`],
};
export const OUTCOME = ACC.vote > ACC.rosa ? 0 : ACC.vote < ACC.rosa ? 2 : 1;

export const QUIZ = {
  question: 'Two labellers outvote one who was right. What would catch tickets like this?',
  options: [
    'Send tickets where the vote split to an expert',
    'Add a fourth labeller to every ticket',
    'Nothing: the vote is never wrong',
  ],
  correct: 0,
  explanation: 'A split vote marks a ticket worth a closer look; an expert settles the few that split.',
  why: [
    'Right: splits are rare, so an expert’s time goes only where people disagreed.',
    'A fourth label on every ticket costs a third more and can still tie or outvote the right one.',
    'This ticket is a vote that went wrong, so votes can be wrong.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `A majority vote gives each ticket the hole with most slips. Alone, ${ROSA} is right on ${pct(ACC.rosa)} of the pool.`,
    act: 'Predict first.',
    say: { block: 'rack', text: 'Most slips win' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'vote',
    focus: 'sort',
    visibleControls: ['sort'],
    narration: 'Your pick is locked. Here is one pool ticket, and three labellers about to file it.',
    act: 'File it where you think the vote lands.',
    say: { block: 'ticket', text: 'Three slips' },
    predicate: s => s.filed !== null,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'sort', 'quiz'],
    narration: `The vote: ${nameOf(VOTE)}. Outvoted, ${ROSA} said ${nameOf(T.intent)}, the right answer. Still, the vote scores ${pct(ACC.vote)}.`,
    act: 'One question to finish.',
    say: { block: 'rosa', text: 'Outvoted' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which tickets are worth a second look: the ones where all three agreed, or the split ones?',
  },
];

function Stage({ s, say }: { s: S; say?: { block: string; text: string } }) {
  return (
    <RackStage
      rack={{
        ticket: T,
        picks: s.filed ? PICKS : undefined,
        mine: s.filed,
        vote: s.filed ? VOTE : null,
        drop: !!s.filed,
        say,
      }}
      caption={
        s.filed
          ? `The vote lights ${nameOf(VOTE)}. The answer is ${nameOf(T.intent)}.`
          : 'Three labellers, one ticket: the hole with most slips wins.'
      }
    />
  );
}

export default function ManyVotes() {
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
            <Fact id="four-labels" />
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
