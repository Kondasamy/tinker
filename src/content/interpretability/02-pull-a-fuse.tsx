// Chapter 2: pull a fuse. On the pinned prompt where it bites (data/interpretability/prompts.json fuses.bite), the
// reader pulls the word-start head's fuse and watches the expected token leave the top 5. They predict how much that
// head matters over all of Larkspur's held-out text, then run every head's fuse over it: each costs a little, the
// word-start head the most, none breaks the model. Every count is computed live (headLoss); the test pins them.
import { useMemo, type CSSProperties } from 'react';
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import type { Model } from '../../lib/lm/model';
import { BITE, FUSES, fuseName, headLoss, nextTop, type Fuse } from '../../lib/interpretability/probe';
import { FUSE_PARTS } from '../../components/scenes/fuseScene';
import { Fact, InterpStage, ModelGate, OURS, TopFive, said, useBase, whenLoaded } from './kit';

const MODULE = 'interpretability',
  ID = '02-pull-a-fuse';
export const PARTS = FUSE_PARTS;
/** The heads, the only fuses this chapter offers. */
export const HEAD_FUSES = FUSES.filter(f => f.startsWith('h'));
const WORD_START: Fuse = 'h0-0';

const P1 = {
  question: `Over all of Larkspur’s held-out text, how many right top-5 guesses does pulling ${fuseName(WORD_START)} lose?`,
  options: ['Most of them: it is the strongest head', 'Some: roughly one in ten', 'None: one head never matters'],
};
/** The option the held-out count lands on: more than half lost, some lost, or none. */
export function outcomeOf(m: Model): number {
  const { lost, right } = headLoss(m, WORD_START);
  return lost * 2 > right ? 0 : lost > 0 ? 1 : 2;
}
const share = (r: { lost: number; right: number }) => `${Math.round((r.lost / r.right) * 100)}%`;

export const QUIZ = {
  question:
    'A teammate switches off one part of a model and a customer’s question still gets the right answer. They conclude the part does nothing. What do you tell them?',
  options: [
    'Right: if one answer didn’t change, the part is useless',
    'One prompt can’t show it: count how often answers change over lots of text, because work is spread across parts',
    'Wrong: every part is needed for every answer',
  ],
  correct: 1,
  explanation:
    'One prompt can hide a part’s effect or exaggerate it. Counting over held-out text shows how much each part matters, and here every head matters a little.',
  why: [
    'The word-start head left most answers alone, yet over held-out text it cost about one right guess in ten.',
    'Right: one prompt is an anecdote, and a count over many shows a part’s real share of the work.',
    'Every head here could be pulled and most guesses survived, so no single head is needed everywhere.',
  ],
};

interface S {
  pulled: Fuse[];
  tried: Fuse[];
  p1: number | null;
  revealed: boolean;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'pull',
    focus: 'pull',
    visibleControls: ['pull'],
    narration: `Ablation tests a part: switch it off and watch the guess. ${fuseName(WORD_START)} finds where words start.`,
    act: `Pull ${fuseName(WORD_START)}’s fuse.`,
    say: { block: 'fuses', text: 'One per part' },
    predicate: whenLoaded(s => s.pulled.includes(WORD_START)),
    hint: `Press “${fuseName(WORD_START)}” under the prompt.`,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['pull', 'p1'],
    narration: `${said(BITE.expected)} fell out of the top 5. But this prompt is one of the few where that happens.`,
    act: 'Predict first.',
    say: { block: 'pulled', text: 'Fuse out' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['p1', 'reveal'],
    narration: 'Locked in.',
    act: 'Count it over the held-out text.',
    predicate: s => s.revealed,
  },
  {
    id: 'heads',
    focus: 'heads',
    visibleControls: ['out1', 'heads'],
    narration: 'Now every head, one at a time, over the same text. Big models lose many heads with little harm too.',
    act: 'Pull each head’s fuse once.',
    say: { block: 'fuses', text: 'One at a time' },
    predicate: s => HEAD_FUSES.every(f => s.tried.includes(f)),
    hint: 'Press each head’s button below the counts.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['heads', 'quiz'],
    narration: 'The word-start head costs most, yet none breaks the model: the work is spread out.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Did one prompt tell you how much a head matters?',
  },
];

/** The four heads' held-out counts, each computed when its fuse is first tried. */
function HeadCounts({ m, s, onTry }: { m: Model; s: S; onTry: (f: Fuse) => void }) {
  const counts = useMemo(
    () => Object.fromEntries(s.tried.map(f => [f, headLoss(m, f)])) as Record<Fuse, { lost: number; right: number }>,
    [m, s.tried],
  );
  return (
    <>
      <ul className="ip-bars" aria-label="Right top-5 guesses lost per head, over held-out text">
        {HEAD_FUSES.map(f => {
          const r = counts[f];
          return (
            <li key={f} data-fuse={f} data-lost={r?.lost}>
              <span>{fuseName(f)}</span>
              <span
                className="bar"
                style={{ '--w': r ? `${(r.lost / r.right) * 100 * 4}%` : '0%' } as CSSProperties}
                aria-hidden="true"
              />
              <span>{r ? `${share(r)} lost` : 'not tried'}</span>
            </li>
          );
        })}
      </ul>
      <div role="group" aria-label="Pull one head’s fuse" className="ip-fuses">
        {HEAD_FUSES.map(f => (
          <button key={f} type="button" className="chip" aria-pressed={s.pulled[0] === f} onClick={() => onTry(f)}>
            {fuseName(f)}
          </button>
        ))}
      </div>
      <p className="note">{`Bars drawn at 4× so small counts show. ${OURS}`}</p>
    </>
  );
}

export default function PullAFuse() {
  const { model } = useBase();
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      ready={!!model}
      initial={{ pulled: [], tried: [], p1: null, revealed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => (
        <InterpStage
          say={say}
          prompt={BITE.text}
          pulled={state.pulled}
          watch={BITE.expected}
          caption={
            state.pulled.length ? `${fuseName(state.pulled[0])} pulled: its output is zeroed.` : 'All six fuses in.'
          }
        />
      )}
      controls={{
        pull: ({ state, apply }) => (
          <ModelGate weights="base">
            {m => (
              <>
                <p>
                  <strong>{BITE.text} …</strong>
                </p>
                <div role="group" aria-label="Pull a fuse" className="ip-fuses">
                  <button
                    type="button"
                    className="chip"
                    aria-pressed={state.pulled.includes(WORD_START)}
                    onClick={() => apply({ ...state, pulled: state.pulled.length ? [] : [WORD_START] })}
                  >
                    {fuseName(WORD_START)}
                  </button>
                </div>
                <TopFive
                  top={nextTop(m, BITE.text, state.pulled)}
                  before={nextTop(m, BITE.text)}
                  mark={BITE.expected}
                />
              </>
            )}
          </ModelGate>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        reveal: ({ state, apply }) => (
          <button
            type="button"
            className="chip"
            onClick={() => apply({ ...state, revealed: true, pulled: [WORD_START], tried: [WORD_START] })}
          >
            Run it over the held-out text
          </button>
        ),
        out1: ({ state }) => (
          <ModelGate weights="base">
            {m => {
              const r = headLoss(m, WORD_START);
              return (
                <>
                  <Outcome {...P1} prediction={state.p1} outcome={outcomeOf(m)} />
                  <p className="tc-status" role="status">
                    {`${fuseName(WORD_START)} pulled: ${r.lost} of ${r.right} right top-5 guesses lost (${share(r)}).`}
                  </p>
                  <Fact id="heads-removable" />
                </>
              );
            }}
          </ModelGate>
        ),
        heads: ({ state, sync }) => (
          <ModelGate weights="base">
            {m => (
              <HeadCounts
                m={m}
                s={state}
                onTry={f => sync({ ...state, pulled: [f], tried: [...new Set([...state.tried, f])] })}
              />
            )}
          </ModelGate>
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
