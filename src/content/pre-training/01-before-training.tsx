// Chapter 1: before training. The reader opens the step-0 checkpoint (Larkspur mini's random starting weights, fetched
// live), predicts what it will write, asks it to finish a Larkspur prompt, and reads its top 5 next pieces: each about
// as likely as any other piece in the vocabulary.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { CKPT, PROMPTS, says, top5 } from '../../lib/pre-training/engine';
import { FORGE_PARTS } from '../../components/scenes/forgeScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { CkptGate, PreTrainingStage, Says, Top5 } from './kit';

const MODULE = 'pre-training',
  ID = '01-before-training';
/** the prompt chapters 1 and 2 ask: “Returns are accepted within” */
export const PROMPT = 2;
const VOCAB = CKPT.model.vocab.toLocaleString('en-US');

interface S {
  opened: boolean;
  p1: number | null;
  asked: boolean;
  odds: boolean;
  quiz: number | null;
}

export const P1 = {
  question: `Ask it to finish “${PROMPTS[PROMPT].text}”. What will the step-0 checkpoint write?`,
  options: [
    'A plausible ending, like a number of days',
    'The same few pieces, over and over, making no sense',
    'Nothing at all: it can’t run before training',
    'The prompt again, word for word',
  ],
};

export const QUIZ = {
  question:
    'A lab sets up a brand-new model and, before a single training step, asks it to finish “The capital of France is”. What comes back?',
  options: [
    'Gibberish: the weights are random, so no next piece is favoured over another',
    '“Paris”, phrased badly: every model starts out knowing basic facts',
    'An error: an untrained model can’t produce text',
    'Grammatical but wrong English: grammar is built in before training',
  ],
  correct: 0,
  explanation: 'Before training, the weights are random numbers, so the model has no reason to prefer any next piece.',
  why: [
    'Right: random weights give every piece about the same odds, so what comes out is noise.',
    'Facts come only from training: a model before its first step has read nothing at all.',
    'It runs fine; the same arithmetic runs on random numbers, it just produces noise.',
    'Grammar is learnt from text like everything else, so it isn’t there before training either.',
  ],
};

/** the foundry's parts a callout can point at */
export const PARTS = FORGE_PARTS;

export const STEPS: Step<S>[] = [
  {
    id: 'open',
    focus: 'open',
    visibleControls: ['open'],
    narration:
      'Pre-training starts here. Larkspur mini’s weights are random numbers, saved at step 0 as the first checkpoint.',
    act: 'Open the step-0 checkpoint.',
    say: { block: 'shelf', text: 'Step 0' },
    predicate: s => s.opened,
    hint: 'Press “Open the step-0 checkpoint”.',
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'A language model has one job: guess the next piece of text. This one has read nothing yet.',
    act: 'Predict first.',
    say: { block: 'furnace', text: 'Not lit yet' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'ask',
    focus: 'ask',
    visibleControls: ['p1', 'ask'],
    narration: 'Same prompt, real weights, running in your browser.',
    act: 'Ask the step-0 checkpoint.',
    say: { block: 'model', text: 'Random weights' },
    predicate: s => s.asked,
  },
  {
    id: 'odds',
    focus: 'odds',
    visibleControls: ['said', 'odds'],
    narration: `Noise. With random weights, every next piece is about as likely as any other, roughly one in ${VOCAB}.`,
    act: 'Show its top five guesses.',
    predicate: s => s.odds,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['top', 'quiz'],
    narration:
      'Nothing is known yet. Everything the model will write comes from training on the documents in those crates.',
    act: 'One question to finish.',
    say: { block: 'crates', text: 'All it will know' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Where would a model’s knowledge come from, before it has read anything?',
  },
];

export default function BeforeTraining() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ opened: false, p1: null, asked: false, odds: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => (
        <PreTrainingStage
          step={state.opened ? 0 : null}
          say={say}
          show={m => ({
            scene: { step: state.opened ? 0 : null, burning: false },
            caption:
              state.asked && m
                ? `Step 0: “${PROMPTS[PROMPT].text}${says(m, PROMPT)}”`
                : 'Larkspur mini, a teaching model trained in this course, not any provider’s.',
          })}
        />
      )}
      controls={{
        open: ({ state, sync }) => (
          <p>
            <button type="button" className="big" onClick={() => sync({ ...state, opened: true })}>
              Open the step-0 checkpoint
            </button>
          </p>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        ask: ({ state, sync }) => (
          <CkptGate step={0}>
            {() => (
              <button type="button" className="big" onClick={() => sync({ ...state, asked: true })}>
                Ask the step-0 checkpoint
              </button>
            )}
          </CkptGate>
        ),
        said: ({ state }) => (
          <CkptGate step={0}>
            {m => (
              <>
                <Outcome {...P1} prediction={state.p1} outcome={1} />
                <Says who="Step 0" prompt={PROMPT} text={says(m, PROMPT)} live />
              </>
            )}
          </CkptGate>
        ),
        odds: ({ state, sync }) => (
          <button type="button" className="chip" onClick={() => sync({ ...state, odds: true })}>
            Show its top five guesses
          </button>
        ),
        top: () => (
          <CkptGate step={0}>
            {m => <Top5 cands={top5(m, PROMPT)} caption="Step 0’s five likeliest next pieces" />}
          </CkptGate>
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
