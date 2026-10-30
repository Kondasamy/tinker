// Chapter 3: network. The exfiltration attack's last move is a request to an outside host. Egress off blocks it (and
// the real task too); an allow-list blocks the attacker's host while letting the company’s server through. Read off the runs.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { sandboxLanes, sandboxMessages } from '../../components/scenes/sandboxSequence';
import { SANDBOX_PARTS } from '../../components/scenes/sandboxScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Messages, Outcome } from '../tool-calling/kit';
import { Chips, Fact, Files as FilesPanel, runCached, SandboxStage, sandboxProps, says, type View } from './kit';

const MODULE = 'sandboxing',
  ID = '03-network';
type Egress = 'off' | 'allowlist' | 'open';
type Case = 'exfil' | 'report';
interface S {
  kase: Case;
  egress: Egress;
  ran: boolean;
  p1: number | null;
  quiz: number | null;
  view: View;
}
const R = (s: Pick<S, 'kase' | 'egress'>) =>
  runCached({ case: s.kase, sandbox: true, files: 'scoped', egress: s.egress, secret: 'env' });

const P1 = {
  question:
    'Now the egress is an allow-list: the only host the proxy lets out is Larkspur’s own server. The attack still tries to reach attacker.example. Does the request leave?',
  options: [
    'Yes: once egress is on, any host is reachable',
    'No: the attacker’s host is not on the allow-list, so the proxy blocks it',
    'Only if attacker.example pretends to be Larkspur’s server',
  ],
};
const OUT1 = R({ kase: 'exfil', egress: 'allowlist' }).attackMet ? 0 : 1;

export const QUIZ = {
  question:
    'A team sets the agent’s egress to “off” so nothing can leak. The agent’s task needs to call the company’s server. What happens?',
  options: [
    'The task runs fine: the company’s own server is always allowed',
    'The task is blocked too: egress off stops the real request as well as any leak, so it’s a false block',
    'Only the leak is stopped; the server request still goes through',
    'The agent finds another route to the server',
  ],
  correct: 1,
  explanation:
    'Off is the bluntest setting: it stops leaks and the task’s own requests alike. An allow-list keeps the friendly host open.',
  why: [
    'Egress off means no outbound network at all; it does not know which host is friendly.',
    'Right: off blocks the real work too, and the allow-list keeps the task’s host open.',
    'There is no exception; off blocks every outbound request.',
    'The agent cannot route around the sandbox’s network boundary.',
  ],
};

/** The glass room's parts, for step callouts. */
export const PARTS = SANDBOX_PARTS;

export const STEPS: Step<S>[] = [
  {
    id: 'open',
    focus: 'run',
    visibleControls: ['egress', 'run'],
    opensDrawer: 'messages',
    narration: 'The exfiltration attack again, now with egress open: the agent can reach any host.',
    act: 'Run it.',
    say: { block: 'network', text: 'Wide open' },
    predicate: s => s.kase === 'exfil' && s.egress === 'open' && s.ran,
    hint: 'With egress “open”, press Run.',
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    opensDrawer: null,
    narration: 'The token left for attacker.example. A proxy can narrow the egress to an allow-list of hosts.',
    act: 'Predict first.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'allowlist',
    focus: 'egress',
    visibleControls: ['p1', 'out1', 'egress', 'run'],
    narration: 'The allow-list holds one host: Larkspur’s server.',
    act: 'Set the egress to the allow-list and run the attack again.',
    predicate: s => s.kase === 'exfil' && s.egress === 'allowlist' && s.ran && !R(s).attackMet,
    hint: 'Set egress to “allow-list” and press Run.',
  },
  {
    id: 'report-off',
    focus: 'case',
    visibleControls: ['case', 'egress', 'run'],
    narration: 'The attacker’s host was blocked. Narrow too far, though, and real work stops.',
    act: 'Pick the report task, set egress to “off”, and run it.',
    setup: s => ({ ...s, kase: 'report', egress: 'off', ran: false }),
    predicate: s => s.kase === 'report' && s.egress === 'off' && s.ran && !R(s).caseDone,
    hint: 'Pick the report task, set egress “off”, and press Run.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration:
      'Egress off blocked the report’s own request: a false block. The allow-list stops the attacker and lets the task work.',
    act: 'One question to finish.',
    say: { block: 'network', text: 'Task blocked' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What does egress “off” do to the task’s own network request?',
  },
];

const status = (r: ReturnType<typeof R>, kase: Case) =>
  kase === 'exfil'
    ? r.attackMet
      ? `The attack worked. ${says('exfil')}.`
      : 'The attack was stopped by the network boundary.'
    : r.caseDone
      ? 'The report task finished.'
      : 'The task was blocked: it could not reach the server (a false block).';

export default function NetworkChapter() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ kase: 'exfil', egress: 'open', ran: false, p1: null, quiz: null, view: 'scene' }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, inspect, say }) => {
        const r = R(state);
        return (
          <SandboxStage
            run={r}
            upTo={state.ran ? r.steps.length : 0}
            props={sandboxProps({ sandbox: true, files: 'scoped', egress: state.egress, secret: 'env' })}
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
        egress: ({ state, apply }) => (
          <Chips<Egress>
            label="Egress"
            values={['off', 'allowlist', 'open']}
            value={state.egress}
            name={v => (v === 'off' ? 'Egress: off' : v === 'open' ? 'Egress: open' : 'Egress: allow-list')}
            pick={v => apply({ ...state, egress: v, ran: false })}
          />
        ),
        case: ({ state, apply }) => (
          <Chips<Case>
            label="Task"
            values={['exfil', 'report']}
            value={state.kase}
            name={v => (v === 'exfil' ? 'The leak attack' : 'The report task')}
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
                <Fact id="proxy" />
              </>
            );
          },
        },
      }}
    />
  );
}
