// Chapter 2: fill the blanks. The toy masked model (live, bidirectional) guesses one hidden token in a handbook phrase,
// reading both sides of it: its top five with their confidence, the real token marked. Then a whole reply of 16 blanks:
// one pass guesses every blank at once, each slot glowing with its confidence, nothing stamped yet.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { forward, softmax, type Model } from '../../lib/lm/model';
import { L, MASK, passOnce, pct, show, startFill, text, type Guess } from '../../lib/diffusion-llms/decode';
import { FRAME_PARTS } from '../../components/scenes/typeFrameScene';
import { Outcome } from '../tool-calling/kit';
import { FrameStage, ToyNote, Waiting, phrase, useModel } from './kit';

const MODULE = 'diffusion-llms',
  ID = '02-fill-the-blanks';
export const PARTS = FRAME_PARTS;
/** The handbook phrase with one token hidden (data/diffusion-llms/prompts.json: its real token is in the top 5). */
export const SEED = 9;
const P = phrase(SEED);

/** The blank's five likeliest tokens, [MASK] ruled out. */
export function guessBlank(model: Model): Guess[] {
  const l = Float64Array.from(forward(model, P.maskedIds, { bidirectional: true }).logits[P.slot]);
  l[MASK] = -Infinity;
  const p = softmax(l);
  return Array.from(p, (v, tok) => ({ tok, p: v }))
    .sort((a, b) => b.p - a.p)
    .slice(0, 5);
}
/** One look at a reply of L blanks: every slot's best guess, nothing stamped. */
export function lookOnce(model: Model): Guess[] {
  return passOnce(model, startFill(P.ids, 1, 'confidence', SEED)).guesses.map(g => g!);
}

export interface S {
  p1: number | null;
  top: Guess[] | null;
  look: Guess[] | null;
  quiz: number | null;
}

const P1 = {
  question: 'Which words can the masked model use to guess the blank?',
  options: [
    'Only the words before it',
    'The words on both sides of it',
    'None: it guesses from how often words appear',
  ],
};

export const QUIZ = {
  question: 'A masked model sees “The order ships [blank] Friday.” What helps it fill the blank?',
  options: [
    'Both “ships” before it and “Friday” after it',
    'Only “ships”: models read left to right',
    'Neither: blanks are filled at random',
  ],
  correct: 0,
  explanation: 'A masked model reads every slot at once, so the words after a blank count as much as the words before.',
  why: [
    'Right: “Friday” after the blank points to “on” as much as “ships” does.',
    'That is a left-to-right model like Larkspur mini; a masked model sees the whole window.',
    'Each guess comes from the words around the blank, with a confidence for every token.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration:
      'The frame holds a handbook phrase with one token hidden: a blank. Larkspur’s toy masked model reads every slot at once.',
    act: 'Predict first.',
    say: { block: 'frame', text: 'One blank' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'guess',
    focus: 'guess',
    visibleControls: ['guess'],
    narration: 'It guesses the blank from both sides. Each guess has a confidence; the glow on the slug grows with it.',
    act: 'Guess the blank.',
    say: { block: 'frame', text: 'Both sides' },
    predicate: s => s.top !== null,
  },
  {
    id: 'look',
    focus: 'look',
    visibleControls: ['top', 'look'],
    narration: `Now a whole reply of ${L} blanks. One pass guesses every blank at once, each with its own confidence.`,
    act: `Look at all ${L} blanks.`,
    say: { block: 'press', text: 'One pass' },
    predicate: s => s.look !== null,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['looked', 'quiz'],
    narration: 'A few guesses glow bright, most faintly. Keeping them all at once would keep the weak ones too.',
    act: 'One question to finish.',
    say: { block: 'frame', text: 'Bright and faint' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Where do the words that help it sit: before the blank, after it, or both?',
  },
];

const masked = text(P.maskedIds);
function Stage({ state, say }: { state: S; say?: Step<S>['say'] }) {
  const best = state.top?.[0];
  return (
    <FrameStage
      say={say}
      shown={{
        given: P.ids.length,
        hole: { at: P.slot, slot: best ? { state: 'new', ...best } : { state: 'mask', tok: MASK, p: 0 } },
        slots: state.look ? state.look.map(g => ({ state: 'mask', ...g })) : [],
        pass: state.look ? 1 : undefined,
        passes: state.look ? 1 : undefined,
        caption: state.look
          ? `One pass over ${L} blanks: every slot guessed, none kept yet. Best guesses: “${text(state.look.map(g => g.tok))}”`
          : best
            ? `“${masked}”: the blank’s best guess is “${show(best.tok)}” at ${pct(best.p)}.`
            : `“${masked}”`,
      }}
    />
  );
}

function Guesses({ top }: { top: Guess[] }) {
  return (
    <table className="tc-ledger" style={{ marginTop: 10 }}>
      <caption>The blank’s five likeliest tokens</caption>
      <thead>
        <tr>
          <th scope="col">Token</th>
          <th scope="col">Confidence</th>
        </tr>
      </thead>
      <tbody>
        {top.map(g => (
          <tr key={g.tok} data-real={g.tok === P.expected ? '1' : '0'}>
            <th scope="row">
              “{show(g.tok)}”{g.tok === P.expected && ' · the real token'}
            </th>
            <td>{pct(g.p)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** A button that runs `run` on the toy masked model once it is in. */
function Run({ label, run }: { label: string; run: (m: Model) => void }) {
  const { model, status, retry } = useModel('mlm');
  if (!model) return <Waiting w="mlm" failed={status === 'error'} retry={retry} />;
  return (
    <button type="button" className="big" onClick={() => run(model)}>
      {label}
    </button>
  );
}

export default function FillTheBlanks() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, top: null, look: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => <Stage state={state} say={say} />}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        guess: ({ state, sync }) => <Run label="Guess the blank" run={m => sync({ ...state, top: guessBlank(m) })} />,
        top: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={1} />
            {state.top && <Guesses top={state.top} />}
          </>
        ),
        look: ({ state, sync }) => (
          <Run label={`Look at ${L} blanks`} run={m => sync({ ...state, look: lookOnce(m) })} />
        ),
        looked: ({ state }) => (
          <>
            {state.top && <Guesses top={state.top} />}
            <ToyNote />
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
