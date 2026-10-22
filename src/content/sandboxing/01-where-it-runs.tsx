// Chapter 1: where the code runs. The same compromised task runs on the host, where it exfiltrates the token, and in a
// configured sandbox, where the same moves are refused. Every outcome is read off the two recorded runs.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { sandboxLanes, sandboxMessages } from '../../components/scenes/sandboxSequence';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Messages, Outcome } from '../tool-calling/kit';
import { Fact, Files, runCached, SandboxStage, sandboxProps, says, type View as SandboxView } from './kit';

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
    'The same task, with the same planted note, now runs inside a sandbox: a box the operating system holds the code in, with the files scoped, the network on an allow-list and the secret held by a proxy. Does the attack still get the token out?',
  options: [
    'Yes: the attacker’s note is the same, so the agent does the same thing',
    'No: the sandbox refuses the moves from outside the model, however the note is worded',
    'Only if the note is reworded to get past the sandbox',
  ],
};
const OUT1 = SAFE.attackMet ? 0 : 1;

const QUIZ = {
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
    'In this chapter the agent followed the planted note and sent the token out on the host. An instruction did not stop it there.',
    'Right. The limit has to sit outside the model. The sandbox refused the same moves no matter how the agent was persuaded.',
    'Wording is not the weak spot: the model can’t tell your instructions from an attacker’s, so no phrasing is reliable.',
    'The agent is useful; the point is to run it inside a boundary, not to switch it off.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'run-host',
    focus: 'runHost',
    visibleControls: ['runHost'],
    opensDrawer: 'files',
    narration: `Larkspur’s agent is given a task, and a note planted in that task tells it to send the API token to an outside address. First, run it the way most agents run today: on the host, with the developer’s full access. Run it.`,
    predicate: s => s.ranHost,
    hint: 'Press “Run it on the host”.',
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['runHost', 'p1'],
    opensDrawer: null,
    narration: `${says('exfil')}. On the host there is nothing to stop it: the agent read the secret token, then sent it to attacker.example. Before you run the sandboxed version:`,
    predicate: s => s.p1 !== null,
  },
  {
    id: 'run-box',
    focus: 'runBox',
    visibleControls: ['p1', 'out1', 'runBox'],
    narration: 'Now run the very same task in the sandbox. Watch where it stops.',
    setup: s => ({ ...s, where: 'sandbox' }),
    predicate: s => s.ranBox,
    hint: 'Press “Run it in the sandbox”.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration:
      'The agent tried to read the token, but the sandbox keeps the secret with the proxy, so the read was refused and the attack stalled. The boundary did the work, not a change to the model. One question to finish.',
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
      stage={({ state, sync, inspect }) => {
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
