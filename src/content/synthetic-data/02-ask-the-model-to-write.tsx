// Chapter 2: ask the model to write. Larkspur mini writes twenty short replies to one support question, live, at a cool
// and a hot temperature (seeded, so the same every time). Each batch is counted for copies (what dedupe would drop) and
// for replies that name a product (on topic); pinned.json holds the counts a test reruns. Cool stays on topic and
// repeats; hot varies and wanders.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { ListRange } from '../../components/story/ListRange';
import PINNED from '../../../data/synthetic-data/pinned.json' with { type: 'json' };
import { BATCH, TEMPS, copies, onTopic, replyText, type Temp } from '../../lib/synthetic-data/generate';
import { productIn, sieve } from '../../lib/synthetic-data/sieve';
import { RUNS } from '../../lib/synthetic-data/runs';
import { COPIER_PARTS } from '../../components/scenes/copierScene';
import { CopierStage, Fact, LoadLine, ToyNote, Waiting, batchNow, useBatch, useModel } from './kit';

const MODULE = 'synthetic-data',
  ID = '02-ask-the-model-to-write';
export const PARTS = COPIER_PARTS;
/** The support question every batch answers (pinned). */
export const PROMPT = RUNS.prompts[PINNED.write.prompt].text;
export const [COOL, , HOT] = TEMPS;
interface Count {
  copies: number;
  topic: number;
}
const PIN = PINNED.write.counts as Record<string, Count>;
const count = (b: number[][]): Count => ({ copies: copies(b), topic: onTopic(b) });

export const P1 = {
  question: `Twenty replies at temperature ${COOL}, then twenty at ${HOT}. Which batch names Larkspur’s products more often?`,
  options: [
    `${COOL}: its likeliest words are the products it knows`,
    `${HOT}: bolder picks find more products`,
    'Neither: temperature only changes speed',
  ],
};
export const OUTCOME = PIN[COOL].topic > PIN[HOT].topic ? 0 : PIN[HOT].topic > PIN[COOL].topic ? 1 : 2;

export const QUIZ = {
  question:
    'A team asks a model for 1,000 product reviews at a low temperature and gets many near-identical ones. What should they change?',
  options: [
    'Raise the temperature a little, and check the replies still make sense',
    'Lower it further, so every review is safe',
    'Ask for 10,000 reviews: more is always better',
  ],
  correct: 0,
  explanation: 'Low temperature repeats the likeliest reply; a little more heat buys variety, at some cost in sense.',
  why: [
    'Right: more heat means fewer copies, but too much and the replies wander.',
    'Lower still means the likeliest reply even more often: more copies, not fewer.',
    'More of the same reply adds copies, not new examples.',
  ],
};

export interface S {
  p1: number | null;
  t: Temp;
  run: Temp | null;
  counts: Partial<Record<string, Count>>;
  quiz: number | null;
}
const wrote = (s: S, t: Temp) => s.counts[t] !== undefined;

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration:
      'Synthetic data is text a model writes. Temperature sets how adventurous each word pick is: low plays safe.',
    act: 'Predict first.',
    say: { block: 'copier', text: 'The writer' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'cool',
    focus: 'write',
    visibleControls: ['p1', 'write', 'results'],
    narration: `Larkspur mini answers “${PROMPT}” twenty times, a few words each.`,
    act: `Write twenty at ${COOL}.`,
    predicate: s => wrote(s, COOL),
    hint: `Set the temperature to ${COOL}, press Write, and wait for twenty replies.`,
    solution: s => ({ ...s, t: COOL, run: COOL, counts: { ...s.counts, [COOL]: PIN[COOL] } }),
  },
  {
    id: 'hot',
    focus: 'write',
    visibleControls: ['write', 'results'],
    narration: `${PIN[COOL].topic} name a product. ${PIN[COOL].copies} is a copy: it repeats a reply already written.`,
    act: `Write twenty at ${HOT}.`,
    say: { block: 'copier', text: 'Safe picks' },
    predicate: s => wrote(s, HOT),
    hint: `Set the temperature to ${HOT} and press Write.`,
    solution: s => ({ ...s, t: HOT, run: HOT, counts: { ...s.counts, [HOT]: PIN[HOT] } }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out', 'results', 'quiz'],
    narration: `At ${HOT}: ${PIN[HOT].copies} copies, ${PIN[HOT].topic} naming a product, and words that wander. Heat buys variety and costs sense.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which way does temperature move the copies?',
  },
];

function Stage({ state, sync, say }: { state: S; sync: (s: S) => void; say?: Step<S>['say'] }) {
  const b = useBatch(PROMPT, state.run, done => {
    if (state.run !== null && !wrote(state, state.run))
      sync({ ...state, counts: { ...state.counts, [state.run]: count(done) } });
  });
  const writing = state.run !== null && !b.done;
  return (
    <CopierStage
      say={say}
      wait={b.status === 'error' ? <Waiting failed retry={b.retry} /> : undefined}
      room={{ gens: [], gen: null, arm: 'replace', real: 1, copying: writing }}
      caption={
        state.run === null
          ? `“${PROMPT}”`
          : `Temperature ${state.run}: ${b.batch.length} of ${BATCH} written, ${onTopic(b.batch)} naming a product.`
      }
    />
  );
}

/** The batch's replies, a copy and a reply naming a product marked as such. */
export function Replies({ batch }: { batch: number[][] }) {
  const v = sieve(batch, 'dedupe');
  return (
    <ol className="sd-replies" aria-label="The replies">
      {batch.map((r, i) => {
        const t = replyText(r),
          copy = v[i] !== 'kept',
          p = productIn(r);
        return (
          <li key={i} data-v={copy ? 'copy' : 'kept'}>
            <span className="v">{copy ? 'COPY' : p ? 'PRODUCT' : `#${i + 1}`}</span> “{t}”
          </li>
        );
      })}
    </ol>
  );
}

function Write({ state, apply }: { state: S; apply: (s: S) => void }) {
  const { status } = useModel();
  const busy = state.run !== null && !wrote(state, state.run) && batchNow(PROMPT, state.run) === undefined;
  return (
    <>
      <ListRange
        className="sd-range"
        label="Temperature"
        list={TEMPS}
        value={state.t}
        words={t => String(t)}
        onChange={t => apply({ ...state, t })}
      />
      <button
        type="button"
        className="big"
        style={{ marginTop: 10 }}
        disabled={status !== 'ready' || busy}
        onClick={() => apply({ ...state, run: state.t })}
      >
        Write twenty at {state.t}
      </button>
      <LoadLine status={status} />
    </>
  );
}

export default function AskTheModelToWrite() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, t: 1, run: null, counts: {}, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => <Stage state={state} sync={sync} say={say} />}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        write: ({ state, apply }) => <Write state={state} apply={apply} />,
        results: ({ state }) => (
          <>
            <table className="tc-ledger" style={{ marginTop: 10 }}>
              <caption>Each batch of {BATCH}</caption>
              <thead>
                <tr>
                  <th scope="col">Temperature</th>
                  <th scope="col">Name a product</th>
                  <th scope="col">Copies</th>
                </tr>
              </thead>
              <tbody>
                {TEMPS.filter(t => wrote(state, t)).map(t => (
                  <tr key={t} data-t={t} data-topic={state.counts[t]!.topic}>
                    <th scope="row">{t}</th>
                    <td>{state.counts[t]!.topic}</td>
                    <td>{state.counts[t]!.copies}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {state.run !== null && batchNow(PROMPT, state.run) && <Replies batch={batchNow(PROMPT, state.run)!} />}
            <ToyNote />
          </>
        ),
        out: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />
            <Fact id="holtzman-2019" />
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
