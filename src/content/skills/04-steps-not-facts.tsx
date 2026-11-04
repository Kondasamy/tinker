// Chapter 4: steps, not facts (R6a.4). A skill holds a procedure and a script, not only facts. Asked first, the
// assistant reads the refund calculator's code into the prompt like any page; the reader predicts what running it
// instead costs, runs it (the stamp presses, a slip slides to the assistant), and the stage closes in on the slip.
// Word counts are hand-set (ToyNote); the reveal cites Anthropic's docs and skill-authoring guide.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import { CAROUSEL_PARTS } from '../../components/scenes/carouselScene';
import { fact } from '../../lib/skills/facts';
import { pick, skillOf, wordsLoaded } from '../../lib/skills/skills';
import { num } from '../../lib/format';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { barsOf, carouselOf, Fact, SkillsStage, ToyNote, type Asked } from './kit';

const MODULE = 'skills',
  ID = '04-steps-not-facts';
const TICKET = 'refund-days',
  BINDER = pick(TICKET)!,
  SCRIPT = skillOf(BINDER).script!;
/** words the refund ticket loads with the script's code read in, and with the script run */
export const READ = wordsLoaded('skills', BINDER, undefined, 'read'),
  RUN = wordsLoaded('skills', BINDER, undefined, 'run');

interface S {
  asked: Asked[];
  prediction: number | null;
  revealed: boolean;
  quiz: number | null;
}

export const PREDICT = {
  question: `Reading the ${SCRIPT.name} loads its ${num(SCRIPT.codeWords)} words of code. What if the assistant runs it instead?`,
  options: [
    'Only its short answer enters the prompt',
    'Its code still enters, so nothing is saved',
    'It costs more: a script must be read before it can run',
  ],
};
const OUTCOME = 0;

export const QUIZ = {
  question:
    'An invoices skill holds a 600-line script that checks totals, and the assistant runs it on every invoice. What enters the prompt?',
  options: [
    'Only what the script prints, such as “Totals match”',
    'All 600 lines of the script, every time',
    'Nothing at all: running a script is free',
  ],
  correct: 0,
  explanation: fact('scripts-output').claim,
  why: [
    'Right: the script runs outside the prompt, and only its output is read in.',
    'Running isn’t reading: the code stays in the skill’s folder.',
    'The output is read in, so a script that prints a lot still costs words.',
  ],
};

export const PARTS = CAROUSEL_PARTS;
const last = (s: S) => s.asked.at(-1);

export const STEPS: Step<S>[] = [
  {
    id: 'ask',
    focus: 'ask',
    visibleControls: [],
    narration:
      'The refund binder now holds steps and a calculator script. Today the assistant reads the script’s code like any page.',
    act: 'Ask the refund ticket.',
    say: { block: 'carousel', text: 'Steps inside' },
    status: 'The refund binder lies open, its script’s code spread beside it as pages read into the prompt.',
    predicate: s => last(s)?.ticket === TICKET && last(s)?.script === 'read',
    hint: 'Press Ask under the picture, or drag the ticket onto the carousel.',
  },
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['predict'],
    narration: 'Those code pages cost words on every refund ticket, and the assistant still works the sum out itself.',
    act: 'Predict: what if the script runs instead?',
    say: { block: 'script', text: 'Code read in' },
    status: 'The script’s code pages still lie beside the open refund binder.',
    predicate: s => s.prediction !== null,
  },
  {
    id: 'run',
    focus: 'run',
    visibleControls: ['predict', 'run'],
    narration: 'Your pick is locked. A run happens outside the prompt, like a calculator on the desk.',
    act: 'Press Run the script.',
    status: 'The stamp pressed, and one small slip slid over to the assistant.',
    predicate: s => last(s)?.script === 'run',
    hint: 'The Run the script button is in the step card.',
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal', 'fact'],
    narration: 'Same answer, far fewer words: the code stayed in the binder, and only the slip was read.',
    act: 'Check your prediction.',
    closeUp: ['script'],
    status: 'The close-up shows the stamp and its slip: only the slip’s words reached the assistant.',
    predicate: s => s.revealed,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'quiz'],
    narration: 'A skill can carry steps and tools; a script that runs costs only what it prints.',
    act: 'One question to finish.',
    status: 'The stamp and its slip stay beside the open refund binder.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Does running a script put its code in the prompt?',
  },
];

export default function StepsNotFacts() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ asked: [], prediction: null, revealed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, say, closeUp }) => (
        <SkillsStage
          scene={carouselOf('skills', state.asked)}
          tickets={[TICKET]}
          ask={t => {
            apply({ ...state, asked: [...state.asked, { ticket: t, script: 'read' }] });
            return undefined;
          }}
          bars={barsOf('skills', state.asked)}
          say={say}
          closeUp={closeUp}
        />
      )}
      controls={{
        predict: ({ state, apply }) => (
          <Predict {...PREDICT} value={state.prediction} onPredict={i => apply({ ...state, prediction: i })} />
        ),
        run: ({ state, apply }) => (
          <button
            type="button"
            className="big"
            onClick={() => apply({ ...state, asked: [...state.asked, { ticket: TICKET, script: 'run' }] })}
          >
            Run the script
          </button>
        ),
        reveal: ({ state, apply }) => (
          <Reveal
            prediction={state.prediction === null ? null : PREDICT.options[state.prediction]}
            outcome={PREDICT.options[OUTCOME]}
            revealed={state.revealed}
            onReveal={() => apply({ ...state, revealed: true })}
            label="Count the words"
          />
        ),
        fact: ({ state }) =>
          state.revealed ? (
            <>
              <p>
                Read in: {num(READ)} words. Run: {num(RUN)} words, the slip’s {num(SCRIPT.outputWords)} in place of{' '}
                {num(SCRIPT.codeWords)} words of code.
              </p>
              <Fact id="scripts-output" />
              <Fact id="run-not-read" />
              <ToyNote />
            </>
          ) : null,
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
