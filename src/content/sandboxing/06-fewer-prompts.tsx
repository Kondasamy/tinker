// Chapter 6: fewer prompts, same safety. Inside the sandbox, ordinary actions run without a prompt; a person is asked
// only when an action would cross the boundary. Approving that crossing hands the safety back to a tired human. The
// secret is in the env so the exfil reaches the blocked fetch that a person is asked about. Outcomes read off the runs.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import type { Approval } from '../../lib/sandboxing/loop';
import { sandboxLanes, sandboxMessages } from '../../components/scenes/sandboxSequence';
import { SANDBOX_PARTS } from '../../components/scenes/sandboxScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Messages, Outcome } from '../tool-calling/kit';
import { fact } from '../../lib/sandboxing/facts';
import { Chips, Fact, runCached, SandboxStage, SimNote, sandboxProps, says, type View } from './kit';

const MODULE = 'sandboxing',
  ID = '06-fewer-prompts';
type Case = 'report' | 'exfil';
interface S {
  kase: Case;
  approval: Approval;
  ran: boolean;
  p1: number | null;
  quiz: number | null;
  view: View;
}
const R = (s: Pick<S, 'kase' | 'approval'>) =>
  runCached({ case: s.kase, sandbox: true, files: 'scoped', egress: 'allowlist', secret: 'env', approval: s.approval });
// a run asked a person only when it has an approval step
const asked = (r: ReturnType<typeof R>) => r.steps.some(s => s.kind === 'approval');

const P1 = {
  question:
    'The leak attack tries to fetch attacker.example, which the allow-list would block. That crossing is shown to a person to approve. A busy operator clicks yes. Does the token leave?',
  options: [
    'Yes: approving the crossing lets the request out past the boundary',
    'No: the sandbox still blocks it even after a person approves',
    'Only if the person also disables the sandbox',
  ],
};
const OUT1 = R({ kase: 'exfil', approval: 'approve' }).attackMet ? 0 : 1;

export const QUIZ = {
  question: 'After adding a sandbox, a team needs far fewer approvals than before, yet they say it is still safe. Why?',
  options: [
    'It isn’t: fewer prompts always means less safety',
    'The boundary enforces the limits, so actions inside it run freely; a person is asked only when an action would cross the boundary',
    'The agent now approves its own actions',
    'The sandbox approves actions faster than a person could',
  ],
  correct: 1,
  explanation:
    'Safety came from the limit, not the clicking. The sandbox supplies the limit, so the prompt is saved for the moments that would leave it.',
  why: [
    'The limit, not the number of clicks, is what kept things safe; the sandbox provides the limit.',
    'Right: inside the boundary actions are already safe, so the prompt is saved for a crossing.',
    'The agent does not approve itself; the sandbox decides what is in bounds.',
    'It is the boundary doing the enforcing, not the speed of approval, that keeps it safe with fewer prompts.',
  ],
};

/** The glass room's parts, for step callouts. */
export const PARTS = SANDBOX_PARTS;

export const STEPS: Step<S>[] = [
  {
    id: 'report',
    focus: 'run',
    visibleControls: ['run'],
    opensDrawer: 'messages',
    narration: 'An ordinary report task runs in the sandbox with no approvals turned on.',
    act: 'Run it, and count the prompts.',
    say: { block: 'emp', text: 'Approvals off' },
    predicate: s => s.kase === 'report' && s.ran,
    hint: 'Press Run.',
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    opensDrawer: null,
    narration:
      'No prompts: every action stayed inside, so none was a boundary crossing. Next, the leak attack, with a person checking crossings.',
    act: 'Predict first.',
    setup: s => ({ ...s, kase: 'exfil', approval: 'approve', ran: false }),
    predicate: s => s.p1 !== null,
  },
  {
    id: 'approve',
    focus: 'approval',
    visibleControls: ['p1', 'out1', 'approval', 'run'],
    narration: 'The person is set to “approve”: they will click yes on any crossing.',
    act: 'Run the attack.',
    say: { block: 'emp', text: 'Clicks yes' },
    predicate: s => s.kase === 'exfil' && s.approval === 'approve' && s.ran && R(s).attackMet,
    hint: 'Set the person to “approve” and press Run.',
  },
  {
    id: 'deny',
    focus: 'approval',
    visibleControls: ['approval', 'run'],
    narration: 'Approving let the token out: the person, not the boundary, made the call.',
    act: 'Set the person to “refuse” and run it again.',
    say: { block: 'emp', text: 'Said yes' },
    predicate: s => s.kase === 'exfil' && s.approval === 'deny' && s.ran && !R(s).attackMet,
    hint: 'Set the person to “refuse” and press Run.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration:
      'Refused, nothing left. Only the crossing ever reached a person, and saying yes undid the boundary: prompt fatigue makes that likely.',
    act: 'One question to finish.',
    say: { block: 'emp', text: 'Said no' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which actions inside a sandbox still need a person?',
  },
];

export const status = (r: ReturnType<typeof R>, kase: Case) => {
  if (kase === 'report') return `The report task finished${asked(r) ? '' : ', with no approval prompt'}.`;
  return r.attackMet
    ? `A person approved the crossing, and the token left. ${says('exfil')}.`
    : asked(r)
      ? 'The person refused the crossing, so nothing left.'
      : 'The allow-list blocked the request and nobody was asked, so nothing left.';
};

export default function FewerPromptsChapter() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ kase: 'report', approval: 'off', ran: false, p1: null, quiz: null, view: 'scene' }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, inspect, say }) => {
        const r = R(state);
        return (
          <SandboxStage
            run={r}
            upTo={state.ran ? r.steps.length : 0}
            props={sandboxProps({ sandbox: true, files: 'scoped', egress: 'allowlist', secret: 'env' })}
            inspect={inspect}
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
          />
        );
      }}
      controls={{
        run: ({ state, sync }) => (
          <>
            <button type="button" className="big" onClick={() => sync({ ...state, ran: true })}>
              Run it
            </button>
            {state.ran && (
              <p className="tc-status" role="status">
                {status(R(state), state.kase)}
              </p>
            )}
          </>
        ),
        approval: ({ state, apply }) => (
          <Chips<Approval>
            label="A person checks boundary crossings"
            values={['off', 'approve', 'deny']}
            value={state.approval}
            name={v => (v === 'off' ? 'Nobody checks' : v === 'approve' ? 'Person approves' : 'Person refuses')}
            pick={v => apply({ ...state, approval: v, ran: false })}
          />
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={OUT1} />
            <p className="note in-note">
              The same allow-list and ask-first rules for a coding agent:{' '}
              <a href="/coding-agents/06-what-it-may-run/">Coding agents</a>.
            </p>
            <p className="note in-note">
              Why a person who approves everything stops reading:{' '}
              <a href="/action-approvals/01-the-approve-button/">Approvals and permissions</a>.
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
            const r = R(s);
            return (
              <>
                <Messages lanes={sandboxLanes()} msgs={sandboxMessages(r)} upTo={s.ran ? r.steps.length : 0} />
                <Fact id="prompt-reduction" />
                <SimNote>
                  Its prompt count is one recorded run’s; the {fact('prompt-reduction').value} is across Anthropic’s own
                  real use.
                </SimNote>
              </>
            );
          },
        },
      }}
    />
  );
}
