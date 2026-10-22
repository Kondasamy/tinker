// Chapter 2: files. Two attacks probe the filesystem wall: peek reads the hidden deploy key, tamper writes a backdoor
// to a read-only mount. Switching the mounts from open to scoped refuses both. Outcomes read off the recorded runs.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { sandboxLanes, sandboxMessages } from '../../components/scenes/sandboxSequence';
import type { Files } from '../../lib/sandboxing/loop';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Messages, Outcome } from '../tool-calling/kit';
import { Chips, Fact, Files as FilesPanel, runCached, SandboxStage, sandboxProps, says, type View } from './kit';

const MODULE = 'sandboxing', ID = '02-files';
type Case = 'peek' | 'tamper';
interface S { kase: Case; files: Files; ran: boolean; p1: number | null; quiz: number | null; view: View }
const R = (s: Pick<S, 'kase' | 'files'>) => runCached({ case: s.kase, sandbox: true, files: s.files, egress: 'allowlist', secret: 'proxy' });

const P1 = {
  question: 'Right now the sandbox mounts everything, read and write. Scope it instead: the working copy writable, the data read-only, the keys hidden. Does the agent still read the deploy key?',
  options: ['Yes: the key is still on the disk somewhere', 'No: a hidden path is not exposed, so the read is refused', 'Only if it asks for the key twice'],
};
const OUT1 = R({ kase: 'peek', files: 'scoped' }).attackMet ? 0 : 1;

const QUIZ = {
  question: 'An agent’s task reads a template and writes a report, but a secrets file sits in the same folder. What is the right filesystem policy?',
  options: [
    'Mount the whole folder writable so nothing breaks',
    'Expose the template read-only, the output writable, and hide the secrets file',
    'Hide the whole folder, including the template',
    'Mount everything read-only',
  ],
  correct: 1,
  explanation: 'Least privilege: read-only where it only reads, writable where it must write, hidden where it should see nothing.',
  why: [
    'A writable everything lets a taken-over agent change files it should never touch, and read the secret.',
    'Right. Each path gets only the access the task needs: read, write, or nothing.',
    'Hiding the template breaks the task; least privilege is not no access.',
    'Read-only everywhere stops the agent writing its report, so the task fails.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'open', focus: 'run', visibleControls: ['files', 'run'], opensDrawer: 'files',
    narration: `A note in this task tells the agent to read Larkspur’s private deploy key. The sandbox is on, but it mounts everything, read and write. Run it and watch the key come straight out.`,
    predicate: s => s.files === 'open' && s.kase === 'peek' && s.ran,
    hint: 'With the mounts set to “everything”, press Run.',
  },
  {
    id: 'predict', focus: 'p1', visibleControls: ['p1'], opensDrawer: null,
    narration: `${says('peek')}. A sandbox that mounts everything is barely a sandbox. The fix is to mount less. Before you scope it:`,
    predicate: s => s.p1 !== null,
  },
  {
    id: 'scope', focus: 'files', visibleControls: ['p1', 'out1', 'files', 'run'],
    narration: 'Switch the mounts to “scoped”, then run the key attack again.',
    predicate: s => s.files === 'scoped' && s.kase === 'peek' && s.ran && !R(s).attackMet,
    hint: 'Set the mounts to “scoped” and press Run.',
  },
  {
    id: 'tamper', focus: 'case', visibleControls: ['case', 'files', 'run'],
    narration: 'The hidden key is refused. Now a different note: write a scheduled job into the machine’s system folder, which is mounted read-only. Switch to the write attack and run it.',
    setup: s => ({ ...s, kase: 'tamper', files: 'scoped', ran: false }),
    predicate: s => s.kase === 'tamper' && s.ran && !R(s).attackMet,
    hint: 'Pick the “write a backdoor” attack and press Run.',
  },
  {
    id: 'quiz', focus: 'quiz', visibleControls: ['quiz'],
    narration: 'A write to a read-only mount is refused too. Read-only, writable, hidden: three settings per path, each one a wall. One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which paths get write access, which get read-only, which get hidden?',
  },
];

export default function FilesChapter() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ kase: 'peek', files: 'open', ran: false, p1: null, quiz: null, view: 'scene' }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, inspect }) => {
        const r = R(state);
        return <SandboxStage run={r} upTo={state.ran ? r.steps.length : 0} props={sandboxProps({ sandbox: true, files: state.files, egress: 'allowlist', secret: 'proxy' })} inspect={inspect} view={state.view} onView={view => sync({ ...state, view })} />;
      }}
      controls={{
        run: ({ state, sync }) => (
          <>
            <button type="button" className="big" onClick={() => sync({ ...state, ran: true })}>Run it</button>
            {state.ran && <p className="tc-status" role="status">{R(state).attackMet ? `The attack worked. ${says(state.kase)}.` : 'The attack was stopped by the filesystem.'}</p>}
          </>
        ),
        files: ({ state, apply }) => <Chips<Files> label="Mounts" values={['open', 'scoped']} value={state.files} name={v => v === 'open' ? 'Mounts: everything' : 'Mounts: scoped'} pick={v => apply({ ...state, files: v, ran: false })} />,
        case: ({ state, apply }) => <Chips<Case> label="Attack" values={['peek', 'tamper']} value={state.kase} name={v => v === 'peek' ? 'Read the hidden key' : 'Write a backdoor'} pick={v => apply({ ...state, kase: v, ran: false })} />,
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUT1} />,
        quiz: ({ state, apply, sync }) => <Quiz {...QUIZ} unsure value={state.quiz} onAnswer={(_, q) => apply({ ...state, quiz: q })} onUnsure={() => sync({ ...state, quiz: UNSURE })} />,
      }}
      inspectPanel="messages"
      panels={{
        files: { title: 'The files in play', render: () => <><FilesPanel /><Fact id="default-read" /></> },
        messages: { title: 'Steps', render: s => { const r = R(s); return <><Messages lanes={sandboxLanes()} msgs={sandboxMessages(r)} upTo={s.ran ? r.steps.length : 0} /><Fact id="default-write" /></>; } },
      }}
    />
  );
}
