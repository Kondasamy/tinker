// Chapter 3: the mask. Larkspur mini writes under the status schema, one token at a time; at each step the schema allows
// some of the 768 tokens and blocks the rest, live. The prediction's answer is read off the run's first step.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import type { Model } from '../../lib/lm/model';
import { VOCAB_SIZE } from '../../lib/lm/bpe';
import { play, run } from '../../lib/structured-outputs/prompts';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Answer, Fact, PinnedStage, Waiting, pct, piece, useModel, whenLoaded, type View } from './kit';

const MODULE = 'structured-outputs', ID = '03-the-mask';
export const RUN = run('mask');
const decoded = (model: Model) => play(model, RUN).decoded;

/** 0: all, 1: about half, 2: one. */
export function answerOf(model: Model) {
  const n = decoded(model).steps[0].allowed.length;
  return n === VOCAB_SIZE ? 0 : n === 1 ? 2 : 1;
}

interface S { p1: number | null; revealed: boolean; at: number; view: View; quiz: number | null }

const P1 = {
  question: `Larkspur mini is about to write its first token, under a schema that wants {"status": …}. Of the ${VOCAB_SIZE} tokens it knows, how many will the schema allow?`,
  options: [`All ${VOCAB_SIZE}: the schema only checks the finished answer`, 'About half of them', 'Only one'],
};

const QUIZ = {
  question: 'At one step the model gives “.” a 60% chance, but the schema blocks it. What happens to that 60%?',
  options: [
    'The model writes “.” anyway, and the check fails later',
    'It is shared out among the allowed tokens, in proportion to their own chances, and the model picks from those',
    'The step is skipped and nothing is written',
    'The model is retrained until it prefers an allowed token',
  ],
  correct: 1,
  explanation: 'Blocked tokens get zero probability. What is left is scaled back up to 100%, so the allowed tokens keep their order and share what the blocked ones had.',
  why: [
    'A blocked token can’t be written at all: its probability is set to zero before the pick. That is the whole difference from checking afterwards.',
    'Right. The mask removes the blocked tokens, and the allowed ones are rescaled to add up to 100%. The model’s preferences among them still decide.',
    'Every step writes a token. If the schema allowed nothing the run would be stuck, which is why a schema compiler makes sure some token is always allowed.',
    'Nothing is trained. The weights stay as they are; only the choice at each step is limited.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict', focus: 'p1', visibleControls: ['p1'],
    narration: 'Checking after the fact only says no. So stop the bad tokens before they are written. A stencil plate now stands across the press’s belt: the schema. At each step it lets some tokens through and stops the rest. Before you look:',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'reveal', focus: 'reveal', visibleControls: ['p1', 'reveal'],
    narration: 'Locked in. The Mask tab shows all the tokens Larkspur mini knows as a grid, lit where the schema allows them.',
    predicate: whenLoaded(s => s.revealed),
    hint: 'Press the button to open the mask at step 1.',
  },
  {
    id: 'write', focus: 'write', visibleControls: ['out1', 'write'],
    narration: 'Now write, a token at a time. Watch the count of allowed tokens change: while the schema spells out {"status": almost nothing else fits, and at the value only tokens that start on time or delayed do. When the model’s own first choice is blocked, it stops at the plate and the model writes the likeliest allowed token instead.',
    predicate: s => s.at >= 99,
    hint: 'Press “Write the rest” to finish the answer.',
  },
  {
    id: 'quiz', focus: 'quiz', visibleControls: ['answer', 'quiz'],
    narration: 'The answer fits the schema, and it couldn’t have done anything else: no token the schema blocks can be written. Real engines compile the schema once and build the mask fast at every step. One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What probability does a blocked token get before the pick?',
  },
];

export default function TheMask() {
  const { model } = useModel();
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      ready={!!model}
      initial={{ p1: null, revealed: false, at: 0, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync }) => (
        <PinnedStage id={RUN.id} at={state.at} locked={state.p1 === null} view={state.view} onView={v => sync({ ...state, view: v })}
          caption={`The prompt: “${RUN.prompt}”. The schema: one field, status, on time or delayed.`} />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        reveal: ({ state, apply }) => (
          <>
            <button type="button" className="chip" disabled={!model} onClick={() => apply({ ...state, revealed: true, view: 'mask' })}>Show the mask at step 1</button>
            {!model && <Waiting />}
          </>
        ),
        out1: ({ state }) => model ? <Outcome {...P1} prediction={state.p1} outcome={answerOf(model)} /> : <Waiting />,
        write: ({ state, apply }) => {
          if (!model) return <Waiting />;
          const d = decoded(model), n = Math.min(state.at, d.ids.length), st = d.steps[n];
          return (
            <>
              <p className="tc-status" role="status" data-testid="mask-step">
                {st ? `Step ${n + 1}: ${st.allowed.length} of ${VOCAB_SIZE} allowed. The model’s first choice: ${piece(st.free.text)} (${pct(st.free.p)})${st.allowed.includes(st.free.id) ? ', allowed' : `, blocked; the mask took ${pct(st.blocked)} away`}. It writes ${piece(st.pick.text)}.`
                  : `Finished after ${d.ids.length} tokens: ${d.text}`}
              </p>
              <div className="so-row">
                <button type="button" className="big" disabled={n >= d.ids.length} onClick={() => apply({ ...state, at: n + 1 })}>Write the next token</button>
                <button type="button" className="chip" onClick={() => apply({ ...state, at: 99 })}>Write the rest</button>
              </div>
            </>
          );
        },
        answer: () => model ? <Answer label="Larkspur mini wrote, under the mask" text={decoded(model).text} /> : <Waiting />,
        quiz: ({ state, apply, sync }) => (
          <>
            <Quiz {...QUIZ} unsure value={state.quiz} onAnswer={(_, q) => apply({ ...state, quiz: q })} onUnsure={() => sync({ ...state, quiz: UNSURE })} />
            <Fact id="anthropic-guarantee" />
            <Fact id="llguidance" />
          </>
        ),
      }}
    />
  );
}
