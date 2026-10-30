// Chapter 7: the workbench (KTD8). A Select picks the team; the three poises set that team's weights. A team's machine
// is the one that meets every need in workbench.json; the bench is solved when every team's beam tips to its machine.
// The puzzle accepts every setting in WINNERS (pinned, recomputed in a test); Show me applies each team's first.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Select from '../../components/story/Select';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { STEELYARD_PARTS } from '../../components/scenes/steelyardScene';
import { IDS, type MachineId } from '../../lib/choosing-models/machines';
import { money, secs } from '../../lib/choosing-models/price';
import {
  BENCH_NOTE,
  SOLVED,
  START,
  TEAMS,
  benchOf,
  fitOf,
  teamOf,
  teamRows,
  teamWins,
  tipsTo,
  wins,
  type Bench,
  type TeamId,
} from '../../lib/choosing-models/workbench';
import { MachinesNote, SteelyardStage, type View } from './kit';

const MODULE = 'choosing-models',
  ID = '07-workbench';
export const PARTS = STEELYARD_PARTS;
const pct = (x: number) => `${Math.round(x * 100)}%`;

export const QUIZ = {
  question: 'A fourth team asks you which model is best. What do you ask back first?',
  options: [
    'What it needs: its quality bar on its own questions, its budget and its longest wait',
    'Which leaderboard it trusts most',
    'How many parameters it wants',
  ],
  correct: 0,
  explanation: 'There is no best model, only the one that meets a team’s needs on its own questions.',
  why: [
    'Right: its needs set the weights, and its own questions set the quality.',
    'A leaderboard ranks someone else’s test, and says nothing of this team’s bill or wait.',
    'Size says little about quality on its questions, and nothing about its needs.',
  ],
};

export interface S {
  team: TeamId;
  bench: Bench;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'bench',
    focus: 'weights',
    visibleControls: ['bench'],
    narration: 'Workbench: each team sets its own weights. A team’s machine is the one that meets all its needs.',
    act: 'Tip every team’s beam to its machine.',
    say: { block: 'beam', text: 'Each team' },
    predicate: s => wins(benchOf(s.bench)),
    hint: 'The catalogue team needs quality most; the warehouse weighs quality and cost; support weighs cost or wait.',
    solution: s => ({ ...s, bench: SOLVED }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['bench', 'quiz'],
    narration: 'Three teams, three different machines. The weights are each team’s needs, written down.',
    act: 'One question to finish.',
    say: { block: 'pan', text: 'Its machine' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What decided each team’s machine?',
  },
];

/** Every team: what it needs, where its beam tips, and whether that is its machine. */
function Teams({ bench, team, onTeam }: { bench: Bench; team: TeamId; onTeam: (t: TeamId) => void }) {
  const all = wins(bench);
  return (
    <div className="cm-bench">
      <label>
        {'Team '}
        <Select value={team} onChange={e => onTeam(e.target.value as TeamId)}>
          {TEAMS.map(t => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      </label>
      <p className="note">{teamOf(team).job}</p>
      <table className="tc-ledger cm-teams">
        <caption>What each team needs</caption>
        <thead>
          <tr>
            <th scope="col">Team</th>
            <th scope="col">Needs</th>
            <th scope="col">Tips to</th>
          </tr>
        </thead>
        <tbody>
          {TEAMS.map(t => {
            const to = tipsTo(t, bench[t.id]),
              ok = teamWins(t, bench[t.id]);
            return (
              <tr key={t.id} data-team={t.id} data-ok={ok ? 1 : 0}>
                <th scope="row">{t.name}</th>
                <td>{`${pct(t.needs.quality)}+ right, ≤ ${money(t.needs.price)} per 1,000, ≤ ${secs(t.needs.wait)}`}</td>
                <td className={ok ? 'ok' : 'bad'}>{`${to ? `Machine ${to}` : 'Level'} ${ok ? '✓' : '✗'}`}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="cm-headline" role="status" data-best={all ? 1 : 0}>
        <strong>{`${TEAMS.filter(t => teamWins(t, bench[t.id])).length} of ${TEAMS.length}`}</strong>
        {' teams on their machine '}
        <span className={`stamp ${all ? 'correct' : 'wrong'}`}>{all ? 'ALL SERVED' : 'NOT YET'}</span>
      </p>
      <p className="note">{BENCH_NOTE}</p>
    </div>
  );
}

export default function Workbench() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ team: 'support', bench: START, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, focus, say }) => {
        const bench = benchOf(state.bench),
          t = teamOf(TEAMS.some(x => x.id === state.team) ? state.team : 'support'),
          rows = teamRows(t);
        const each = (f: (id: MachineId) => string) =>
          Object.fromEntries(IDS.map(id => [id, f(id)])) as Record<MachineId, string>;
        const q = { name: `${t.name}’s questions`, text: each(id => pct(t.quality[id])) };
        return (
          <SteelyardStage
            rows={rows}
            weights={bench[t.id]}
            onWeights={w => (focus === 'weights' ? apply : sync)({ ...state, bench: { ...bench, [t.id]: w } })}
            quality={q}
            pills={each(id => `${id} · ${pct(t.quality[id])}`)}
            view={state.view}
            onView={view => sync({ ...state, view })}
            say={say}
            step={focus}
            caption={`${t.name}: its machine is ${fitOf(t)}. Quality on its own questions, hand-set.`}
          >
            <MachinesNote />
          </SteelyardStage>
        );
      }}
      controls={{
        bench: ({ state, sync }) => (
          <Teams bench={benchOf(state.bench)} team={state.team} onTeam={team => sync({ ...state, team })} />
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
