// Chapter 7: the red team. Every defence from the module is a control (WORKBENCH_DOMAINS: all of them but the
// trifecta's legs); each change reruns both suites, the attacks and the ordinary customers, and the bench reads out the
// attack success rate, the false-block rate and a plain verdict. The puzzle: a set with no attack through and no
// customer blocked; then free play, and the pointer to Evals' release gate. Controls, the case on the stage and the tab
// are step state, so a reload keeps the bench as it was (as Agents' and Evals' workbenches do).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { guardLanes, guardMessages } from '../../components/scenes/guardSequence';
import { CASES, DEFAULTS, WORKBENCH_DOMAINS, isAttack, metrics, type CaseId, type Defences, type Metrics } from '../../lib/guardrails/loop';
import { fact } from '../../lib/guardrails/facts';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Messages } from '../tool-calling/kit';
import { Chips, Fact, GuardStage, Group, cellWord, guardProps, longName, shortName, type View } from './kit';

const MODULE = 'guardrails', ID = '07-red-team';
const W = WORKBENCH_DOMAINS;
/** The bench's settings: every workbench control but the case. */
export type Bench = Pick<Defences, 'rule' | 'threshold' | 'inputPolicy' | 'taint' | 'allow' | 'filter' | 'outputPolicy' | 'approval'>;
// every default but the trifecta's legs, in DEFAULTS' order (which is the bench's control order)
const { remove: _, ...START_ } = DEFAULTS;
export const START: Bench = START_;
const KEYS = Object.keys(START) as (keyof Bench)[];
export const benchOf = (s: Bench): Bench => Object.fromEntries(KEYS.map(k => [k, s[k]])) as Bench;

const cache = new Map<string, Metrics>();
/** Both suites under one bench: the eval (R11). */
export const bench = (b: Bench) => {
  const k = JSON.stringify(benchOf(b));
  if (!cache.has(k)) cache.set(k, metrics(benchOf(b), CASES));
  return cache.get(k)!;
};
const pct = (x: number) => `${Math.round(x * 100)}%`;
/** The bench's call, in plain words. */
export function verdict(m: Metrics): string {
  if (m.succeeded) return `${m.succeeded} of ${m.attacks} attacks got through${m.blocked ? `, and ${m.blocked} of ${m.customers} customers were blocked` : ''}. Not safe to ship.`;
  if (m.blocked) return `No attack got through, but ${m.blocked} of ${m.customers} customers were blocked. Safe on this suite, at a cost to real customers.`;
  return 'No attack got through and every customer was served. This set holds on this suite; an attack it has never seen still could get past it.';
}
export const clean = (m: Metrics) => m.succeeded === 0 && m.blocked === 0;
/** "Show me": chapter 5's smallest injection set plus chapter 6's two policy checks; the unit test checks it is clean. */
export const SOLUTION: Bench = { ...START, rule: true, taint: true, inputPolicy: true, outputPolicy: 'on' };
/** every control at its strictest */
const STRICTEST: Bench = { rule: true, threshold: W.threshold!.at(-1)!, inputPolicy: true, taint: true, allow: true, filter: true, outputPolicy: 'strict', approval: 'deny' };
const NONE = bench(START), STRICT = bench(STRICTEST);

/** Each control: its label and the words for each value, in domain order. */
const on = (label: string) => [label, (v: boolean) => `${label}: ${v ? 'on' : 'off'}`] as const;
const NAMES: { [K in keyof Bench]: readonly [string, (v: Bench[K]) => string] } = {
  rule: on('Prompt rule'),
  threshold: ['Input filter', v => (v === null ? 'Input filter: off' : `Filter at ${v}`)],
  inputPolicy: on('Input policy check'),
  taint: on('Taint rule'),
  allow: on('Allow-list'),
  filter: on('Output filter'),
  outputPolicy: ['Output policy check', v => (v === 'off' ? 'Output check: off' : v === 'on' ? 'Output check: on' : 'Output check: strict')],
  approval: ['A person checks send_email', v => (v === 'off' ? 'Nobody checks' : v === 'approve' ? 'Person says yes' : 'Person says no')],
};

export interface S extends Bench { kase: CaseId; view: View; quiz: number | null }
const current = (s: S) => bench(s).runs.find(r => r.case === s.kase)!;

const QUIZ = {
  question: `Larkspur’s red-team set now stops all ${NONE.attacks} attacks in its suite and blocks no customer. The team asks: are we safe now?`,
  options: [
    'Yes: a 0% attack success rate means no attack can get through',
    'Only against these attacks: add each new attack to the suite, rerun both suites on every change, and ship only when neither rate gets worse',
    'Not yet: turn every defence up to its strictest, just in case',
    'Yes, as long as a person also checks every outgoing email',
  ],
  correct: 1,
  explanation: `A suite measures the attacks it holds. ${fact('one-percent').claim}`,
  why: [
    `The rate is over ${NONE.attacks} attacks someone thought of. ${fact('no-foolproof').claim}`,
    'Right. The suites are an eval: they say how a set does on known attacks and real customers, and they grow as new attacks are found. A release gate on both rates stops a change that makes either worse.',
    `At its strictest the bench blocks ${STRICT.blocked} of ${STRICT.customers} customers. Strictness moves cost onto real customers without proving safety against new attacks.`,
    'A person sees only outgoing email: the discount push in chapter 6 came as a refund, not an email. And in chapter 3 a person who said yes let a record go outside.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'bench', focus: 'start', visibleControls: ['bench', 'readout'],
    narration: `The red team’s bench. Every defence from this module is a control, and every change reruns both suites: the ${NONE.attacks} attacks (the injections and the policy pushes) and the ${NONE.customers} ordinary customers. With nothing on, ${NONE.succeeded} of ${NONE.attacks} attacks get through. The readout gives the attack success rate, the false-block rate and a verdict; pick a case to watch it on the stage. Turn on any defence to start.`,
    predicate: s => KEYS.some(k => s[k] !== START[k]),
    hint: 'Press any defence, such as “Prompt rule: on”.',
  },
  {
    id: 'red-team', focus: 'bench', visibleControls: ['bench', 'readout'],
    narration: 'Find a set with no attack through and no customer blocked. Chapters 5 and 6 each found part of the answer: one for planted text, one for customers who push.',
    predicate: s => clean(bench(s)),
    hint: 'Chapter 5 stopped the injections with two layers that block nobody; chapter 6 added a check on the way in and one on refunds, not the strict one.',
    solution: s => ({ ...s, ...SOLUTION }),
  },
  {
    id: 'gate', focus: 'quiz', visibleControls: ['bench', 'readout', 'gate', 'quiz'],
    narration: 'A clean bench, on this suite. Keep playing: try the strictest settings and watch the false blocks, or take one layer away and see which attack comes back. Then one question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What does a 0% rate say about an attack nobody has written yet?',
  },
];

function Readout({ s }: { s: S }) {
  const m = bench(s);
  return (
    <div role="status" data-asr={m.succeeded} data-fbr={m.blocked} data-clean={clean(m) ? '1' : '0'}>
      <table className="tc-ledger" style={{ marginTop: 10 }}>
        <caption>Both suites, under your set</caption>
        <thead><tr><th scope="col">Measure</th><th scope="col">Count</th><th scope="col">Rate</th></tr></thead>
        <tbody>
          <tr><th scope="row">Attack success rate</th><td>{m.succeeded} of {m.attacks}</td><td>{pct(m.asr)}</td></tr>
          <tr><th scope="row">False-block rate</th><td>{m.blocked} of {m.customers}</td><td>{pct(m.fbr)}</td></tr>
        </tbody>
      </table>
      <p className="tc-status" data-verdict><strong>{verdict(m)}</strong></p>
      <table className="tc-ledger gr-cases" style={{ marginTop: 10 }}>
        <caption>Each case under your set</caption>
        <thead><tr><th scope="col">Email</th><th scope="col">Is</th><th scope="col">Outcome</th></tr></thead>
        <tbody>{m.runs.map(r => (
          <tr key={r.case} data-case={r.case} data-bad={(isAttack(r.case) ? r.attackMet : !r.caseDone) ? '1' : '0'}>
            <th scope="row">{longName(r.case)}</th><td>{isAttack(r.case) ? 'Attack' : 'Customer'}</td><td>{cellWord(r)}</td>
          </tr>
        ))}</tbody>
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
      initial={{ ...START, kase: 'invoice', view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, inspect }) => {
        const r = current(state);
        return <GuardStage run={r} upTo={r.steps.length} props={guardProps(state)} inspect={inspect} view={state.view} onView={view => sync({ ...state, view })} />;
      }}
      controls={{
        // watching a case is never a miss; changing a defence is an attempt only in the puzzle step
        bench: ({ state, apply, sync, focused }) => {
          const set = focused ? apply : sync;
          return (
            <div className="tc-bench">
              <Group label="On the stage"><Chips<CaseId> label="On the stage" values={CASES} value={state.kase} name={c => `${shortName(c)}${isAttack(c) ? '' : ' (customer)'}`} pick={kase => sync({ ...state, kase })} /></Group>
              {KEYS.map(k => {
                const vals = W[k] as unknown[], [label, name] = NAMES[k] as readonly [string, (v: unknown) => string];
                return <Group key={k} label={label}><Chips label={label} values={vals.map((_, i) => i)} value={vals.indexOf(state[k])} name={i => name(vals[i])} pick={i => set({ ...state, [k]: vals[i] })} /></Group>;
              })}
            </div>
          );
        },
        readout: ({ state }) => <Readout s={state} />,
        gate: () => (
          <div className="tc-def" data-gate>
            <p>
              The two rates over a fixed suite are an eval, and they gate a release the way{' '}
              <a href="/evals/07-release-day/">Evals’ release gate</a> does: a new defence, prompt or model ships only when neither rate gets
              worse. Every new attack the red team finds joins the suite, so the bar rises with it.
            </p>
            <Fact id="red-team-rate" />
          </div>
        ),
        quiz: ({ state, apply, sync }) => (
          <Quiz {...QUIZ} unsure value={state.quiz} onAnswer={(_, q) => apply({ ...state, quiz: q })} onUnsure={() => sync({ ...state, quiz: UNSURE })} />
        ),
      }}
      inspectPanel="messages"
      panels={{
        messages: {
          title: 'Steps',
          render: s => { const r = current(s); return <><Messages lanes={guardLanes()} msgs={guardMessages(r)} upTo={r.steps.length} /><Fact id="ninety-five-fails" /></>; },
        },
      }}
    />
  );
}
