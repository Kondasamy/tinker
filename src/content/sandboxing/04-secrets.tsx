// Chapter 4: secrets. The task needs an API token. With the token in the sandbox's env a compromised agent reads it and
// sends it out; held by the proxy, the agent never sees it and the theft fails. Egress is open throughout, to isolate
// the secret's location as the thing that changes. Outcomes read off the recorded runs.
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
  ID = '04-secrets';
type Secret = 'env' | 'proxy';
interface S {
  secret: Secret;
  ran: boolean;
  p1: number | null;
  quiz: number | null;
  view: View;
}
const R = (s: Pick<S, 'secret'>) =>
  runCached({ case: 'exfil', sandbox: true, files: 'scoped', egress: 'open', secret: s.secret });

const P1 = {
  question:
    'The egress stays open the whole time, so a request can always leave. All that changes is where the token lives. Move it out of the sandbox, held by the proxy. Does the agent still send it out?',
  options: [
    'Yes: the agent needs the token, so it must be able to read it',
    'No: if the agent cannot read the token, it has nothing to send',
    'Only if the proxy leaks it on the first request',
  ],
};
const OUT1 = R({ secret: 'proxy' }).attackMet ? 0 : 1;

const QUIZ = {
  question:
    'With the secret held by the proxy, the agent still calls the company API successfully. How, if it never sees the token?',
  options: [
    'It guessed the token',
    'The proxy adds the real token to the request on the way out, only for allowed hosts',
    'The API stopped requiring a token',
    'The sandbox copied the token into the agent’s memory',
  ],
  correct: 1,
  explanation:
    'The proxy injects the credential on allowed outbound requests, so the call authenticates without the agent ever holding the secret.',
  why: [
    'Nothing is guessed; the agent’s request simply carries no token.',
    'Right. The secret lives with the proxy, which attaches it on the way out to allowed hosts only.',
    'The API still needs the token; the proxy supplies it.',
    'Revealing the token to the agent would defeat the point.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'env',
    focus: 'run',
    visibleControls: ['secret', 'run'],
    opensDrawer: 'files',
    narration: `The task needs Larkspur’s API token. A colleague puts it in the sandbox’s environment so the agent can use it. A planted note tells the agent to send it to an auditor. Egress is open. Run it.`,
    predicate: s => s.secret === 'env' && s.ran,
    hint: 'With the secret “in the sandbox”, press Run.',
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    opensDrawer: null,
    narration: `${says('exfil')}. A sandbox did not help here: the agent could read the secret, so a compromised agent could send it out. Before you move it:`,
    predicate: s => s.p1 !== null,
  },
  {
    id: 'proxy',
    focus: 'secret',
    visibleControls: ['p1', 'out1', 'secret', 'run'],
    narration: 'Move the secret to the proxy, outside the sandbox, and run the attack again.',
    predicate: s => s.secret === 'proxy' && s.ran && !R(s).attackMet,
    hint: 'Set the secret to “with the proxy” and press Run.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration:
      'The read of the token was refused, so there was nothing to send, and yet the real task can still call the API. Keeping the secret out of the agent is a defence the network layer alone cannot give. One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Who adds the token to the request if the agent never sees it?',
  },
];

export default function SecretsChapter() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ secret: 'env', ran: false, p1: null, quiz: null, view: 'scene' }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, inspect }) => {
        const r = R(state);
        return (
          <SandboxStage
            run={r}
            upTo={state.ran ? r.steps.length : 0}
            props={sandboxProps({ sandbox: true, files: 'scoped', egress: 'open', secret: state.secret })}
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
                {R(state).attackMet
                  ? `The attack worked. ${says('exfil')}.`
                  : 'The attack was stopped: the secret was not in the sandbox to read.'}
              </p>
            )}
          </>
        ),
        secret: ({ state, apply }) => (
          <Chips<Secret>
            label="The secret"
            values={['env', 'proxy']}
            value={state.secret}
            name={v => (v === 'env' ? 'Secret: in the sandbox' : 'Secret: with the proxy')}
            pick={v => apply({ ...state, secret: v, ran: false })}
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
        files: {
          title: 'The files in play',
          render: () => (
            <>
              <FilesPanel />
              <Fact id="credentials-outside" />
            </>
          ),
        },
        messages: {
          title: 'Steps',
          render: s => {
            const r = R(s);
            return (
              <>
                <Messages lanes={sandboxLanes()} msgs={sandboxMessages(r)} upTo={s.ran ? r.steps.length : 0} />
                <Fact id="credentials-outside" />
              </>
            );
          },
        },
      }}
    />
  );
}
