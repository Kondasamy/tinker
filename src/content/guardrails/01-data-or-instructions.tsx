// Chapter 1: data or instructions? One recap of Tool calling's planted note (R9), then two attacks on the support inbox:
// a customer who writes the instruction themselves (direct) and a forwarded invoice with a note planted inside it
// (indirect). The reader predicts what a prompt rule does, runs both again with it, and finds it stops only the direct
// one. Every outcome, sender and model note is read off the runs and the inbox, so the copy and the runs agree.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { guardLanes, guardMessages } from '../../components/scenes/guardSequence';
import { GUARD_PARTS } from '../../components/scenes/guardScene';
import { RULE, stepsOf, type Run } from '../../lib/guardrails/loop';
import { ORDERS } from '../../lib/tools/server';
import { fact } from '../../lib/guardrails/facts';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Messages, Outcome } from '../tool-calling/kit';
import { Email, Fact, GuardStage, runCached, says, sender } from './kit';

const MODULE = 'guardrails',
  ID = '01-data-or-instructions';
type Case = 'direct' | 'invoice';
const CASES: Case[] = ['direct', 'invoice'];
const key = (c: Case, rule: boolean) => `${c}:${rule ? 'on' : 'off'}`;
const R = (c: Case, rule: boolean) => runCached({ case: c, rule });

/** the model's note on its turn after reading the email: why it followed the email or refused it */
const note = (r: Run) => stepsOf(r, 'proposal').find(p => p.turn === 1)?.text ?? '';
const owner = (n: string) => `${n}’${n.endsWith('s') ? '' : 's'}`;
const NAME: Record<Case, string> = { direct: `${owner(sender('direct'))} email`, invoice: 'the forwarded invoice' };
const PLANTED = ORDERS.find(o => o.injected)!;
const OUTSIDE = R('invoice', false).sent.find(m => m.tool === 'send_email')!.to;

interface S {
  kase: Case;
  rule: boolean;
  ran: boolean;
  seen: string[];
  opened: boolean;
  p1: number | null;
  quiz: number | null;
}
const current = (s: S) => R(s.kase, s.rule);
const seenBoth = (s: S, rule: boolean) => CASES.every(c => s.seen.includes(key(c, rule)));

const P1 = {
  question: `Larkspur adds a prompt rule to the assistant’s instructions: “${RULE}” Run both emails again. Which attacks does the rule stop?`,
  options: [
    'Both: the rule tells the model exactly what not to do',
    `Only ${NAME.direct}: the forwarded invoice still gets through`,
    `Only the forwarded invoice: ${sender('direct')} is a customer, so the assistant still obeys them`,
    'Neither: a model ignores rules in its own prompt',
  ],
};
// read off the runs: which attacks the rule stops
const stops = (c: Case) => !R(c, true).attackMet;
const OUT1 = stops('direct') ? (stops('invoice') ? 0 : 1) : stops('invoice') ? 2 : 3;

const QUIZ = {
  question:
    'Larkspur’s assistant will also read web pages that customers link to. A colleague says: “We’ll add a line to the prompt telling it to ignore instructions on web pages. Then we’re covered.” What do you tell them?',
  options: [
    'Agreed: a clear rule in the prompt is what the model follows first',
    'The line helps, but it is not enough: the model can’t reliably tell a page’s instructions from its information, and a page can claim to speak for Larkspur. Something outside the model has to limit what an attack can do',
    'Skip the line: prompt rules never change what a model does',
    'Agreed, as long as the line also lists every attack phrase to ignore',
  ],
  correct: 1,
  explanation: fact('no-foolproof').claim,
  why: [
    'In this chapter the rule was in the prompt and the invoice still got a customer’s record sent outside, because the model read the note as Larkspur billing’s.',
    `Right: ${fact('blur').claim.replace(/\.$/, '')}, so a rule lowers attacks but can’t be the only defence.`,
    'The rule did stop the email that said to ignore its instructions, so keep it; just don’t rely on it alone.',
    'The invoice note was polite and used no attack phrase, so a list of phrases misses text that doesn’t look like an attack.',
  ],
};

/** The parts of the mail room a step's callout may name. */
export const PARTS = GUARD_PARTS;

export const STEPS: Step<S>[] = [
  {
    id: 'recap',
    focus: 'open',
    visibleControls: ['open'],
    narration: `A note planted on order ${PLANTED.id} once asked for a refund. Now every email is untrusted text: anyone can write one.`,
    act: 'Open the first email.',
    say: { block: 'inbox', text: 'Anyone can write' },
    predicate: s => s.opened,
  },
  {
    id: 'run-direct',
    focus: 'run',
    visibleControls: ['run'],
    opensDrawer: 'email',
    narration: `${sender('direct')} wrote this email themselves, telling the assistant to ignore its instructions. The user writing the attack makes it a direct injection.`,
    act: 'Run it.',
    predicate: s => s.seen.includes(key('direct', false)),
    hint: 'Press the run button.',
  },
  {
    id: 'direct',
    focus: 'next',
    visibleControls: ['tally', 'next'],
    opensDrawer: null,
    narration: `The attack worked: ${says('direct')}. The model obeyed: it can’t see who wrote a line.`,
    act: 'Next email.',
    say: { block: 'orders', text: 'Refund paid' },
    predicate: s => s.kase === 'invoice',
  },
  {
    id: 'run-invoice',
    focus: 'run',
    visibleControls: ['run'],
    opensDrawer: 'email',
    narration: `${sender('invoice')} forwards a supplier invoice with a planted note posing as Larkspur billing: an indirect injection, hidden in data.`,
    act: 'Run it.',
    predicate: s => s.seen.includes(key('invoice', false)),
    hint: 'Press the run button.',
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['tally', 'p1'],
    opensDrawer: null,
    narration: `${says('invoice')}: ${OUTSIDE}. The customer never knew. Larkspur’s first fix against prompt injection: a prompt rule.`,
    act: 'Predict first.',
    say: { block: 'post', text: 'Sent outside' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'run-rule',
    focus: 'run',
    visibleControls: ['p1', 'run'],
    narration: 'The rule is now in the assistant’s instructions.',
    act: 'Run both emails again.',
    say: { block: 'model', text: 'Rule added' },
    predicate: s => seenBoth(s, true),
    hint: 'Run the customer’s email and the forwarded invoice, one after the other.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'tally', 'notes', 'quiz'],
    narration:
      'The rule stopped “ignore your instructions”, not the invoice note posing as Larkspur. These turns are recorded to show it.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Did the rule stop the invoice? What did the invoice note pretend to be?',
  },
];

/** How each run so far ended, in words, in the order they were run. */
function Tally({ s }: { s: S }) {
  const rows = s.seen.map(k => {
    const [c, rule] = k.split(':');
    return { c: c as Case, rule: rule === 'on' };
  });
  if (!rows.length) return null;
  return (
    <table className="tc-ledger" style={{ marginTop: 10 }}>
      <caption>Runs so far</caption>
      <thead>
        <tr>
          <th scope="col">Email</th>
          <th scope="col">Prompt rule</th>
          <th scope="col">What happened</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ c, rule }) => {
          const r = R(c, rule);
          return (
            <tr key={key(c, rule)}>
              <th scope="row">{NAME[c][0].toUpperCase() + NAME[c].slice(1)}</th>
              <td>{rule ? 'On' : 'Off'}</td>
              <td>{r.attackMet ? `Attack worked: ${says(c)}` : 'Attack stopped'}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function DataOrInstructions() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ kase: 'direct', rule: false, ran: false, seen: [], opened: false, p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, inspect, say }) => {
        const r = current(state);
        return <GuardStage run={r} upTo={state.ran ? r.steps.length : 0} inspect={inspect} say={say} />;
      }}
      controls={{
        open: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, opened: true })}>
            Open the first email
          </button>
        ),
        run: ({ state, sync }) => {
          const offered = state.rule ? CASES : [state.kase];
          return (
            <>
              <div role="group" aria-label="Run an email" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {offered.map(c => (
                  <button
                    key={c}
                    type="button"
                    className="big"
                    onClick={() =>
                      sync({ ...state, kase: c, ran: true, seen: [...new Set([...state.seen, key(c, state.rule)])] })
                    }
                  >
                    Run {NAME[c]}
                    {state.rule ? ', rule on' : ''}
                  </button>
                ))}
              </div>
              {state.ran && (
                <p className="tc-status" role="status">
                  {NAME[state.kase]}:{' '}
                  {current(state).attackMet ? `the attack worked. ${says(state.kase)}.` : 'the attack was stopped.'}
                </p>
              )}
              <Tally s={state} />
            </>
          );
        },
        tally: ({ state }) => <Tally s={state} />,
        next: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, kase: 'invoice', ran: false })}>
            Next email: a forwarded invoice →
          </button>
        ),
        p1: ({ state, apply }) => (
          <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i, rule: true, ran: false })} />
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUT1} />,
        notes: () => (
          <div className="tc-def">
            {CASES.map(c => (
              <div key={c}>
                <p className="lbl">The model’s note on {NAME[c]}, rule on</p>
                <p>“{note(R(c, true))}”</p>
              </div>
            ))}
          </div>
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
      inspectPanel="messages"
      panels={{
        email: {
          title: 'The email',
          render: s => (
            <>
              <Email c={s.kase} />
              <Fact id="owasp-llm01" />
            </>
          ),
        },
        messages: {
          title: 'Steps',
          render: s => {
            const r = current(s);
            return (
              <>
                <Messages lanes={guardLanes()} msgs={guardMessages(r)} upTo={s.ran ? r.steps.length : 0} />
                <Fact id="indirect-remote" />
              </>
            );
          },
        },
      }}
    />
  );
}
