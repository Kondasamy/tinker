// Chapter 7: Larkspur's training run, the workbench. The reader picks a data mix (one of the recorded runs) and a step
// to stop at; the plan scores that run's held-out loss there, read off its recorded curve. The result table has a row per
// mix at the chosen step, each saying why it scores what it does. The puzzle accepts every plan tied for the best
// (WINNERS); Show me applies one of them. The plan and the tab are step state, so a reload keeps the bench as it was.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { LAST, RUN_IDS, passes, runOf, type RunId } from '../../lib/pre-training/engine';
import { BEST, MIX_LABEL, STOPS, WINNERS, rows, scoreOf, solved, type Plan } from '../../lib/pre-training/workbench';
import { fact } from '../../lib/pre-training/facts';
import { FORGE_PARTS } from '../../components/scenes/forgeScene';
import { loss } from '../../components/scenes/lossChart';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, PreTrainingStage, StepRange, ToyNote, runSeries, type View } from './kit';

const MODULE = 'pre-training',
  ID = '07-larkspurs-run';
/** where the bench starts: half the documents, run to the end */
export const START: Plan = { mix: 'half', stop: STOPS.at(-1)! };
/** the plan in a run's state; an unknown mix or step from a saved run falls back to START's */
export const planOf = (s: Partial<Plan>): Plan => ({
  mix: RUN_IDS.includes(s.mix as RunId) ? (s.mix as RunId) : START.mix,
  stop: STOPS.includes(s.stop as number) ? (s.stop as number) : START.stop,
});
const HALF_MIN = runOf('half').heldoutMin.step;

export interface S extends Plan {
  view: View;
  quiz: number | null;
}

export const QUIZ = {
  question:
    'A team training on a small data set sees held-out loss bottom out at step 4,000 of a planned 20,000, then creep up while training loss keeps falling. What should they do?',
  options: [
    'Keep the step-4,000 checkpoint, and look for more data before the next run',
    'Train all 20,000 steps: training loss is still improving',
    'Restart with a bigger model on the same data',
    'Ship the last checkpoint, since it saw the data the most times',
  ],
  correct: 0,
  explanation:
    'Stop where held-out loss is lowest, since that checkpoint does best on unseen text, and more data moves that point later and lower.',
  why: [
    'Right: early stopping keeps the best checkpoint for unseen text, and more data is what lets training go further.',
    'Training loss falling while held-out rises is memorising, which helps nothing outside the training set.',
    'A bigger model has even more room to memorise the same small data set.',
    'Seeing the same data more times is exactly what made it memorise; the held-out score is what counts.',
  ],
};

/** the foundry's parts a callout can point at (the Loss tab takes none) */
export const PARTS = FORGE_PARTS;

export const STEPS: Step<S>[] = [
  {
    id: 'plan',
    focus: 'plan',
    visibleControls: ['score', 'plan'],
    narration: 'Each mix is a real recorded run. Its score is held-out loss at your stopping step: lower wins.',
    act: 'Find the best plan.',
    say: { block: 'crates', text: 'Pick the data' },
    predicate: s => solved(planOf(s)),
    hint: 'Read each row’s reason. Which mix does best on unseen text, and where does its curve stop falling?',
    solution: s => ({ ...s, ...WINNERS[0], view: 'chart' }),
  },
  {
    id: 'ties',
    focus: 'quiz',
    visibleControls: ['score', 'plan', 'fact', 'quiz'],
    narration: `${loss(BEST)} wins, one of ${WINNERS.length} that work. Half the data peaks at step ${HALF_MIN}. Early stopping helps; more data helps more.`,
    act: 'One question to finish.',
    say: { block: 'shelf', text: 'Keep this one' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which score says how a checkpoint does on text it never saw?',
  },
];

/** The headline number, then a row per mix at the chosen step, each with its reason. */
function Score({ s }: { s: S }) {
  const p = planOf(s),
    best = solved(p);
  return (
    <div role="status" data-score={scoreOf(p)} data-best={best ? '1' : '0'}>
      <p className="ft-headline">
        <strong>{loss(scoreOf(p))}</strong> held-out loss{' '}
        <span className={`stamp ${best ? 'correct' : 'neutral'}`}>{best ? 'BEST' : `BEST IS ${loss(BEST)}`}</span>
      </p>
      {best && <p className="tc-status">{`One of ${WINNERS.length} plans that work.`}</p>}
      <table className="tc-ledger" style={{ marginTop: 10 }}>
        <caption>Every mix stopped at step {p.stop} (recorded runs, lower is better)</caption>
        <thead>
          <tr>
            <th scope="col">Data mix</th>
            <th scope="col">Held-out loss</th>
          </tr>
        </thead>
        <tbody>
          {rows(p).map(r => (
            <tr key={r.mix} data-mix={r.mix} data-chosen={r.chosen ? '1' : '0'}>
              <th scope="row">
                {r.chosen ? <strong>{r.label} (yours)</strong> : r.label}
                <span className="note">{r.why}</span>
              </th>
              <td>{loss(r.heldout)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function LarkspursRun() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ...START, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const p = planOf(state);
        return (
          <PreTrainingStage
            view={state.view}
            onView={view => sync({ ...state, view })}
            say={say}
            show={() => ({
              scene: { steps: STOPS, step: p.stop, mix: p.mix },
              chart: { series: runSeries(p.mix) },
              caption: `${MIX_LABEL[p.mix]}, stopped at step ${p.stop}: held-out loss ${loss(scoreOf(p))}.`,
            })}
          />
        );
      }}
      controls={{
        score: ({ state }) => <Score s={state} />,
        // changing the plan is an attempt only while it is the puzzle
        plan: ({ state, apply, sync, focused }) => {
          const set = focused ? apply : sync,
            p = planOf(state);
          return (
            <div className="tc-bench">
              <fieldset className="tc-pick">
                <legend>Data mix</legend>
                <div className="ft-row">
                  {RUN_IDS.map(m => (
                    <button
                      key={m}
                      type="button"
                      className="chip"
                      aria-pressed={p.mix === m}
                      onClick={() => set({ ...state, ...p, mix: m })}
                    >
                      {MIX_LABEL[m]}
                    </button>
                  ))}
                </div>
              </fieldset>
              <StepRange
                id="pt-stop"
                steps={STOPS}
                value={p.stop}
                label="Stop at"
                valueText={st => `step ${st}: held-out loss ${loss(scoreOf({ ...p, stop: st }))}`}
                onChange={stop => set({ ...state, ...p, stop })}
              />
            </div>
          );
        },
        fact: () => (
          <>
            <Fact id="repeat-passes" />
            <p className="note">{`In ${LAST.toLocaleString('en-US')} steps Larkspur mini read all its documents about ${passes('clean')} times over, and half of them about ${passes('half')} times: far beyond the ${fact('repeat-passes').value} that study found almost as good as fresh text.`}</p>
            <ToyNote />
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
