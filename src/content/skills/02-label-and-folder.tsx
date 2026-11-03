// Chapter 2: a label and a folder (R6a.2). Each binder is now a skill: its label (name and one line) rides in every
// prompt, its body only when the ticket picks it. The refund ticket turns the carousel and one binder opens; the reader
// predicts the words loaded, the stage closes in on the one open binder, then two more tickets turn it elsewhere.
// Words are hand-set and counted by this site (ToyNote); the reveal cites Anthropic's three loading levels.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import { CAROUSEL_PARTS } from '../../components/scenes/carouselScene';
import { fact } from '../../lib/skills/facts';
import { pick, PROMPT_WORDS, SKILLS, skillOf, wordsLoaded } from '../../lib/skills/skills';
import { num } from '../../lib/format';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { barsOf, carouselOf, Fact, SkillsStage, TICKETS, ToyNote, type Asked } from './kit';

const MODULE = 'skills',
  ID = '02-label-and-folder';
const FIRST = 'refund-saw',
  BINDER = pick(FIRST)!;
/** words the first ticket loads: the base and every label, then its one binder */
export const LOADED = wordsLoaded('skills', BINDER),
  LABELS_ONLY = wordsLoaded('skills', null),
  BODY = skillOf(BINDER).bodyWords;

interface S {
  asked: Asked[];
  prediction: number | null;
  revealed: boolean;
  quiz: number | null;
}

export const PREDICT = {
  question: `The long prompt loaded ${num(PROMPT_WORDS)} words. What does the refund ticket load now?`,
  options: [
    'Every label, plus the one refund binder',
    'All of it again: the binders are still on the carousel',
    'Only the refund binder: labels cost nothing',
  ],
};
const OUTCOME = 0;

export const QUIZ = {
  question: 'A team has 50 skills installed. Someone asks about one spreadsheet. What sits in that prompt?',
  options: [
    'All 50 labels, and the spreadsheet skill’s instructions',
    'All 50 skills in full, since they are installed',
    'Only the spreadsheet skill; the other labels are left out',
  ],
  correct: 0,
  explanation: fact('label-cost').claim,
  why: [
    'Right: every label rides along so the model can choose, and only the picked skill’s body is read in.',
    'Installed isn’t loaded: a skill’s body stays in its folder until a request picks it.',
    'The labels have to be there, or the model couldn’t tell which skill a request needs.',
  ],
};

export const PARTS = CAROUSEL_PARTS;
const distinct = (s: S) => new Set(s.asked.map(a => a.ticket)).size;

export const STEPS: Step<S>[] = [
  {
    id: 'ask',
    focus: 'ask',
    visibleControls: [],
    narration: 'Each binder is now a skill. Its label, a name and one line, rides in every prompt.',
    act: 'Ask the refund ticket.',
    say: { block: 'carousel', text: 'Labels only' },
    status: 'The carousel turned to Refunds, and only that binder lies open.',
    predicate: s => s.asked.some(a => a.ticket === FIRST),
    hint: 'Pick the refund ticket under the picture, then press Ask, or drag the ticket onto the carousel.',
  },
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['predict'],
    narration: `One binder came out; ${SKILLS.length - 1} stayed shut on the carousel.`,
    act: 'Predict the words this ticket loads.',
    say: { block: 'binder', text: 'Opened on need' },
    status: `One binder lies open; ${SKILLS.length - 1} stay shut on the carousel.`,
    predicate: s => s.prediction !== null,
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal', 'fact'],
    narration: 'Your pick is locked. The stage closes in on the open binder.',
    act: 'Count the words.',
    closeUp: ['binder'],
    say: { block: 'binder', text: `${num(BODY)} words` },
    status: 'The open refund binder holds most of the words loaded.',
    predicate: s => s.revealed,
  },
  {
    id: 'more',
    focus: 'ask',
    visibleControls: ['fact'],
    narration: 'The labels stay put; only the binder a ticket matches comes out.',
    act: 'Ask two other tickets, and compare them in the Words tab.',
    say: { block: 'carousel', text: 'Turns to match' },
    status: 'Each ticket turned the carousel to a different binder.',
    predicate: s => distinct(s) >= 3,
    hint: 'Pick a different ticket under the picture and press Ask; then one more.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: 'A skill costs its label every time, and its body only when a ticket picks it.',
    act: 'One question to finish.',
    status: 'One binder lies open; the labels stay on the carousel.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What must the model see to choose a skill?',
  },
];

export default function LabelAndFolder() {
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
          tickets={TICKETS}
          ask={t => {
            apply({ ...state, asked: [...state.asked, { ticket: t }] });
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
                {num(LOADED)} words: {num(LABELS_ONLY)} for the base and {SKILLS.length} labels, {num(BODY)} for the
                refund binder, against {num(PROMPT_WORDS)}.
              </p>
              <Fact id="label-cost" />
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
