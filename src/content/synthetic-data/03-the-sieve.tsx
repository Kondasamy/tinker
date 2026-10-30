// Chapter 3: the sieve. Larkspur mini writes twenty replies at pinned.json's sieve temperature (live, seeded); the reader predicts how
// many survive, then runs dedupe and the fact filter over them live (sieve.ts, the grid's own rule). pinned.json holds
// the kept counts a test reruns.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import PINNED from '../../../data/synthetic-data/pinned.json' with { type: 'json' };
import { BATCH, replyText } from '../../lib/synthetic-data/generate';
import { RUNS } from '../../lib/synthetic-data/runs';
import { SIEVES, sieve, type SieveKind, type Verdict } from '../../lib/synthetic-data/sieve';
import { COPIER_PARTS } from '../../components/scenes/copierScene';
import { CopierStage, Fact, LoadLine, ToyNote, Waiting, batchNow, useBatch, useModel } from './kit';

const MODULE = 'synthetic-data',
  ID = '03-the-sieve';
export const PARTS = COPIER_PARTS;
export const PROMPT = RUNS.prompts[PINNED.sieve.prompt].text;
export const T = PINNED.sieve.temperature;
const KEPT = PINNED.sieve.kept as Record<SieveKind, number>;
export const SIEVE_WORDS: Record<SieveKind, string> = {
  off: 'Off: keep everything',
  dedupe: 'Dedupe: drop copies and near-copies',
  facts: 'Dedupe, then the fact filter: keep replies naming a product',
};
const VERDICT: Record<Verdict, string> = { kept: 'KEPT', copy: 'COPY', overlap: 'NEAR-COPY', 'no-fact': 'NO PRODUCT' };

export const P1 = {
  question: `Dedupe, then the fact filter. How many of the ${BATCH} replies survive both?`,
  options: ['Most of them: the replies read fine', 'About half', 'Only a few'],
};
export const OUTCOME = KEPT.facts > BATCH * 0.7 ? 0 : KEPT.facts >= BATCH * 0.3 ? 1 : 2;

export const QUIZ = {
  question:
    'A sieve drops nine in ten model-written replies about a rare refund rule. What does the team have left to train on?',
  options: [
    'A few replies about that rule, no better informed than the model that wrote them',
    'Better replies: the sieve fixed the wrong ones',
    'New facts about the rule, found by the sieve',
  ],
  correct: 0,
  explanation: 'A sieve only removes; it can’t add a fact the writer didn’t know.',
  why: [
    'Right: what survives is a subset of what the model wrote, mistakes it can’t see included.',
    'A sieve drops replies; it never edits one to be right.',
    'The sieve checks what is there; it has no source of new facts.',
  ],
};

export interface S {
  asked: boolean;
  wrote: boolean;
  p1: number | null;
  sieve: SieveKind;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'write',
    focus: 'write',
    visibleControls: ['write'],
    narration: `Larkspur mini answers “${PROMPT}” at temperature ${T}. Some replies repeat, some wander.`,
    act: `Write twenty at ${T}.`,
    say: { block: 'copier', text: 'Raw replies' },
    predicate: s => s.wrote,
    hint: 'Press Write and wait for twenty replies.',
    solution: s => ({ ...s, asked: true, wrote: true }),
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1', 'list'],
    narration: 'A sieve drops replies before training. Dedupe goes first, then a fact filter.',
    act: 'Predict first.',
    say: { block: 'sieve', text: 'The sieve' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'dedupe',
    focus: 'sieve',
    visibleControls: ['p1', 'sieve', 'list'],
    narration:
      'Dedupe drops copies and near-copies: replies sharing at least half their four-piece phrases with replies kept.',
    act: 'Set the sieve to Dedupe.',
    predicate: s => s.sieve === 'dedupe',
  },
  {
    id: 'facts',
    focus: 'sieve',
    visibleControls: ['sieve', 'list'],
    narration: `${KEPT.dedupe} of ${BATCH} left. The fact filter then keeps only replies that name a Larkspur product.`,
    act: 'Add the fact filter.',
    say: { block: 'sieve', text: 'Fact filter' },
    predicate: s => s.sieve === 'facts',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out', 'list', 'quiz'],
    narration: `${KEPT.facts} of ${BATCH} survive. A sieve only removes: it can’t add the rare examples that were missing.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Does a sieve add anything?',
  },
];

function Stage({ state, sync, say }: { state: S; sync: (s: S) => void; say?: Step<S>['say'] }) {
  const on = state.asked || state.wrote;
  const b = useBatch(PROMPT, on ? T : null, () => {
    if (!state.wrote) sync({ ...state, wrote: true });
  });
  const kept = b.done ? sieve(b.batch, state.sieve).filter(v => v === 'kept').length : 0;
  return (
    <CopierStage
      say={say}
      wait={b.status === 'error' ? <Waiting failed retry={b.retry} /> : undefined}
      room={{ gens: [], gen: null, arm: 'replace', real: 1, copying: on && !b.done, sieve: state.sieve }}
      caption={
        !on
          ? `“${PROMPT}”`
          : b.done
            ? `Sieve ${state.sieve === 'off' ? 'off' : state.sieve === 'dedupe' ? 'dedupe' : 'dedupe + facts'}: ${kept} of ${BATCH} kept.`
            : `${b.batch.length} of ${BATCH} written.`
      }
    />
  );
}

/** Write asks the stage for the batch; the step moves on once all of it is written. */
function Writer({ state, sync }: { state: S; sync: (s: S) => void }) {
  const { status } = useModel();
  return (
    <>
      <button
        type="button"
        className="big"
        disabled={status !== 'ready' || state.asked}
        onClick={() => sync({ ...state, asked: true })}
      >
        Write twenty at {T}
      </button>
      <LoadLine status={status} />
    </>
  );
}

/** The batch with each reply's fate under the chosen sieve. */
function List({ kind }: { kind: SieveKind }) {
  const batch = batchNow(PROMPT, T);
  if (!batch) return null;
  const v = sieve(batch, kind);
  return (
    <>
      <ol className="sd-replies" aria-label={`The ${BATCH} replies, sieved`}>
        {batch.map((r, i) => (
          <li key={i} data-v={v[i]}>
            <span className="v">{VERDICT[v[i]]}</span> “{replyText(r)}”
          </li>
        ))}
      </ol>
      <ToyNote />
    </>
  );
}

export default function TheSieve() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ asked: false, wrote: false, p1: null, sieve: 'off', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => <Stage state={state} sync={sync} say={say} />}
      controls={{
        write: ({ state, sync }) => <Writer state={state} sync={sync} />,
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        sieve: ({ state, apply }) => (
          <fieldset className="sd-arms">
            <legend>Sieve</legend>
            {SIEVES.map(k => (
              <label key={k}>
                <input
                  type="radio"
                  name="sd-sieve"
                  checked={state.sieve === k}
                  onChange={() => apply({ ...state, sieve: k })}
                />{' '}
                {SIEVE_WORDS[k]}
              </label>
            ))}
          </fieldset>
        ),
        list: ({ state }) => <List kind={state.sieve} />,
        out: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />
            <Fact id="self-instruct-filter" />
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
