// Chapter 7: route the sale, the workbench. Cedar dies and Dogwood turns slow but answering; the reader sets the rule,
// the health-check miss count and the hedge wait, and every change replays the sale. A setup passes the team's budget
// (no failed requests, extra copies within the cap) and scores its p99. The puzzle accepts every passing setup tied for
// the lowest (WINNERS, computed over all 64 and pinned).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { RULE_NAME } from '../../lib/load-balancing/rules';
import {
  BEST,
  LIMITS,
  START,
  WINNERS,
  benchOf,
  extraShare,
  meets,
  runBench,
  scoreOf,
  wins,
  type Bench,
} from '../../lib/load-balancing/workbench';
import { SERVERS } from '../../lib/load-balancing/sim';
import { fact } from '../../lib/load-balancing/facts';
import { YARD_PARTS, idleYard } from '../../components/scenes/yardScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, HedgeWait, LbStage, MissCount, RulePick, SimNote, msOf, pct, type View } from './kit';

const MODULE = 'load-balancing',
  ID = '07-route-the-sale';
export const PARTS = YARD_PARTS;
/** the extra copies Google's hedging test sent, beside the team's looser cap */
export const REAL_EXTRA = Number(fact('hedge-benchmark').value);

export const QUIZ = {
  question:
    'A ticket site expects one dead server and one slow one during a launch. Which plan matches what you found?',
  options: [
    'Least outstanding, health checks, and a hedge after most requests are done',
    'Round robin with health checks only',
    'Hedge every request at once',
    'Weighted round robin with no health checks',
  ],
  correct: 0,
  explanation: 'Checks pull the dead server, counting steers around the slow one, and a late hedge rescues the rest.',
  why: [
    'Right: each part handles one failure, and the late hedge keeps the extra copies few.',
    'Health checks pass a slow server that still answers, so round robin keeps feeding it.',
    'Copying every request doubles the work and blows any budget for extra copies.',
    'Fixed weights never notice either failure, and nothing pulls the dead server.',
  ],
};

interface S extends Bench {
  plays: number;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'bench',
    focus: 'bench',
    visibleControls: ['score', 'bench'],
    narration: `The team’s budget: no failed requests, and hedging may add at most ${pct(LIMITS.extraShare)} extra copies.`,
    act: 'Find the lowest p99 within it.',
    say: { block: 'switch', text: 'Route the sale' },
    predicate: s => wins(benchOf(s)),
    hint: 'Pull the dead server, pick a rule that counts waiting requests, then hedge late enough to stay in budget.',
    solution: s => ({ ...s, ...WINNERS[0], plays: s.plays + 1 }),
  },
  {
    id: 'ties',
    focus: 'quiz',
    visibleControls: ['score', 'bench', 'quiz'],
    narration: `${msOf(BEST)} is the lowest p99 within budget; yours is one of ${WINNERS.length} setups that work.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which plan handles both the dead server and the slow one?',
  },
];

function Score({ s }: { s: S }) {
  const r = runBench(benchOf(s)),
    ok = meets(r),
    best = ok && scoreOf(r) === BEST;
  return (
    <div role="status" data-p99={scoreOf(r)} data-best={best ? '1' : '0'}>
      <p className="lb-headline">
        <strong>{msOf(r.p99)}</strong>
        {' p99 '}
        <span className={`stamp ${best ? 'correct' : ok ? 'neutral' : 'wrong'}`}>
          {best ? 'BEST' : ok ? `BEST IS ${msOf(BEST)}` : 'OVER BUDGET'}
        </span>
      </p>
      {best && <p className="tc-status">{`One of ${WINNERS.length} setups that work.`}</p>}
    </div>
  );
}

function BenchControls({ s, set }: { s: S; set: (s: S) => void }) {
  const b = benchOf(s),
    r = runBench(b),
    go = (next: Partial<Bench>) => set({ ...s, ...next, plays: s.plays + 1 });
  return (
    <div className="tc-bench">
      <RulePick value={b.rule} onPick={rule => go({ rule })} />
      <MissCount id="lb-wchecks" value={b.checks} onChange={checks => go({ checks })} />
      <HedgeWait id="lb-whedge" value={b.hedgeMs} onChange={hedgeMs => go({ hedgeMs })} />
      <table className="tc-ledger">
        <caption>The sale against the team’s budget</caption>
        <thead>
          <tr>
            <th scope="col">Measure</th>
            <th scope="col">This setup</th>
            <th scope="col">Budget</th>
          </tr>
        </thead>
        <tbody>
          <tr data-row="failed" data-ok={r.failed <= LIMITS.failed ? 1 : 0}>
            <th scope="row">Failed requests</th>
            <td className={r.failed <= LIMITS.failed ? 'ok' : 'bad'}>{r.failed}</td>
            <td>{LIMITS.failed}</td>
          </tr>
          <tr data-row="extra" data-ok={extraShare(r) <= LIMITS.extraShare ? 1 : 0}>
            <th scope="row">Extra copies</th>
            <td className={extraShare(r) <= LIMITS.extraShare ? 'ok' : 'bad'}>{pct(extraShare(r))}</td>
            <td>{`at most ${pct(LIMITS.extraShare)}`}</td>
          </tr>
          <tr data-row="p99">
            <th scope="row">p99</th>
            <td>{msOf(r.p99)}</td>
            <td>lowest wins</td>
          </tr>
        </tbody>
      </table>
      <p className="note lb-note">Carts live in a shared store now, so sticky sessions stay off.</p>
      <SimNote />
      <p className="note lb-note">
        {`The team’s ${pct(LIMITS.extraShare)} cap is loose: Google’s own test needed only ${pct(REAL_EXTRA)} extra.`}
      </p>
      <Fact id="hedge-benchmark" />
    </div>
  );
}

export default function RouteTheSale() {
  const [cedar, dog] = [SERVERS[2], SERVERS[3]];
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ...START, plays: 0, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const b = benchOf(state),
          r = runBench(b);
        return (
          <LbStage
            say={say}
            run={r}
            play={state.plays}
            idle={idleYard(SERVERS.length, RULE_NAME[b.rule])}
            rule={b.rule}
            view={state.view}
            onView={view => sync({ ...state, view })}
            caption={`${cedar.name} dies and ${dog.name} turns slow but answering. ${r.failed} failed, ${pct(extraShare(r))} extra copies.`}
          />
        );
      }}
      controls={{
        score: ({ state }) => <Score s={state} />,
        // changing the setup is an attempt only while it is the puzzle
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
