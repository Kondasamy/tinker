// Chapter 2: a schema is a contract. The host checks each answer against the schema after it is written (Tool calling's
// checks, plus the length cap), and a failed check means a retry: three tries drawn with seeds 1 to 3, every token paid
// for again. The count of passing tries is read off the live runs, never typed.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import type { Model } from '../../lib/lm/model';
import { checkText } from '../../lib/structured-outputs/grammar';
import { SCHEMAS, play, run } from '../../lib/structured-outputs/prompts';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Answer, Fact, PinnedStage, Waiting, useModel, whenLoaded } from './kit';

const MODULE = 'structured-outputs', ID = '02-a-schema-is-a-contract';
export const SCHEMA = SCHEMAS.status;
export const TRIES = [1, 2, 3].map(i => run(`retry-${i}`));

/** Each try's answer, its check and the tokens it cost. */
export const triesOf = (model: Model) => TRIES.map(r => {
  const d = play(model, r).decoded;
  return { text: d.text, tokens: d.ids.length, check: checkText(SCHEMA, d.text) };
});
/** 0: all three pass, 1: one or two, 2: none. */
export function answerOf(model: Model) {
  const n = triesOf(model).filter(t => t.check.ok).length;
  return n === 3 ? 0 : n > 0 ? 1 : 2;
}

interface S { read: boolean; p1: number | null; tries: number; quiz: number | null }

const P1 = {
  question: `The host checks each answer against the schema and asks again when the check fails, up to ${TRIES.length} tries. Each try draws its tokens afresh. How many of the ${TRIES.length} pass?`,
  options: ['All of them', 'One or two', 'None'],
};

const QUIZ = {
  question: 'Larkspur’s assistant moves to a big provider model that passes the check 99 times in 100. The team keeps the check and one retry. What have they bought?',
  options: [
    'A guarantee: with a retry, every answer passes',
    'A safety net: bad answers are caught and retried, at the cost of more tokens and time, and a retry can fail again',
    'Nothing: a check after the answer can’t catch anything',
    'Faster answers, since the check runs before the model writes',
  ],
  correct: 1,
  explanation: 'A check after the answer catches a bad answer; it can’t prevent one. Every retry is a whole new answer, paid for again, and it can fail too.',
  why: [
    'A retry is another draw from the same model. It usually passes; nothing makes it pass. Twice unlucky still breaks the order system.',
    'Right. The check is worth keeping, but it works after the fact, so its price is retries, and its promise is “caught”, not “never”.',
    'It catches exactly what you saw here: answers that don’t parse or break the schema. Catching isn’t preventing, which is the next chapter’s job.',
    'The check reads a finished answer; it runs after every token is written and paid for.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'schema', focus: 'schema', visibleControls: ['schema'],
    narration: 'The team writes down what the order system expects, as a schema: the same small subset of JSON Schema Tool calling checks tool arguments with. One field, status, whose value must be on time or delayed, and nothing else.',
    predicate: whenLoaded(s => s.read),
    hint: 'Press the button under the schema.',
  },
  {
    id: 'predict', focus: 'p1', visibleControls: ['p1'],
    narration: 'The host now checks every answer after it is written. A failed check means asking again. Before the tries run:',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'retry', focus: 'retry', visibleControls: ['p1', 'retry'],
    narration: `Run the tries, one at a time. Each is a draw at temperature 1 with its own seed, so each answer differs. Watch the check and the tokens each try costs.`,
    predicate: s => s.tries >= TRIES.length,
    hint: `Press the button ${TRIES.length} times.`,
  },
  {
    id: 'quiz', focus: 'quiz', visibleControls: ['out1', 'quiz'],
    narration: 'Every token of every try was paid for, and the order system still has nothing it can read. A check after the answer can only say no. Larkspur mini is extreme: it never saw JSON. Bigger models pass far more often, but a retry loop has the same shape for them. One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'When does the check run: before the model writes, or after?',
  },
];

export default function ASchemaIsAContract() {
  const { model } = useModel();
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      ready={!!model}
      initial={{ read: false, p1: null, tries: 0, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state }) => (
        <PinnedStage id={TRIES[Math.max(0, state.tries - 1)].id} masked={false} at={state.tries ? 32 : 0}
          caption={state.tries ? `Try ${state.tries} of ${TRIES.length}: no schema while it writes; the check comes after.` : `The prompt: “${TRIES[0].prompt}”`} />
      )}
      controls={{
        schema: ({ state, apply }) => (
          <>
            <Answer label="The schema (JSON Schema)" text={JSON.stringify(SCHEMA, null, 2)} />
            <button type="button" className="big" disabled={!model} onClick={() => apply({ ...state, read: true })}>Use it to check every answer</button>
            {!model && <Waiting />}
          </>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        retry: ({ state, apply }) => {
          if (!model) return <Waiting />;
          const tries = triesOf(model).slice(0, state.tries);
          const spent = tries.reduce((n, t) => n + t.tokens, 0);
          return (
            <>
              {tries.map((t, i) => (
                <div key={i} data-try={i + 1}>
                  <Answer label={`Try ${i + 1}: ${t.tokens} tokens`} text={t.text} />
                  <p className="tc-status">{t.check.ok ? 'The check passes.' : `The check fails: ${t.check.errors.join('; ')}.`}</p>
                </div>
              ))}
              <button type="button" className="big" disabled={state.tries >= TRIES.length} onClick={() => apply({ ...state, tries: state.tries + 1 })}>
                {state.tries ? 'Check failed: try again' : 'Run the first try'}
              </button>
              <p className="tc-status" role="status" data-testid="spent">{`Tries: ${state.tries} of ${TRIES.length} · tokens written: ${spent}`}</p>
            </>
          );
        },
        out1: ({ state }) => model ? <Outcome {...P1} prediction={state.p1} outcome={answerOf(model)} /> : <Waiting />,
        quiz: ({ state, apply, sync }) => (
          <>
            <Quiz {...QUIZ} unsure value={state.quiz} onAnswer={(_, q) => apply({ ...state, quiz: q })} onUnsure={() => sync({ ...state, quiz: UNSURE })} />
            <Fact id="openai-vs-json-mode" />
          </>
        ),
      }}
    />
  );
}
