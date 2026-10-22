// Chapter 3: network. The exfiltration attack's last move is a request to an outside host. Egress off blocks it (and
// the real task too); an allow-list blocks the attacker's host while letting the company API through. Read off the runs.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { sandboxLanes, sandboxMessages } from '../../components/scenes/sandboxSequence';
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
    'Now the egress is an allow-list: the only host the proxy lets out is Larkspur’s own API. The attack still tries to reach attacker.example. Does the request leave?',
  options: [
    'Yes: once egress is on, any host is reachable',
    'No: the attacker’s host is not on the allow-list, so the proxy blocks it',
    'Only if attacker.example pretends to be Larkspur’s API',
  ],
};
const OUT1 = R({ kase: 'exfil', egress: 'allowlist' }).attackMet ? 0 : 1;

const QUIZ = {
  question:
    'A team sets the agent’s egress to “off” so nothing can leak. The agent’s task needs to call the company API. What happens?',
  options: [
    'The task runs fine: internal APIs are always allowed',
    'The task is blocked too: egress off stops the real API call as well as any leak, so it’s a false block',
    'Only the leak is stopped; the API call still goes through',
    'The agent finds another route to the API',
  ],
  correct: 1,
  explanation:
    'Off is the bluntest setting: it stops leaks and the task’s own requests alike. An allow-list keeps the friendly host open.',
  why: [
    'Egress off means no outbound network at all; it does not know which host is friendly.',
    'Right. Off blocks the real work too. The allow-list is the middle setting that keeps the task’s host open.',
    'There is no exception; off blocks every outbound request.',
    'The agent cannot route around the sandbox’s network boundary.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'open',
    focus: 'run',
    visibleControls: ['egress', 'run'],
    opensDrawer: 'messages',
    narration: `The exfiltration attack again, but now the egress is open: the agent can reach any host. Run it and watch the token leave for attacker.example.`,
    predicate: s => s.kase === 'exfil' && s.egress === 'open' && s.ran,
    hint: 'With egress “open”, press Run.',
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    opensDrawer: null,
    narration: `${says('exfil')}. Open egress is a wide-open door. The proxy can narrow it to an allow-list of hosts. Before you do:`,
    predicate: s => s.p1 !== null,
  },
  {
    id: 'allowlist',
    focus: 'egress',
    visibleControls: ['p1', 'out1', 'egress', 'run'],
    narration: 'Set the egress to the allow-list (Larkspur’s API only), and run the attack again.',
    predicate: s => s.kase === 'exfil' && s.egress === 'allowlist' && s.ran && !R(s).attackMet,
    hint: 'Set egress to “allow-list” and press Run.',
  },
  {
    id: 'report-off',
    focus: 'case',
    visibleControls: ['case', 'egress', 'run'],
    narration:
      'The attacker’s host is blocked. But narrow too far and you block the real work. Switch to the ordinary report task and set egress to “off”: it needs the API.',
    setup: s => ({ ...s, kase: 'report', egress: 'off', ran: false }),
    predicate: s => s.kase === 'report' && s.egress === 'off' && s.ran && !R(s).caseDone,
    hint: 'Pick the report task, set egress “off”, and press Run.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration:
      'Off blocked the report’s own API call: a false block. The allow-list is the setting that stops the attacker and still lets the task work. One question to finish.',
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
      : 'The task was blocked: it could not reach the API (a false block).';

export default function NetworkChapter() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ kase: 'exfil', egress: 'open', ran: false, p1: null, quiz: null, view: 'scene' }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, inspect }) => {
        const r = R(state);
        return (
          <SandboxStage
            run={r}
            upTo={state.ran ? r.steps.length : 0}
            props={sandboxProps({ sandbox: true, files: 'scoped', egress: state.egress, secret: 'env' })}
            inspect={inspect}
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
            name={v => (v === 'exfil' ? 'The exfil attack' : 'The report task')}
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
