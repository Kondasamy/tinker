// Chapter 1: the leaderboard. The pills show each made-up machine's public-test score; the reader predicts where the
// beam tips with quality alone, slides the quality poise, and reads what a leaderboard is made of (preference votes,
// private testing; cited). The order here is the public one; chapter 2 runs Larkspur's own questions.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { STEELYARD_PARTS } from '../../components/scenes/steelyardScene';
import { rank, machineOf } from '../../lib/choosing-models/machines';
import { rowsOf, weigh, type Weights } from '../../lib/choosing-models/score';
import { qualityText } from '../../lib/choosing-models/story';
import { Outcome } from '../tool-calling/kit';
import { Fact, MachinesNote, NONE, SteelyardStage } from './kit';

const MODULE = 'choosing-models',
  ID = '01-the-leaderboard';
export const PARTS = STEELYARD_PARTS;
const ROWS = rowsOf('public');
const Q = qualityText('public');
const TOP = rank(id => machineOf(id).public)[0];

export interface S {
  w: Weights;
  p1: number | null;
  quiz: number | null;
}

export const P1 = {
  question: 'With quality alone on the beam, which machine does it tip toward?',
  options: ['Machine A', 'Machine B', 'Machine C'],
};
/** the public leader (the chapter test checks it against the engine) */
export const OUTCOME = P1.options.indexOf(`Machine ${TOP}`);

export const QUIZ = {
  question: 'A model tops a popular leaderboard. What does that tell Larkspur?',
  options: [
    'It did best on that board’s questions and voters, not yet on Larkspur’s',
    'It will be best at Larkspur’s support replies',
    'It is the best value for money',
  ],
  correct: 0,
  explanation: 'A leaderboard ranks models on someone else’s test; it says nothing yet about your questions or bill.',
  why: [
    'Right: the board measured its own questions and voters, so Larkspur still has to test.',
    'The board never saw a Larkspur ticket, so its order may not hold on them.',
    'A leaderboard ranks quality on its test, and says nothing about price.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration:
      'Each pill shows a machine’s score on a public benchmark, out of 100. The balance’s beam hangs level: nothing weighed yet.',
    act: 'Predict first.',
    say: { block: 'beam', text: 'Level' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'slide',
    focus: 'weights',
    visibleControls: [],
    narration:
      'Each slider moves a weight on the beam: how much one criterion counts. Quality alone means the leaderboard’s order.',
    act: 'Slide Quality to the right.',
    say: { block: 'quality', text: 'Quality' },
    predicate: s => weigh(ROWS, s.w).winner === TOP,
    hint: 'Drag the Quality slider under the picture, or focus it and press the right arrow.',
    solution: s => ({ ...s, w: { ...s.w, quality: 2 } }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'facts', 'quiz'],
    narration: `It tips to ${TOP}, the leaderboard’s top. But that leaderboard ranked machines on someone else’s questions and voters.`,
    act: 'One question to finish.',
    say: { block: `machine-${TOP.toLowerCase()}`, text: 'Top in public' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Whose questions did the leaderboard ask?',
  },
];

export default function TheLeaderboard() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ w: NONE, p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, focus, say }) => (
        <SteelyardStage
          rows={ROWS}
          weights={state.w}
          only={['quality']}
          onWeights={state.p1 === null ? undefined : w => (focus === 'weights' ? apply : sync)({ ...state, w })}
          quality={Q}
          pills={Q.pills}
          say={say}
          step={focus}
          caption={`Public test: A ${Q.text.A}, B ${Q.text.B}, C ${Q.text.C}, out of 100.`}
        >
          <MachinesNote />
        </SteelyardStage>
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        facts: () => (
          <>
            <Fact id="arena" />
            <Fact id="leaderboard-illusion" />
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
