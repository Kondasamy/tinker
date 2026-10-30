// Chapter 4: a machine that guesses the next word (KTD5), at what-changed altitude (R15). Larkspur mini, a toy, reads
// a line of Larkspur's refund policy; the reader predicts its next word, then sees its top 5 live. The answer is read
// off the model, never typed. How it works stays in Transformers chapter 1, which the last reveal links.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import { KIOSK_PARTS } from '../../components/scenes/kioskScene';
import { pieceLabel } from '../../components/scenes/attentionMap';
import { messageOf, run } from '../../lib/before-genai/bots';
import type { Model } from '../../lib/lm/model';
import { trace } from '../../lib/transformers/trace';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { useModel, whenLoaded } from '../transformers/kit';
import { BeforeGenaiStage, type Deeper, Fact, GoDeeper, MiniGate, MiniNote } from './kit';

const MODULE = 'before-genai',
  ID = '04-next-word';
export const PARTS = KIOSK_PARTS;
const IDLE = run(messageOf('where-order'));
/** A line from data/corpus/refund-policy-2025.md (a test holds its expected next word in Larkspur mini's top 5). */
export const PROMPT = { text: 'Standard customers may request a refund within 30', expected: ' days' };
/** The prediction's options: single tokens of Larkspur mini's vocabulary (a test holds that). */
export const PIECES = [' days', ' hours', ' business'];
export const DEEPER: readonly Deeper[] = [['transformers', 0]];
const word = (p: string) => `“${p.trim()}”`;

/** Larkspur mini's five likeliest next tokens after the prompt, with their chances. */
export const topOf = (model: Model) => trace(model, PROMPT.text).top.at(-1)!;
/** The option Larkspur mini rates likeliest. */
export function answerOf(model: Model): number {
  const top = topOf(model)[0].text;
  return PIECES.indexOf(top);
}

export interface S {
  p1: number | null;
  revealed: boolean;
  quiz: number | null;
}
export const INITIAL: S = { p1: null, revealed: false, quiz: null };

export const P1 = {
  question: `Larkspur mini has read “${PROMPT.text}”. Which word does it rate likeliest next?`,
  options: PIECES.map(word),
};

export const QUIZ = {
  question: 'How does a machine that only guesses the next word write a whole reply?',
  options: [
    'It adds its guess to the text and guesses again, word after word',
    'It looks the reply up in a list of fixed answers',
    'It plans the full reply first, then types it out',
  ],
  correct: 0,
  explanation: 'One guess gives one word; repeating it, each time on the longer text, writes the reply.',
  why: [
    'Right: each guess joins the text, and the model guesses again on the longer text.',
    'That was the script and the sorter; a language model keeps no list of replies.',
    'Each run gives only the next word, so the reply grows one word at a time.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration:
      'A language model guesses the word that comes next. Larkspur mini is a tiny one, trained on Larkspur’s documents.',
    act: 'Predict its guess.',
    say: { block: 'model', text: 'Larkspur mini' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['p1', 'reveal'],
    narration: 'Your pick is locked. Larkspur mini runs here, in your browser.',
    act: 'Run Larkspur mini.',
    predicate: whenLoaded(s => s.revealed),
    hint: 'Press Run Larkspur mini. If it is still loading, wait a moment.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'top', 'size', 'deeper', 'quiz'],
    narration:
      'It gave every word a chance. Add the likeliest to the text and guess again: word after word, guessing writes.',
    act: 'One question to finish.',
    say: { block: 'model', text: 'Odds for each' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'How many words does one guess give?',
  },
];

/** The top 5 as story-column lines: the word and its chance, from the live run. */
function Top({ model }: { model: Model }) {
  return (
    <dl className="bg-transcript" aria-label="Larkspur mini’s five likeliest next words">
      {topOf(model).map(c => (
        <div key={c.id} className="bg-line">
          <dt>{`“${pieceLabel(c.text)}”`}</dt>
          <dd>{`${(c.p * 100).toFixed(1)}%`}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function NextWord() {
  const { model } = useModel();
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      ready={!!model}
      initial={INITIAL}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => (
        <BeforeGenaiStage
          run={IDLE}
          say={say}
          caption={
            state.revealed && model
              ? `Larkspur mini’s likeliest next word: ${word(topOf(model)[0].text)}.`
              : 'The model machine holds Larkspur mini, a toy language model.'
          }
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        reveal: ({ state, apply }) => (
          <MiniGate>
            {m => (
              <Reveal
                prediction={state.p1 === null ? null : P1.options[state.p1]}
                outcome={P1.options[answerOf(m)]}
                revealed={state.revealed}
                onReveal={() => apply({ ...state, revealed: true })}
                label="Run Larkspur mini"
              />
            )}
          </MiniGate>
        ),
        out1: ({ state }) => (
          <MiniGate>{m => <Outcome {...P1} prediction={state.p1} outcome={answerOf(m)} />}</MiniGate>
        ),
        top: () => <MiniGate>{m => <Top model={m} />}</MiniGate>,
        size: () => (
          <>
            <MiniNote />
            <Fact id="few-shot" />
          </>
        ),
        deeper: () => <GoDeeper to={DEEPER} />,
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
