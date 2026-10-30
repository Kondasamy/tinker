// Chapter 5: copies of copies. Five generations under "replace", trained offline (runs.json): the reader predicts, then
// flips the stack through the generations with a native range. Held-out loss rises (drift), and next-word accuracy on
// rare words falls faster than on all words. Shumailov et al. is cited apart, as a large-model finding.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { GENS, LAST, genOf, loss, pct } from '../../lib/synthetic-data/runs';
import { COPIER_PARTS, copierAt } from '../../components/scenes/copierScene';
import { CopierStage, Fact, GenRange, ToyNote } from './kit';

const MODULE = 'synthetic-data',
  ID = '05-copies-of-copies';
export const PARTS = COPIER_PARTS;
const G0 = genOf('replace', 0),
  G5 = genOf('replace', LAST);

export const P1 = {
  question: `By generation ${LAST}, how does the model read Larkspur’s real text?`,
  options: [
    'Worse each generation: it drifts away from the real text',
    'The same: each copy is a faithful copy',
    'Better: it has practised on more text',
  ],
};
/** Held-out loss rose every generation: the drift the chapter teaches. */
export const OUTCOME = GENS.every(g => g === 0 || genOf('replace', g).heldout > genOf('replace', g - 1).heldout)
  ? 0
  : G5.heldout <= G0.heldout
    ? 2
    : 1;

export const QUIZ = {
  question:
    'A forum’s next model trains mostly on posts the last model wrote. What should its builders watch for first?',
  options: [
    'Unusual topics and rare words fading, as the model drifts from real writing',
    'Nothing: model text is as good as human text for training',
    'Only typos: drift means spelling mistakes',
  ],
  correct: 0,
  explanation: 'Each generation learns the last one’s slightly narrowed picture, so the rare parts go first.',
  why: [
    'Right: what was rare in the real data is the first thing each copy gets wrong.',
    'Each copy carries its writer’s gaps and adds its own, so the errors build up.',
    'Drift is in what the model knows and how surprised it is by real text, not spelling.',
  ],
};

export interface S {
  p1: number | null;
  gen: number;
  seen: number[];
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `A generation is a model trained from scratch on the last one’s writing. Larkspur ran ${LAST} ahead of time.`,
    act: 'Predict first.',
    say: { block: 'copies', text: 'Generations' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'flip',
    focus: 'gen',
    visibleControls: ['p1', 'gen'],
    narration: 'Held-out loss is how surprised a model is by real text it never trained on.',
    act: `Flip to generation ${LAST}.`,
    predicate: s => s.gen === LAST,
  },
  {
    id: 'rare',
    focus: 'gen',
    visibleControls: ['out', 'gen'],
    narration: `Loss rose from ${loss(G0.heldout)} to ${loss(G5.heldout)}: drift. Rare words guessed fell from ${pct(G0.rareTop5)} to ${pct(G5.rareTop5)}.`,
    act: 'Look at every generation.',
    say: { block: 'copies', text: 'Rare marks fade' },
    predicate: s => GENS.every(g => s.seen.includes(g)),
    hint: 'Move the generation slider through 0 to 5.',
    solution: s => ({ ...s, seen: [...GENS] }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['gen', 'facts', 'quiz'],
    narration: `All words fell from ${pct(G0.top5)} to ${pct(G5.top5)}, rare words much faster. Each copy loses the rare parts first.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which words does a copy get wrong first?',
  },
];

export default function CopiesOfCopies() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, gen: 0, seen: [0], quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => (
        <CopierStage
          say={say}
          readout
          room={copierAt('replace', state.gen)}
          caption={`Replace, generation ${state.gen}: held-out loss ${loss(genOf('replace', state.gen).heldout)}, rare words guessed ${pct(genOf('replace', state.gen).rareTop5)}.`}
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        gen: ({ state, apply, sync, focused }) => (
          <GenRange
            value={state.gen}
            onChange={gen =>
              (focused ? apply : sync)({
                ...state,
                gen,
                seen: state.seen.includes(gen) ? state.seen : [...state.seen, gen],
              })
            }
          />
        ),
        out: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />
            <ToyNote />
          </>
        ),
        facts: () => <Fact id="shumailov-2024" />,
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
