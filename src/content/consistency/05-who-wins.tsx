// Chapter 5: who wins. Quorums are on (R = W = 2), and the two buyers of the last hinge still both get receipts:
// last writer wins keeps one write and loses the other's decrement. Switching to reservations at North, the primary,
// sells one at a time, and the second buyer finds it sold out.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { EVENTS, MOMENTS, REP_NAME, RULE_NAME, clock, policyOf, runOf, type Rule } from '../../lib/consistency/sim';
import { STOCK_PARTS, stockAt } from '../../components/scenes/stockScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Clock, ConsistencyStage, Fact, Receipts, RuleSwitch, SimNote } from './kit';

const MODULE = 'consistency',
  ID = '05-who-wins';
export const PARTS = STOCK_PARTS;
export const runWith = (rule: Rule) => runOf(policyOf({ r: 2, w: 2, rule }));
const LAST = MOMENTS.lastHinge;
const [A, B] = EVENTS.filter(e => e.t === LAST && e.kind === 'order');
const sales = (rule: Rule) => runWith(rule).ticks[LAST].outcomes.filter(o => o.result === 'sold');
/** the sale last writer wins drops from the count */
export const LOST = sales('lww').find(o => o.lost)!;
/** the buyer reservations turn away */
export const TURNED = runWith('primary').ticks[LAST].outcomes.find(o => o.result === 'soldout')!;

export const P1 = {
  question: `Quorums are on. At ${clock(LAST)} ${A.who} and ${B.who} still buy the last hinge in the same minute. How many receipts?`,
  options: [
    'One: the quorum stops the second sale',
    'Two: both read 1 before either wrote',
    'None: the quorum sees a clash and refuses both',
  ],
};
export const outcomeOf = () => (sales('lww').length === 2 ? 1 : sales('lww').length === 1 ? 0 : 2);

export const QUIZ = {
  question:
    'A shared document keeps whichever version has the latest timestamp. Two editors change the same sentence at the same moment. What happens?',
  options: [
    'One edit silently disappears',
    'The two edits are merged into one sentence',
    'Both editors get an error and try again',
  ],
  correct: 0,
  explanation: 'Last writer wins keeps the newest version whole and drops the other, with no warning.',
  why: [
    'Right: the later timestamp wins, and the other edit is lost without anyone being told.',
    'Merging needs a rule that understands the content; last writer wins only compares timestamps.',
    'Nothing reports the clash: both writes succeed, and one is simply replaced.',
  ],
};

interface S {
  p1: number | null;
  t: number;
  rule: Rule;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'Quorums ended the stale reads: R and W are 2. The last hinge is down to one again.',
    act: 'Predict the receipts.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'clock',
    focus: 'clock',
    visibleControls: ['p1', 'clock'],
    narration: 'Your pick is locked.',
    act: `Move the clock to ${clock(LAST)}.`,
    say: { block: LOST.at, text: 'Sale lost' },
    predicate: s => s.p1 !== null && s.t === LAST,
    hint: `Set the clock to exactly ${clock(LAST)}.`,
  },
  {
    id: 'lww',
    focus: 'rule',
    visibleControls: ['out1', 'rule'],
    narration: `Last writer wins kept ${REP_NAME[LOST.at === 'north' ? 'west' : 'north']}’s write and dropped ${REP_NAME[LOST.at]}’s: a lost update. Two receipts, one decrement.`,
    act: 'Switch to reservations at North.',
    predicate: s => s.rule === 'primary',
  },
  {
    id: 'primary',
    focus: 'quiz',
    visibleControls: ['receipts', 'quiz'],
    narration: `Now North, the primary, takes every order one at a time. ${TURNED.who} finds the hinge sold out.`,
    act: 'One question to finish.',
    say: { block: 'north', text: 'One at a time' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Does keeping the newest timestamp combine the two edits, or replace one?',
  },
];

export default function WhoWins() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, t: LAST - 2, rule: 'lww', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => {
        const r = runWith(state.rule);
        return (
          <ConsistencyStage
            say={say}
            show={{
              scene: stockAt(r, state.t),
              result: r,
              tick: state.t,
              caption: `${clock(state.t)}. R 2, W 2, ${RULE_NAME[state.rule].toLowerCase()}: ${r.sold.hinge} hinges sold, ${r.lost.hinge} lost from the count.`,
            }}
          />
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        clock: ({ state, sync }) => <Clock id="cs-clock5" t={state.t} onTick={t => sync({ ...state, t })} />,
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />
            <Fact id="lww" />
          </>
        ),
        rule: ({ state, apply }) => (
          <RuleSwitch label="Conflict rule" value={state.rule} onChange={rule => apply({ ...state, rule })} />
        ),
        receipts: ({ state }) => <Receipts run={runWith(state.rule)} t={LAST} />,
        quiz: ({ state, apply, sync }) => (
          <>
            <Fact id="raft" />
            <SimNote />
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
