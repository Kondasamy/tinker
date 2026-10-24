// Chapter 6: the same trick everywhere. The shelves stay on the stage while the story column carries the idea into
// model serving: a provider's prompt cache and a reply's KV cache, each read through the same three questions (what is
// kept, where, and what makes it unusable), with links to the Context and Inference chapters that teach them.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { MOMENTS, TTLS, clock, policyOf, runOf } from '../../lib/caching/sim';
import { DEPOT_PARTS, depotAt } from '../../components/scenes/depotScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { CachingStage, Fact } from './kit';

const MODULE = 'caching',
  ID = '06-the-same-trick';
export const PARTS = DEPOT_PARTS;
const DAY = TTLS.at(-1)!,
  AT = MOMENTS.sale + 4;
const RUN = runOf(policyOf({ ttl: { price: DAY, photo: DAY, stock: TTLS[1] }, purge: true, coalesce: true }));
export const LINKS = { context: '/context/04-order-for-the-cache/', inference: '/inference/02-kv-cache-at-scale/' };

export const P1 = {
  question:
    'Your assistant’s next call changes one word in the first line of its prompt. What does the prompt cache do?',
  options: [
    'Misses: a hit needs the prompt identical up to the cached point',
    'Hits: one word is too small a change to matter',
    'Hits, and sends back the previous reply',
  ],
};
export const P2 = {
  question: 'When does a reply’s KV cache stop being useful?',
  options: [
    'When the reply ends: the next request has tokens of its own',
    'After a TTL of five minutes',
    'Never: every customer shares it',
  ],
};
/** what the sources say: a hit needs an identical prefix; a request's KV cache grows and shrinks with it */
export const OUTCOMES = [0, 0];

export const QUIZ = {
  question:
    'An assistant’s system prompt starts with today’s date, which changes at midnight. Its long instructions follow. What happens to prompt caching, and what is the fix?',
  options: [
    'Every call after midnight misses until the new prompt is cached; put the date after the instructions',
    'Nothing: a prompt cache ignores dates',
    'Calls after midnight get yesterday’s replies from the cache',
  ],
  correct: 0,
  explanation:
    'Like a shelf copy, a prompt cache entry is only usable while what it copied is unchanged, from the start.',
  why: [
    'Right: the change is at the very start, so nothing after it matches; put what changes last and the instructions stay cached.',
    'The cache matches text exactly, and a date is text like any other.',
    'A prompt cache keeps the work of reading the prompt, not replies, so it can’t hand back an old answer.',
  ],
};

interface S {
  p1: number | null;
  p2: number | null;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'prompt',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'Model providers keep copies too. A prompt cache keeps the work done reading a prompt’s opening.',
    act: 'Predict what breaks a hit.',
    say: { block: 'north', text: 'Kept nearby' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'kv',
    focus: 'p2',
    visibleControls: ['out1', 'p2'],
    narration: 'A KV cache keeps the keys and values of tokens a model already read, for one reply.',
    act: 'Predict how long it lasts.',
    predicate: s => s.p2 !== null,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out2', 'table', 'quiz'],
    narration: 'Every cache answers the same questions: what to keep, where, and what makes a copy wrong.',
    act: 'One question to finish.',
    say: { block: 'depot', text: 'The origin' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Where in the prompt does the change sit, and what has to match for a hit?',
  },
];

function Table() {
  return (
    <table className="tc-ledger">
      <caption>Three caches, one idea</caption>
      <thead>
        <tr>
          <th scope="col">Cache</th>
          <th scope="col">Keeps</th>
          <th scope="col">Unusable when</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">Warehouse shelf</th>
          <td>a copy of a page</td>
          <td>its TTL runs out, or a purge drops it</td>
        </tr>
        <tr>
          <th scope="row">
            <a href={LINKS.context}>Prompt cache</a>
          </th>
          <td>the work of reading a prompt’s opening</td>
          <td>the opening changes, or it goes unused past its lifetime</td>
        </tr>
        <tr>
          <th scope="row">
            <a href={LINKS.inference}>KV cache</a>
          </th>
          <td>each read token’s keys and values</td>
          <td>its reply ends</td>
        </tr>
      </tbody>
    </table>
  );
}

export default function TheSameTrick() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, p2: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ say }) => (
        <CachingStage
          say={say}
          show={{
            scene: depotAt(RUN, AT),
            result: RUN,
            tick: AT,
            caption: `${clock(AT)}: Larkspur’s shelves after the sale, with chapters 4 and 5’s fixes.`,
          }}
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={OUTCOMES[0]} />
            <Fact id="prompt-cache-match" />
            <Fact id="prompt-cache-lifetime" />
          </>
        ),
        p2: ({ state, apply }) => <Predict {...P2} value={state.p2} onPredict={i => apply({ ...state, p2: i })} />,
        out2: ({ state }) => (
          <>
            <Outcome {...P2} prediction={state.p2} outcome={OUTCOMES[1]} />
            <Fact id="kv-cache" />
          </>
        ),
        table: () => (
          <>
            <Table />
            <p className="note ca-note">
              <a href={LINKS.context}>Context engineering, chapter 4</a> orders a prompt for the cache;{' '}
              <a href={LINKS.inference}>Inference engineering, chapter 2</a> sizes the KV cache on a real server.
            </p>
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
