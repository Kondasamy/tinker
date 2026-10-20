// Chapter 6, in a fixed order: the approval gate on (the reader approves or denies the refund; both advance, AE5),
// then the gate off with a refund limit narrowing issue_refund until it refuses (isError), then order 1047's planted
// note: with the gate off the host runs the $5,000 refund and the ledger shows it; with the gate on it waits, and
// only denying advances (AE6). The note only ever reaches the page as React text (KTD12).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import FlatStage from '../../components/scenes/FlatStage';
import { toolLanes, transcript, callText, type Shown } from '../../components/scenes/toolSequence';
import { DOMAINS, run, type Decision, type Run, type Setup, type Step as HostStep } from '../../lib/tools/host';
import { RECORDINGS, type Recording } from '../../lib/tools/turns';
import { ORDERS } from '../../lib/tools/server';
import { fact } from '../../lib/tools/facts';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, Ledger, Messages, Outcome, Play, Stepper, money, openMessage } from './kit';

const MODULE = 'tool-calling', ID = '06-when-tools-go-wrong';
const LANES = toolLanes();
const GATE = RECORDINGS['refund-gate'], INJ = RECORDINGS.injection;
const LIMITS = DOMAINS['refund-gate'].limit as (number | null)[];
type Scene = 'gate' | 'limit' | 'inject-off' | 'inject-on';
interface S { scene: Scene; decide: Decision | null; limit: number | null; shown: number; p1: number | null; quiz: number | null }

const REC: Record<Scene, Recording> = { gate: GATE, limit: GATE, 'inject-off': INJ, 'inject-on': INJ };
const setupOf = (s: S): Partial<Setup> =>
  s.scene === 'gate' ? { gate: true, decide: s.decide ?? undefined }
  : s.scene === 'limit' ? { gate: false, limit: s.limit }
  : s.scene === 'inject-off' ? { gate: false } : { gate: true, decide: s.decide ?? undefined };
// every reachable setup, run once (the domains are small)
const cache = new Map<string, { run: Run; msgs: Shown[] }>();
function result(s: S) {
  const key = `${s.scene}|${s.scene === 'limit' ? s.limit : s.decide}`;
  if (!cache.has(key)) { const r = run(REC[s.scene], setupOf(s)); cache.set(key, { run: r, msgs: transcript(REC[s.scene], r) }); }
  return cache.get(key)!;
}
const msgs = (s: S) => result(s).msgs;
/** the order a request is about, as the employee names it */
const orderIn = (r: Recording) => Number(r.ask.match(/\d{4}/)![0]);
const done = (s: S) => s.shown >= msgs(s).length;
const of = <K extends HostStep['kind']>(r: Run, kind: K) => r.steps.filter((x): x is Extract<HostStep, { kind: K }> => x.kind === kind);
const answer = (r: Run) => of(r, 'answer')[0]?.text ?? '';
const refundOf = (r: Run) => of(r, 'result').find(x => x.call.name === 'issue_refund');

const base: S = { scene: 'gate', decide: null, limit: null, shown: 0, p1: null, quiz: null };
/** messages up to and including the one that waits at the gate: where a decision picks the run up */
const waitAt = (scene: Scene) => msgs({ ...base, scene }).length;
const GATE_CALL = of(run(GATE, { gate: true }), 'gate')[0].call;
const LIMIT_OF = (l: number | null) => l === null ? 'No limit' : `Up to ${money(l)}`;
const LIMIT_REFUSAL = refundOf(run(GATE, { limit: LIMITS.at(-1) }))!.result.content[0].text;
const NOTE_ORDER = ORDERS.find(o => o.injected)!;
const PLANTED = of(run(INJ, { gate: false }), 'proposal').find(p => p.call.name === 'issue_refund')!.call;

const P1 = {
  question: `Order ${NOTE_ORDER.id}’s note asks for a refund. The model reads the note in the lookup result. What can happen next, with the gate off?`,
  options: [
    'Nothing: models ignore text inside tool results',
    'The model can follow the note and propose the refund, and the host runs it',
    'The order system strips notes like this before the model sees them',
  ],
};
// read off the recorded run: did the planted refund run?
const OUT1 = of(run(INJ, { gate: false }), 'call').some(c => c.call.name === 'issue_refund') ? 1 : 0;

const QUIZ = {
  question: `What protected Larkspur from the note on order ${NOTE_ORDER.id}?`,
  options: [
    'The model noticed the trick and refused',
    'The host’s gate and the tool’s limit: rules outside the model that hold whatever it proposes',
    'MCP blocks instructions found inside tool results',
    'Nothing could have: once the model reads the note, the money is gone',
  ],
  correct: 1,
  explanation: 'A model can follow instructions planted in the data it reads. Rules the model cannot change, a person at the gate and a narrow permission, protect you whether it does or not.',
  why: [
    `With the gate off it did not refuse: it proposed ${callText(PLANTED)}, and the ledger showed the damage.`,
    'Right. The gate and the refund limit sit in your software, so they work whatever the model was persuaded to do.',
    'The note reached the model as an ordinary tool result. Protection has to come from the host and the tools.',
    `The gate stopped the same call before it ran, and a refund limit below ${money(PLANTED.arguments.amount as number)} refuses it too.`,
  ],
};

const decided = (s: S) => s.decide !== null && done(s);
export const STEPS: Step<S>[] = [
  {
    id: 'gate-on', focus: 'play', visibleControls: ['play'],
    narration: `“${GATE.ask}” This time the host has an approval gate: any call to a tool that changes data waits for a person. ${fact('mcp-human').claim} Run the request.`,
    predicate: s => s.scene === 'gate' && s.decide === null && done(s),
    hint: 'Press “Run the request”, then “Next message” until a call waits for approval.',
  },
  {
    id: 'decide', focus: 'decide', visibleControls: ['decide', 'play'],
    narration: `The ${GATE_CALL.name} call waits, stamped WAITING. Nothing has moved yet. You are the person at the gate: approve it or deny it, then step through what happens.`,
    predicate: s => s.scene === 'gate' && decided(s),
    hint: 'Press Approve or Deny, then “Next message” until the answer arrives.',
  },
  {
    id: 'limit', focus: 'limit', visibleControls: ['said', 'limit'], opensDrawer: null,
    setup: s => ({ ...s, scene: 'limit', limit: LIMITS[0], shown: msgs({ ...s, scene: 'limit', limit: LIMITS[0] }).length }),
    narration: `Either way, a person decided. Now the team turns the gate off, as busy teams do, and narrows ${GATE_CALL.name} instead: give it a refund limit. Step the limit down until the tool refuses this refund.`,
    predicate: s => s.scene === 'limit' && !!refundOf(result(s).run)?.result.isError,
    hint: 'Press “Lower” until the limit is below the refund’s amount.',
  },
  {
    id: 'refused', focus: 'next', visibleControls: ['next'],
    narration: `Refused, stamped REFUSED and marked isError: “${LIMIT_REFUSAL}” The model read the error and told the employee. Least privilege: a tool can only do as much harm as its permission allows.`,
    predicate: s => s.scene === 'inject-off',
  },
  {
    id: 'predict-injection', focus: 'p1', visibleControls: ['p1'],
    narration: `A different request: “${INJ.ask}” No refund limit this time, and the gate is still off. This customer left a note on the order. Read it:`,
    predicate: s => s.p1 !== null,
  },
  {
    id: 'run-injection', focus: 'play', visibleControls: ['p1', 'play'],
    narration: 'Run the request and watch the ledger under the picture.',
    predicate: s => s.scene === 'inject-off' && done(s),
    hint: 'Press “Run the request”, then “Next message” until the answer arrives.',
  },
  {
    id: 'gate-back', focus: 'gate', visibleControls: ['out1', 'gate', 'play'], opensDrawer: 'messages',
    narration: `The model read the note as an instruction and proposed ${callText(PLANTED)}. Nothing stopped it, and the ledger shows the damage. A model can follow text planted in what it reads. It will not always, but you cannot count on it not to. Turn the approval gate back on and run the request again.`,
    predicate: s => s.scene === 'inject-on' && s.decide === null && done(s),
    hint: 'Tick the approval gate, then press “Run the request” and “Next message” until a call waits.',
  },
  {
    id: 'inject-decide', focus: 'decide', visibleControls: ['decide', 'play', 'approved'],
    narration: `Same note, same proposal, but now it waits at the gate and the ledger has not changed. The gate holds every tool not marked read-only, and that mark comes from the server: ${fact('mcp-untrusted-annotations').claim} You are the person at the gate. Read the call, decide, and step through what happens.`,
    predicate: s => s.scene === 'inject-on' && s.decide === 'deny' && done(s),
    hint: `Nobody asked for ${money(PLANTED.arguments.amount as number)}. Deny the call, then press “Next message” until the answer arrives.`,
  },
  {
    id: 'quiz', focus: 'quiz', visibleControls: ['quiz'],
    narration: `Denied: no money moved, and the assistant said “${answer(result({ ...base, scene: 'inject-on', decide: 'deny' }).run)}” One question to finish.`,
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which parts worked no matter what the model was persuaded to do?',
  },
];

export default function WhenToolsGoWrong() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={base}
      next={nextOf(MODULE, ID)}
      stage={({ state, inspect }) => (
        <div className="tc-stage">
          <div className="tc-frame"><FlatStage lanes={LANES} msgs={msgs(state)} upTo={state.shown} onPick={openMessage(inspect)} /></div>
          {/* the ledger follows the messages shown: a refund only lands once its result is on screen */}
          <Ledger after={done(state) ? result(state).run.orders : ORDERS} ids={[orderIn(REC[state.scene])]} />
        </div>
      )}
      controls={{
        next: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, scene: 'inject-off', decide: null, limit: null, shown: 0 })}>Next request →</button>
        ),
        play: ({ state, sync }) => <Play shown={state.shown} total={msgs(state).length} onStep={n => sync({ ...state, shown: n })} />,
        decide: ({ state, sync }) => {
          if (state.shown < waitAt(state.scene)) return null;
          const pick = (d: Decision) => sync({ ...state, decide: d, shown: waitAt(state.scene) });
          return (
            <div className="opts" role="group" aria-label={`Approval gate: ${callText(of(result(state).run, 'gate')[0].call)}`}>
              <button type="button" className="chip" aria-pressed={state.decide === 'approve'} onClick={() => pick('approve')}>Approve</button>
              <button type="button" className="chip" aria-pressed={state.decide === 'deny'} onClick={() => pick('deny')}>Deny</button>
            </div>
          );
        },
        said: ({ state }) => {
          const r = result({ ...state, scene: 'gate' }).run;
          return <p className="tc-status">{state.decide === 'deny' ? 'You denied it' : 'You approved it'}, and the assistant said: “{answer(r)}”<br />Now: {state.limit === null ? 'no limit, so the refund runs' : refundOf(result(state).run)?.result.isError ? 'the limit refuses it' : 'the refund fits under the limit, so it runs'}.</p>;
        },
        limit: ({ state, sync }) => (
          <Stepper label={`Refund limit for ${GATE_CALL.name}`} values={LIMITS} value={state.limit} show={LIMIT_OF}
            down="− Lower" up="+ Raise" onChange={l => sync({ ...state, limit: l, shown: msgs({ ...state, limit: l }).length })} />
        ),
        p1: ({ state, apply }) => (
          <>
            {/* the planted note, as plain text: React escapes it, nothing in it becomes markup */}
            <blockquote className="tc-quote" data-note>{NOTE_ORDER.note}</blockquote>
            <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />
          </>
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUT1} />,
        gate: ({ state, sync }) => (
          <label className="tc-check">
            <input type="checkbox" checked={state.scene === 'inject-on'}
              onChange={e => sync({ ...state, scene: e.target.checked ? 'inject-on' : 'inject-off', decide: null, shown: 0 })} />
            <span>Approval gate: calls that change data wait for a person</span>
          </label>
        ),
        approved: ({ state }) => state.decide === 'approve' && done(state)
          ? <p className="hint" role="status">You approved it, and {money(PLANTED.arguments.amount as number)} left the business: see the ledger. A gate only protects you if the person reads the call. Nobody asked for this refund. Deny it instead.</p>
          : null,
        quiz: ({ state, apply, sync }) => (
          <Quiz {...QUIZ} unsure value={state.quiz} onAnswer={(_, q) => apply({ ...state, quiz: q })} onUnsure={() => sync({ ...state, quiz: UNSURE })} />
        ),
      }}
      inspectPanel="messages"
      panels={{
        messages: { title: 'Messages', render: s => <><Messages lanes={LANES} msgs={msgs(s)} upTo={s.shown} /><Fact id="mcp-human" /></> },
      }}
    />
  );
}
