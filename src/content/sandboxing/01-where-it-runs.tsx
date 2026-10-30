// Chapter 1: where the code runs. The same compromised task runs on the host, where it exfiltrates the token, and in a
// configured sandbox, where the same moves are refused. Every outcome is read off the two recorded runs.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { sandboxLanes, sandboxMessages } from '../../components/scenes/sandboxSequence';
import { SANDBOX_PARTS } from '../../components/scenes/sandboxScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Messages, Outcome } from '../tool-calling/kit';
import { Fact, Files, runCached, SandboxStage, sandboxProps, type View as SandboxView } from './kit';

const MODULE = 'sandboxing',
  ID = '01-where-it-runs';
const HOST = runCached({ case: 'exfil', sandbox: false });
const SAFE = runCached({ case: 'exfil', sandbox: true, files: 'scoped', egress: 'allowlist', secret: 'proxy' });

interface S {
  where: 'host' | 'sandbox';
  ranHost: boolean;
  ranBox: boolean;
  p1: number | null;
  quiz: number | null;
  view: SandboxView;
}
const current = (s: S) => (s.where === 'host' ? HOST : SAFE);

const P1 = {
  question:
    'The same task, with the same planted note, now runs inside a sandbox: a box the operating system holds the code in, with the files scoped, the network open only to approved hosts and the secret held by a proxy outside it. Does the attack still get the token out?',
  options: [
    'Yes: the attacker’s note is the same, so the agent does the same thing',
    'No: the sandbox refuses the moves from outside the model, however the note is worded',
    'Only if the note is reworded to get past the sandbox',
  ],
};
const OUT1 = SAFE.attackMet ? 0 : 1;

export const QUIZ = {
  question:
    'A teammate says: “We don’t need a sandbox; we’ll just tell the agent in its prompt not to touch anything sensitive.” What’s the best response?',
  options: [
    'That works: the agent always follows its own instructions first',
    'An instruction is inside the model, where a planted note can override it; a sandbox is a boundary the OS enforces whatever the agent is told',
    'That works, as long as the instruction is in capitals',
    'We should stop running the agent entirely',
  ],
  correct: 1,
  explanation:
    'A sandbox limits what the agent’s code can reach, from outside the model, so it holds even when the agent is taken over.',
  why: [
    'In this chapter the agent followed the planted note on the host, and no instruction stopped it.',
    'Right: the limit sits outside the model, so the sandbox refused the same moves however the agent was persuaded.',
    'Wording is not the weak spot, because the model can’t tell your instructions from an attacker’s.',
    'The agent is useful; the point is to run it inside a boundary, not to switch it off.',
  ],
};

/** The glass room's parts, for step callouts. */
export const PARTS = SANDBOX_PARTS;

export const STEPS: Step<S>[] = [
  {
    id: 'run-host',
    focus: 'runHost',
    visibleControls: ['runHost'],
    opensDrawer: 'files',
    narration:
      'A planted note tells Larkspur’s agent to send its access token outside. Here it runs on the host, with full access.',
    act: 'Run it.',
    say: { block: 'host', text: 'Full access' },
    predicate: s => s.ranHost,
    hint: 'Press “Run it on the host”.',
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['runHost', 'p1'],
    opensDrawer: null,
    narration:
      'It worked: the agent read the token and sent it to attacker.example. That is exfiltration, and nothing on the host stopped it.',
    act: 'Predict first.',
    say: { block: 'world', text: 'Token arrived' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'run-box',
    focus: 'runBox',
    visibleControls: ['p1', 'out1', 'runBox'],
    narration:
      'Now the same task runs in a sandbox: scoped files, only approved hosts, the token kept outside by a proxy.',
    act: 'Run it in the sandbox.',
    say: { block: 'host', text: 'Walled in' },
    setup: s => ({ ...s, where: 'sandbox' }),
    predicate: s => s.ranBox,
    hint: 'Press “Run it in the sandbox”.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration:
      'The token read was refused, so the attack stalled. The boundary did the work, not a change to the model.',
    act: 'One question to finish.',
    say: { block: 'files', text: 'Read refused' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Where does the limit live: in the prompt, or in the sandbox?',
  },
];

export default function WhereItRuns() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ where: 'host', ranHost: false, ranBox: false, p1: null, quiz: null, view: 'scene' }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, inspect, say }) => {
        const r = current(state);
        const ran = state.where === 'host' ? state.ranHost : state.ranBox;
        return (
          <SandboxStage
            run={r}
            upTo={ran ? r.steps.length : 0}
            props={sandboxProps(
              state.where === 'host'
                ? { sandbox: false }
                : { sandbox: true, files: 'scoped', egress: 'allowlist', secret: 'proxy' },
            )}
            inspect={inspect}
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
          />
        );
      }}
      controls={{
        runHost: ({ state, sync }) => (
          <>
            <button type="button" className="big" onClick={() => sync({ ...state, where: 'host', ranHost: true })}>
              Run it on the host
            </button>
            {state.ranHost && (
              <p className="tc-status" role="status">
                The attack worked: the token went to attacker.example.
              </p>
            )}
          </>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUT1} />,
        runBox: ({ state, sync }) => (
          <>
            <button type="button" className="big" onClick={() => sync({ ...state, where: 'sandbox', ranBox: true })}>
              Run it in the sandbox
            </button>
            {state.ranBox && (
              <p className="tc-status" role="status">
                The attack was stopped: the secret is not in the sandbox, so there was nothing to send.
              </p>
            )}
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
        files: {
          title: 'The files in play',
          render: () => (
            <>
              <Files />
              <Fact id="filesystem-isolation" />
            </>
          ),
        },
        messages: {
          title: 'Steps',
          render: s => {
            const r = current(s);
            const ran = s.where === 'host' ? s.ranHost : s.ranBox;
            return (
              <>
                <Messages lanes={sandboxLanes()} msgs={sandboxMessages(r)} upTo={ran ? r.steps.length : 0} />
                <Fact id="two-layers" />
              </>
            );
          },
        },
      }}
    />
  );
}
