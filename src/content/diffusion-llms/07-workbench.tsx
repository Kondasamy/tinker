// Chapter 7: the workbench. Tokens a pass and a remasking rule for each kind of reply (a native select each). Under it,
// a row per case (each kind's pinned phrases) with its reply's matches and repeats against the kind's bars, and a live
// total against the best. The puzzle accepts every plan tied for the fewest passes (WINNERS); Show me applies one.
// Results read the pinned replies (workbench.ts); the stage fills the shown kind's first phrase live.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { KS, L, RULES, passesFor, text, type K, type Rule } from '../../lib/diffusion-llms/decode';
import {
  BEST,
  KINDS,
  KIND_IDS,
  WINNERS,
  casesOf,
  kindOf,
  kindOk,
  passesOf,
  solved,
  type Choice,
  type KindId,
  type Plan,
} from '../../lib/diffusion-llms/workbench';
import { FRAME_PARTS } from '../../components/scenes/typeFrameScene';
import { FrameStage, RULE_NAME, ToyNote, Waiting, frameOf, given, phrase, replyAt, tokens, useFill } from './kit';
import { NEED } from './06-reading-a-speed-claim';

const MODULE = 'diffusion-llms',
  ID = '07-workbench';
export const PARTS = FRAME_PARTS;
/** The vendor's default: the setting that reached its speed claim in chapter 6, surest first, for every kind. */
export const START = Object.fromEntries(KIND_IDS.map(id => [id, { k: NEED, rule: 'confidence' }])) as Plan;
const ok = (c: Partial<Choice> | undefined): c is Choice =>
  !!c && KS.includes(c.k as K) && RULES.includes(c.rule as Rule);
/** The plan in a run's state; a missing or unknown choice falls back to START's. */
export const planOf = (p: Partial<Plan> | undefined): Plan =>
  Object.fromEntries(KIND_IDS.map(id => [id, ok(p?.[id]) ? p![id] : START[id]])) as Plan;

export interface S {
  plan: Plan;
  show: KindId;
  quiz: number | null;
}

export const QUIZ = {
  question:
    'A team runs every reply, from refunds to internal notes, at the vendor’s fastest setting. What does the workbench say?',
  options: [
    'Test each kind of reply, and keep the fastest setting that passes its bar',
    'Keep it: speed is what they paid for',
    'Use the careful fill everywhere: it is always safe',
  ],
  correct: 0,
  explanation: 'Each kind has its own bar, so each gets the fewest passes that clears it.',
  why: [
    'Right: an internal note can pass at a fraction of the passes a customer answer needs.',
    'At the fastest setting, the replies that need care fail their bar.',
    'The careful fill passes, but wastes passes on replies that clear their bar faster.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'plan',
    focus: 'plan',
    visibleControls: ['score', 'plan'],
    narration: `The vendor’s default: ${NEED} tokens a pass, surest first, everywhere. The best plan clears every bar in ${BEST} passes.`,
    act: 'Change the plan on the workbench.',
    say: { block: 'dial', text: 'Vendor default' },
    predicate: s => solved(planOf(s.plan)),
    hint: 'Take each kind alone: how many repeats may it have, and must it match the careful fill?',
    solution: s => ({ ...s, plan: WINNERS[0] }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['score', 'plan', 'quiz'],
    narration: 'Customer answers need the careful fill; drafts can go faster. Each bar sets its own speed.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'With every kind passing, what decides between two plans?',
  },
];

function Score({ s }: { s: S }) {
  const p = planOf(s.plan),
    best = solved(p),
    passes = passesOf(p);
  return (
    <div role="status" data-passes={passes} data-best={best ? '1' : '0'}>
      <p className="dl-headline">
        <strong>
          {KINDS.filter(k => kindOk(k, p[k.id])).length} of {KINDS.length}
        </strong>{' '}
        kinds pass · {passes} passes
        <span className={`stamp ${best ? 'correct' : 'neutral'}`}>{best ? 'BEST' : `BEST IS ${BEST}`}</span>
      </p>
      {best && <p className="dl-note">One of {WINNERS.length} that work.</p>}
      <table className="tc-ledger" style={{ marginTop: 10 }}>
        <caption>Your plan, case by case: one pinned phrase each</caption>
        <thead>
          <tr>
            <th scope="col">Case</th>
            <th scope="col">Same as careful</th>
            <th scope="col">Repeats</th>
          </tr>
        </thead>
        {KINDS.map(kind => {
          const c = p[kind.id],
            pass = kindOk(kind, c);
          return (
            <tbody key={kind.id} data-kind={kind.id} data-ok={pass ? '1' : '0'}>
              <tr>
                <th scope="colgroup" colSpan={3}>
                  {kind.label}: {tokens(c.k)} a pass, {RULE_NAME[c.rule].toLowerCase()} · {passesFor(c.k)} passes ·{' '}
                  {pass ? 'passes' : 'fails'}
                  <span className="dl-why">
                    Bar: {kind.agree > 0 ? `at least ${kind.agree} of ${L} the same as careful, ` : ''}at most{' '}
                    {kind.repeat} repeats. {kind.reason}
                  </span>
                </th>
              </tr>
              {casesOf(kind, c).map(x => (
                <tr key={x.seed} data-ok={x.ok ? '1' : '0'}>
                  <th scope="row">
                    “{given(x.seed)}” <span className="dl-why">→ “{text(x.reply)}”</span>
                  </th>
                  <td>
                    {x.agree} of {L}
                    {x.agree < kind.agree && ' · too far'}
                  </td>
                  <td>
                    {x.repeat}
                    {x.repeat > kind.repeat && ' · too many'}
                  </td>
                </tr>
              ))}
            </tbody>
          );
        })}
      </table>
      <ToyNote />
    </div>
  );
}

function Stage({ state, say }: { state: S; say?: Step<S>['say'] }) {
  const p = planOf(state.plan),
    show = KIND_IDS.includes(state.show) ? state.show : KIND_IDS[0],
    c = p[show],
    kind = kindOf(show),
    seed = kind.cases[0];
  const r = useFill({ seed, k: c.k, rule: c.rule });
  const fr = frameOf(r.fill, r.shown, c.k);
  return (
    <FrameStage
      say={say}
      shown={{
        wait:
          !r.fill && r.status !== 'ready' ? (
            <Waiting w="mlm" failed={r.status === 'error'} retry={r.retry} />
          ) : undefined,
        given: phrase(seed).ids.length,
        ...fr,
        fill: r.done ? r.fill : null,
        stripLabel: `${kind.label}: ${tokens(c.k)} a pass, pass by pass`,
        caption: r.fill
          ? `${kind.label}, pass ${r.shown} of ${fr.passes}: “${replyAt(r.fill, r.shown)}”. Plan total: ${passesOf(p)} passes.`
          : `${kind.label}: “${given(seed)}”`,
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
      initial={{ plan: START, show: KIND_IDS[0], quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => <Stage state={state} say={say} />}
      controls={{
        score: ({ state }) => <Score s={state} />,
        // changing the plan is an attempt only while it is the puzzle
        plan: ({ state, apply, sync, focused }) => {
          const set = focused ? apply : sync,
            p = planOf(state.plan);
          const change = (id: KindId, c: Partial<Choice>) =>
            set({ ...state, show: id, plan: { ...p, [id]: { ...p[id], ...c } } });
          return (
            <div className="dl-bench">
              {KINDS.map(kind => (
                <fieldset key={kind.id} data-kind={kind.id}>
                  <legend>{kind.label}</legend>
                  <label>
                    Tokens a pass{' '}
                    <select
                      value={p[kind.id].k}
                      onChange={e => change(kind.id, { k: Number(e.currentTarget.value) as K })}
                    >
                      {KS.map(k => (
                        <option key={k} value={k}>
                          {k} ({passesFor(k)} passes)
                        </option>
                      ))}
                    </select>
                  </label>{' '}
                  <label>
                    Stamp{' '}
                    <select
                      value={p[kind.id].rule}
                      onChange={e => change(kind.id, { rule: e.currentTarget.value as Rule })}
                    >
                      {RULES.map(r => (
                        <option key={r} value={r}>
                          {RULE_NAME[r].toLowerCase()}
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
