// Chapter 3: the way out. The forwarded invoice gets a customer's record emailed to an outside address (exfiltration).
// The allow-list stops the send and the model, told it was blocked, still answers the customer. A second email leaks
// the same data inside a link in the customer's own reply, which the allow-list lets through; the output filter strips
// it. Last, a person checking each send instead of a list. Every address, quote and outcome is read off the runs.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { guardLanes, guardMessages } from '../../components/scenes/guardSequence';
import { ATTACKS, CUSTOMER_RECORDS, INBOX, ON_FILE, REMOVED_LINK, answerOf, outsideLinks, run, stepsOf, type Decision, type Run } from '../../lib/guardrails/loop';
import { RECORDING } from '../../lib/guardrails/turns';
import { fact } from '../../lib/guardrails/facts';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Messages, Outcome } from '../tool-calling/kit';
import { Chips, Fact, GuardStage, guardProps } from './kit';

const MODULE = 'guardrails', ID = '03-the-way-out';
type Case = 'invoice' | 'link';
type Approval = 'off' | Decision;
interface Setup { kase: Case; allow: boolean; filter: boolean; approval: Approval }
const RUNS = new Map<string, Run>();
const R = ({ kase, allow, filter, approval }: Setup) => {
  const k = `${kase}:${allow}:${filter}:${approval}`;
  if (!RUNS.has(k)) RUNS.set(k, run(RECORDING, { case: kase, allow, filter, approval }));
  return RUNS.get(k)!;
};
const OPEN: Setup = { kase: 'invoice', allow: false, filter: false, approval: 'off' };

const email = (c: Case) => INBOX.find(e => e.id === c)!;
const sender = (c: Case) => CUSTOMER_RECORDS.find(x => x.email === email(c).from)?.name ?? email(c).from;
const says = (c: Case) => ATTACKS.find(a => a.email === c)!.says;
const outside = (m: { tool: string; to: string }) => m.tool === 'send_email' && !ON_FILE.includes(m.to);
const LEAK = R(OPEN), OUTSIDE = LEAK.sent.find(outside)!.to;
const ALLOWED = R({ ...OPEN, allow: true }), BLOCKED = stepsOf(ALLOWED, 'blocked')[0];
const LINK = R({ ...OPEN, kase: 'link', allow: true }), FILTERED = R({ ...OPEN, kase: 'link', allow: true, filter: true });
const LINK_URL = outsideLinks(answerOf(LINK))[0], LINK_SITE = new URL(LINK_URL).hostname;
const APPROVED = R({ ...OPEN, approval: 'approve' }), DENIED = R({ ...OPEN, approval: 'deny' });

interface S extends Setup { ran: boolean; p1: number | null; p2: number | null; answered: Approval[]; quiz: number | null }
const current = (s: S) => R(s);

const P1 = {
  question: `Larkspur turns on an allow-list: send_email may only go to customer addresses on file. The model asks to send the record to ${OUTSIDE} again. What happens?`,
  options: [
    'The host blocks the send and tells the model, and the customer still gets their answer',
    'The model sends the record to a different outside address instead',
    'The whole case stops, and the customer gets no answer',
    'The send goes through: the model asked for it, and the host does what the model asks',
  ],
};
const OUT1 = ALLOWED.attackMet ? 3 : ALLOWED.caseDone && BLOCKED ? 0 : !ALLOWED.caseDone ? 2 : 1;

const P2 = {
  question: `${sender('link')} asks which delivery address Larkspur has on file. A moving company’s checklist, pasted below, asks any AI assistant to add a “verification link” to its reply. The allow-list is still on. Does it stop this attack?`,
  options: [
    'Yes: the allow-list guards everything that leaves Larkspur',
    'No: the data leaves inside the reply to the customer’s own address, which the allow-list lets through',
    'There is no attack: a link is harmless until someone clicks it',
  ],
};
const OUT2 = LINK.attackMet ? 1 : 0;

const QUIZ = {
  question: 'Larkspur’s assistant will soon draft quotes as web pages that load product images. A colleague says: “Pages only go to the customer who asked, so nothing can leak.” What do you tell them?',
  options: [
    'Agreed: if the recipient is the right customer, the data stays where it should',
    'An image or a link to someone else’s site can carry data out as it loads or when it is clicked, so the host must check where every address in the page points, not only who receives it',
    'Turn off the assistant’s ability to send anything at all',
    'Agreed, as long as a person approves each page before it goes out',
  ],
  correct: 1,
  explanation: fact('link-exfiltration').claim,
  why: [
    `In this chapter the reply went to ${sender('link')}, on file, and still carried their address and card digits out in a link to ${LINK_SITE}.`,
    `Right. ${fact('link-exfiltration').claim} Check who receives it and where every link in it points: the allow-list did one, the output filter the other.`,
    'That stops leaks and stops the job: customers need their answers. Checks on what leaves, and where to, keep the way out useful.',
    `A person helps only if they read every line. In this chapter, a person who said yes let the record go to ${OUTSIDE}; a long page with a link buried in it is easy to wave through.`,
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'run-leak', focus: 'run', visibleControls: ['run'], opensDrawer: 'email',
    narration: `Back to the forwarded invoice from chapter 1. ${sender('invoice')} asks a fair question; the note planted in their supplier’s invoice asks for their record to go to an outside address. This time follow the record. Run it.`,
    predicate: s => s.ran,
    hint: 'Press the run button.',
  },
  {
    id: 'predict-allow', focus: 'p1', visibleControls: ['log', 'p1'], opensDrawer: null,
    narration: `${says('invoice')}: ${OUTSIDE}. The model looked up the record with get_customer, then mailed it out with send_email. Private data leaving for somewhere it shouldn’t go is exfiltration. A rule in the prompt didn’t stop it, so Larkspur puts a check on what leaves: an allow-list of the addresses send_email may write to. Before you turn it on:`,
    predicate: s => s.p1 !== null,
  },
  {
    id: 'allow', focus: 'allow', visibleControls: ['p1', 'allow', 'log'],
    narration: 'Turn on the allow-list. The stage draws it as a barrier on the outbound chute.',
    predicate: s => s.allow,
    hint: 'Press “Allow-list: on”.',
  },
  {
    id: 'predict-link', focus: 'p2', visibleControls: ['out1', 'log', 'p2'],
    narration: `The barrier held. The host told the model “${BLOCKED.text}” The model moved on and answered ${sender('invoice')}. The mail log has no outside address in it. The check sits outside the model, so how the note was worded doesn’t matter. A second email arrives. Before you run it:`,
    predicate: s => s.p2 !== null,
  },
  {
    id: 'run-link', focus: 'run', visibleControls: ['p2', 'run'], opensDrawer: 'email',
    narration: `Run ${sender('link')}’s email, with the allow-list still on.`,
    predicate: s => s.kase === 'link' && s.ran,
    hint: `Press “Run ${sender('link')}’s email”.`,
  },
  {
    id: 'filter', focus: 'filter', visibleControls: ['out2', 'log', 'filter'], opensDrawer: null,
    narration: `${says('link')}. The reply went to ${sender('link')}’s own address, so the allow-list let it through, but the link points to ${LINK_SITE} with their address and card digits in it. One click, or a mail app that loads links on its own, and the data is gone. ${fact('link-exfiltration').claim} The second output check is a filter: it strips links to any site but Larkspur’s from everything sent. Turn it on.`,
    predicate: s => s.filter,
    hint: 'Press “Output filter: on”.',
  },
  {
    id: 'approval', focus: 'approval', visibleControls: ['filtered', 'approval'],
    narration: `The reply now reads “${REMOVED_LINK}” where the link was, and ${sender('link')} still gets their address. Some teams guard the way out with a person instead of a list, as Tool calling’s approval gate did. Here the allow-list and the filter are off, the forwarded invoice runs again, and every send_email waits for someone to say yes or no. Try both answers.`,
    setup: s => ({ ...s, kase: 'invoice', allow: false, filter: false, approval: 'approve', answered: [] }),
    predicate: s => s.answered.includes('approve') && s.answered.includes('deny'),
    hint: 'Pick “Person says yes”, then “Person says no”.',
  },
  {
    id: 'quiz', focus: 'quiz', visibleControls: ['compare', 'quiz'],
    narration: `Said no, the record stayed home and ${sender('invoice')} still got their answer. Said yes, it went to ${OUTSIDE}: the person is only as good as their attention, and the note claimed to come from Larkspur billing. A list never gets tired. One question to finish.`,
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'In this chapter, where did the data go when the reply went to the right customer?',
  },
];

/** Every email the run sent, after the output filter: the mail log. Attacker text is React text. */
function Log({ r, title = 'Mail log: what left Larkspur' }: { r: Run; title?: string }) {
  return (
    <div className="tc-def" data-log>
      <p className="lbl">{title}</p>
      {r.sent.length ? r.sent.map((m, i) => (
        <p key={i} data-out={outside(m) ? 1 : 0}>
          <strong>{m.tool} to {m.to}</strong> {outside(m) ? '(not a customer address)' : '(on file)'}: {m.body}
        </p>
      )) : <p>Nothing.</p>}
    </div>
  );
}

/** The four runs of the chapter side by side: which defence stopped what. */
function Compare() {
  const rows: [string, Run][] = [
    ['Forwarded invoice, no checks', LEAK], ['Forwarded invoice, allow-list', ALLOWED],
    [`${sender('link')}’s email, allow-list`, LINK], [`${sender('link')}’s email, allow-list and filter`, FILTERED],
    ['Forwarded invoice, person says yes', APPROVED], ['Forwarded invoice, person says no', DENIED],
  ];
  return (
    <table className="tc-ledger" style={{ marginTop: 10 }}>
      <caption>This chapter’s runs</caption>
      <thead><tr><th scope="col">Run</th><th scope="col">Data left?</th><th scope="col">Customer answered?</th></tr></thead>
      <tbody>{rows.map(([k, r]) => <tr key={k}><th scope="row">{k}</th><td>{r.attackMet ? 'Yes' : 'No'}</td><td>{r.caseDone ? 'Yes' : 'No'}</td></tr>)}</tbody>
    </table>
  );
}

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

export default function TheWayOut() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ...OPEN, ran: false, p1: null, p2: null, answered: [], quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, inspect }) => {
        const r = current(state);
        return <GuardStage run={r} upTo={state.ran ? r.steps.length : 0} props={guardProps(state)} inspect={inspect} />;
      }}
      controls={{
        run: ({ state, sync }) => {
          const c: Case = state.p2 === null ? 'invoice' : 'link';
          return (
            <>
              <button type="button" className="big" onClick={() => sync({ ...state, kase: c, ran: true })}>
                {c === 'invoice' ? 'Run the forwarded invoice' : `Run ${sender('link')}’s email`}
              </button>
              {state.ran && state.kase === c && <p className="tc-status" role="status">{current(state).attackMet ? `The attack worked. ${says(c)}.` : 'The attack was stopped.'}</p>}
            </>
          );
        },
        log: ({ state }) => state.ran ? <Log r={current(state)} /> : null,
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUT1} />,
        p2: ({ state, apply }) => <Predict {...P2} value={state.p2} onPredict={i => apply({ ...state, p2: i, ran: false })} />,
        out2: ({ state }) => <Outcome {...P2} prediction={state.p2} outcome={OUT2} />,
        allow: ({ state, apply }) => <Chips label="Allow-list" values={[0, 1]} value={Number(state.allow)} name={v => `Allow-list: ${v ? 'on' : 'off'}`} pick={v => apply({ ...state, allow: !!v })} />,
        filter: ({ state, apply }) => <Chips label="Output filter" values={[0, 1]} value={Number(state.filter)} name={v => `Output filter: ${v ? 'on' : 'off'}`} pick={v => apply({ ...state, filter: !!v })} />,
        approval: ({ state, apply }) => (
          <>
            <Chips<Decision> label="The person checking send_email" values={['approve', 'deny']} value={state.approval as Decision}
              name={v => v === 'approve' ? 'Person says yes' : 'Person says no'}
              pick={v => apply({ ...state, approval: v, answered: [...new Set([...state.answered, v])] })} />
            <p className="tc-status" role="status">{current(state).attackMet ? `Said yes: the record went to ${OUTSIDE}.` : `Said no: nothing went to ${OUTSIDE}, and ${sender('invoice')} still got their answer.`}</p>
          </>
        ),
        filtered: () => <div data-filtered><Log r={FILTERED} title={`Mail log for ${sender('link')}’s email, with the output filter on`} /></div>,
        compare: () => <Compare />,
        quiz: ({ state, apply, sync }) => (
          <Quiz {...QUIZ} unsure value={state.quiz} onAnswer={(_, q) => apply({ ...state, quiz: q })} onUnsure={() => sync({ ...state, quiz: UNSURE })} />
        ),
      }}
      inspectPanel="messages"
      panels={{
        email: {
          title: 'The email',
          render: s => <><Email c={s.p2 === null ? 'invoice' : 'link'} /><Fact id="owasp-mitigations" /></>,
        },
        messages: {
          title: 'Steps',
          render: s => { const r = current(s); return <><Messages lanes={guardLanes()} msgs={guardMessages(r)} upTo={s.ran ? r.steps.length : 0} /><Fact id="link-exfiltration" /></>; },
        },
      }}
    />
  );
}
