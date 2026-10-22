// Chapter 6: fewer prompts, same safety. Inside the sandbox, ordinary actions run without a prompt; a person is asked
// only when an action would cross the boundary. Approving that crossing hands the safety back to a tired human. The
// secret is in the env so the exfil reaches the blocked fetch that a person is asked about. Outcomes read off the runs.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import type { Approval } from '../../lib/sandboxing/loop';
import { sandboxLanes, sandboxMessages } from '../../components/scenes/sandboxSequence';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Messages, Outcome } from '../tool-calling/kit';
import { Chips, Fact, runCached, SandboxStage, sandboxProps, says, type View } from './kit';

const MODULE = 'sandboxing', ID = '06-fewer-prompts';
type Case = 'report' | 'exfil';
interface S { kase: Case; approval: Approval; ran: boolean; p1: number | null; quiz: number | null; view: View }
const R = (s: Pick<S, 'kase' | 'approval'>) => runCached({ case: s.kase, sandbox: true, files: 'scoped', egress: 'allowlist', secret: 'env', approval: s.approval });
// a run asked a person only when it has an approval step
const asked = (r: ReturnType<typeof R>) => r.steps.some(s => s.kind === 'approval');

const P1 = {
  question: 'The exfil attack tries to fetch attacker.example, which the allow-list would block. That crossing is shown to a person to approve. A busy operator clicks yes. Does the token leave?',
  options: ['Yes: approving the crossing lets the request out past the boundary', 'No: the sandbox still blocks it even after a person approves', 'Only if the person also disables the sandbox'],
};
const OUT1 = R({ kase: 'exfil', approval: 'approve' }).attackMet ? 0 : 1;

const QUIZ = {
  question: 'After adding a sandbox, a team needs far fewer approvals than before, yet they say it is still safe. Why?',
  options: [
    'It isn’t: fewer prompts always means less safety',
    'The boundary enforces the limits, so actions inside it run freely; a person is asked only when an action would cross the boundary',
    'The agent now approves its own actions',
    'The sandbox approves actions faster than a person could',
  ],
  correct: 1,
  explanation: 'Safety came from the limit, not the clicking. The sandbox supplies the limit, so the prompt is saved for the moments that would leave it.',
  why: [
    'The limit, not the number of clicks, is what kept things safe; the sandbox provides the limit.',
    'Right. Inside the boundary actions are already safe; the prompt is reserved for a crossing. Anthropic found this cuts prompts sharply.',
    'The agent does not approve itself; the sandbox decides what is in bounds.',
    'It is the boundary doing the enforcing, not the speed of approval, that keeps it safe with fewer prompts.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'report', focus: 'run', visibleControls: ['run'], opensDrawer: 'messages',
    narration: `Before sandboxing, a careful team approved almost every action. Now the agent runs an ordinary report task inside the sandbox, with no approvals turned on. Run it and notice: every action stayed inside the boundary, so nobody was asked anything.`,
    predicate: s => s.kase === 'report' && s.ran,
    hint: 'Press Run.',
  },
  {
    id: 'predict', focus: 'p1', visibleControls: ['p1'], opensDrawer: null,
    narration: 'The report finished with no prompts: its API call was allowed, so it never crossed the boundary. Now the exfil attack, with a person set to check any boundary crossing. Before you run it:',
    setup: s => ({ ...s, kase: 'exfil', approval: 'approve', ran: false }),
    predicate: s => s.p1 !== null,
  },
  {
    id: 'approve', focus: 'approval', visibleControls: ['p1', 'out1', 'approval', 'run'],
    narration: 'Run the exfil attack with the person set to “approve”, then try “refuse”. Watch what the approval actually controls.',
    predicate: s => s.kase === 'exfil' && s.approval === 'approve' && s.ran && R(s).attackMet,
    hint: 'Set the person to “approve” and press Run.',
  },
  {
    id: 'deny', focus: 'approval', visibleControls: ['approval', 'run'],
    narration: 'Now set the person to “refuse” and run it again.',
    predicate: s => s.kase === 'exfil' && s.approval === 'deny' && s.ran && !R(s).attackMet,
    hint: 'Set the person to “refuse” and press Run.',
  },
  {
    id: 'quiz', focus: 'quiz', visibleControls: ['quiz'],
    narration: 'Only the boundary crossing was ever shown to a person, and approving it let the token out: the safety was in the boundary, not the click. Keep the boundary, ask a person rarely. One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which actions inside a sandbox still need a person?',
  },
];

export const status = (r: ReturnType<typeof R>, kase: Case) => {
  if (kase === 'report') return `The report task finished${asked(r) ? '' : ', with no approval prompt'}.`;
  return r.attackMet ? `A person approved the crossing, and the token left. ${says('exfil')}.` : asked(r) ? 'The person refused the crossing, so nothing left.' : 'The allow-list blocked the request and nobody was asked, so nothing left.';
};

export default function FewerPromptsChapter() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ kase: 'report', approval: 'off', ran: false, p1: null, quiz: null, view: 'scene' }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, inspect }) => {
        const r = R(state);
        return <SandboxStage run={r} upTo={state.ran ? r.steps.length : 0} props={sandboxProps({ sandbox: true, files: 'scoped', egress: 'allowlist', secret: 'env' })} inspect={inspect} view={state.view} onView={view => sync({ ...state, view })} />;
      }}
      controls={{
        run: ({ state, sync }) => (
          <>
            <button type="button" className="big" onClick={() => sync({ ...state, ran: true })}>Run it</button>
            {state.ran && <p className="tc-status" role="status">{status(R(state), state.kase)}</p>}
          </>
        ),
        approval: ({ state, apply }) => <Chips<Approval> label="A person checks boundary crossings" values={['off', 'approve', 'deny']} value={state.approval} name={v => v === 'off' ? 'Nobody checks' : v === 'approve' ? 'Person approves' : 'Person refuses'} pick={v => apply({ ...state, approval: v, ran: false })} />,
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUT1} />,
        quiz: ({ state, apply, sync }) => <Quiz {...QUIZ} unsure value={state.quiz} onAnswer={(_, q) => apply({ ...state, quiz: q })} onUnsure={() => sync({ ...state, quiz: UNSURE })} />,
      }}
      inspectPanel="messages"
      panels={{
        messages: { title: 'Steps', render: s => { const r = R(s); return <><Messages lanes={sandboxLanes()} msgs={sandboxMessages(r)} upTo={s.ran ? r.steps.length : 0} /><Fact id="prompt-reduction" /></>; } },
      }}
    />
  );
}
