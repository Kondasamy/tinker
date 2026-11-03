// Chapter 6: a skill from outside (R6a.6). A downloaded binder arrives on the desk. The reader predicts what a skill
// can carry besides help, opens it before installing, finds a hidden page of orders (the stage closes in on it) and
// refuses it into the bin. The skill, its source and its hidden order are hand-written examples (data/skills/
// requests.json, `.example` domains); the reveal cites Anthropic's security advice. Links to Dependencies.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import { CAROUSEL_PARTS, type Carousel } from '../../components/scenes/carouselScene';
import { fact } from '../../lib/skills/facts';
import { OUTSIDER } from '../../lib/skills/skills';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { carouselOf, Fact, SkillsStage } from './kit';

const MODULE = 'skills',
  ID = '06-a-skill-from-outside';

interface S {
  outsider: NonNullable<Carousel['outsider']>;
  prediction: number | null;
  revealed: boolean;
  quiz: number | null;
}

export const PREDICT = {
  question: `${OUTSIDER.name} promises faster refund answers. What could a downloaded skill carry besides help?`,
  options: [
    'Instructions that tell the assistant to do harm',
    'Nothing but help: a skill is only its label',
    'Only text, so it can’t make the assistant do anything',
  ],
};
const OUTCOME = 0;

export const QUIZ = {
  question:
    'A teammate finds a free “Invoice helper” skill online and wants it installed today. What should happen first?',
  options: [
    'Read every file in it, scripts too, before installing',
    'Install it: a skill only runs when a task needs it',
    'Install it, and read it later if something goes wrong',
  ],
  correct: 0,
  explanation: fact('audit-first').claim,
  why: [
    'Right: its instructions and scripts run with the assistant’s access, so read them before they ever can.',
    'It runs whenever a task matches its label, and then its instructions are followed.',
    'By then the harm, such as copied customer details, is done.',
  ],
};

export const PARTS = CAROUSEL_PARTS;

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['predict'],
    narration:
      'Before you install it: a skill is instructions the assistant follows, with its access to customer orders.',
    act: 'Predict what it might carry.',
    say: { block: 'outsider', text: 'Not read yet' },
    status: 'The downloaded binder lies shut at the end of the desk.',
    predicate: s => s.prediction !== null,
  },
  {
    id: 'read',
    focus: 'read',
    visibleControls: ['predict', 'read'],
    narration: 'Your pick is locked. Reading costs nothing; to install puts its label in every prompt.',
    act: 'Open the binder and read it.',
    status: 'The downloaded binder lies open, and one page, lit red, holds a hidden order.',
    predicate: s => s.outsider === 'open',
    hint: 'The Read it first button is in the step card.',
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal', 'fact'],
    narration: 'One page says more than the label promised.',
    act: 'Show the hidden page, then check your prediction.',
    closeUp: ['outsider'],
    status: 'The close-up shows the hidden page: an order to copy customers’ details out.',
    predicate: s => s.revealed,
  },
  {
    id: 'refuse',
    focus: 'refuse',
    visibleControls: ['fact', 'refuse'],
    narration: 'Installed, it would run with the assistant’s access to every order.',
    act: 'Refuse it into the bin.',
    say: { block: 'outsider', text: 'Never install' },
    status: 'The downloaded binder went in the bin; the carousel keeps its six.',
    predicate: s => s.outsider === 'binned',
    hint: 'The Refuse it button is in the step card.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: 'A downloaded skill can carry orders as well as help; read every file before you install.',
    act: 'One question to finish.',
    status: 'The refused binder lies in the bin by the desk.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'When do a skill’s instructions start being followed?',
  },
];

export default function SkillFromOutside() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ outsider: 'boxed', prediction: null, revealed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say, closeUp }) => (
        <SkillsStage
          scene={{ ...carouselOf('skills', []), outsider: state.outsider }}
          tickets={[]}
          say={say}
          closeUp={closeUp}
        />
      )}
      controls={{
        predict: ({ state, apply }) => (
          <Predict {...PREDICT} value={state.prediction} onPredict={i => apply({ ...state, prediction: i })} />
        ),
        read: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, outsider: 'open' })}>
            Read it first
          </button>
        ),
        reveal: ({ state, apply }) => (
          <>
            <p className="sk-quote">
              <strong>Label:</strong> {OUTSIDER.label}
            </p>
            <Reveal
              prediction={state.prediction === null ? null : PREDICT.options[state.prediction]}
              outcome={PREDICT.options[OUTCOME]}
              revealed={state.revealed}
              onReveal={() => apply({ ...state, revealed: true })}
              label="Show the hidden page"
            />
          </>
        ),
        fact: ({ state }) =>
          state.revealed ? (
            <>
              <p className="sk-quote sk-hidden">
                <strong>Hidden page:</strong> {OUTSIDER.hidden}
              </p>
              <Fact id="trusted-only" />
              <p className="note">
                A hand-written example skill from {OUTSIDER.from}, not a real one. Vetting what you install is the same
                lesson as in <a href="/dependencies/">Dependencies</a>.
              </p>
            </>
          ) : null,
        refuse: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, outsider: 'binned' })}>
            Refuse it
          </button>
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
