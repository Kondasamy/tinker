// Chapter 3: the way out. The forwarded invoice gets a customer's record emailed to an outside address (exfiltration).
// The allow-list stops the send and the model, told it was blocked, still answers the customer. A second email leaks
// the same data inside a link in the customer's own reply, which the allow-list lets through; the output filter strips
// it. Last, a person checking each send instead of a list. Every address, quote and outcome is read off the runs.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { guardLanes, guardMessages } from '../../components/scenes/guardSequence';
import { GUARD_PARTS } from '../../components/scenes/guardScene';
import { ON_FILE, answerOf, outsideLinks, stepsOf, type Decision, type Run } from '../../lib/guardrails/loop';
import { fact } from '../../lib/guardrails/facts';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Messages, Outcome } from '../tool-calling/kit';
import { Chips, Email, Fact, GuardStage, guardProps, runCached, says, sender } from './kit';

const MODULE = 'guardrails',
  ID = '03-the-way-out';
type Case = 'invoice' | 'link';
type Approval = 'off' | Decision;
interface Setup {
  kase: Case;
  allow: boolean;
  filter: boolean;
  approval: Approval;
}
const R = ({ kase, allow, filter, approval }: Setup) => runCached({ case: kase, allow, filter, approval });
const OPEN: Setup = { kase: 'invoice', allow: false, filter: false, approval: 'off' };

const outside = (m: { tool: string; to: string }) => m.tool === 'send_email' && !ON_FILE.includes(m.to);
const LEAK = R(OPEN),
  OUTSIDE = LEAK.sent.find(outside)!.to;
const ALLOWED = R({ ...OPEN, allow: true }),
  BLOCKED = stepsOf(ALLOWED, 'blocked')[0];
const LINK = R({ ...OPEN, kase: 'link', allow: true }),
  FILTERED = R({ ...OPEN, kase: 'link', allow: true, filter: true });
const LINK_URL = outsideLinks(answerOf(LINK))[0],
  LINK_SITE = new URL(LINK_URL).hostname;
const APPROVED = R({ ...OPEN, approval: 'approve' }),
  DENIED = R({ ...OPEN, approval: 'deny' });

interface S extends Setup {
  ran: boolean;
  p1: number | null;
  p2: number | null;
  answered: Approval[];
  quiz: number | null;
}
const current = (s: S) => R(s);

const P1 = {
  question: `Larkspur turns on an allow-list: send_email may only go to customer addresses on file. The model asks to send the record to ${OUTSIDE} again. What happens?`,
  options: [
    'Larkspur’s app blocks the send and tells the model, and the customer still gets their answer',
    'The model sends the record to a different outside address instead',
    'The whole case stops, and the customer gets no answer',
    'The send goes through: the model asked for it, and the app does what the model asks',
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
  question:
    'Larkspur’s assistant will soon draft quotes as web pages that load product images. A colleague says: “Pages only go to the customer who asked, so nothing can leak.” What do you tell them?',
  options: [
    'Agreed: if the recipient is the right customer, the data stays where it should',
    'An image or a link to someone else’s site can carry data out as it loads or when it is clicked, so Larkspur’s app must check where every address in the page points, not only who receives it',
    'Turn off the assistant’s ability to send anything at all',
    'Agreed, as long as a person approves each page before it goes out',
  ],
  correct: 1,
  explanation: fact('link-exfiltration').claim,
  why: [
    `In this chapter the reply went to ${sender('link')}, on file, and still carried their address and card digits out in a link to ${LINK_SITE}.`,
    'Right: check who receives it and where every link in it points, as the allow-list and the output filter did.',
    'That stops leaks and stops the job too, while checks on what leaves, and where to, keep the way out useful.',
    `A person helps only if they read every line, and in this chapter one who said yes let the record go to ${OUTSIDE}.`,
  ],
};

/** The parts of the mail room a step's callout may name. */
export const PARTS = GUARD_PARTS;

export const STEPS: Step<S>[] = [
  {
    id: 'run-leak',
    focus: 'run',
    visibleControls: ['run'],
    opensDrawer: 'email',
    narration: `The forwarded invoice again: its planted note asks for ${sender('invoice')}’s record to go outside.`,
    act: 'Run it and follow the record.',
    predicate: s => s.ran,
    hint: 'Press the run button.',
  },
  {
    id: 'predict-allow',
    focus: 'p1',
    visibleControls: ['log', 'p1'],
    opensDrawer: null,
    narration: `${says('invoice')}: ${OUTSIDE}, via get_customer then send_email. That is exfiltration. Next: an allow-list for send_email.`,
    act: 'Predict first.',
    say: { block: 'post', text: 'Record out' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'allow',
    focus: 'allow',
    visibleControls: ['p1', 'allow', 'log'],
    narration: 'In the picture, the allow-list is a barrier on the chute out to the post box.',
    act: 'Turn on the allow-list.',
    predicate: s => s.allow,
    hint: 'Press “Allow-list: on”.',
  },
  {
    id: 'predict-link',
    focus: 'p2',
    visibleControls: ['out1', 'log', 'p2'],
    narration: `The barrier held, and the model still answered ${sender('invoice')}. The check sits outside the model, so wording can’t beat it.`,
    act: 'Predict the next email.',
    say: { block: 'allow', text: 'Send blocked' },
    predicate: s => s.p2 !== null,
  },
  {
    id: 'run-link',
    focus: 'run',
    visibleControls: ['p2', 'run'],
    opensDrawer: 'email',
    narration: 'The allow-list is still on.',
    act: `Run ${sender('link')}’s email.`,
    predicate: s => s.kase === 'link' && s.ran,
    hint: `Press “Run ${sender('link')}’s email”.`,
  },
  {
    id: 'filter',
    focus: 'filter',
    visibleControls: ['out2', 'fact', 'log', 'filter'],
    opensDrawer: null,
    narration: `${says('link')}, in a reply the allow-list passed.`,
    act: 'Turn on the output filter.',
    say: { block: 'post', text: 'Link leaks data' },
    predicate: s => s.filter,
    hint: 'Press “Output filter: on”.',
  },
  {
    id: 'approval',
    focus: 'approval',
    visibleControls: ['filtered', 'approval'],
    narration: `The filter stripped the link; ${sender('link')} still got their address. Next, approval: a person checks each send instead.`,
    act: 'Try both answers.',
    say: { block: 'post', text: 'Person decides' },
    setup: s => ({ ...s, kase: 'invoice', allow: false, filter: false, approval: 'approve', answered: [] }),
    predicate: s => s.answered.includes('approve') && s.answered.includes('deny'),
    hint: 'Pick “Person says yes”, then “Person says no”.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['compare', 'quiz'],
    narration: `Said no, the record stayed home. Said yes, it went to ${OUTSIDE}: a person is only as good as their attention.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'In this chapter, where did the data go when the reply went to the right customer?',
  },
];

/** Every email the run sent, after the output filter: the mail log. Attacker text is React text. */
function Log({ r, title = 'Mail log: what left Larkspur' }: { r: Run; title?: string }) {
  return (
    <div className="tc-def" data-log>
      <p className="lbl">{title}</p>
      {r.sent.length ? (
        r.sent.map((m, i) => (
          <p key={i} data-out={outside(m) ? 1 : 0}>
            <strong>
              {m.tool} to {m.to}
            </strong>{' '}
            {outside(m) ? '(not a customer address)' : '(on file)'}: {m.body}
          </p>
        ))
      ) : (
        <p>Nothing.</p>
      )}
    </div>
  );
}

/** The four runs of the chapter side by side: which defence stopped what. */
function Compare() {
  const rows: [string, Run][] = [
    ['Forwarded invoice, no checks', LEAK],
    ['Forwarded invoice, allow-list', ALLOWED],
    [`${sender('link')}’s email, allow-list`, LINK],
    [`${sender('link')}’s email, allow-list and filter`, FILTERED],
    ['Forwarded invoice, person says yes', APPROVED],
    ['Forwarded invoice, person says no', DENIED],
  ];
  return (
    <table className="tc-ledger" style={{ marginTop: 10 }}>
      <caption>This chapter’s runs</caption>
      <thead>
        <tr>
          <th scope="col">Run</th>
          <th scope="col">Data left?</th>
          <th scope="col">Customer answered?</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([k, r]) => (
          <tr key={k}>
            <th scope="row">{k}</th>
            <td>{r.attackMet ? 'Yes' : 'No'}</td>
            <td>{r.caseDone ? 'Yes' : 'No'}</td>
          </tr>
        ))}
      </tbody>
    </table>
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
      stage={({ state, inspect, say }) => {
        const r = current(state);
        return (
          <GuardStage
            run={r}
            upTo={state.ran ? r.steps.length : 0}
            props={guardProps(state)}
            inspect={inspect}
            say={say}
          />
        );
      }}
      controls={{
        run: ({ state, sync }) => {
          const c: Case = state.p2 === null ? 'invoice' : 'link';
          return (
            <>
              <button type="button" className="big" onClick={() => sync({ ...state, kase: c, ran: true })}>
                {c === 'invoice' ? 'Run the forwarded invoice' : `Run ${sender('link')}’s email`}
              </button>
              {state.ran && state.kase === c && (
                <p className="tc-status" role="status">
                  {current(state).attackMet ? `The attack worked. ${says(c)}.` : 'The attack was stopped.'}
                </p>
              )}
            </>
          );
        },
        log: ({ state }) => (state.ran ? <Log r={current(state)} /> : null),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUT1} />,
        p2: ({ state, apply }) => (
          <Predict {...P2} value={state.p2} onPredict={i => apply({ ...state, p2: i, ran: false })} />
        ),
        out2: ({ state }) => <Outcome {...P2} prediction={state.p2} outcome={OUT2} />,
        fact: () => <Fact id="owasp-image-exfil" />,
        allow: ({ state, apply }) => (
          <Chips
            label="Allow-list"
            values={[0, 1]}
            value={Number(state.allow)}
            name={v => `Allow-list: ${v ? 'on' : 'off'}`}
            pick={v => apply({ ...state, allow: !!v })}
          />
        ),
        filter: ({ state, apply }) => (
          <Chips
            label="Output filter"
            values={[0, 1]}
            value={Number(state.filter)}
            name={v => `Output filter: ${v ? 'on' : 'off'}`}
            pick={v => apply({ ...state, filter: !!v })}
          />
        ),
        approval: ({ state, apply }) => (
          <>
            <Chips<Decision>
              label="The person checking send_email"
              values={['approve', 'deny']}
              value={state.approval as Decision}
              name={v => (v === 'approve' ? 'Person says yes' : 'Person says no')}
              pick={v => apply({ ...state, approval: v, answered: [...new Set([...state.answered, v])] })}
            />
            <p className="tc-status" role="status">
              {current(state).attackMet
                ? `Said yes: the record went to ${OUTSIDE}.`
                : `Said no: nothing went to ${OUTSIDE}, and ${sender('invoice')} still got their answer.`}
            </p>
          </>
        ),
        filtered: () => (
          <div data-filtered>
            <Log r={FILTERED} title={`Mail log for ${sender('link')}’s email, with the output filter on`} />
          </div>
        ),
        compare: () => <Compare />,
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
              <Email c={s.p2 === null ? 'invoice' : 'link'} />
              <Fact id="owasp-mitigations" />
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
                <Fact id="link-exfiltration" />
              </>
            );
          },
        },
      }}
    />
  );
}
