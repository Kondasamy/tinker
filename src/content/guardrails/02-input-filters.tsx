// Chapter 2: input filters. A stand-in detector scores every email in the injection suite (KTD9: the scores are set by
// hand in data/guardrails/inbox.json); the reader moves the threshold over the finite list and reads, live, how many
// attacks and how many customers it quarantines. No threshold holds every attack and no customer, and the strictest one
// that holds every attack holds a customer's fair refund too. Every count is the engine's `held()` over suite.json.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { guardLanes, guardMessages } from '../../components/scenes/guardSequence';
import { INBOX, INJECTION_SUITE, THRESHOLDS, held, isAttack } from '../../lib/guardrails/loop';
import { fact } from '../../lib/guardrails/facts';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Messages, Outcome } from '../tool-calling/kit';
import { Fact, GuardStage, guardProps, nameOf, runCached } from './kit';
import '../../components/scenes/scenes.css';

const MODULE = 'guardrails', ID = '02-input-filters';
type Case = 'invoice' | 'refund';
// the injection suite: the attacks a detector of injected instructions is for, and the ordinary customers
const SUITE = INJECTION_SUITE.map(id => INBOX.find(e => e.id === id)!);
const OFF = THRESHOLDS.indexOf(null);
const name = (t: number | null) => t === null ? 'off' : String(t);
const H = THRESHOLDS.map(t => held(t, INJECTION_SUITE));
const counts = (i: number) => `${H[i].attacks} of ${H[i].ofAttacks} attacks quarantined, ${H[i].customers} of ${H[i].ofCustomers} customers quarantined`;
const wins = (i: number) => H[i].attacks === H[i].ofAttacks && H[i].customers === 0;
/** the highest threshold that still holds every attack: the one to set before the cost shows */
const ALL = THRESHOLDS.findIndex((_, i) => H[i].attacks === H[i].ofAttacks);
// the customer the catch-all threshold holds, and the attack that scores below them
const HELD_CUSTOMER = SUITE.find(e => !isAttack(e.id) && e.score >= THRESHOLDS[ALL]!)!;
const LOW = SUITE.filter(e => isAttack(e.id)).sort((a, b) => a.score - b.score)[0];

interface S { p1: number | null; t: number; tried: number[]; kase: Case; quiz: number | null }
const current = (s: S) => runCached({ case: s.kase, threshold: THRESHOLDS[s.t] });

const P1 = {
  question: `The detector will give each email a score from 0 to 1: the higher, the more it reads like an attack. Larkspur will quarantine every email that scores at or above a threshold. Is there a threshold that holds all ${H[OFF].ofAttacks} attacks and lets all ${H[OFF].ofCustomers} customers through?`,
  options: [
    'Yes: attacks read like attacks, so they all score higher than the customers',
    'Yes, as long as the threshold is set low enough',
    'No: at least one customer’s email will score higher than an attack',
  ],
};
const OUT1 = H.some((_, i) => wins(i)) ? 0 : 2;

const QUIZ = {
  question: 'Another team tests an injection detector for its chat assistant. Lowered far enough, the threshold holds every attack in their test. They plan to ship at that setting. What should they check first?',
  options: [
    'Nothing: if every attack is held, the job is done',
    'How many ordinary messages that same threshold holds, measured on a set of real customer messages as well as the attacks',
    'Whether each score is exactly right, email by email',
    'Nothing, as long as attackers can’t see where the threshold is set',
  ],
  correct: 1,
  explanation: 'A threshold trades attacks held against customers held. Only counting both, over attacks and ordinary messages alike, shows what a setting costs.',
  why: [
    `In this chapter the threshold that held every attack also held ${nameOf(HELD_CUSTOMER.from)}’s fair refund. A customer who never gets an answer is a failure too.`,
    'Right. Count both sides: attacks that got through, and real customers held. Those two counts over a fixed set of messages are an eval, and they are how a setting is chosen.',
    'Scores are never exactly right, and they don’t need to be. A detector is judged by what it holds at a threshold, over attacks and ordinary messages together.',
    `Hiding the setting changes nothing for real customers, and attackers don’t need it: the ${nameOf(LOW.from)} attack scored ${LOW.score} just by reading like an ordinary checklist.`,
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict', focus: 'p1', visibleControls: ['inbox', 'p1'],
    narration: `Larkspur adds an input filter: a classifier that reads each email before the model does and scores how much it looks like an attack. ${fact('scan-untrusted').claim} Larkspur’s detector here is a stand-in: its scores were set by hand to show the trade-off every real one has. An email that scores at or above the threshold is quarantined: held back, so the model never reads it. The test inbox holds the ${H[OFF].ofAttacks} injection attacks and ${H[OFF].ofCustomers} ordinary customers. Before you score it:`,
    predicate: s => s.p1 !== null,
  },
  {
    id: 'threshold', focus: 'threshold', visibleControls: ['p1', 'threshold', 'inbox'],
    narration: 'The inbox has its scores now. Move the threshold and watch what it holds: the count below, and the forwarded invoice on the stage. Try at least two thresholds.',
    predicate: s => s.tried.filter(i => i !== OFF).length >= 2,
    hint: 'Move the threshold slider to two different settings.',
  },
  {
    id: 'no-winner', focus: 'threshold', visibleControls: ['out1', 'threshold', 'inbox'],
    narration: `No threshold wins outright. ${nameOf(HELD_CUSTOMER.from)}’s email about a cracked printer scores ${HELD_CUSTOMER.score}: it is in capitals and in a hurry, so it reads like an order. The ${nameOf(LOW.from)} attack scores ${LOW.score}: its planted line hides in a checklist. Any threshold low enough to hold the one holds the other. Set the highest threshold that still holds every attack.`,
    predicate: s => s.t === ALL,
    hint: `Move the slider until it reads ${H[ALL].attacks} of ${H[ALL].ofAttacks} attacks quarantined.`,
  },
  {
    id: 'cost', focus: 'open', visibleControls: ['threshold', 'inbox', 'open'],
    narration: `At ${name(THRESHOLDS[ALL])} every attack is held, and so is ${H[ALL].customers} of ${H[ALL].ofCustomers} customers. A real customer the filter holds is a false block. Open ${nameOf(HELD_CUSTOMER.from)}’s email to see what that costs them.`,
    predicate: s => s.kase === HELD_CUSTOMER.id,
    hint: 'Press the button to open the refund email.',
  },
  {
    id: 'quiz', focus: 'quiz', visibleControls: ['eval', 'quiz'],
    narration: `The model never read it. ${nameOf(HELD_CUSTOMER.from)} asked for a fair refund and got no answer at all. Every threshold buys fewer attacks with more customers held, and the two counts are how Larkspur picks one. One question to finish.`,
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What did the threshold that held every attack cost?',
  },
];

/** The injection suite as a strip of emails; scores and holds appear once the reader has predicted. Attacker text is React text. */
function Inbox({ s }: { s: S }) {
  const scored = s.p1 !== null, t = THRESHOLDS[s.t];
  return (
    <table className="tc-ledger" style={{ marginTop: 10 }}>
      <caption>The test inbox{scored ? ', scored' : ''}</caption>
      <thead><tr><th scope="col">Email</th><th scope="col">Is</th>{scored && <><th scope="col">Score</th><th scope="col">At {name(t)}</th></>}</tr></thead>
      <tbody>
        {SUITE.map(e => {
          const q = t !== null && e.score >= t;
          return (
            <tr key={e.id} data-email={e.id} data-held={scored ? (q ? 1 : 0) : undefined}>
              <th scope="row">{nameOf(e.from)}: {e.subject}</th>
              <td>{isAttack(e.id) ? 'Attack' : 'Customer'}</td>
              {scored && <><td>{e.score}</td><td>{q ? 'Quarantined' : 'Let through'}</td></>}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function InputFilters() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, t: OFF, tried: [], kase: 'invoice', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, inspect }) => {
        const r = current(state);
        return <GuardStage run={r} upTo={r.steps.length} props={guardProps({ threshold: THRESHOLDS[state.t] })} inspect={inspect} />;
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUT1} />,
        inbox: ({ state }) => <Inbox s={state} />,
        threshold: ({ state, apply }) => (
          <>
            <label className="slider">
              <span>Threshold: <strong>{name(THRESHOLDS[state.t])}</strong></span>
              <input type="range" min={0} max={THRESHOLDS.length - 1} step={1} value={state.t}
                aria-valuetext={`${name(THRESHOLDS[state.t])}: ${counts(state.t)}`}
                onChange={e => { const t = Number(e.target.value); apply({ ...state, t, tried: [...new Set([...state.tried, t])] }); }} />
              <span className="ends"><span>Off</span><span>Strictest</span></span>
            </label>
            <p className="tc-status" role="status" data-counts>{counts(state.t)}.</p>
          </>
        ),
        open: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, kase: HELD_CUSTOMER.id as Case })}>Open {nameOf(HELD_CUSTOMER.from)}’s refund email</button>
        ),
        eval: () => (
          <p className="tc-status" data-eval>
            Those two counts are an eval: a fixed set of attacks and ordinary customers, run under one setting, scored on attacks that got through and customers held.{' '}
            <a href="/evals/">The Evals module</a> builds test sets like this one.
          </p>
        ),
        quiz: ({ state, apply, sync }) => (
          <Quiz {...QUIZ} unsure value={state.quiz} onAnswer={(_, q) => apply({ ...state, quiz: q })} onUnsure={() => sync({ ...state, quiz: UNSURE })} />
        ),
      }}
      inspectPanel="messages"
      panels={{
        messages: {
          title: 'Steps',
          render: s => { const r = current(s); return <><Messages lanes={guardLanes()} msgs={guardMessages(r)} upTo={r.steps.length} /><Fact id="ninety-five-fails" /></>; },
        },
      }}
    />
  );
}

