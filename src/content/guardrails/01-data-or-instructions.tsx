// Chapter 1: data or instructions? One recap of Tool calling's planted note (R9), then two attacks on the support inbox:
// a customer who writes the instruction themselves (direct) and a forwarded invoice with a note planted inside it
// (indirect). The reader predicts what a prompt rule does, runs both again with it, and finds it stops only the direct
// one. Every outcome, sender and model note is read off the runs and the inbox, so the copy and the runs agree.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { guardLanes, guardMessages } from '../../components/scenes/guardSequence';
import { ATTACKS, CUSTOMER_RECORDS, INBOX, RULE, run, stepsOf, type Run } from '../../lib/guardrails/loop';
import { RECORDING } from '../../lib/guardrails/turns';
import { ORDERS } from '../../lib/tools/server';
import { fact } from '../../lib/guardrails/facts';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Messages, Outcome } from '../tool-calling/kit';
import { Fact, GuardStage } from './kit';

const MODULE = 'guardrails', ID = '01-data-or-instructions';
type Case = 'direct' | 'invoice';
const CASES: Case[] = ['direct', 'invoice'];
const key = (c: Case, rule: boolean) => `${c}:${rule ? 'on' : 'off'}`;
const RUNS: Record<string, Run> = Object.fromEntries(CASES.flatMap(c => [false, true].map(rule => [key(c, rule), run(RECORDING, { case: c, rule })])));
const R = (c: Case, rule: boolean) => RUNS[key(c, rule)];

const email = (c: Case) => INBOX.find(e => e.id === c)!;
const sender = (c: Case) => CUSTOMER_RECORDS.find(x => x.email === email(c).from)?.name ?? email(c).from;
const says = (c: Case) => ATTACKS.find(a => a.email === c)!.says;
/** the model's note on its turn after reading the email: why it followed the email or refused it */
const note = (r: Run) => stepsOf(r, 'proposal').find(p => p.turn === 1)?.text ?? '';
const owner = (n: string) => `${n}’${n.endsWith('s') ? '' : 's'}`;
const NAME: Record<Case, string> = { direct: `${owner(sender('direct'))} email`, invoice: 'the forwarded invoice' };
const PLANTED = ORDERS.find(o => o.injected)!;
const OUTSIDE = R('invoice', false).sent.find(m => m.tool === 'send_email')!.to;

interface S { kase: Case; rule: boolean; ran: boolean; seen: string[]; opened: boolean; p1: number | null; quiz: number | null }
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
  question: 'Larkspur’s assistant will also read web pages that customers link to. A colleague says: “We’ll add a line to the prompt telling it to ignore instructions on web pages. Then we’re covered.” What do you tell them?',
  options: [
    'Agreed: a clear rule in the prompt is what the model follows first',
    'The line helps, but it is not enough: the model can’t reliably tell a page’s instructions from its information, and a page can claim to speak for Larkspur. Something outside the model has to limit what an attack can do',
    'Skip the line: prompt rules never change what a model does',
    'Agreed, as long as the line also lists every attack phrase to ignore',
  ],
  correct: 1,
  explanation: fact('no-foolproof').claim,
  why: [
    'In this chapter the rule was in the prompt and the forwarded invoice still got a customer’s record sent outside. The model read the note as Larkspur billing’s.',
    `Right. ${fact('blur').claim} A rule lowers attacks; it can’t be the only defence. ${fact('no-foolproof').claim}`,
    'The rule did stop the email that told the assistant to ignore its instructions. It lowers attacks, so keep it; just don’t rely on it alone.',
    'The invoice note used no attack phrase at all: it was polite and claimed to come from Larkspur. A list of phrases misses text that doesn’t look like an attack.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'recap', focus: 'open', visibleControls: ['open'],
    narration: `In Tool calling, someone planted a note on order ${PLANTED.id} telling the model to refund money. The model proposed the refund, and only a person at the approval gate stopped it. Now Larkspur’s assistant works the support inbox. It reads each email, can look up a customer’s private record, and can send email to any address. A note no longer has to sneak onto an order: anyone can write to the assistant. Open the first email.`,
    predicate: s => s.opened,
  },
  {
    id: 'run-direct', focus: 'run', visibleControls: ['run'], opensDrawer: 'email',
    narration: `${sender('direct')}, a customer, wrote this email themselves. It tells the assistant to ignore its instructions. When the person using the assistant writes the attack, it is a direct prompt injection. ${fact('direct-injection').claim} Run it.`,
    predicate: s => s.seen.includes(key('direct', false)),
    hint: 'Press the run button.',
  },
  {
    id: 'direct', focus: 'next', visibleControls: ['tally', 'next'], opensDrawer: null,
    narration: `The attack worked: ${says('direct')}. The model read “refund mode” and “limits are switched off” and acted on them, because nothing in the text says who really wrote it. Larkspur gets one more email.`,
    predicate: s => s.kase === 'invoice',
  },
  {
    id: 'run-invoice', focus: 'run', visibleControls: ['run'], opensDrawer: 'email',
    narration: `${sender('invoice')}, another customer, forwards an invoice from their supplier and asks a fair question. Inside the invoice is a note that claims to come from Larkspur billing. ${sender('invoice')} never wrote it, and may not have seen it. When the attack hides in data the assistant reads, it is an indirect prompt injection. ${fact('indirect-injection').claim} Run it.`,
    predicate: s => s.seen.includes(key('invoice', false)),
    hint: 'Press the run button.',
  },
  {
    id: 'predict', focus: 'p1', visibleControls: ['tally', 'p1'], opensDrawer: null,
    narration: `${says('invoice')}: ${OUTSIDE}. The customer got a polite answer about the address and never knew. The team’s first fix is a rule in the prompt. Before you run anything:`,
    predicate: s => s.p1 !== null,
  },
  {
    id: 'run-rule', focus: 'run', visibleControls: ['p1', 'run'],
    narration: 'The rule is now in the assistant’s instructions. Run both emails again.',
    predicate: s => seenBoth(s, true),
    hint: 'Run the customer’s email and the forwarded invoice, one after the other.',
  },
  {
    id: 'quiz', focus: 'quiz', visibleControls: ['out1', 'tally', 'notes', 'quiz'],
    narration: `The rule stopped the email that said “ignore your instructions”: it looked like what the rule describes. The invoice note didn’t. It claimed to come from Larkspur itself, so the model treated it as its own team’s request. ${fact('blur').claim} These model turns are recorded, written to show that finding; below each attack is the model’s own note on why it refused or followed. One question to finish.`,
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Did the rule stop the invoice? What did the invoice note pretend to be?',
  },
];

/** One email as the assistant receives it. Attacker text: React text only. */
function Email({ c }: { c: Case }) {
  const e = email(c);
  return (
    <div className="tc-def">
      <p className="lbl">From</p><p>{e.from} ({sender(c)})</p>
      <p className="lbl">Subject</p><p>{e.subject}</p>
      <p className="lbl">Text</p><p style={{ whiteSpace: 'pre-wrap' }}>{e.text}</p>
    </div>
  );
}

/** How each run so far ended, in words, in the order they were run. */
function Tally({ s }: { s: S }) {
  const rows = s.seen.map(k => { const [c, rule] = k.split(':'); return { c: c as Case, rule: rule === 'on' }; });
  if (!rows.length) return null;
  return (
    <table className="tc-ledger" style={{ marginTop: 10 }}>
      <caption>Runs so far</caption>
      <thead><tr><th scope="col">Email</th><th scope="col">Prompt rule</th><th scope="col">What happened</th></tr></thead>
      <tbody>
        {rows.map(({ c, rule }) => {
          const r = R(c, rule);
          return <tr key={key(c, rule)}><th scope="row">{NAME[c][0].toUpperCase() + NAME[c].slice(1)}</th><td>{rule ? 'On' : 'Off'}</td><td>{r.attackMet ? `Attack worked: ${says(c)}` : 'Attack stopped'}</td></tr>;
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
      stage={({ state, inspect }) => {
        const r = current(state);
        return <GuardStage run={r} upTo={state.ran ? r.steps.length : 0} inspect={inspect} />;
      }}
      controls={{
        open: ({ state, apply }) => <button type="button" className="big" onClick={() => apply({ ...state, opened: true })}>Open the first email</button>,
        run: ({ state, sync }) => {
          const offered = state.rule ? CASES : [state.kase];
          return (
            <>
              <div role="group" aria-label="Run an email" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {offered.map(c => (
                  <button key={c} type="button" className="big" onClick={() => sync({ ...state, kase: c, ran: true, seen: [...new Set([...state.seen, key(c, state.rule)])] })}>
                    Run {NAME[c]}{state.rule ? ', rule on' : ''}
                  </button>
                ))}
              </div>
              {state.ran && <p className="tc-status" role="status">{NAME[state.kase]}: {current(state).attackMet ? `the attack worked. ${says(state.kase)}.` : 'the attack was stopped.'}</p>}
              <Tally s={state} />
            </>
          );
        },
        tally: ({ state }) => <Tally s={state} />,
        next: ({ state, apply }) => <button type="button" className="big" onClick={() => apply({ ...state, kase: 'invoice', ran: false })}>Next email: a forwarded invoice →</button>,
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i, rule: true, ran: false })} />,
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
          <Quiz {...QUIZ} unsure value={state.quiz} onAnswer={(_, q) => apply({ ...state, quiz: q })} onUnsure={() => sync({ ...state, quiz: UNSURE })} />
        ),
      }}
      inspectPanel="messages"
      panels={{
        email: {
          title: 'The email',
          render: s => <><Email c={s.kase} /><Fact id="owasp-llm01" /></>,
        },
        messages: {
          title: 'Steps',
          render: s => { const r = current(s); return <><Messages lanes={guardLanes()} msgs={guardMessages(r)} upTo={s.ran ? r.steps.length : 0} /><Fact id="indirect-remote" /></>; },
        },
      }}
    />
  );
}
