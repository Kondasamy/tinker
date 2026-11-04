// Chapter 5: two skills fight (R6a.5). A blurry Damaged label overlaps Warranty's, so a kettle under warranty opens the
// Damaged binder. The reader predicts the fix, sharpens Damaged's label, asks again (Warranty opens), the stage closes
// in on it, and the tiles ticket checks Damaged still catches its own. The pick is the word-matching stand-in
// (ToyNote); the reveal cites Anthropic's skill-authoring guide.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import Select from '../../components/story/Select';
import { CAROUSEL_PARTS } from '../../components/scenes/carouselScene';
import { fact } from '../../lib/skills/facts';
import { LABELS, pick, skillOf } from '../../lib/skills/skills';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { barsOf, carouselOf, Fact, SkillsStage, ToyNote, type Asked } from './kit';

const MODULE = 'skills',
  ID = '05-two-skills-fight';
const TICKET = 'kettle',
  OWN = 'tiles',
  SKILL = skillOf('damaged');
/** Damaged's labels: the blurry one it starts with, then the sharp one */
export const OPTIONS = [SKILL.blurry!, SKILL.label];
const SHARP = OPTIONS.length - 1;
/** the labels that send the kettle to Warranty and the tiles to Damaged (tests/unit/skills.test.ts pins the effect) */
export const WINNERS = OPTIONS.flatMap((o, i) =>
  pick(TICKET, { ...LABELS, damaged: o }) === 'warranty' && pick(OWN, { ...LABELS, damaged: o }) === 'damaged'
    ? [i]
    : [],
);

interface S {
  asked: Asked[];
  label: number;
  prediction: number | null;
  revealed: boolean;
  quiz: number | null;
}

export const PREDICT = {
  question: 'Kettle tickets keep opening the Damaged binder. What stops it?',
  options: [
    'Sharpen Damaged’s label to deliveries that arrive broken',
    'Make the Warranty label longer still',
    'Merge both binders into one big one',
  ],
};
const OUTCOME = 0;

export const QUIZ = {
  question:
    'A support bot has an Orders skill and a Shipping skill. Both labels mention “delivery”, and parcel questions keep opening Orders. What fixes it?',
  options: [
    'Rewrite both labels so each names only its own tasks',
    'Add more instructions inside the Shipping skill',
    'Ask customers to stop saying “parcel”',
  ],
  correct: 0,
  explanation: fact('pick-from-many').claim,
  why: [
    'Right: when each label names only its own tasks, a question matches one of them clearly.',
    'Instructions are read only after a skill opens, so they can’t change which one opens.',
    'Labels should fit the words people really use, not the other way round.',
  ],
};

export const PARTS = CAROUSEL_PARTS;
const last = (s: S) => s.asked.at(-1);
const askedWith = (s: S, ticket: string, label: number) =>
  s.asked.some(a => a.ticket === ticket && a.swap?.damaged === OPTIONS[label]);

export const STEPS: Step<S>[] = [
  {
    id: 'ask',
    focus: 'ask',
    visibleControls: [],
    narration: `A teammate changed Damaged’s label to “${SKILL.blurry}”`,
    act: 'Ask the kettle ticket.',
    say: { block: 'carousel', text: 'Two claim it' },
    status: 'The carousel turned to Damaged, and its binder opened for a kettle under warranty.',
    predicate: s => last(s)?.ticket === TICKET,
    hint: 'Press Ask under the picture, or drag the ticket onto the carousel.',
  },
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['predict'],
    narration: 'Wrong binder: the kettle is a warranty claim, but Damaged’s label shares more of its words.',
    act: 'Predict the fix.',
    say: { block: 'binder', text: 'Wrong binder' },
    status: 'The Damaged binder still lies open for the kettle ticket.',
    predicate: s => s.prediction !== null,
  },
  {
    id: 'sharpen',
    focus: 'label',
    visibleControls: ['predict', 'label'],
    narration: 'Pick locked. An overlap means both labels fit, so the one sharing more words wins.',
    act: 'Pick Damaged’s sharp label, then ask the kettle ticket.',
    status: 'The carousel turned to Warranty, and its binder opened for the kettle.',
    predicate: s => WINNERS.some(i => askedWith(s, TICKET, i)),
    hint: 'Which label names only deliveries that arrive broken?',
    solution: s => ({
      ...s,
      label: SHARP,
      asked: [...s.asked, { ticket: TICKET, swap: { damaged: OPTIONS[SHARP] } }],
    }),
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal', 'fact'],
    narration: 'Each label now claims only its own tickets.',
    act: 'Check your prediction.',
    closeUp: ['binder'],
    status: 'The close-up shows the warranty binder open beside the kettle ticket.',
    predicate: s => s.revealed,
  },
  {
    id: 'own',
    focus: 'ask',
    visibleControls: ['fact', 'label'],
    narration: 'A sharp label must still catch its own tickets.',
    act: 'Ask the tiles ticket.',
    say: { block: 'carousel', text: 'Its own only' },
    status: 'The carousel turned back to Damaged for the tiles that arrived cracked.',
    predicate: s => WINNERS.some(i => askedWith(s, OWN, i)),
    hint: 'Pick the tiles ticket under the picture, then press Ask.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: 'Two labels that share words fight over tickets; sharpen each to its own.',
    act: 'One question to finish.',
    status: 'The Damaged binder lies open for the tiles; Warranty is back on the carousel.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What does the model read when it chooses?',
  },
];

export default function TwoSkillsFight() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ asked: [], label: 0, prediction: null, revealed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, say, closeUp }) => (
        <SkillsStage
          scene={carouselOf('skills', state.asked)}
          tickets={[TICKET, OWN]}
          ask={t => {
            apply({ ...state, asked: [...state.asked, { ticket: t, swap: { damaged: OPTIONS[state.label] } }] });
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
        label: ({ state, sync }) => (
          <label className="sk-label">
            <span>Damaged label</span>
            <Select value={state.label} onChange={e => sync({ ...state, label: Number(e.target.value) })}>
              {OPTIONS.map((o, i) => (
                <option key={o} value={i}>
                  {o}
                </option>
              ))}
            </Select>
          </label>
        ),
        reveal: ({ state, apply }) => (
          <Reveal
            prediction={state.prediction === null ? null : PREDICT.options[state.prediction]}
            outcome={PREDICT.options[OUTCOME]}
            revealed={state.revealed}
            onReveal={() => apply({ ...state, revealed: true })}
            label="See why it moved"
          />
        ),
        fact: ({ state }) =>
          state.revealed ? (
            <>
              <Fact id="pick-from-many" />
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
