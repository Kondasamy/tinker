// Chapter 7: red-team the sandbox. Every control is a knob; each change reruns both suites, the attacks and the ordinary
// tasks, and the bench reads out attack success rate, false-block rate and a plain verdict. The puzzle: a policy that
// stops every attack and blocks no task. "Show me" shows one of the minimal winners (WINNERS). Controls, the case on the
// stage and the tab are step state, so a reload keeps the bench as it was (as the other workbenches do).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { sandboxLanes, sandboxMessages } from '../../components/scenes/sandboxSequence';
import { SANDBOX_PARTS } from '../../components/scenes/sandboxScene';
import { CASES, isAttack, metrics, type CaseId, type Files, type Metrics, type Setup } from '../../lib/sandboxing/loop';
import { WINNERS, isWinner } from '../../lib/sandboxing/workbench';
import { fact } from '../../lib/sandboxing/facts';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Messages } from '../tool-calling/kit';
import { Chips, Fact, Group, SandboxStage, cellWord, memo, sandboxProps, shortName, type View } from './kit';

const MODULE = 'sandboxing',
  ID = '07-red-team';
type Egress = 'off' | 'allowlist' | 'open';
type Secret = 'env' | 'proxy';
type Approval = 'off' | 'approve' | 'deny';
export interface Bench {
  files: Files;
  egress: Egress;
  secret: Secret;
  approval: Approval;
}
export interface S extends Bench {
  kase: CaseId;
  view: View;
  quiz: number | null;
}

const defOf = (b: Bench): Partial<Setup> => ({
  sandbox: true,
  files: b.files,
  egress: b.egress,
  secret: b.secret,
  approval: b.approval,
});
const benchRun = memo((b: Bench) => metrics(defOf(b), CASES));
export const bench = (b: Bench) => benchRun(b);
const current = (s: S) => bench(s).runs.find(r => r.case === s.kase)!;
const pct = (x: number) => `${Math.round(x * 100)}%`;
export const START: Bench = { files: 'open', egress: 'open', secret: 'env', approval: 'off' };
export const SOLUTION: Bench = { files: 'nodata', egress: 'allowlist', secret: 'proxy', approval: 'off' };
export const clean = (m: Metrics) => m.succeeded === 0 && m.blocked === 0;
const NONE = bench(START),
  STRICT = bench({ files: 'nodata', egress: 'off', secret: 'proxy', approval: 'deny' });

export function verdict(m: Metrics): string {
  if (m.succeeded)
    return `${m.succeeded} of ${m.attacks} attacks got through${m.blocked ? `, and ${m.blocked} of ${m.tasks} tasks were blocked` : ''}. Not safe to ship.`;
  if (m.blocked)
    return `No attack got through, but ${m.blocked} of ${m.tasks} tasks were blocked. Safe on this suite, at a cost to real work.`;
  return 'No attack got through and every task ran. This policy holds on this suite; an attack it has never seen still could get past it.';
}

const FILES_NAME: Record<Files, string> = { open: 'everything', scoped: 'scoped', nodata: 'no data' };
const NAMES = {
  files: ['Mounts', (v: Files) => `Mounts: ${FILES_NAME[v]}`] as const,
  egress: ['Egress', (v: Egress) => `Egress: ${v === 'allowlist' ? 'allow-list' : v}`] as const,
  secret: ['Secret', (v: Secret) => `Secret: ${v === 'env' ? 'in the sandbox' : 'with the proxy'}`] as const,
  approval: [
    'Approval',
    (v: Approval) => `Approval: ${v === 'off' ? 'nobody' : v === 'approve' ? 'approve crossings' : 'refuse crossings'}`,
  ] as const,
};
const DOMAIN = {
  files: ['open', 'scoped', 'nodata'] as Files[],
  egress: ['off', 'allowlist', 'open'] as Egress[],
  secret: ['env', 'proxy'] as Secret[],
  approval: ['off', 'approve', 'deny'] as Approval[],
};
const KEYS = ['files', 'egress', 'secret', 'approval'] as const;

export const QUIZ = {
  question: `Your bench now stops all ${NONE.attacks} attacks and blocks no task. The team asks: are we safe now?`,
  options: [
    'Yes: a 0% attack success rate means no attack can get through',
    'Only against these attacks: add each new attack to the suite, rerun both suites on every change, and ship only when neither rate gets worse',
    'Yes, as long as a person also approves every action',
    'Not yet: turn every control to its strictest, just in case',
  ],
  correct: 1,
  explanation: `A suite measures the attacks it holds. ${fact('not-complete').claim}`,
  why: [
    `The rate covers only the ${NONE.attacks} attacks someone thought of, and a sandbox is not a complete boundary.`,
    'Right: the suites are an eval that grows with new attacks, and a gate on both rates stops a change that makes either worse.',
    'Approvals add prompt fatigue without proving safety against new attacks, and not every action is a crossing.',
    `At its strictest the bench blocks ${STRICT.blocked} of ${STRICT.tasks} tasks, moving cost onto real work without proving safety against new attacks.`,
  ],
};

/** The glass room's parts, for step callouts. */
export const PARTS = SANDBOX_PARTS;

export const STEPS: Step<S>[] = [
  {
    id: 'bench',
    focus: 'start',
    visibleControls: ['bench', 'readout'],
    narration: `Each change reruns the attack suite (${NONE.attacks}) and the task suite (${NONE.tasks}). Wide open, ${NONE.succeeded} of ${NONE.attacks} attacks get through.`,
    act: 'Change any control to start.',
    say: { block: 'host', text: 'Wide open' },
    predicate: s => KEYS.some(k => s[k] !== START[k]),
    hint: 'Change any control, such as the mounts or the egress.',
  },
  {
    id: 'red-team',
    focus: 'bench',
    visibleControls: ['bench', 'readout'],
    narration: 'As the red team, use what each chapter found.',
    act: 'Find a policy that stops every attack and blocks no task.',
    predicate: s => clean(bench(s)),
    hint: 'Scope the mounts so no data leg is exposed, hold the secret with the proxy, and allow-list the egress. Leave approvals off.',
    solution: s => ({ ...s, ...SOLUTION }),
  },
  {
    id: 'gate',
    focus: 'quiz',
    visibleControls: ['bench', 'readout', 'gate', 'quiz'],
    narration: 'A clean bench on this suite: a minimal policy.',
    act: 'Try the strictest settings or drop a layer, then answer the question.',
    say: { block: 'host', text: 'Clean on suite' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What does a 0% rate say about an attack nobody has written yet?',
  },
];

function Readout({ s }: { s: S }) {
  const m = bench(s);
  return (
    <div role="status" data-asr={m.succeeded} data-fbr={m.blocked} data-clean={clean(m) ? '1' : '0'}>
      <table className="tc-ledger" style={{ marginTop: 10 }}>
        <caption>Both suites, under your policy</caption>
        <thead>
          <tr>
            <th scope="col">Measure</th>
            <th scope="col">Count</th>
            <th scope="col">Rate</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Attack success rate</th>
            <td>
              {m.succeeded} of {m.attacks}
            </td>
            <td>{pct(m.asr)}</td>
          </tr>
          <tr>
            <th scope="row">False-block rate</th>
            <td>
              {m.blocked} of {m.tasks}
            </td>
            <td>{pct(m.fbr)}</td>
          </tr>
        </tbody>
      </table>
      <p className="tc-status" data-verdict>
        <strong>{verdict(m)}</strong>
        {isWinner(defOf(s)) && ` This policy is one of ${WINNERS.length} that work.`}
      </p>
      <table className="tc-ledger sb-cases" style={{ marginTop: 10 }}>
        <caption>Each case under your policy</caption>
        <thead>
          <tr>
            <th scope="col">Case</th>
            <th scope="col">Is</th>
            <th scope="col">Outcome</th>
          </tr>
        </thead>
        <tbody>
          {m.runs.map(r => (
            <tr key={r.case} data-case={r.case} data-bad={(isAttack(r.case) ? r.attackMet : !r.caseDone) ? '1' : '0'}>
              <th scope="row">{shortName(r.case)}</th>
              <td>{isAttack(r.case) ? 'Attack' : 'Task'}</td>
              <td>{cellWord(r)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function RedTeam() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ...START, kase: 'exfil', view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, inspect, say }) => {
        const r = current(state);
        return (
          <SandboxStage
            run={r}
            upTo={r.steps.length}
            props={sandboxProps({ sandbox: true, files: state.files, egress: state.egress, secret: state.secret })}
            inspect={inspect}
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
          />
        );
      }}
      controls={{
        bench: ({ state, apply, sync, focused }) => {
          const set = focused ? apply : sync;
          return (
            <div className="tc-bench">
              <Group label="On the stage">
                <Chips<CaseId>
                  label="On the stage"
                  values={CASES}
                  value={state.kase}
                  name={c => `${shortName(c)}${isAttack(c) ? '' : ' (task)'}`}
                  pick={kase => sync({ ...state, kase })}
                />
              </Group>
              {KEYS.map(k => {
                const vals = DOMAIN[k] as string[],
                  [label, name] = NAMES[k] as readonly [string, (v: string) => string];
                return (
                  <Group key={k} label={label}>
                    <Chips
                      label={label}
                      values={vals}
                      value={state[k] as string}
                      name={v => name(v)}
                      pick={v => set({ ...state, [k]: v })}
                    />
                  </Group>
                );
              })}
            </div>
          );
        },
        readout: ({ state }) => <Readout s={state} />,
        gate: () => (
          <div className="tc-def" data-gate>
            <p>
              The two rates over a fixed suite are an eval, and they gate a release the way{' '}
              <a href="/evals/07-release-day/">Evals’ release gate</a> does: a change ships only when neither rate gets
              worse. Every new attack the red team finds joins the suite, so the bar rises with it.
            </p>
            <Fact id="cve-2025-66479" />
          </div>
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
                <Messages lanes={sandboxLanes()} msgs={sandboxMessages(r)} upTo={r.steps.length} />
                <Fact id="not-complete" />
                <p className="note">
                  An agent that clicks through screens needs the same limits, from outside the model:{' '}
                  <a href="/computer-use/05-ask-before-you-pay/">Computer use</a> sets them for one.
                </p>
              </>
            );
          },
        },
      }}
    />
  );
}
