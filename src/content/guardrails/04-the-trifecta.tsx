// Chapter 4: the lethal trifecta. The forwarded invoice needs all three legs: private data (get_customer), untrusted
// text (the email) and a way out (send_email). The puzzle: remove one leg so the attack fails and Hollis Hardware still
// gets their answer. Only the way out works, because replies go through `reply`, which can only answer the sender.
// The reveal is the taint rule: it removes the way out only once untrusted text is in. Every outcome is read off the runs.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { puzzle, Verdict } from '../../components/quiz/Puzzle';
import { guardLanes, guardMessages } from '../../components/scenes/guardSequence';
import { GUARD_PARTS } from '../../components/scenes/guardScene';
import { DOMAINS, REPLY, type Leg, type Run } from '../../lib/guardrails/loop';
import { fact } from '../../lib/guardrails/facts';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Messages, Outcome } from '../tool-calling/kit';
import { Chips, Fact, GuardStage, guardProps, runCached, says, sender } from './kit';

const MODULE = 'guardrails',
  ID = '04-the-trifecta';
const CASE = DOMAINS[ID].case![0],
  LEGS = DOMAINS[ID].remove!;
const R = (remove: Leg, taint: boolean) => runCached({ case: CASE, remove, taint });

const SENDER = sender(CASE);
const SAYS = says(CASE)!;
const OUTSIDE = R('none', false).sent.find(m => m.tool === 'send_email')!.to;
/** what each leg is, and what removing it changes */
const LEG: Record<Exclude<Leg, 'none'>, { name: string; tool: string; removal: string }> = {
  private: { name: 'Private data', tool: 'get_customer', removal: 'get_customer is no longer offered' },
  untrusted: {
    name: 'Untrusted text',
    tool: 'read_inbox',
    removal: 'every email is quarantined before the model reads it',
  },
  out: { name: 'The way out', tool: 'send_email', removal: 'send_email is no longer offered' },
};
const legName = (l: Leg) => (l === 'none' ? 'Keep all three' : `Remove ${LEG[l].name.toLowerCase()}`);
const works = (r: Run) => !r.attackMet && r.caseDone;
const WIN = LEGS.find(l => l !== 'none' && works(R(l, false)))!;
const reply = (r: Run) => r.sent.find(m => m.tool === 'reply')?.body;

interface S {
  remove: Leg;
  taint: boolean;
  p1: number | null;
  quiz: number | null;
}
const current = (s: S) => R(s.remove, s.taint);
const fixed = (s: S) => works(current(s));

const P1 = {
  question: `Larkspur can remove one leg for the forwarded invoice. Which one stops the attack and still answers ${SENDER}?`,
  options: [
    ...(['private', 'untrusted', 'out'] as const).map(l => `${LEG[l].name}: ${LEG[l].removal}`),
    'None: support needs all three',
  ],
};
const OUT1 = (['private', 'untrusted', 'out'] as const).indexOf(WIN as Exclude<Leg, 'none'>);

const QUIZ = {
  question:
    'Larkspur’s buyers want an assistant that reads supplier web pages, looks up Larkspur’s internal price list, and can post messages to a shared supplier chat. Which design is safest, while still letting it compare prices?',
  options: [
    'Add a prompt rule telling it never to share the price list',
    'Once it has read a supplier page in a session, stop offering the chat tool; it can still answer the buyer who asked',
    'Let it keep all three tools, but add a classifier for the supplier pages',
    'Remove the price list, so there is nothing to steal',
  ],
  correct: 1,
  explanation: fact('avoid-trifecta').claim,
  why: [
    'A prompt rule lowers attacks but doesn’t stop them, and in chapter 1 a note that claimed to come from Larkspur got past one.',
    'Right: that is the taint rule, which takes the way out once untrusted text is in, so a planted line can’t send the prices and the buyer still gets a comparison.',
    'A classifier lowers the odds, but in chapter 2 every threshold that held all the attacks held a real customer too, and one missed page leaks the list.',
    `Then it can’t compare prices, the job itself, just as removing private data here left ${SENDER}’s question unanswered.`,
  ],
};

/** The parts of the mail room a step's callout may name. */
export const PARTS = GUARD_PARTS;

export const STEPS: Step<S>[] = [
  {
    id: 'legs',
    focus: 'p1',
    visibleControls: ['legs', 'p1'],
    narration: `Unchecked, the invoice always ends: ${SAYS.toLowerCase()}. The assistant has every leg of the lethal trifecta.`,
    act: 'Predict first.',
    say: { block: 'host', text: 'All three legs' },
    predicate: s => s.p1 !== null,
  },
  puzzle<S>({
    id: 'remove-leg',
    focus: 'leg',
    visibleControls: ['p1', 'legs', 'leg', 'verdict'],
    narration: `${SENDER} still needs an answer about their delivery address.`,
    act: 'Remove one leg so the attack fails and the customer is answered.',
    broken: s => ({ ...s, remove: 'none', taint: false }),
    verdict: fixed,
    solution: s => ({ ...s, remove: WIN, taint: false }),
    hint: `${SENDER} needs their record looked up and their email read. Which leg does answering them not need?`,
  }),
  {
    id: 'taint',
    focus: 'taint',
    visibleControls: ['out1', 'taint'],
    narration: `No send_email, nowhere to go: ${REPLY.name} only writes to the sender. A taint rule keeps send_email until untrusted text is read.`,
    act: 'Turn it on.',
    say: { block: 'post', text: 'Way out back' },
    setup: s => ({ ...s, remove: 'none' }),
    predicate: s => s.taint,
    hint: 'Press “Taint rule: on”.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['compare', 'fact', 'quiz'],
    narration: `Once the email was read, send_email was gone; ${SENDER} still got an answer. The rule never judges the note.`,
    act: 'One question to finish.',
    say: { block: 'post', text: 'Chute shut' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which design takes a leg away at the moment it becomes dangerous?',
  },
];

/** The three legs and the tool that is each one. */
function Legs() {
  return (
    <div className="tc-def">
      {(['private', 'untrusted', 'out'] as const).map(l => (
        <p key={l}>
          <strong>{LEG[l].name}</strong>: {LEG[l].tool}. Removed: {LEG[l].removal}.
        </p>
      ))}
    </div>
  );
}

/** Each setting on the same email: did the attack work, and did the customer get their answer? */
function Compare() {
  const rows: [string, Run][] = [
    ...LEGS.map(l => [legName(l), R(l, false)] as [string, Run]),
    ['Keep all three, taint rule on', R('none', true)],
  ];
  return (
    <table className="tc-ledger" style={{ marginTop: 10 }}>
      <caption>The forwarded invoice, each way</caption>
      <thead>
        <tr>
          <th scope="col">Setting</th>
          <th scope="col">Attack worked?</th>
          <th scope="col">{SENDER} answered?</th>
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

/** What the current setting did, in words. */
function said(r: Run) {
  const attack = r.attackMet ? `The attack worked: the record went to ${OUTSIDE}.` : 'The attack failed.';
  const answer = r.caseDone
    ? `${SENDER} got their answer.`
    : reply(r)
      ? `${SENDER}’s question went unanswered: “${reply(r)}”`
      : `Nobody read the email, so ${SENDER} got no reply at all.`;
  return `${attack} ${answer}`;
}

export default function TheTrifecta() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ remove: 'none', taint: false, p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, inspect, say }) => {
        const r = current(state);
        return <GuardStage run={r} upTo={r.steps.length} props={guardProps(state, true)} inspect={inspect} say={say} />;
      }}
      controls={{
        legs: () => <Legs />,
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUT1} />,
        leg: ({ state, apply }) => (
          <Chips<Leg>
            label="Remove a leg"
            values={LEGS}
            value={state.remove}
            name={legName}
            pick={v => apply({ ...state, remove: v })}
          />
        ),
        verdict: ({ state }) => (
          <p className="tc-status" role="status">
            <Verdict fixed={fixed(state)} /> {said(current(state))}
          </p>
        ),
        taint: ({ state, apply }) => (
          <>
            <Chips
              label="Taint rule"
              values={[0, 1]}
              value={Number(state.taint)}
              name={v => `Taint rule: ${v ? 'on' : 'off'}`}
              pick={v => apply({ ...state, taint: !!v })}
            />
            <p className="tc-status" role="status">
              {said(current(state))}
            </p>
          </>
        ),
        compare: () => <Compare />,
        fact: () => (
          <>
            <Fact id="camel" />
            <p className="note">
              Which of an assistant’s actions outside text can reach:{' '}
              <a href="/action-approvals/03-following-the-dye/">Approvals and permissions</a>.
            </p>
            <p className="note">
              Injected text can also hide in memory and outlive its page:{' '}
              <a href="/agent-memory/05-poisoned-note/">Memory you can trust</a>.
            </p>
            <p className="note">
              Or in a tool’s own description:{' '}
              <a href="/tools-in-production/05-hidden-instructions/">Tools and MCP in production</a>.
            </p>
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
      inspectPanel="messages"
      panels={{
        messages: {
          title: 'Steps',
          render: s => {
            const r = current(s);
            return (
              <>
                <Messages lanes={guardLanes()} msgs={guardMessages(r)} upTo={r.steps.length} />
                <Fact id="lethal-trifecta" />
              </>
            );
          },
        },
      }}
    />
  );
}
