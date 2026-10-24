// Chapter 7: the workbench. A step count and a guidance scale for each use (a native select each). Under it, a row per
// use with its test pictures passed and its cost; a live total against the best. The puzzle accepts every plan tied for
// the best (WINNERS); Show me applies one of them. Results come from the precomputed measurements (workbench.ts); the
// stage draws the shown use's three parts live, one per animation frame.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { LABELS, nearest } from '../../lib/diffusion/drawings';
import { GUIDANCE, sampleDrawing, type Guidance } from '../../lib/diffusion/ideal';
import { STEPS as COUNTS, type Steps } from '../../lib/diffusion/schedule';
import {
  BEST_COST,
  SEEDS,
  USES,
  USE_IDS,
  WINNERS,
  costOf,
  perPicture,
  resultOf,
  solved,
  type Choice,
  type Plan,
  type UseId,
} from '../../lib/diffusion/workbench';
import { DARKROOM_PARTS } from '../../components/scenes/darkroomScene';
import { DiffusionStage, ToyNote, printWords, two, useJobs } from './kit';

const MODULE = 'diffusion',
  ID = '07-workbench';
export const PARTS = DARKROOM_PARTS;
/** “The most of everything, to be safe”: where the meeting started */
export const START = Object.fromEntries(USE_IDS.map(u => [u, { steps: 50, scale: 4 }])) as Plan;
const ok = (c: Partial<Choice> | undefined): c is Choice =>
  !!c && COUNTS.includes(c.steps as Steps) && GUIDANCE.includes(c.scale as Guidance);
/** the plan in a run's state; a missing or unknown choice falls back to START's */
export const planOf = (p: Partial<Plan> | undefined): Plan =>
  Object.fromEntries(USE_IDS.map(u => [u, ok(p?.[u]) ? p![u] : START[u]])) as Plan;

export interface S {
  plan: Plan;
  show: UseId;
  quiz: number | null;
}

export const QUIZ = {
  question:
    'A team makes every picture, icons and posters alike, with the most steps and guidance. What does the workbench say?',
  options: [
    'Test each use, and keep the cheapest setting that passes it',
    'Keep it: every picture passes',
    'Use the fewest steps everywhere: it is cheapest',
  ],
  correct: 0,
  explanation: 'Each use has its own bar, so each gets the cheapest setting that clears it.',
  why: [
    'Right: an icon can pass at a fraction of a poster’s cost, so each use gets its own measured setting.',
    'Passing isn’t the same as best: a setting that passes at twice the cost is worse.',
    'Fewest steps everywhere fails the uses that need a clean picture.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'plan',
    focus: 'plan',
    visibleControls: ['score', 'plan'],
    narration: `Proposed: ${START.catalogue.steps} steps at scale ${START.catalogue.scale} for both. The best plan passes both bars for ${BEST_COST} predictions in all.`,
    act: 'Change the plan on the workbench.',
    say: { block: 'dial', text: 'Safe, but costly' },
    predicate: s => solved(planOf(s.plan)),
    hint: 'Take each use alone: chapter 2 showed what fewer steps cost, chapter 5 what guidance buys.',
    solution: s => ({ ...s, plan: WINNERS[0] }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['score', 'plan', 'quiz'],
    narration:
      'A thumbnail may be rough but must show the right part; a catalogue image must be clean, and costs more.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'With every use passing, what decides between two plans?',
  },
];

function Score({ s }: { s: S }) {
  const p = planOf(s.plan),
    best = solved(p),
    cost = costOf(p);
  return (
    <div role="status" data-cost={cost} data-best={best ? '1' : '0'}>
      <p className="df-headline">
        <strong>
          {USE_IDS.filter(u => resultOf(u, p[u]).ok).length} of {USE_IDS.length}
        </strong>{' '}
        uses pass · {cost} predictions
        <span className={`stamp ${best ? 'correct' : 'neutral'}`}>{best ? 'BEST' : `BEST IS ${BEST_COST}`}</span>
      </p>
      {best && <p className="df-note">One of {WINNERS.length} that work.</p>}
      <table className="tc-ledger" style={{ marginTop: 10 }}>
        <caption>
          Your plan, use by use ({LABELS.length} parts × {SEEDS.length} seeds each)
        </caption>
        <thead>
          <tr>
            <th scope="col">Use</th>
            <th scope="col">Pictures passing</th>
            <th scope="col">Predictions a picture</th>
          </tr>
        </thead>
        <tbody>
          {USES.map(u => {
            const r = resultOf(u.id, p[u.id]);
            return (
              <tr key={u.id} data-use={u.id} data-ok={r.ok ? '1' : '0'}>
                <th scope="row">
                  {u.label}: {p[u.id].steps} steps, scale {p[u.id].scale}
                  <span className="df-why">
                    Bar: roughness ≤ {two(u.bar)}. {u.reason}
                  </span>
                </th>
                <td>
                  {r.right} of {r.of}
                  {r.of - r.part > 0 && ` · ${r.of - r.part} wrong part`}
                  {r.rough > 0 && ` · ${r.rough} too rough`}
                </td>
                <td>{r.cost}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <ToyNote />
    </div>
  );
}

function Stage({ state, say }: { state: S; say?: Step<S>['say'] }) {
  const p = planOf(state.plan),
    show = USE_IDS.includes(state.show) ? state.show : USE_IDS[0],
    c = p[show],
    use = USES.find(u => u.id === show)!;
  const xs = useJobs(
    LABELS.map(l => ({ key: `7:${c.steps}:${c.scale}:${l}`, run: () => sampleDrawing(c.steps, SEEDS[0], l, c.scale) })),
  );
  const ready = xs.every(Boolean);
  const drill = xs[LABELS.indexOf('drill')];
  return (
    <DiffusionStage
      say={say}
      shown={{
        print: drill ? { kind: 'pixels', px: drill, name: nearest(drill).drawing.label.toUpperCase() } : undefined,
        steps: c.steps,
        label: 'drill',
        guidance: c.scale,
        frames: ready
          ? xs.map((x, i) => ({
              print: { kind: 'pixels', px: x!, name: '' },
              pill: nearest(x!).drawing.label.toUpperCase(),
              words: `Asked for a ${LABELS[i]}: ${printWords(x!)}`,
            }))
          : undefined,
        stripLabel: `${use.label}: one seed, each part asked for`,
        caption: `${use.label}: ${c.steps} steps at scale ${c.scale}, ${perPicture(c)} predictions a picture. Plan total: ${costOf(p)}.`,
        stamp: solved(p) ? 'APPROVED' : undefined,
      }}
    />
  );
}

export default function Workbench() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ plan: START, show: 'catalogue', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => <Stage state={state} say={say} />}
      controls={{
        score: ({ state }) => <Score s={state} />,
        // changing the plan is an attempt only while it is the puzzle
        plan: ({ state, apply, sync, focused }) => {
          const set = focused ? apply : sync,
            p = planOf(state.plan);
          const change = (u: UseId, c: Partial<Choice>) =>
            set({ ...state, show: u, plan: { ...p, [u]: { ...p[u], ...c } } });
          return (
            <div className="df-bench">
              {USES.map(u => (
                <fieldset key={u.id} data-use={u.id}>
                  <legend>{u.label}</legend>
                  <label>
                    Steps{' '}
                    <select
                      value={p[u.id].steps}
                      onChange={e => change(u.id, { steps: Number(e.currentTarget.value) as Steps })}
                    >
                      {COUNTS.map(n => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </label>{' '}
                  <label>
                    Guidance{' '}
                    <select
                      value={p[u.id].scale}
                      onChange={e => change(u.id, { scale: Number(e.currentTarget.value) as Guidance })}
                    >
                      {GUIDANCE.map(g => (
                        <option key={g} value={g}>
                          scale {g}
                        </option>
                      ))}
                    </select>
                  </label>
                </fieldset>
              ))}
            </div>
          );
        },
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
