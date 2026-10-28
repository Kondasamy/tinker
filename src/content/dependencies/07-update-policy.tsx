// Chapter 7: an update policy, the workbench. The reader sets the range style, the lockfile, how often a tested update
// refreshes it, and install scripts; a build runs every day of the registry's month and the owner's rule is checked.
// The day slider shows the tower on any day of the run. The puzzle accepts every policy tied for best (WINNERS, pinned
// and recomputed in a test).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { HIJACK, SECURITY } from '../../lib/dependencies/story';
import {
  BEST,
  CADENCES,
  RANGES,
  REASONS,
  RULE,
  START,
  WINNERS,
  benchOf,
  runPolicy,
  wins,
  type Cadence,
  type Policy,
  type RangeStyle,
} from '../../lib/dependencies/workbench';
import { TOWER_PARTS, towerOf } from '../../components/scenes/towerScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { DepsStage, RegistryNote, Toggle, type View } from './kit';

const MODULE = 'dependencies',
  ID = '07-update-policy';
export const PARTS = TOWER_PARTS;
const RANGE_NAME: Record<RangeStyle, string> = { caret: 'Caret ^', tilde: 'Tilde ~', exact: 'Exact pins' };
const CADENCE_NAME: Record<Cadence, string> = { never: 'Never', monthly: 'Monthly', weekly: 'Weekly', daily: 'Daily' };

export const QUIZ = {
  question: 'A team refreshes its lockfile the moment anything new is released, with tests. What risk is left?',
  options: [
    'A hijacked release that passes the tests ships at once',
    'None: tests catch every bad release',
    'Builds break more often',
  ],
  correct: 0,
  explanation: 'Tests catch broken code, not code that works and also does harm; waiting gives others time to spot it.',
  why: [
    'Right: a hijacked release can pass every test, and updating at once leaves no time for it to be caught.',
    'Tests check that the app works; a payload can work perfectly and still steal.',
    'The tests reject a bad patch before it reaches the lockfile, so builds stay green.',
  ],
};

interface S extends Policy {
  day: number;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'bench',
    focus: 'bench',
    visibleControls: ['score', 'bench'],
    narration: 'A build runs daily for a month: a bad patch, a hijacked release, and a security fix.',
    act: 'Keep the owner’s rule; take the fix soonest.',
    say: { block: 'app', text: 'Your app' },
    predicate: s => wins(benchOf(s)),
    hint: 'Without a lockfile every build takes whatever is newest. How often should the lockfile move?',
    solution: s => ({ ...s, ...WINNERS[0] }),
  },
  {
    id: 'ties',
    focus: 'quiz',
    visibleControls: ['score', 'bench', 'quiz'],
    narration: `${WINNERS.length} policies tie at ${BEST} days late. Why not daily? It would take the hijacked release.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Can a test tell working code from harmful code?',
  },
];

function Score({ s }: { s: S }) {
  const b = benchOf(s),
    r = runPolicy(b),
    best = wins(b);
  return (
    <div role="status" data-best={best ? '1' : '0'}>
      <p className="dp-headline">
        <strong>{r.late}</strong>
        {` day${r.late === 1 ? '' : 's'} late `}
        <span className={`stamp ${best ? 'correct' : r.meets ? 'neutral' : 'wrong'}`}>
          {best ? 'BEST' : r.meets ? `BEST IS ${BEST}` : 'RULE BROKEN'}
        </span>
      </p>
      <p className="note dp-note">{RULE}</p>
      {best && <p className="tc-status">{`One of ${WINNERS.length} policies that tie.`}</p>}
    </div>
  );
}

function Bench({ s, set }: { s: S; set: (s: S) => void }) {
  const b = benchOf(s),
    r = runPolicy(b);
  const rows: [string, string, boolean][] = [
    ['Broken builds', String(r.broken), r.broken === 0],
    [`Days ${HIJACK.name} ${HIJACK.version}’s payload shipped`, String(r.shipped), r.shipped === 0],
    ['Its install script runs', String(r.scriptRuns), r.scriptRuns === 0],
    [`Days late on ${SECURITY.name} ${SECURITY.version}`, String(r.late), r.late === BEST],
  ];
  return (
    <div className="tc-bench">
      <section className="dp-bench" aria-label="Update policy">
        <fieldset>
          <legend>Ranges</legend>
          {RANGES.map(range => (
            <label key={range}>
              <input type="radio" name="dp-range" checked={b.range === range} onChange={() => set({ ...s, range })} />
              {RANGE_NAME[range]}
            </label>
          ))}
        </fieldset>
        <p className="note dp-note">{REASONS.range}</p>
        <Toggle label="Lockfile" checked={b.lock} onChange={lock => set({ ...s, lock })} />
        <p className="note dp-note">{REASONS.lock}</p>
        <fieldset>
          <legend>Tested update</legend>
          {CADENCES.map(cadence => (
            <label key={cadence}>
              <input
                type="radio"
                name="dp-cadence"
                checked={b.cadence === cadence}
                onChange={() => set({ ...s, cadence })}
              />
              {CADENCE_NAME[cadence]}
            </label>
          ))}
        </fieldset>
        <p className="note dp-note">{REASONS.cadence}</p>
        <Toggle label="Install scripts on" checked={b.scripts} onChange={scripts => set({ ...s, scripts })} />
        <p className="note dp-note">{REASONS.scripts}</p>
      </section>
      <table className="tc-ledger">
        <caption>The month, day 1 to its end</caption>
        <thead>
          <tr>
            <th scope="col">Case</th>
            <th scope="col">This policy</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([name, v, ok]) => (
            <tr key={name} data-ok={ok ? 1 : 0}>
              <th scope="row">{name}</th>
              <td className={ok ? 'ok' : 'bad'}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <RegistryNote />
    </div>
  );
}

export default function UpdatePolicy() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ...START, day: HIJACK.day, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const b = benchOf(state),
          d = runPolicy(b).days[Math.max(1, Math.min(state.day, runPolicy(b).days.length)) - 1];
        const what = [
          d.broken ? 'build broken' : 'build passed',
          ...(d.update ? [`update ${d.update}`] : []),
          ...(d.hijacked ? ['hijacked code shipped'] : []),
          ...(d.scriptRan ? ['its install script ran'] : []),
          d.fixed ? 'security fix in' : 'security fix missing',
        ];
        return (
          <DepsStage
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            day={d.day}
            onDay={day => sync({ ...state, day })}
            show={{
              tower: towerOf(d.tree, { lock: b.lock }),
              tree: d.tree,
              caption: `Day ${d.day} of the month${b.lock ? ', from the lockfile' : ''}. Slide to any day.`,
              status: `Day ${d.day}: ${what.join(', ')}.`,
            }}
          />
        );
      }}
      controls={{
        score: ({ state }) => <Score s={state} />,
        // changing the bench is an attempt only while it is the puzzle
        bench: ({ state, apply, sync, focused }) => <Bench s={state} set={focused ? apply : sync} />,
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
