// Chapter 7: plan the release, the workbench. The reader sets the canary's share, the bake time, a flag and the check's
// threshold; the simulator runs all four of next week's changes and the owner's rule is checked. The puzzle accepts
// every plan that meets the rule and reaches everyone soonest (WINNERS, pinned and recomputed in a test).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { clock, pct } from '../../lib/releases/sim';
import {
  BAKES,
  BENCH_CHANGES,
  BEST,
  CANARIES,
  GOOD,
  HURT_LIMIT,
  MIDDLE,
  REASONS,
  RULE,
  START,
  THRESHOLDS,
  WINNERS,
  benchOf,
  benchRun,
  hurtOf,
  meets,
  minutesOf,
  wins,
  type Bench,
} from '../../lib/releases/workbench';
import { SIGNAL_PARTS } from '../../components/scenes/signalScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, Pick, ReleasesStage, SimNote, type View } from './kit';

const MODULE = 'releases',
  ID = '07-release-plan';
export const PARTS = SIGNAL_PARTS;
const checkText = (v: number) => (v === 0 ? 'no check' : `rings at ${pct(v)} worse`);

export const QUIZ = {
  question: 'Why does a feature flag help a release plan, even with a good canary check?',
  options: [
    'Its way back takes a minute, so fewer customers meet a bad change',
    'It makes the canary bigger',
    'It stops bugs before the pipeline',
  ],
  correct: 0,
  explanation: 'Every minute of the way back is a minute of failed checkouts; a flag shortens it.',
  why: [
    'Right: the check rings just as fast, but the bad change is gone in a minute instead of several.',
    'The flag doesn’t change who is in the canary; the plan’s share does.',
    'A flag acts after the deploy; the pipeline runs before it.',
  ],
};

interface S extends Bench {
  t: number;
  shown: string;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'bench',
    focus: 'bench',
    visibleControls: ['score', 'bench'],
    narration: `The workbench runs all four changes under your plan: the ${GOOD.short} and three with hidden bugs.`,
    act: 'Meet the owner’s rule, reaching everyone soonest.',
    say: { block: 'box', text: 'Your plan' },
    predicate: s => wins(benchOf(s)),
    hint: 'Without a check, every bug reaches everyone. A small canary on a short bake rings false alarms.',
    solution: s => ({ ...s, ...WINNERS[0] }),
  },
  {
    id: 'ties',
    focus: 'quiz',
    visibleControls: ['score', 'bench', 'quiz'],
    narration: `${BEST} minutes to everyone is the soonest; yours is one of ${WINNERS.length} plans that do it.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'How long does each way back take?',
  },
];

function Score({ s }: { s: S }) {
  const b = benchOf(s),
    best = wins(b),
    ok = meets(b),
    m = minutesOf(b);
  return (
    <div role="status" data-best={best ? '1' : '0'}>
      <p className="rl-headline">
        <strong>{hurtOf(b)}</strong>
        {' hurt '}
        <span className={`stamp ${best ? 'correct' : ok ? 'neutral' : 'wrong'}`}>
          {best ? 'BEST' : ok ? `SOONEST IS ${BEST} MIN` : 'RULE BROKEN'}
        </span>
      </p>
      <p className="note rl-note">{RULE}</p>
      <p className="note rl-note">
        {m === null
          ? `The ${GOOD.short} never reaches everyone.`
          : `The ${GOOD.short} reaches everyone in ${m} minutes.`}
      </p>
      {best && <p className="tc-status">{`One of ${WINNERS.length} plans that work.`}</p>}
    </div>
  );
}

function BenchControls({ s, set, show }: { s: S; set: (s: S) => void; show: (s: S) => void }) {
  const b = benchOf(s);
  return (
    <div className="tc-bench">
      <section className="rl-bench" aria-label="Release plan">
        <Pick
          id="rl-b-canary"
          name="Canary"
          value={b.canary}
          values={CANARIES}
          text={pct}
          onChange={canary => set({ ...s, canary })}
        />
        <p className="note rl-note">{REASONS.canary}</p>
        <Pick
          id="rl-b-bake"
          name="Bake time"
          value={b.bake}
          values={BAKES}
          text={v => `${v} minutes`}
          onChange={bake => set({ ...s, bake })}
        />
        <p className="note rl-note">{REASONS.bake}</p>
        <label className="rl-row">
          <input type="checkbox" checked={b.flag} onChange={e => set({ ...s, flag: e.target.checked })} /> Behind a flag
        </label>
        <p className="note rl-note">{REASONS.flag}</p>
        <Pick
          id="rl-b-check"
          name="Check"
          value={b.threshold}
          values={THRESHOLDS}
          text={checkText}
          onChange={threshold => set({ ...s, threshold })}
        />
        <p className="note rl-note">{REASONS.threshold}</p>
      </section>
      <table className="tc-ledger">
        <caption>{`Your plan: canary, then ${pct(MIDDLE)}, then everyone`}</caption>
        <thead>
          <tr>
            <th scope="col">Change</th>
            <th scope="col">Hurt</th>
            <th scope="col">Ended</th>
          </tr>
        </thead>
        <tbody>
          {BENCH_CHANGES.map(c => {
            const r = benchRun(b, c.id),
              good = c.id === GOOD.id,
              ok = good ? r.fullAt !== null : r.fullAt === null;
            return (
              <tr key={c.id} data-change={c.id} data-ok={ok ? 1 : 0}>
                <th scope="row">
                  <label>
                    <input
                      type="radio"
                      name="rl-shown"
                      checked={s.shown === c.id}
                      onChange={() => show({ ...s, shown: c.id })}
                    />{' '}
                    {c.name}
                  </label>
                </th>
                <td>{r.hurt}</td>
                <td className={ok ? 'ok' : 'bad'}>
                  {r.fullAt !== null
                    ? `everyone at ${clock(r.fullAt)}`
                    : r.backAt !== null
                      ? `rolled back at ${clock(r.backAt)}`
                      : 'never reached everyone'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="note rl-note">{`At most ${HURT_LIMIT} hurt in all. Pick a row to see it in the picture.`}</p>
      <Fact id="dora" />
      <SimNote />
    </div>
  );
}

export default function ReleasePlan() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ...START, t: 0, shown: BENCH_CHANGES[1].id, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const r = benchRun(benchOf(state), state.shown);
        return (
          <ReleasesStage
            run={r}
            t={state.t}
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            onTick={t => sync({ ...state, t })}
            caption={`${clock(state.t)}. The ${r.change.short} under your plan.`}
          />
        );
      }}
      controls={{
        score: ({ state }) => <Score s={state} />,
        // changing the bench is an attempt only while it is the puzzle
        bench: ({ state, apply, sync, focused }) => (
          <BenchControls s={state} set={focused ? apply : sync} show={sync} />
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
