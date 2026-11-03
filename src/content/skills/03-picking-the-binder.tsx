// Chapter 3: picking the binder (R6a.3). The label alone decides which skill opens: the warranty binder's vague label
// shares no word with a drill ticket, so the carousel never turns. The reader predicts the fix, rewrites the label's
// description, asks again, and the stage closes in on the warranty binder now open. The pick is a word-matching
// stand-in for the model's (ToyNote); the reveal cites Anthropic's docs and the Agent Skills specification.
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
  ID = '03-picking-the-binder';
const TICKET = 'drill',
  SKILL = skillOf('warranty');
/** the descriptions the reader may give the warranty binder: the drafts, then the sharp one */
export const OPTIONS = [...(SKILL.drafts ?? []), SKILL.label];
const SHARP = OPTIONS.length - 1;
/** the sharp label is the only one of them the drill ticket picks (tests/unit/skills.test.ts) */
export const WINNERS = OPTIONS.flatMap((o, i) => (pick(TICKET, { ...LABELS, warranty: o }) === SKILL.id ? [i] : []));
const vagueText = (SKILL.vague ?? '').replace(/\.$/, '');

interface S {
  asked: Asked[];
  label: number;
  prediction: number | null;
  revealed: boolean;
  quiz: number | null;
}

export const PREDICT = {
  question: 'What would get the warranty binder picked for the drill ticket?',
  options: [
    'A description saying what it covers and when to use it',
    'A longer, more detailed binder inside',
    'Moving the binder to the front of the carousel',
  ],
};
const OUTCOME = 0;

export const QUIZ = {
  question:
    'An expenses skill has the description “Finance helper.” Staff ask how to claim back a taxi fare, and it never opens. What fixes it?',
  options: [
    'A description of what it does and when: “Expense claims: taxi, meals, receipts. Use when claiming costs back.”',
    'Longer, more detailed instructions inside the skill',
    'Installing it twice, so it is more likely to be picked',
  ],
  correct: 0,
  explanation: fact('label-decides').claim,
  why: [
    'Right: the description is all the model reads when choosing, so it must name the task and the words people use.',
    'The instructions are read only after the skill is picked, so they can’t help it get picked.',
    'Two copies of a vague label are still vague; neither one matches the request.',
  ],
};

export const PARTS = CAROUSEL_PARTS;
const asked = (s: S, label: number) => s.asked.some(a => a.ticket === TICKET && a.swap?.warranty === OPTIONS[label]);

export const STEPS: Step<S>[] = [
  {
    id: 'ask',
    focus: 'ask',
    visibleControls: [],
    narration: `The warranty binder’s label reads only “${SKILL.vague}” Rosa passes you a drill ticket.`,
    act: 'Ask the drill ticket.',
    say: { block: 'carousel', text: vagueText },
    status: 'No binder opened: no label matched the drill ticket.',
    predicate: s => s.asked.some(a => a.ticket === TICKET),
    hint: 'Pick the drill ticket under the picture, then press Ask.',
  },
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['predict'],
    narration: 'The carousel never turned: no label shared a word with the ticket.',
    act: 'Predict what gets the warranty binder picked.',
    say: { block: 'carousel', text: 'Never turned' },
    status: 'The desk holds only the drill ticket.',
    predicate: s => s.prediction !== null,
  },
  {
    id: 'rewrite',
    focus: 'label',
    visibleControls: ['predict', 'label'],
    narration: 'Pick locked. The assistant chooses from the description alone: the label’s one line.',
    act: 'Pick a new description, then ask the drill ticket.',
    say: { block: 'carousel', text: 'Reads labels' },
    status: 'The sharp description turned the carousel to Warranty, and its binder opened.',
    predicate: s => WINNERS.some(i => asked(s, i)),
    hint: 'Which description names a broken tool and being covered?',
    solution: s => ({
      ...s,
      label: SHARP,
      asked: [...s.asked, { ticket: TICKET, swap: { warranty: OPTIONS[SHARP] } }],
    }),
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal', 'fact'],
    narration: 'Same binder, same rules inside; only the description changed.',
    act: 'Check your prediction.',
    closeUp: ['binder'],
    say: { block: 'binder', text: 'Picked by label' },
    status: 'The warranty binder lies open beside the drill ticket.',
    predicate: s => s.revealed,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'quiz'],
    narration: 'The label decides: a skill whose description doesn’t say when to use it never opens.',
    act: 'One question to finish.',
    status: 'The warranty binder stays open on the desk.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What does the model read before a skill is opened?',
  },
];

export default function PickingTheBinder() {
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
          tickets={[TICKET, 'kettle']}
          ask={t => {
            apply({ ...state, asked: [...state.asked, { ticket: t, swap: { warranty: OPTIONS[state.label] } }] });
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
            <span>Warranty description</span>
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
            label="See why it opened"
          />
        ),
        fact: ({ state }) =>
          state.revealed ? (
            <>
              <Fact id="label-decides" />
              <Fact id="poor-label" />
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
