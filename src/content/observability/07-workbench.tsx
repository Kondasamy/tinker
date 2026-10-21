// Chapter 7: the workbench (R12.7). Day 2's thumbs-down queue: a select per trace for its failure mode, and a select for
// the fix to ship. Under them, a row per trace (right or not, and why), the reader's tally by count × harm, and the
// headline: the harm the chosen fix removes against the best possible. A policy works when every label is right and the
// fix is one of the modes tied for the most harm removed (WINNERS); "Show me" gives one, labelled one of N.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { puzzle, Verdict } from '../../components/quiz/Puzzle';
import { DAY2, MODE_IDS, traceOf, type ModeId } from '../../lib/observability/traces';
import { TOP } from '../../lib/observability/coding';
import { EMPTY, WINNERS, rowsOf, scoreOf, solution, solved, type Policy } from '../../lib/observability/workbench';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { Fact, MODE_SHORT, MODULE, ObsStage, binsOf, modeName, wallOf, type View } from './kit';

const ID = '07-workbench';
export const P1 = {
  question: `Yesterday’s fix targeted “${modeName(TOP[0])}”. What do you expect to lead today’s queue?`,
  options: [`“${modeName(TOP[0])}” again`, 'Something else: the fix changed what fails', 'Nothing: the queue will be empty'],
};
export const OUT1 = DAY2.length === 0 ? 2 : WINNERS.includes(TOP[0]) ? 0 : 1;

const QUIZ = {
  question: 'A team’s dashboard shows one chart: “errors per day”, which fell after last week’s fix. Is their error analysis done?',
  options: [
    'Yes: errors are down',
    'No: read today’s failed traces, label them and count again; what matters most may have changed',
    'Only if the chart reaches zero',
  ],
  correct: 1,
  explanation: 'Error analysis is a loop: read, label, count, fix, and read again.',
  why: [
    'A falling total can hide a new failure that does more harm.',
    'Right. A fix changes what fails. Today’s traces, labelled and counted, show what to fix next.',
    'No assistant reaches zero; the question is always which failure to fix next.',
  ],
};

interface S extends Policy { opened: boolean; p1: number | null; view: View; quiz: number | null }
const policyOf = (s: S): Policy => ({ labels: s.labels, fix: s.fix });

export const STEPS: Step<S>[] = [
  {
    id: 'open', focus: 'open', visibleControls: ['open'],
    narration: `The fix shipped, and its eval cases joined the suite. A new day brings a new queue: the ${DAY2.length} traces customers marked with a thumbs-down. Open it.`,
    predicate: s => s.opened,
    hint: 'Press the open button.',
  },
  {
    id: 'predict', focus: 'p1', visibleControls: ['p1'],
    narration: 'Before you read today’s traces:',
    predicate: s => s.p1 !== null,
  },
  puzzle<S>({
    id: 'triage', focus: 'bench', visibleControls: ['out1', 'bench'],
    narration: 'Label each trace with its failure mode, then choose the one fix to ship this week. The rows say whether each label is right; the tally counts your labels by count × harm; the headline shows the harm your fix removes, out of the most any fix could.',
    broken: s => ({ ...s, ...EMPTY }),
    verdict: s => solved(policyOf(s)),
    solution: s => ({ ...s, ...solution() }),
    hint: 'Label by the first failure, as in chapter 2. Then weigh count and harm, as in chapter 5.',
  }),
  {
    id: 'quiz', focus: 'quiz', visibleControls: ['readout', 'facts', 'quiz'],
    narration: `${WINNERS.length > 1 ? `${WINNERS.map(modeName).join(' and ')} tie for the most harm today, so either is a sound fix.` : `${modeName(WINNERS[0])} does the most harm today.`} Yesterday’s leader has almost left the queue. The traces are hand-written for this module, so the numbers show the method, not a real day. One question to finish.`,
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What changed between yesterday and today?',
  },
];

function Readout({ s, verdict }: { s: S; verdict?: boolean }) {
  const p = policyOf(s), sc = scoreOf(p), rows = rowsOf(p);
  return (
    <div role="status" data-sorted={sc.sorted} data-solved={solved(p) ? '1' : '0'}>
      <p className="ob-headline">
        <strong>{sc.removed} of {sc.best}</strong> harm removed by the fix{verdict && <> <Verdict fixed={solved(p)} /></>}
      </p>
      <p className="tc-status">
        {sc.sorted} of {sc.of} traces labelled right{s.fix ? ` · fix: ${modeName(s.fix)}` : ' · no fix chosen'}.
        {verdict && solved(p) && WINNERS.length > 1 && ` This plan is one of ${WINNERS.length} that work.`}
      </p>
      <div className="ob-hscroll">
        <table className="tc-ledger">
          <caption>Today’s queue</caption>
          <thead><tr><th scope="col">Trace</th><th scope="col">Your label</th><th scope="col">Check</th></tr></thead>
          <tbody>{rows.map(r => (
            <tr key={r.trace.id} data-trace={r.trace.id} data-right={r.right ? 1 : 0}>
              <th scope="row">{r.trace.customer}: “{r.trace.question}”</th><td>{r.label ? modeName(r.label) : '—'}</td><td>{r.reason}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <table className="tc-ledger">
        <caption>Your tally, by count × harm</caption>
        <thead><tr><th scope="col">Mode</th><th scope="col">Count</th><th scope="col">Harm</th><th scope="col">Count × harm</th></tr></thead>
        <tbody>{sc.tally.map(r => <tr key={r.mode}><th scope="row">{modeName(r.mode)}</th><td>{r.count}</td><td>{r.harm}</td><td>{r.score}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

export default function Workbench() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ...EMPTY, opened: false, p1: null, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync }) => {
        const tally = Object.fromEntries(scoreOf(policyOf(state)).tally.map(r => [r.mode, r.count])) as Record<ModeId, number>;
        const last = DAY2.filter(t => state.labels[t.id]).at(-1) ?? null;
        return (
          <ObsStage room={{ cards: state.opened ? wallOf(DAY2, last?.id) : [], bins: binsOf(tally, state.fix), board: state.fix ? `SHIP: ${MODE_SHORT[state.fix]}` : `QUEUE ${state.opened ? DAY2.length : 0}` }}
            trace={last ? traceOf(last.id) : null} view={state.view} onView={view => sync({ ...state, view })}
            caption={<><span className="lbl">Your bins, front left to right</span><span>{MODE_IDS.map(m => `${modeName(m)}: ${tally[m]}`).join(' · ')}</span></>} />
        );
      }}
      controls={{
        open: ({ state, apply }) => <button type="button" className="big" onClick={() => apply({ ...state, opened: true })}>Open today’s queue</button>,
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUT1} />,
        // a label is never a failed try (the plan is only right once all are set), so labels sync; the fix is the attempt
        bench: ({ state, apply, sync }) => (
          <div className="tc-bench">
            <fieldset className="tc-pick">
              <legend>Label each trace</legend>
              {DAY2.map((t, i) => (
                <label key={t.id} className="ob-field">
                  <span><b>{i + 1}.</b> {t.customer}: “{t.question}” Reply: “{t.spans.find(s => s.kind === 'reply')!.detail}”</span>
                  <select value={state.labels[t.id] ?? ''} aria-label={`Mode for trace ${i + 1}`} onChange={e => sync({ ...state, labels: { ...state.labels, [t.id]: e.target.value as ModeId | '' } })}>
                    <option value="">Choose a mode…</option>
                    {MODE_IDS.map(m => <option key={m} value={m}>{modeName(m)}</option>)}
                  </select>
                </label>
              ))}
            </fieldset>
            <label className="ob-field">
              <span className="lbl">Fix to ship</span>
              <select value={state.fix} aria-label="Fix to ship" onChange={e => apply({ ...state, fix: e.target.value as ModeId | '' })}>
                <option value="">Choose a fix…</option>
                {MODE_IDS.map(m => <option key={m} value={m}>{modeName(m)}</option>)}
              </select>
            </label>
            <Readout s={state} verdict />
          </div>
        ),
        readout: ({ state }) => <Readout s={state} />,
        facts: () => <><Fact id="saturation" /><Fact id="error-analysis" /></>,
        quiz: ({ state, apply, sync }) => (
          <Quiz {...QUIZ} unsure value={state.quiz} onAnswer={(_, q) => apply({ ...state, quiz: q })} onUnsure={() => sync({ ...state, quiz: UNSURE })} />
        ),
      }}
    />
  );
}
