// Chapter 4: copy or create. On the same hinge outline, the ideal denoiser over 24 training points (rings) puts every dot
// on a ring, while the learned denoiser draws new dots between them. Both run live: the ideal one at once (cheap), the
// learned one a slice per animation frame. Counts are computed from the dots and shown as data attributes for the e2e.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { sampleIdealPoints } from '../../lib/diffusion/ideal';
import { distanceToOutline, pointsOf, startPoints, trainingPoints } from '../../lib/diffusion/points';
import { DARKROOM_PARTS } from '../../components/scenes/darkroomScene';
import { Outcome } from '../tool-calling/kit';
import { DiffusionStage, Fact, META, NEAR, ToyNote, Waiting, onTrain, useLearnedPoints } from './kit';

const MODULE = 'diffusion',
  ID = '04-copy-or-create';
export const PARTS = DARKROOM_PARTS;
export const DOTS = 300,
  SEED = 7,
  STEPS_4 = 50;
export const TRAIN = trainingPoints(META.outline);
const NOISE = pointsOf(startPoints(DOTS, 1, SEED));
let ideal: [number, number][] | null = null;
/** The ideal denoiser's dots, sampled once (a few milliseconds). */
const idealDots = () => (ideal ??= sampleIdealPoints(TRAIN, DOTS, STEPS_4, SEED));

interface S {
  p1: number | null;
  ideal: boolean;
  learned: boolean;
  /** which run the tray shows */
  show: 'ideal' | 'learned' | null;
  quiz: number | null;
}

const P1 = {
  question: `What will the ideal denoiser draw from ${DOTS} dots of noise?`,
  options: [
    `Its ${TRAIN.length} training points, exactly`,
    'New points all along the outline',
    'A blur between the rings',
  ],
};

export const QUIZ = {
  question: 'A model trained on a few hundred company logos is asked for “a new logo”. What is the risk?',
  options: [
    'It hands back one of its training logos, almost exactly',
    'It can’t draw a logo it hasn’t seen, so it fails',
    'Every logo comes out as a blur of all of them',
  ],
  correct: 0,
  explanation: 'With few examples, the best fit to them is a copy of one of them, as the ideal denoiser showed.',
  why: [
    'Right: with few training examples a denoiser can fit them so well that it hands one back.',
    'Drawing new things is what generalising means; the worry is the opposite, that it copies.',
    'A blur is what one rough step gives; a well-trained denoiser settles on a sharp picture.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `The red rings are ${TRAIN.length} training points on the hinge’s outline. The ideal denoiser is the best possible guess for them.`,
    act: 'Predict first.',
    say: { block: 'tray', text: 'Training points' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'ideal',
    focus: 'runIdeal',
    visibleControls: ['runIdeal'],
    narration:
      'Its guess is an average of the training points, weighted by fit. Near the end, one point outweighs the rest.',
    act: 'Run the ideal denoiser.',
    predicate: s => s.ideal,
  },
  {
    id: 'learned',
    focus: 'runLearned',
    visibleControls: ['counts', 'runLearned'],
    narration:
      'Nearly every dot sits on a ring: it can only memorise. Now the learned denoiser, trained on the same outline.',
    act: 'Run the learned denoiser.',
    say: { block: 'tray', text: 'All copies' },
    predicate: s => s.learned,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['counts', 'quiz'],
    narration:
      'The network learned a shape, not points, so it can generalise: new dots between the rings. Real models still copy sometimes.',
    act: 'One question to finish.',
    say: { block: 'tray', text: 'New dots' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'With only a few examples, what is the closest fit to them?',
  },
];

const counts = (pts: [number, number][]) => ({
  rings: pts.filter(p => onTrain(p, TRAIN)).length,
  outline: pts.filter(([x, y]) => distanceToOutline(META.outline, x, y) < NEAR).length,
});

function Stage({ state, sync, say }: { state: S; sync: (s: S) => void; say?: Step<S>['say'] }) {
  const job = state.show === 'learned' ? { n: DOTS, steps: STEPS_4, seed: SEED } : null;
  const r = useLearnedPoints(job, () => {
    if (!state.learned) sync({ ...state, learned: true });
  });
  const running = !!job && r.done < STEPS_4;
  const pts = state.show === 'ideal' ? idealDots() : (r.pts ?? NOISE);
  const c = counts(pts);
  return (
    <DiffusionStage
      say={say}
      shown={{
        wait:
          job && !r.pts && r.status !== 'ready' ? <Waiting failed={r.status === 'error'} retry={r.retry} /> : undefined,
        print: {
          kind: 'points',
          pts,
          train: TRAIN,
          name: state.show === 'ideal' ? 'COPIES' : job && !running ? 'NEW DOTS' : 'NOISE',
        },
        steps: STEPS_4,
        done: job ? r.done : undefined,
        caption: !state.show
          ? `${DOTS} dots of noise; the rings are the training points.`
          : running
            ? `The learned denoiser, developing: step ${r.done} of ${STEPS_4}.`
            : `The ${state.show} denoiser: ${c.rings} of ${DOTS} dots on a training point, ${c.outline} on the outline.`,
      }}
    />
  );
}

/** Both runs side by side once run: dots on a training point, and on the outline. */
function Counts({ state }: { state: S }) {
  const run = useLearnedPoints(state.learned ? { n: DOTS, steps: STEPS_4, seed: SEED } : null).pts,
    learned = state.learned && run ? counts(run) : null;
  const ideal = counts(idealDots());
  return (
    <>
      <Outcome {...P1} prediction={state.p1} outcome={0} />
      <table className="tc-ledger" style={{ marginTop: 10 }}>
        <caption>Where the {DOTS} dots landed</caption>
        <thead>
          <tr>
            <th scope="col">Denoiser</th>
            <th scope="col">On a training point</th>
            <th scope="col">On the outline</th>
          </tr>
        </thead>
        <tbody>
          <tr data-run="ideal" data-rings={ideal.rings}>
            <th scope="row">Ideal</th>
            <td>{ideal.rings}</td>
            <td>{ideal.outline}</td>
          </tr>
          {learned && (
            <tr data-run="learned" data-rings={learned.rings} data-outline={learned.outline}>
              <th scope="row">Learned</th>
              <td>{learned.rings}</td>
              <td>{learned.outline}</td>
            </tr>
          )}
        </tbody>
      </table>
      {learned && <Fact id="memorise" />}
      <ToyNote />
    </>
  );
}

export default function CopyOrCreate() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, ideal: false, learned: false, show: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => <Stage state={state} sync={sync} say={say} />}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        runIdeal: ({ state, sync }) => (
          <button type="button" className="big" onClick={() => sync({ ...state, ideal: true, show: 'ideal' })}>
            Run the ideal denoiser
          </button>
        ),
        counts: ({ state }) => <Counts state={state} />,
        runLearned: ({ state, sync }) =>
          state.show === 'learned' ? (
            <p className="note" role="status">
              Developing…
            </p>
          ) : (
            <button type="button" className="big" onClick={() => sync({ ...state, show: 'learned' })}>
              Run the learned denoiser
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
