// Chapter 3: attention. The reader opens the live heatmap of layer 1, head 1, reads who looks at whom, predicts what
// the cells above the diagonal hold (the causal mask, read off every head on every prompt the chapter offers), then
// tries other prompts. The formula sits in a fold-away "the maths" note; nothing needs it.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import type { Model } from '../../lib/lm/model';
import { PROMPTS, trace } from '../../lib/transformers/trace';
import { fact } from '../../lib/transformers/facts';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { ENGINE_PARTS } from '../../components/scenes/engineScene';
import { Fact, TransformersStage, Waiting, useModel, whenLoaded, type View } from './kit';

const MODULE = 'transformers',
  ID = '03-attention';
/** The prompts the chapter offers; the long one is left for chapter 2 (it is too wide a grid for a phone). */
export const OFFERED = PROMPTS.filter(p => p.id !== 'long');
/** A prompt's text; an id no longer offered (a run saved before the list changed) falls back to the first. */
export const textOf = (id: string) => (OFFERED.find(p => p.id === id) ?? OFFERED[0]).text;
/** How many prompts the reader tries, the first included. */
const TRY = 3;
export const PARTS = ENGINE_PARTS;

/** 0 when every head gives every later token exactly 0 on every prompt offered, else 1: read off the traces. */
export function outcomeOf(m: Model): number {
  const ahead = OFFERED.flatMap(p =>
    trace(m, p.text)
      .attention.flat()
      .flatMap(rows => rows.flatMap((r, t) => r.slice(t + 1))),
  );
  return ahead.every(w => w === 0) ? 0 : 1;
}

interface S {
  view: View;
  prompt: string;
  seen: string[];
  p1: number | null;
  revealed: boolean;
  quiz: number | null;
}

const P1 = {
  question:
    'Look at the cells above the diagonal, where a token would look at a token that comes after it. What weight do they hold?',
  options: [
    'Always 0: a token never looks at a later one',
    'Small, but more than 0: a later token can still help a little',
    'It depends on the prompt',
  ],
};

export const QUIZ = {
  question:
    'Larkspur mini reads “Expedited delivery takes two business”. In this run, can the token “delivery” take anything from “business”?',
  options: [
    'No: “business” comes later, so “delivery” gives it a weight of 0',
    'Yes: attention looks at every token in the prompt, both ways',
    'Only in the second layer, after the first has read the whole prompt',
  ],
  correct: 0,
  explanation:
    'Under the causal mask, a token only weighs itself and the tokens before it, in every head of every layer.',
  why: [
    'Right: the mask sets every weight on a later token to 0, which lets the model predict the next token without seeing it.',
    'That is attention without a mask; you saw every cell above the diagonal hold 0, on every prompt, in every head.',
    'The mask holds in every layer, so a second-layer token reads only its own position and earlier ones.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'open',
    focus: 'view',
    visibleControls: ['open'],
    narration:
      'Attention lets tokens read each other: each weighs the tokens before it and takes in more from the heavier ones.',
    act: 'Open the Attention tab.',
    say: { block: 'focus', text: 'Weighed most' },
    predicate: whenLoaded(s => s.view === 'attn'),
    hint: 'Press “Attention” above the picture.',
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'Rows look, columns are looked at. Darker means more weight; each row’s weights add up to 1.',
    act: 'Predict the top right first.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['p1', 'reveal'],
    narration: 'Locked in.',
    act: 'Check every cell above the diagonal.',
    predicate: s => s.revealed,
  },
  {
    id: 'prompts',
    focus: 'prompts',
    visibleControls: ['out1', 'prompts'],
    narration: 'Every one is 0: the causal mask. A token only sees what came before, in training too.',
    act: 'Try other prompts.',
    predicate: s => s.seen.length >= TRY,
    hint: `Try ${TRY - 1} more prompts.`,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['maths', 'quiz'],
    narration: 'The weights change with every prompt: nobody wrote them, the model computes them from the vectors.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which cells held 0, on every prompt?',
  },
];

export default function Attention() {
  const { model } = useModel();
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      ready={!!model}
      initial={{ view: 'scene', prompt: OFFERED[0].id, seen: [OFFERED[0].id], p1: null, revealed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => (
        <TransformersStage
          say={say}
          prompt={textOf(state.prompt)}
          view={state.view}
          onView={v => sync({ ...state, view: v })}
          caption="Who looks at whom, in Larkspur mini’s first head. Weights computed live."
        />
      )}
      controls={{
        open: () => (model ? <p className="tc-status">The Attention tab is above the picture.</p> : <Waiting />),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        reveal: ({ state, apply }) => (
          <button type="button" className="chip" onClick={() => apply({ ...state, revealed: true, view: 'attn' })}>
            Check the cells above the diagonal
          </button>
        ),
        out1: ({ state }) =>
          model ? <Outcome {...P1} prediction={state.p1} outcome={outcomeOf(model)} /> : <Waiting />,
        prompts: ({ state, apply }) => (
          <>
            <div role="group" aria-label="Pick a prompt" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {OFFERED.map(p => (
                <button
                  key={p.id}
                  type="button"
                  className="chip"
                  aria-pressed={state.prompt === p.id}
                  onClick={() =>
                    apply({ ...state, prompt: p.id, view: 'attn', seen: [...new Set([...state.seen, p.id])] })
                  }
                >
                  {p.text}
                </button>
              ))}
            </div>
            <p className="tc-status" role="status">{`Tried ${state.seen.length} of ${TRY}.`}</p>
          </>
        ),
        maths: () => (
          <details className="tc-def">
            <summary>The maths (optional)</summary>
            <p>
              Each token makes three vectors from its own: a query (what it looks for), a key (what it offers) and a
              value (what it passes on). A token’s query is scored against every key it may see; the scores become
              weights that add up to 1; the weights mix the values.
            </p>
            <p>
              <code>{fact('attention-formula').value}</code>
            </p>
            <Fact id="attention-formula" />
          </details>
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
