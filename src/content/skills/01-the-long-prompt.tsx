// Chapter 1: the long prompt (R6a.1). Every rule for every task rides in every prompt: asking one refund ticket brings
// all six binders out at once and buries the desk. The reader predicts what happens to the refund rule, the stage
// closes in on the buried binder, and a label ticket shows every ticket pays the same. Words are hand-set (ToyNote);
// the reveal cites Anthropic's docs on loading only what a task needs.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import { CAROUSEL_PARTS } from '../../components/scenes/carouselScene';
import { fact } from '../../lib/skills/facts';
import { PAGES, PROMPT_WORDS, SKILLS } from '../../lib/skills/skills';
import { num } from '../../lib/format';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { barsOf, carouselOf, Fact, SkillsStage, ToyNote, type Asked } from './kit';

const MODULE = 'skills',
  ID = '01-the-long-prompt';
const TICKETS = ['refund-saw', 'print-label'];

interface S {
  asked: Asked[];
  /** the refund binder is lit in the pile (set on entering the reveal) */
  found: boolean;
  prediction: number | null;
  revealed: boolean;
  quiz: number | null;
}

export const PREDICT = {
  question: `The refund rule is in one binder. With all ${SKILLS.length} open on the desk, what happens to it?`,
  options: [
    'It is buried among rules this ticket doesn’t need',
    'It stands out: more rules give the model more to go on',
    'Nothing changes: the model reads only the binder it needs',
  ],
};
const OUTCOME = 0;

export const QUIZ = {
  question:
    'A shop’s assistant has a 30-page prompt of rules. A customer asks one question about gift cards. What goes to the model?',
  options: [
    'All 30 pages, sent again with that one question',
    'Only the gift-card page',
    'Nothing extra: the model remembers the prompt from the last question',
  ],
  correct: 0,
  explanation: fact('on-demand').claim,
  why: [
    'Right: a prompt goes in full with every request, so every page rides along with every question.',
    'A prompt has no way to send part of itself; picking one page is what skills add.',
    'The model keeps nothing between requests, so the whole prompt is sent each time.',
  ],
};

export const PARTS = CAROUSEL_PARTS;

const has = (s: S, t: string) => s.asked.some(a => a.ticket === t);

export const STEPS: Step<S>[] = [
  {
    id: 'ask',
    focus: 'ask',
    visibleControls: [],
    narration: 'Each binder holds one task’s rules. Today the prompt holds every binder, for every ticket.',
    act: 'Drag the refund ticket onto the carousel, or press Ask.',
    say: { block: 'carousel', text: `${SKILLS.length} binders` },
    status: 'Every binder lies open on the desk, burying the refund ticket.',
    predicate: s => has(s, 'refund-saw'),
    hint: 'Pick the refund ticket under the picture, then press Ask.',
  },
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['predict'],
    narration: 'Every binder came out at once, for one refund question.',
    act: 'Predict: where is the refund rule now?',
    say: { block: 'desk', text: 'Buried desk' },
    status: `${SKILLS.length} open binders still cover the desk and the ticket.`,
    predicate: s => s.prediction !== null,
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal', 'fact'],
    narration: 'Your pick is locked. The refund binder is lit.',
    act: 'Check your prediction.',
    closeUp: ['binder', 'desk'],
    say: { block: 'binder', text: `Under ${SKILLS.length - 1} more` },
    status: 'The refund binder is lit, at the bottom of the pile on the ticket.',
    setup: s => ({ ...s, found: true }),
    predicate: s => s.revealed,
  },
  {
    id: 'again',
    focus: 'ask',
    visibleControls: ['fact', 'words'],
    narration: 'Now a ticket about return labels. Watch the words the assistant loads.',
    act: 'Ask the label ticket, then open the Words tab.',
    say: { block: 'desk', text: `${num(PROMPT_WORDS)} words` },
    status: `A label question loads the same ${SKILLS.length} binders and the same words.`,
    predicate: s => has(s, 'print-label'),
    hint: 'Pick the label ticket under the picture, then press Ask.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: 'Every ticket pays for every binder, and the one rule it needs is buried among them.',
    act: 'One question to finish.',
    status: `The desk stays buried under all ${SKILLS.length} binders.`,
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Does a prompt send only part of itself?',
  },
];

export default function TheLongPrompt() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ asked: [], found: false, prediction: null, revealed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, say, closeUp }) => {
        const last = state.asked.at(-1)?.ticket;
        return (
          <SkillsStage
            scene={carouselOf('prompt', state.asked, state.found && last === 'refund-saw' ? 'refunds' : null)}
            tickets={TICKETS}
            ask={t => {
              apply({ ...state, asked: [...state.asked, { ticket: t }] });
              return undefined;
            }}
            bars={barsOf('prompt', state.asked)}
            say={say}
            closeUp={closeUp}
          />
        );
      }}
      controls={{
        predict: ({ state, apply }) => (
          <Predict {...PREDICT} value={state.prediction} onPredict={i => apply({ ...state, prediction: i })} />
        ),
        reveal: ({ state, apply }) => (
          <Reveal
            prediction={state.prediction === null ? null : PREDICT.options[state.prediction]}
            outcome={PREDICT.options[OUTCOME]}
            revealed={state.revealed}
            onReveal={() => apply({ ...state, revealed: true })}
            label="Find the refund rule"
          />
        ),
        fact: ({ state }) =>
          state.revealed ? (
            <>
              <Fact id="on-demand" />
              <ToyNote>
                Here the prompt is {num(PROMPT_WORDS)} words, {PAGES} pages.
              </ToyNote>
            </>
          ) : null,
        words: () => <ToyNote>The Words tab counts what each ticket loaded.</ToyNote>,
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
