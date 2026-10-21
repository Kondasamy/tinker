// Chapter 6: valid isn't right. The mask forces a value the model doesn't know (the order number, the days to arrive):
// the answers pass the check and are wrong. Then a schema too long for the window is cut off. Refusals and cut-offs at
// real providers come from facts. Every answer is read off the live runs.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import type { Model } from '../../lib/lm/model';
import { checkText } from '../../lib/structured-outputs/grammar';
import { play, run, schemaOf } from '../../lib/structured-outputs/prompts';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Answer, Fact, PinnedStage, Waiting, useModel, whenLoaded } from './kit';

const MODULE = 'structured-outputs', ID = '06-valid-isnt-right';
export const SHOWN = [run('order'), run('days'), run('cutoff')];
/** The order number the prompt names, read off the prompt. */
export const ORDER = Number(/\d+/.exec(SHOWN[0].prompt)![0]);

const result = (model: Model, i: number) => {
  const r = SHOWN[i], d = play(model, r).decoded, c = d.status === 'done' ? checkText(schemaOf(r)!, d.text) : null;
  return { run: r, text: d.text, status: d.status, check: c, tokens: d.prompt.length + d.ids.length };
};
/** 0: 1042, 1: a valid integer but not 1042, 2: not valid. */
export function answerOf(model: Model) {
  const r = result(model, 0);
  if (!r.check?.ok) return 2;
  return (r.check.value as { order: number }).order === ORDER ? 0 : 1;
}

interface S { p1: number | null; shown: number; quiz: number | null }

const P1 = {
  question: `The schema asks for one field, order, a whole number. The prompt is “${SHOWN[0].prompt}”. What will Larkspur mini write?`,
  options: [`{"order":${ORDER}}`, `A valid whole number, but not ${ORDER}`, 'Something the check rejects'],
};

const QUIZ = {
  question: 'Every answer from Larkspur’s new assistant passes the schema check. Can the team report that the assistant is right 100% of the time?',
  options: [
    'Yes: a valid answer is a right answer',
    'No: the check says the shape is right, not the values. Whether they are true needs its own test, against what really happened',
    'Yes, as long as the schema has no free-text fields',
    'No, because the check itself is often wrong',
  ],
  correct: 1,
  explanation: 'A schema check (and a mask) guarantees the shape. Correctness is a separate question, answered by comparing values with the truth, which is what Evals is about.',
  why: [
    `You just saw a valid answer give order ${ORDER} the wrong number. The mask forces some value; it can’t force the true one.`,
    'Right. Valid and right are two measurements. A mask gets the first to 100%; only knowledge, tools and tests move the second.',
    'Numbers and lists were forced just the same: the order number and the status were valid and wrong.',
    'The check did exactly its job: the shape was right. The problem is asking it a question it doesn’t answer.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict', focus: 'p1', visibleControls: ['p1'],
    narration: 'Every answer passes the check now. The team asks for one more field, the order number, so the order system can match the answer to an order. The prompt even names it. Before you run it:',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'reveal', focus: 'reveal', visibleControls: ['p1', 'reveal'],
    narration: 'Locked in. Run it, then ask for the days the order will take to arrive.',
    predicate: whenLoaded(s => s.shown >= 2),
    hint: 'Press the button twice: the order number, then the days.',
  },
  {
    id: 'cutoff', focus: 'cutoff', visibleControls: ['out1', 'cutoff'],
    narration: 'Both pass the check. Both are wrong: Larkspur mini has no idea what order 1042 is or when it will arrive, and the mask made it write a number anyway. A mask forces a value; it can’t make one true. One more way an answer can fail the schema even under a mask: run out of room.',
    predicate: whenLoaded(s => s.shown >= 3),
    hint: 'Press “Ask for status and days together”.',
  },
  {
    id: 'quiz', focus: 'quiz', visibleControls: ['cut', 'quiz'],
    narration: 'With two fields the answer needs more tokens than Larkspur mini’s window has left, so it stopped mid-answer: cut off, and not valid JSON. Real providers have the same edge, at their output limit; and a refusal comes back in a form that may not follow your schema either. One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What does the check look at: the shape, or the truth?',
  },
];

function Shown({ i }: { i: number }) {
  const { model } = useModel();
  if (!model) return <Waiting />;
  const r = result(model, i);
  return (
    <div data-shown={r.run.id}>
      <Answer label={`Asked: ${Object.keys(schemaOf(r.run)!.properties).join(' and ')}`} text={r.text} />
      <p className="tc-status">{r.status === 'cut-off' ? `Cut off: the window was full (${r.tokens} of 32 tokens) before the answer closed. It doesn’t parse.` : r.check?.ok ? 'The check passes: valid.' : `The check fails: ${r.check?.errors.join('; ')}`}</p>
    </div>
  );
}

export default function ValidIsntRight() {
  const { model } = useModel();
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      ready={!!model}
      initial={{ p1: null, shown: 0, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state }) => (
        <PinnedStage id={SHOWN[Math.max(0, state.shown - 1)].id} at={state.shown ? 32 : 0}
          caption={state.shown ? `The schema asks for ${Object.keys(schemaOf(SHOWN[state.shown - 1])!.properties).join(' and ')}.` : 'The schema asks for order, a whole number.'} />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        reveal: ({ state, apply }) => (
          <>
            {Array.from({ length: Math.min(state.shown, 2) }, (_, i) => <Shown key={i} i={i} />)}
            <button type="button" className="big" disabled={!model || state.shown >= 2} onClick={() => apply({ ...state, shown: state.shown + 1 })}>
              {state.shown ? 'Ask for days to arrive' : 'Ask for the order number'}
            </button>
            {!model && <Waiting />}
          </>
        ),
        out1: ({ state }) => model ? (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={answerOf(model)} />
            <Shown i={0} />
            <Shown i={1} />
          </>
        ) : <Waiting />,
        cutoff: ({ state, apply }) => (
          <button type="button" className="big" disabled={!model} onClick={() => apply({ ...state, shown: 3 })}>Ask for status and days together</button>
        ),
        cut: () => <Shown i={2} />,
        quiz: ({ state, apply, sync }) => (
          <>
            <Fact id="anthropic-max-tokens" />
            <Fact id="anthropic-refusal" />
            <Fact id="openai-refusal" />
            <Quiz {...QUIZ} unsure value={state.quiz} onAnswer={(_, q) => apply({ ...state, quiz: q })} onUnsure={() => sync({ ...state, quiz: UNSURE })} />
          </>
        ),
      }}
    />
  );
}
