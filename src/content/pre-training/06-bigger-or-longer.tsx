// Chapter 6: bigger or longer. The published scaling fits (Kaplan et al. 2020 and Hoffmann et al. 2022, as the latter's
// Table 2 gives their exponents) on their own chart: how much bigger a model and how much more data each says to use
// for more compute. Beside it, apart and in its own units, Larkspur mini's full and half runs. Larkspur mini is never
// placed on the published fits.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { LAST, runOf } from '../../lib/pre-training/engine';
import { BUDGETS, FITS, grow } from '../../lib/pre-training/scaling';
import { FORGE_PARTS } from '../../components/scenes/forgeScene';
import { loss } from '../../components/scenes/lossChart';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { Fact, PreTrainingStage, ToyNote, type View } from './kit';

const MODULE = 'pre-training',
  ID = '06-bigger-or-longer';
const TOP = BUDGETS.at(-1)!;
const times = (k: number) => `${k.toLocaleString('en-US')}×`;
/** the budget a saved run shows; one no longer on the list falls back to the first */
export const budgetOf = (s: { budget: number }) => (BUDGETS.includes(s.budget) ? s.budget : BUDGETS[0]);

interface S {
  p1: number | null;
  budget: number;
  view: View;
  quiz: number | null;
}

export const P1 = {
  question: 'With ten times the compute, what did Hoffmann and colleagues (2022) say to grow?',
  options: ['Mostly the model', 'The model and its training data, equally', 'Mostly the training data'],
};
const C10 = grow(FITS.chinchilla, 10);
/** what their fit says: equal growth when its two exponents match */
export const OUTCOME = Math.abs(C10.params - C10.tokens) < 1e-9 ? 1 : C10.params > C10.tokens ? 0 : 2;

export const QUIZ = {
  question:
    'A company can afford one training run. Its plan: the biggest model the budget allows, trained on whatever text is left over. What does the 2022 research say?',
  options: [
    'Spend less on size and more on data: grow the model and the data together',
    'Good plan: size always wins',
    'Skip the model size question: only the data matters',
    'Train two small models instead of one',
  ],
  correct: 0,
  explanation:
    'Hoffmann and colleagues found models of the day too big for their data: for a fixed budget, grow size and data together.',
  why: [
    'Right: their fit says to scale parameters and training tokens equally, so a model starved of data wastes compute.',
    'That was the reading of the 2020 fit; the 2022 fit found such models significantly undertrained.',
    'Both terms matter in the fit: a model too small for the data also falls short.',
    'Neither fit compares several small models against one; both are about splitting one budget between size and data.',
  ],
};

/** the foundry's parts a callout can point at (the Scaling tab takes none) */
export const PARTS = FORGE_PARTS;

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration:
      'Compute buys parameters or training text. Two papers fit a scaling law to many real runs, and disagreed on the split.',
    act: 'Predict first.',
    say: { block: 'furnace', text: 'Fixed compute' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'budget',
    focus: 'budget',
    visibleControls: ['outcome', 'budget'],
    narration: 'Their own fits, in their own units. Raise the budget and compare the advice.',
    act: `Drag the budget to ${times(TOP)}.`,
    predicate: s => budgetOf(s) === TOP,
    hint: 'Drag the slider all the way right, or press End.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['facts', 'quiz'],
    narration: `Larkspur mini, apart: half its documents ended at ${loss(runOf('half').heldout.loss)} held-out loss, all of them at ${loss(runOf('clean').heldout.loss)}. Data mattered here too.`,
    act: 'One question to finish.',
    say: { block: 'crates', text: 'More text helps' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What did the 2022 paper find about the models of its day?',
  },
];

export default function BiggerOrLonger() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, budget: BUDGETS[0], view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const b = budgetOf(state),
          k = grow(FITS.kaplan, b),
          c = grow(FITS.chinchilla, b);
        return (
          <PreTrainingStage
            view={state.view}
            onView={view => sync({ ...state, view })}
            say={say}
            show={() => ({
              scene: { step: LAST },
              chart: state.p1 !== null ? { budget: b } : undefined,
              caption:
                state.p1 === null
                  ? 'Larkspur mini’s run: one model size, one data set, one budget.'
                  : `${times(b)} the compute. Kaplan: model ${k.params.toFixed(1)}×, data ${k.tokens.toFixed(1)}×. Hoffmann: model ${c.params.toFixed(1)}×, data ${c.tokens.toFixed(1)}×.`,
            })}
          />
        );
      }}
      controls={{
        p1: ({ state, apply }) => (
          <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i, view: 'chart' })} />
        ),
        outcome: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />
            <Fact id="chinchilla-kaplan-10x" />
          </>
        ),
        budget: ({ state, sync }) => {
          const b = budgetOf(state);
          return (
            <div className="pt-range">
              <label htmlFor="pt-budget">
                <strong>Compute: {times(b)} today’s</strong>
              </label>
              <input
                id="pt-budget"
                type="range"
                min={0}
                max={BUDGETS.length - 1}
                step={1}
                value={BUDGETS.indexOf(b)}
                aria-valuetext={`${times(b)} the compute`}
                onChange={e => sync({ ...state, budget: BUDGETS[Number(e.target.value)], view: 'chart' })}
              />
            </div>
          );
        },
        facts: () => (
          <>
            <Fact id="chinchilla-gopher" />
            <Fact id="chinchilla-undertrained" />
            <Fact id="kaplan-big-models" />
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
