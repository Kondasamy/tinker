// Chapter 7: plan Larkspur's backups, the workbench. The reader sets how often, full or incremental, and where copies
// go; the simulator runs the week against a dead disk, a fire and ransomware, and Mira's rule is checked. The puzzle
// accepts every plan that meets the rule at the lowest cost (WINNERS, pinned and recomputed in a test). The strike bar
// replays any of the three on the picture.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Select from '../../components/story/Select';
import { BENCH_STRIKES, KIND, clock, type Kind } from '../../lib/backups/sim';
import {
  BEST,
  EVERIES,
  MAX_DOWN,
  MAX_LOST,
  PLACE_NAME,
  PLACE_SETS,
  REASONS,
  RULE,
  START,
  WINNERS,
  benchOf,
  costOf,
  meets,
  resultsOf,
  weekFor,
  wins,
  type Bench,
  type Places,
} from '../../lib/backups/workbench';
import { money } from '../../lib/format';
import { SAFE_PARTS } from '../../components/scenes/safeScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { BackupsStage, Fact, SimNote, StrikeBar, type Struck } from './kit';

const MODULE = 'backups',
  ID = '07-workbench';
export const PARTS = SAFE_PARTS;
const PRESETS = Object.fromEntries(BENCH_STRIKES.map(s => [s.kind, s.hour])) as Record<Kind, number>;
const KINDS = BENCH_STRIKES.map(s => s.kind);
const EVERY_NAME: Record<number, string> = {
  24: 'Every night',
  12: 'Every 12 hours',
  6: 'Every 6 hours',
  1: 'Every hour',
};

export const QUIZ = {
  question: 'A shop must lose at most an hour of sales, and ransomware is its worst fear. Which plan fits?',
  options: [
    'Hourly copies, plus one locked away offline',
    'Hourly copies to a cloud folder that syncs',
    'Nightly copies to an offline drive',
  ],
  correct: 0,
  explanation: 'The schedule sets how much you lose; only an offline copy survives an attacker on the network.',
  why: [
    'Right: hourly copies cap the loss, and the offline one is the copy ransomware can’t reach.',
    'A syncing folder is online, so ransomware encrypts it with everything else.',
    'Offline survives, but nightly copies can lose a whole day of sales.',
  ],
};

interface S extends Bench, Struck {
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'bench',
    focus: 'bench',
    visibleControls: ['score', 'bench'],
    narration: 'The workbench runs the week against a dead disk, a fire and ransomware.',
    act: 'Meet Mira’s rule for the least money a week.',
    say: { block: 'lockbox', text: 'Which copies?' },
    predicate: s => wins(benchOf(s)),
    hint: 'Ransomware needs the lockbox and fire needs the warehouse; then make the tapes cheap.',
    solution: s => ({ ...s, ...WINNERS[0] }),
  },
  {
    id: 'cheap',
    focus: 'quiz',
    visibleControls: ['score', 'bench', 'fact', 'quiz'],
    narration: `${money(BEST)} a week is the least that meets the rule: short incremental chains, three places.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which copy can ransomware not reach, and what caps the loss?',
  },
];

function Score({ s }: { s: S }) {
  const b = benchOf(s),
    best = wins(b),
    ok = meets(b);
  return (
    <div data-cost={costOf(b)} data-best={best ? '1' : '0'}>
      <p className="bk-headline">
        <strong>{money(costOf(b))}</strong>
        {' a week '}
        <span className={`stamp ${best ? 'correct' : ok ? 'neutral' : 'wrong'}`}>
          {best ? 'BEST' : ok ? `LEAST IS ${money(BEST)}` : 'RULE BROKEN'}
        </span>
      </p>
      <p className="note bk-note">{RULE}</p>
    </div>
  );
}

function BenchControls({ s, set }: { s: S; set: (s: S) => void }) {
  const b = benchOf(s),
    rs = resultsOf(b);
  return (
    <div className="tc-bench">
      <section className="bk-bench" aria-label="Backup plan">
        <label className="bk-field">
          <span>How often</span>
          <Select value={b.every} onChange={e => set({ ...s, every: Number(e.target.value) })}>
            {EVERIES.map(e => (
              <option key={e} value={e}>
                {EVERY_NAME[e]}
              </option>
            ))}
          </Select>
        </label>
        <p className="note bk-note">{REASONS.every}</p>
        <label className="bk-field">
          <span>Copies</span>
          <Select
            value={b.incremental ? 'inc' : 'full'}
            onChange={e => set({ ...s, incremental: e.target.value === 'inc' })}
          >
            <option value="full">Full every time</option>
            <option value="inc">Incremental, one full a day</option>
          </Select>
        </label>
        <p className="note bk-note">{REASONS.kind}</p>
        <label className="bk-field">
          <span>Where</span>
          <Select value={b.places} onChange={e => set({ ...s, places: e.target.value as Places })}>
            {PLACE_SETS.map(p => (
              <option key={p} value={p}>
                {PLACE_NAME[p]}
              </option>
            ))}
          </Select>
        </label>
        <p className="note bk-note">{REASONS.places}</p>
      </section>
      <table className="tc-ledger">
        <caption>The week’s disasters</caption>
        <thead>
          <tr>
            <th scope="col">Disaster</th>
            <th scope="col">{`Lost (max ${MAX_LOST})`}</th>
            <th scope="col">{`Down (max ${MAX_DOWN} h)`}</th>
          </tr>
        </thead>
        <tbody>
          {rs.map(r => {
            const lostOk = r.down !== null && r.lost <= MAX_LOST,
              downOk = r.down !== null && r.down <= MAX_DOWN;
            return (
              <tr key={r.strike.kind} data-kind={r.strike.kind} data-ok={lostOk && downOk ? 1 : 0}>
                <th scope="row">{`${KIND[r.strike.kind].name}, ${clock(r.strike.hour)}`}</th>
                <td className={lostOk ? 'ok' : 'bad'}>{r.down === null ? 'every order' : String(r.lost)}</td>
                <td className={downOk ? 'ok' : 'bad'}>{r.down === null ? 'no restore' : `${r.down} h`}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <SimNote />
    </div>
  );
}

export default function Workbench() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ...START, hour: PRESETS.fire, kind: 'fire', struck: true, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => (
        <BackupsStage
          week={weekFor(benchOf(state))}
          s={state}
          say={say}
          onView={view => sync({ ...state, view })}
          bar={<StrikeBar s={state} kinds={KINDS} presets={PRESETS} onChange={n => sync({ ...state, ...n })} />}
        />
      )}
      controls={{
        score: ({ state }) => <Score s={state} />,
        fact: () => (
          <>
            <Fact id="cost-balance" />
            <p className="note bk-note">
              Mira’s rule is Larkspur’s own RPO and RTO, chosen by the team; the week’s costs are planning numbers.
            </p>
          </>
        ),
        // changing the bench is an attempt only while it is the puzzle
        bench: ({ state, apply, sync, focused }) => <BenchControls s={state} set={focused ? apply : sync} />,
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
