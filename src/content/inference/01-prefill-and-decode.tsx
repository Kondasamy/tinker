// Chapter 1: prefill and decode. One request runs live on Larkspur mini: one pass reads the whole prompt (prefill) and
// picks the first token; each later token takes a pass of its own (decode). Times come from the simulated server's cost
// model over the same token counts, on the open model's published shape (R6: a cost model, never measured).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { decode, encode } from '../../lib/lm/bpe';
import type { Model } from '../../lib/lm/model';
import { greedy } from '../../lib/inference/speculate';
import { OPEN, iterationMs } from '../../lib/inference/server';
import { ms } from '../../components/scenes/serverTimeline';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import P from '../../../data/inference/prompts.json' with { type: 'json' };
import { CostModelNote, Fact, InferenceStage, ModelGate, modelNow } from './kit';

const MODULE = 'inference',
  ID = '01-prefill-and-decode';
export const PROMPT = P.prompts.find(p => p.id === 'reply')!.text;
export const IDS = encode(PROMPT);
/** the reply's length: as many tokens as the prompt has */
export const N = IDS.length;
/** time to first token and time per token on the simulated server, for a prompt of n tokens */
export const ttftOf = (n: number) => iterationMs(OPEN, [n], []);
export const tpotOf = (n: number) => iterationMs(OPEN, [], [n]);
/** writing N tokens against reading the N-token prompt */
export const writeOf = () => Array.from({ length: N - 1 }, (_, i) => tpotOf(N + i)).reduce((a, b) => a + b, 0);
/** the longer prompts the chapter compares */
export const LONG = [N, 100, 500, 1000];

const P1 = {
  question: `Larkspur mini read the ${N}-token prompt in one pass. It will now write ${N} tokens. Compared with reading the prompt, writing them takes:`,
  options: [
    'About the same: it is the same number of tokens',
    `About ${N} times as long: each token it writes needs a pass of its own`,
    'Much less: writing is easier than reading',
  ],
};
/** which option the counted times match */
export function outcomeOf(): number {
  const r = (ttftOf(N) + writeOf()) / ttftOf(N);
  return r > 3 ? 1 : r > 0.5 ? 0 : 2;
}

const QUIZ = {
  question:
    'A customer pastes a 2,000-word contract and asks for a one-line summary. Another asks a one-line question and gets a 2,000-word answer. Which waits longer for the first word, and which waits longer for the whole reply?',
  options: [
    'The contract waits longer for the first word; the long answer waits longer for the whole reply',
    'Both wait the same: they move the same amount of text',
    'The long answer waits longer for the first word, because the model plans the whole reply first',
    'The contract waits longer for both: reading is the slow part',
  ],
  correct: 0,
  explanation:
    'The first word waits for the prefill, which grows with the prompt. The whole reply waits for one decode pass per token, which grows with the reply.',
  why: [
    'Right. A long prompt makes a long prefill, so a late first word; a long reply makes many decode passes, so a long wait for the end.',
    'Prompt tokens are read all together in one pass; reply tokens are written one pass each. The same amount of text costs very different time.',
    'The model doesn’t plan ahead: it writes one token per pass, and the first token comes right after the prompt is read.',
    'Reading is the cheap part per token: the whole prompt goes through in one pass. The 2,000-word answer needs thousands of passes.',
  ],
};

interface S {
  read: boolean;
  written: number;
  p1: number | null;
  long: boolean;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'read',
    focus: 'run',
    visibleControls: ['run'],
    narration: `A customer’s request has arrived: “${PROMPT}”. Larkspur mini runs in your browser. Press Read the prompt: one forward pass reads all ${N} tokens at once and scores the next one. That pass is the prefill.`,
    predicate: s => !!modelNow('base') && s.read,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['run', 'p1'],
    narration: 'The first token is out. The rest of the reply comes one token per pass: decode. Before it runs:',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'reveal',
    focus: 'run',
    visibleControls: ['p1', 'run'],
    narration: `Locked in. Write the reply, ${N} tokens.`,
    predicate: s => s.written >= N,
  },
  {
    id: 'long',
    focus: 'long',
    visibleControls: ['out1', 'long'],
    narration:
      'One pass read the whole prompt; each reply token needed its own. A decode pass reads every weight to write one token, so its cost barely depends on the reply so far. Now make the prompt longer, as a customer pasting an order history would.',
    predicate: s => s.long,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['long', 'quiz'],
    narration:
      'A longer prompt makes a longer prefill, so a later first token. The time per token stays nearly flat. Two numbers, two causes. One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which pass does a long prompt slow down, and which does a long reply multiply?',
  },
];

/** The reply so far, live: the first token from the prefill, then one per decode pass. */
function Run({ model, s, apply }: { model: Model; s: S; apply: (s: S) => void }) {
  const out = greedy(model, IDS, N),
    shown = s.read ? Math.max(1, s.written) : 0,
    passes = shown;
  const can = s.read && (s.p1 !== null || s.written >= N);
  return (
    <>
      <p className="tc-status" data-reply>
        {`“${PROMPT}`}
        <strong>{decode(out.slice(0, shown))}</strong>”
      </p>
      <table className="tc-ledger">
        <caption>Counted live on Larkspur mini</caption>
        <tbody>
          <tr>
            <th scope="row">Forward passes</th>
            <td>{passes}</td>
          </tr>
          <tr>
            <th scope="row">Tokens read in the first pass</th>
            <td>{s.read ? N : 0}</td>
          </tr>
          <tr>
            <th scope="row">Reply tokens written</th>
            <td>
              {shown} of {N}
            </td>
          </tr>
        </tbody>
      </table>
      {!s.read && (
        <button type="button" className="big" onClick={() => apply({ ...s, read: true, written: 1 })}>
          Read the prompt (prefill)
        </button>
      )}
      {s.read && s.written < N && (
        <button
          type="button"
          className="big"
          disabled={!can}
          onClick={() => apply({ ...s, written: N })}
        >{`Write the next ${N - shown} tokens (decode)`}</button>
      )}
    </>
  );
}

/** Time to first token and per token for prompts of growing length, on the simulated server. */
function Times({ long }: { long: boolean }) {
  return (
    <table className="tc-ledger">
      <caption>On the simulated server, the open model’s shape</caption>
      <thead>
        <tr>
          <th scope="col">Prompt</th>
          <th scope="col">First token</th>
          <th scope="col">Each later token</th>
        </tr>
      </thead>
      <tbody>
        {(long ? LONG : LONG.slice(0, 1)).map(n => (
          <tr key={n}>
            <th scope="row">{n.toLocaleString('en-US')} tokens</th>
            <td>{ms(ttftOf(n))}</td>
            <td>{ms(tpotOf(n))}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function PrefillAndDecode() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      ready={!!modelNow('base')}
      initial={{ read: false, written: 0, p1: null, long: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state }) => (
        <InferenceStage
          weights={['base']}
          show={() => ({
            scene: {
              seats: [state.written >= N ? 'empty' : !state.read ? 'empty' : state.written > 1 ? 'decode' : 'prefill'],
              queued: state.read ? 0 : 1,
              kv: 0,
            },
            caption: !state.read
              ? 'One request waits on the belt; the server has one seat.'
              : state.written >= N
                ? `The reply is done: 1 prefill pass, then ${N - 1} decode passes.`
                : 'The prefill pass read the whole prompt and picked the first token.',
          })}
        />
      )}
      controls={{
        run: ({ state, apply }) => (
          <ModelGate weights={['base']}>{m => <Run model={m.base!} s={state} apply={apply} />}</ModelGate>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />
            <p className="tc-status">{`On the simulated server: the prompt took ${ms(ttftOf(N))}; the ${N - 1} tokens after the first took ${ms(writeOf())}.`}</p>
            <Fact id="prefill-parallel" />
            <Fact id="decode-memory-bound" />
          </>
        ),
        long: ({ state, apply }) => (
          <>
            <Times long={state.long} />
            {!state.long && (
              <button type="button" className="chip" onClick={() => apply({ ...state, long: true })}>
                Try longer prompts
              </button>
            )}
            <CostModelNote />
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
