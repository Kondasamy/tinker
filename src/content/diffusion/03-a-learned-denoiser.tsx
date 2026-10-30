// Chapter 3: a learned denoiser. The reader predicts what a network learns, then develops 300 dots with the learned 2-D
// denoiser (trained once in Python, run live a slice per animation frame) and watches noise pulled onto the hinge's
// outline. The finished run lands in the step state through sync.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { fact } from '../../lib/diffusion/facts';
import { pointsOf, startPoints } from '../../lib/diffusion/points';
import { DARKROOM_PARTS } from '../../components/scenes/darkroomScene';
import { Outcome } from '../tool-calling/kit';
import { DiffusionStage, Fact, META, ToyNote, Waiting, dotFrames, dotWords, useLearnedPoints } from './kit';

const MODULE = 'diffusion',
  ID = '03-a-learned-denoiser';
export const PARTS = DARKROOM_PARTS;
export const DOTS = 300,
  SEED = 7,
  STEPS_3 = 50;
const NOISE = pointsOf(startPoints(DOTS, 1, SEED));
const TRAINING = META as unknown as { training: { steps: number }; model: { params: number } };
const thousands = (n: number) => n.toLocaleString('en-US');
/** DDPM's CIFAR-10 network, in millions of weights (fact `ddpm-noise`). */
const REAL_M = Number(fact('ddpm-noise').value) / 1e6;

interface S {
  p1: number | null;
  ran: boolean;
  done: boolean;
  quiz: number | null;
}

const P1 = {
  question: 'The network never keeps a list of the outline’s points. What did it learn?',
  options: [
    'Which way, and how far, to move a dot at each noise level',
    'A copy of every training point, squeezed small',
    'One fixed hinge that it pastes in at the end',
  ],
};

export const QUIZ = {
  question: 'A model that draws chairs was trained on a million chair photos. What ships with the model?',
  options: [
    'The network’s weights, and no photos',
    'The million photos, compressed',
    'An index for looking the photos up',
  ],
  correct: 0,
  explanation:
    'Training tunes the weights; the photos stay behind, and the weights hold how to remove noise toward chairs.',
  why: [
    'Right: only the weights ship, though chapter 4 shows they can still hold near-copies of some pictures.',
    'The photos are only used to tune the weights; they are not packed into the model.',
    'There is no lookup at drawing time: each step is one run of the network on the noisy picture.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `The tray holds ${DOTS} dots of pure noise. A small network was trained on points from the hinge’s outline.`,
    act: 'Predict first.',
    say: { block: 'tray', text: 'Pure noise' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'sample',
    focus: 'sample',
    visibleControls: ['sample'],
    narration: `Training: noise a point, ask the network for the noise, nudge its weights. ${thousands(TRAINING.training.steps)} rounds.`,
    act: `Develop ${DOTS} dots.`,
    say: { block: 'dial', text: `${STEPS_3} steps` },
    predicate: s => s.done,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['reveal', 'quiz'],
    narration: 'Each dot followed the network’s guess toward the outline. It kept no points, only which way to move.',
    act: 'One question to finish.',
    say: { block: 'tray', text: 'Pulled onto it' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What did training change: the pictures, or the network?',
  },
];

function Stage({ state, sync, say }: { state: S; sync: (s: S) => void; say?: Step<S>['say'] }) {
  const job = state.ran ? { n: DOTS, steps: STEPS_3, seed: SEED } : null;
  const r = useLearnedPoints(job, () => {
    if (!state.done) sync({ ...state, done: true });
  });
  const pts = r.pts ?? NOISE,
    running = !!job && r.done < STEPS_3;
  return (
    <DiffusionStage
      say={say}
      shown={{
        wait:
          job && !r.pts && r.status !== 'ready' ? <Waiting failed={r.status === 'error'} retry={r.retry} /> : undefined,
        print: { kind: 'points', pts, name: job && !running ? 'HINGE' : 'NOISE' },
        steps: STEPS_3,
        done: job ? r.done : undefined,
        frames: job && r.snaps && !running ? dotFrames(r.snaps, STEPS_3) : undefined,
        stripLabel: `${DOTS} dots developed by the learned denoiser`,
        caption: !job
          ? `${DOTS} dots of pure noise.`
          : running
            ? `Developing: step ${r.done} of ${STEPS_3}.`
            : `The learned denoiser, ${STEPS_3} steps: ${dotWords(pts)}.`,
      }}
    />
  );
}

export default function ALearnedDenoiser() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, ran: false, done: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => <Stage state={state} sync={sync} say={say} />}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        sample: ({ state, sync }) =>
          state.ran ? (
            <p className="note" role="status">
              Developing…
            </p>
          ) : (
            <button type="button" className="big" onClick={() => sync({ ...state, ran: true })}>
              Develop {DOTS} dots
            </button>
          ),
        reveal: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={0} />
            <p className="note">
              The network has {thousands(TRAINING.model.params)} weights and was trained once, ahead of time, on points
              from the outline; your browser only runs it. A real picture model learns the same job with far more:
              DDPM’s model for 32 × 32 photos had {REAL_M} million.
            </p>
            <Fact id="ddpm-noise" />
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
