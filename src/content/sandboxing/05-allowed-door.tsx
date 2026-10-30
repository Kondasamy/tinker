// Chapter 5: an allowed door still leaks. The allow-list lets the agent reach Larkspur's own API; an attack smuggles a
// customer record out through that one allowed host. This is Guardrails' lethal trifecta. The reliable fix is to remove
// a leg: not mounting the private data the task doesn't need. Outcomes read off the recorded runs.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { sandboxLanes, sandboxMessages } from '../../components/scenes/sandboxSequence';
import { SANDBOX_PARTS } from '../../components/scenes/sandboxScene';
import type { Files } from '../../lib/sandboxing/loop';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Messages, Outcome } from '../tool-calling/kit';
import { Chips, Fact, Files as FilesPanel, runCached, SandboxStage, sandboxProps, says, type View } from './kit';

const MODULE = 'sandboxing',
  ID = '05-allowed-door';
type Case = 'beacon' | 'report';
interface S {
  kase: Case;
  files: Files;
  ran: boolean;
  p1: number | null;
  quiz: number | null;
  view: View;
}
const R = (s: Pick<S, 'kase' | 'files'>) =>
  runCached({ case: s.kase, sandbox: true, files: s.files, egress: 'allowlist', secret: 'proxy' });

const P1 = {
  question:
    'The agent can only reach Larkspur’s own server, and the attack smuggles the record there. One fix is to stop mounting the customer data the report task doesn’t even need. Does that stop the leak?',
  options: [
    'No: the attack can read the data from somewhere else',
    'Yes: with no customer data mounted, there is nothing to smuggle out',
    'Only if the allow-list is emptied too',
  ],
};
const OUT1 = R({ kase: 'beacon', files: 'nodata' }).attackMet ? 0 : 1;

export const QUIZ = {
  question:
    'An agent may only reach the company’s own server. A colleague says “so data can’t leak.” What do you tell them?',
  options: [
    'Agreed: if the only host is ours, nothing can get out',
    'An attack can hide stolen data inside a request to the allowed host, so the allow-list alone does not stop a leak',
    'Agreed, as long as the connection is encrypted',
    'Turn off the agent’s network entirely',
  ],
  correct: 1,
  explanation:
    'The allow-list decides which host, not what the request contains; the reliable fix is to remove a leg of the trifecta.',
  why: [
    'An allowed door is still a door: a request to it can carry whatever the attacker chose.',
    'Right: the record leaves through the open door, so you must take away a leg: the data, the untrusted content or the way out.',
    'Encryption hides the request from the network, not from the host that receives it, and the proxy cannot read inside it.',
    'Off stops the leak and the real work; removing the unneeded data leg stops the leak at no cost here.',
  ],
};

/** The glass room's parts, for step callouts. */
export const PARTS = SANDBOX_PARTS;

export const STEPS: Step<S>[] = [
  {
    id: 'leak',
    focus: 'run',
    visibleControls: ['run'],
    opensDrawer: 'messages',
    narration:
      'Every defence so far is on. A note tells the agent to slip a customer’s record into a routine ping to Larkspur’s server.',
    act: 'Run it.',
    say: { block: 'network', text: 'Allow-list on' },
    predicate: s => s.kase === 'beacon' && s.files === 'scoped' && s.ran,
    hint: 'Press Run.',
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    opensDrawer: null,
    narration:
      'The record left by the allowed door: Guardrails’ lethal trifecta of private data, untrusted content, a way out. Fix: break a leg.',
    act: 'Predict first.',
    say: { block: 'network', text: 'Record got out' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'cut',
    focus: 'files',
    visibleControls: ['p1', 'out1', 'files', 'run'],
    narration: 'The “no data” mounts don’t expose the customer records at all: the data leg is gone.',
    act: 'Switch to “no data” mounts and rerun the attack.',
    predicate: s => s.kase === 'beacon' && s.files === 'nodata' && s.ran && !R(s).attackMet,
    hint: 'Set the mounts to “no data” and press Run.',
  },
  {
    id: 'task',
    focus: 'case',
    visibleControls: ['case', 'files', 'run'],
    narration: 'Nothing left to smuggle. The report never needed that data, so it should still run.',
    act: 'Pick the report task and run it.',
    setup: s => ({ ...s, kase: 'report', files: 'nodata', ran: false }),
    predicate: s => s.kase === 'report' && s.ran && R(s).caseDone,
    hint: 'Pick the report task and press Run.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: 'The report ran. Least privilege removed a whole leg of the trifecta, at no cost to the real work.',
    act: 'One question to finish.',
    say: { block: 'files', text: 'No data here' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Does the allow-list check what’s inside a request, or only which host it goes to?',
  },
];

const status = (r: ReturnType<typeof R>, kase: Case) =>
  kase === 'beacon'
    ? r.attackMet
      ? `The attack worked. ${says('beacon')}.`
      : 'The attack was stopped: no customer data was mounted to smuggle.'
    : r.caseDone
      ? 'The report task finished (it never needed the customer data).'
      : 'The report task was blocked.';

export default function AllowedDoorChapter() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ kase: 'beacon', files: 'scoped', ran: false, p1: null, quiz: null, view: 'scene' }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, inspect, say }) => {
        const r = R(state);
        return (
          <SandboxStage
            run={r}
            upTo={state.ran ? r.steps.length : 0}
            props={sandboxProps({ sandbox: true, files: state.files, egress: 'allowlist', secret: 'proxy' })}
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
        files: ({ state, apply }) => (
          <Chips<Files>
            label="Mounts"
            values={['scoped', 'nodata']}
            value={state.files}
            name={v => (v === 'scoped' ? 'Mounts: scoped (data read-only)' : 'Mounts: no data')}
            pick={v => apply({ ...state, files: v, ran: false })}
          />
        ),
        case: ({ state, apply }) => (
          <Chips<Case>
            label="Task"
            values={['beacon', 'report']}
            value={state.kase}
            name={v => (v === 'beacon' ? 'The smuggle attack' : 'The report task')}
            pick={v => apply({ ...state, kase: v, ran: false })}
          />
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUT1} />,
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
        files: { title: 'The files in play', render: () => <FilesPanel /> },
        messages: {
          title: 'Steps',
          render: s => {
            const r = R(s);
            return (
              <>
                <Messages lanes={sandboxLanes()} msgs={sandboxMessages(r)} upTo={s.ran ? r.steps.length : 0} />
                <p className="tc-fact">
                  The lethal trifecta is from Guardrails: <a href="/guardrails/04-the-trifecta/">the chapter on it</a>{' '}
                  shows the three legs.
                </p>
                <Fact id="allowed-domain-leak" />
              </>
            );
          },
        },
      }}
    />
  );
}
