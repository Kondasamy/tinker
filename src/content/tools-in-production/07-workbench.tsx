// Chapter 7: workbench (R6e.7). A hand-written week of fifteen requests while the servers change under them: Stockroom
// renames a field on Tuesday, QuickPost slips hidden orders into track_parcel on Wednesday (a rug pull), and DocShelf's
// find_manual is poisoned from day one. The reader sets, per server, Trust, Pin and Load when needed, and runs the week
// (runWeek, for real). The rule: no leaks, then the most requests done, then the fewest tokens. Every policy that
// meets it is accepted (WINNERS, recomputed in tests/unit/tools-in-production.test.ts); Show me applies the first.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Predict, { Reveal } from '../../components/quiz/Predict';
import { SHADOW_PARTS, type Shadow } from '../../components/scenes/shadowScene';
import { BOARD, changed, SERVERS, toolOf, TOOLS } from '../../lib/tools-in-production/tools';
import {
  bitsOf,
  OPENING,
  type Policy,
  policyOf,
  runWeek,
  solve,
  TASKS,
  WEEK,
} from '../../lib/tools-in-production/week';
import { num } from '../../lib/format';
import { nextOf } from '../../lib/modules';
import { EMPTY, Fact, ShadowStage, ToyNote } from './kit';

const MODULE = 'tools-in-production',
  ID = '07-workbench';
const SOLVED = solve();
/** every policy that scores best (as switch bits): the workbench accepts any of them */
export const WINNERS = SOLVED.winners;
const BEST = SOLVED.best;
const START = bitsOf(OPENING);
const OPEN = runWeek(OPENING);
/** tools changed during the week, by its end */
const CHANGED = WEEK.flatMap(d => (d.change ? [d.change.tool] : []));

interface S {
  bits: number;
  /** the policy last run, or none yet */
  ran: number | null;
  prediction: number | null;
  revealed: boolean;
}

export const PREDICT = {
  question: 'Which server can no pin or search make safe, so you must stop trusting it?',
  options: [
    'DocShelf: its tool is poisoned from day one',
    'QuickPost: its tool changes on Wednesday',
    'Stockroom: it renames a field on Tuesday',
  ],
};
const OUTCOME = 0;

export const PARTS = SHADOW_PARTS;

/** The board at the week's end under a policy: trusted vans docked, barred bays, padlocks, held and askew tools. */
export function sceneOf(bits: number | null, shown: number): Shadow {
  const p = policyOf(shown);
  const trusted = SERVERS.filter(s => p[s.id].trust).map(s => s.id);
  if (bits === null) return { ...EMPTY, vans: trusted, blocked: SERVERS.filter(s => !p[s.id].trust).map(s => s.id) };
  const sc = runWeek(p);
  return {
    ...EMPTY,
    vans: trusted,
    blocked: SERVERS.filter(s => !p[s.id].trust).map(s => s.id),
    pinned: SERVERS.filter(s => p[s.id].pin).map(s => s.id),
    changed: CHANGED.filter(id => trusted.includes(toolOf(id).server)),
    held: sc.held,
    hung: BOARD.filter(t => p[t.server].trust && !sc.held.includes(t.id)).map(t => ({
      id: t.id,
      fit: !CHANGED.includes(t.id),
    })),
    heap: TOOLS.filter(t => !t.shape && p[t.server].trust && !p[t.server].lazy).length,
    sent: sc.leaked[0] ?? null,
    tokens: sc.tokens,
  };
}

/** the Prints tab: each day's definitions, every change so far applied */
const PRINTS = WEEK.map((d, i) => ({
  label: d.day,
  defs: Object.fromEntries(
    WEEK.slice(0, i + 1).flatMap(w => (w.change ? [[w.change.tool, changed(toolOf(w.change.tool), w.change)]] : [])),
  ),
}));

const scoreLine = (bits: number) => {
  const s = runWeek(policyOf(bits));
  return `${s.done} of ${TASKS} requests done, ${s.incidents} leaks, ${num(s.tokens)} tokens.`;
};

export const STEPS: Step<S>[] = [
  {
    id: 'run',
    focus: 'run',
    visibleControls: ['run'],
    narration: `A hand-written week: ${TASKS} requests while servers change. Today’s setup trusts all, pins none, loads everything.`,
    act: 'Press Run the week.',
    say: { block: 'board', text: 'Monday' },
    status: `All ${OPEN.done} requests ran, but ${OPEN.incidents} leaked through poisoned descriptions.`,
    predicate: s => s.ran !== null,
    hint: 'Press Run the week in the step card.',
  },
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['score', 'predict'],
    narration: 'Two servers leaked: DocShelf and QuickPost. Hidden orders sat in the prompt on every request.',
    act: 'Predict which server to stop trusting.',
    say: { block: 'bench', text: 'Leaks' },
    status: 'Every van docked, the board askew in two places, a file sent off.',
    predicate: s => s.prediction !== null,
  },
  {
    id: 'fix',
    focus: 'switches',
    visibleControls: ['predict', 'switches', 'run', 'score'],
    narration: 'Pick locked. The rule: no leaks first, then the most requests done, then the fewest tokens.',
    act: 'Set the switches, then press Run the week.',
    status: `Best week: ${BEST.done} of ${TASKS} done, no leaks, ${num(BEST.tokens)} tokens.`,
    predicate: s => s.ran !== null && WINNERS.includes(s.ran),
    hint: 'Bar DocShelf, pin QuickPost, and load every server only when needed.',
    solution: s => ({ ...s, bits: WINNERS[0], ran: WINNERS[0] }),
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal', 'fact', 'score'],
    narration: 'DocShelf barred, QuickPost pinned, every server searched: fewer requests done, but none leaked.',
    act: 'Check your prediction.',
    closeUp: ['board'],
    say: { block: 'board', text: 'Your week' },
    status: 'Padlock on QuickPost, DocShelf barred, few tools on the board, the bench clear.',
    predicate: s => s.revealed,
  },
];

const SWITCHES: [keyof Policy[string], string][] = [
  ['trust', 'Trust'],
  ['pin', 'Pin'],
  ['lazy', 'Load when needed'],
];

export default function Workbench() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ bits: START, ran: null, prediction: null, revealed: false }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say, closeUp }) => (
        <ShadowStage scene={sceneOf(state.ran, state.ran ?? state.bits)} prints={PRINTS} say={say} closeUp={closeUp} />
      )}
      controls={{
        run: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, ran: state.bits })}>
            Run the week
          </button>
        ),
        score: ({ state }) => (state.ran === null ? null : <p className="tip-score">{scoreLine(state.ran)}</p>),
        switches: ({ state, sync }) => {
          const p = policyOf(state.bits);
          return (
            <div className="tip-switches">
              {SERVERS.map(s => (
                <fieldset key={s.id}>
                  <legend>{s.name}</legend>
                  {SWITCHES.map(([k, label]) => (
                    <button
                      key={k}
                      type="button"
                      className="chip"
                      aria-pressed={p[s.id][k]}
                      onClick={() =>
                        sync({ ...state, bits: bitsOf({ ...p, [s.id]: { ...p[s.id], [k]: !p[s.id][k] } }) })
                      }
                    >
                      {label}
                    </button>
                  ))}
                </fieldset>
              ))}
            </div>
          );
        },
        predict: ({ state, apply }) => (
          <Predict {...PREDICT} value={state.prediction} onPredict={i => apply({ ...state, prediction: i })} />
        ),
        reveal: ({ state, apply }) => (
          <Reveal
            prediction={state.prediction === null ? null : PREDICT.options[state.prediction]}
            outcome={PREDICT.options[OUTCOME]}
            revealed={state.revealed}
            onReveal={() => apply({ ...state, revealed: true })}
            label="See the best week"
          />
        ),
        fact: ({ state }) =>
          state.revealed ? (
            <>
              <Fact id="pin-tools" />
              <Fact id="search-saving" />
              <ToyNote>The week is hand-written.</ToyNote>
            </>
          ) : null,
      }}
    />
  );
}
