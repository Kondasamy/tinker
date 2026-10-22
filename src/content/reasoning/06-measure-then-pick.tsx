// Chapter 6: measure, then pick. Each kind of question runs through Evals' release gate (decide, read-only) at every
// effort, against answering with no thinking; the lowest effort that ships is the pick. The Accuracy tab charts every kind
// run so far. The tab is step state, so a reload keeps it.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import {
  BASELINE,
  EFFORTS,
  GATE,
  KINDS,
  gateKind,
  kindOf,
  lowestPassing,
  ofKind,
  run,
  type KindId,
} from '../../lib/reasoning/engine';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { Fact, ReasoningStage, kindSeries, type View } from './kit';

const MODULE = 'reasoning',
  ID = '06-measure-then-pick';
const IDS = KINDS.map(k => k.id);

interface S {
  p1: number | null;
  gated: KindId[];
  view: View;
  quiz: number | null;
}

const P1 = {
  question: `Each kind of question runs through the gate at every effort. Which kind will need the highest effort to ship?`,
  options: KINDS.map(k => k.label),
};
/** the kind whose lowest passing effort is highest */
const outcome = () => {
  const rank = (k: KindId) => EFFORTS.indexOf(lowestPassing(k) ?? 'high');
  return IDS.reduce((best, k, i) => (rank(k) > rank(IDS[best]) ? i : best), 0);
};

const QUIZ = {
  question:
    'A new kind of request arrives: customers asking for a quote with a trade-in credit. What should the team do before choosing its effort?',
  options: [
    'Copy the multi-step setting: quotes are quotes',
    'Write test questions for it and run them through the gate at every effort',
    'Use high until someone complains',
  ],
  correct: 1,
  explanation: 'Each kind gets its own measured setting. A new kind means a new sweep.',
  why: [
    'A good first guess, but the trade-in step may need more, or less. The gate is what tells you.',
    'Right. A sweep through the gate finds the lowest effort that passes, and the no-regressions rule guards what already worked.',
    'High costs the most, waits the longest, and chapter 4 showed it can make answers worse.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['kinds', 'p1'],
    narration: `A release gate is the rule that decides, from a test run, whether a change ships; this is the one from the Evals module, unchanged. Here a kind of question ships at an effort if ${GATE.threshold}% or more of its answers pass and none that passed with no thinking (the baseline) now fails: a question that used to pass and now fails is a regression. Before you run it:`,
    predicate: s => s.p1 !== null,
  },
  {
    id: 'gate',
    focus: 'gate',
    visibleControls: ['p1', 'gate'],
    narration: 'Run each kind through the gate at every effort.',
    predicate: s => IDS.every(k => s.gated.includes(k)),
    hint: 'Press the button for each of the three kinds.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['picks', 'quiz'],
    narration: `${IDS.map(k => `${kindOf(k).short}: ${lowestPassing(k)}`).join('; ')}. Lookups need no thinking at all. Multi-step questions need medium; high costs more for no gain. The distractions pass at low, and the no-regressions rule holds high back: it breaks counts that no thinking got right. The right setting is the lowest effort that passes, kind by kind.`,
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What tells you a setting works for a kind of question?',
  },
];

export default function MeasureThenPick() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, gated: [], view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync }) => {
        const last = state.gated.at(-1),
          pick = last ? (lowestPassing(last) ?? 'high') : 'none';
        const qs = last ? ofKind(last).map(q => q.id) : [];
        const thinking = qs.reduce((n, q) => n + run(q, pick).thinkingTokens, 0),
          wait = qs.length ? qs.reduce((n, q) => n + run(q, pick).wait, 0) / qs.length : 0;
        return (
          <ReasoningStage
            view={state.view}
            onView={view => sync({ ...state, view })}
            shown={{
              desk: { effort: pick, thinking, wait, right: last ? true : undefined },
              series: state.gated.length ? kindSeries(IDS.filter(k => state.gated.includes(k))) : undefined,
              caption: last
                ? `${kindOf(last).label}: the gate ships ${pick}, the lowest effort that passes.`
                : 'The gate, ready: three kinds of question, four efforts.',
              thinking: last ? run(qs[0], pick).thinking : undefined,
              stamp: last ? 'APPROVED' : undefined,
            }}
          />
        );
      }}
      controls={{
        kinds: () => (
          <ul className="rs-qs">
            {KINDS.map(k => (
              <li key={k.id}>
                <strong>{k.label}</strong> ({ofKind(k.id).length}) <span className="note">{k.about}</span>
              </li>
            ))}
          </ul>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        gate: ({ state, sync }) => (
          <>
            <div className="rs-row">
              {KINDS.map(k => (
                <button
                  key={k.id}
                  type="button"
                  className="chip"
                  aria-pressed={state.gated.includes(k.id)}
                  onClick={() =>
                    sync({ ...state, gated: [...state.gated.filter(x => x !== k.id), k.id], view: 'chart' })
                  }
                >
                  Gate the {k.short.toLowerCase()}
                </button>
              ))}
            </div>
            {KINDS.filter(k => state.gated.includes(k.id)).map(k => (
              <table key={k.id} className="tc-ledger" style={{ marginTop: 10 }} data-kind={k.id}>
                <caption>
                  {k.label}, against {BASELINE}
                </caption>
                <tbody>
                  {EFFORTS.map(e => {
                    const d = gateKind(k.id, e);
                    return (
                      <tr key={e} data-effort={e} data-ship={d.ship ? '1' : '0'}>
                        <th scope="row">{e}</th>
                        <td>
                          {d.ship ? 'ships' : 'held'}
                          <span className="rs-why">{d.reason}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ))}
          </>
        ),
        picks: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcome()} />
            <Fact id="measure-effort" />
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
    />
  );
}
