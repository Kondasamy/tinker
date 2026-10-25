// Chapter 2: step by step. The learned toy denoiser draws the hinge's outline as 300 dots; the reader runs it at 50, 5
// and 1 steps and sees roughness (U4's measure: the dots' mean distance to the outline) rise as the steps fall. Sampling
// runs live, a slice per animation frame (kit's useLearnedPoints); each run's roughness lands in the step state.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { fact } from '../../lib/diffusion/facts';
import { roughness, pointsOf, startPoints } from '../../lib/diffusion/points';
import { STEPS as COUNTS, type Steps } from '../../lib/diffusion/schedule';
import { DARKROOM_PARTS } from '../../components/scenes/darkroomScene';
import { Outcome } from '../tool-calling/kit';
import {
  DiffusionStage,
  Fact,
  META,
  StepsRange,
  ToyNote,
  Waiting,
  dotFrames,
  dotWords,
  stepWords,
  two,
  useLearnedPoints,
} from './kit';

const MODULE = 'diffusion',
  ID = '02-step-by-step';
export const PARTS = DARKROOM_PARTS;
export const DOTS = 300,
  SEED = 7;
/** The step counts the chapter asks for, most first. */
export const ASKED: Steps[] = [50, 5, 1];
const NOISE = pointsOf(startPoints(DOTS, 1, SEED));
const DDPM = Number(fact('ddpm').value).toLocaleString('en-US');

export interface S {
  p1: number | null;
  steps: Steps;
  /** the step count being run (or last run) */
  run: Steps | null;
  /** roughness per step count run */
  rough: Partial<Record<string, number>>;
  quiz: number | null;
}

const P1 = {
  question: 'Drop from 50 steps to 5. What happens to the hinge?',
  options: [
    'The same hinge, ten times cheaper',
    'Ten times cheaper, but rougher: dots land off the outline',
    'Nothing comes out: it needs all 50',
  ],
};

export const QUIZ = {
  question: 'An image tool offers “fast” (8 steps) and “best” (40 steps) from the same model. Which is true?',
  options: [
    'Fast costs about a fifth as much, and its pictures are rougher',
    'Both cost the same; fast just skips a final check',
    'Fast is cheaper and just as sharp, so best is wasted',
  ],
  correct: 0,
  explanation:
    'Each step is one run of the denoiser: a fifth of the steps is about a fifth of the cost, and a rougher picture.',
  why: [
    'Right: cost follows the step count, and bigger jumps from rougher guesses leave a rougher picture.',
    'Every step is a full run of the denoiser, so fewer steps really do cost less.',
    'Bigger jumps rest on rougher guesses, so the same model loses detail at fewer steps.',
  ],
};

const tried = (s: S) => ASKED.every(n => s.rough[n] !== undefined);
export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `A toy denoiser trained on the hinge’s outline draws it with ${DOTS} dots. Each step is one run of the denoiser.`,
    act: 'Predict first.',
    say: { block: 'dial', text: 'One run a step' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'sweep',
    focus: 'steps',
    visibleControls: ['steps', 'results'],
    narration: 'Roughness: how far the dots land from the outline. Fewer steps mean bigger jumps from rougher guesses.',
    act: `Develop at ${ASKED.join(', then ')} steps.`,
    say: { block: 'tray', text: 'How rough?' },
    predicate: tried,
    hint: 'Set the Steps slider, press Develop, wait for the dots to settle, then the next count.',
    solution: s => ({ ...s, rough: { ...s.rough, ...ROUGH } }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['results', 'quiz'],
    narration: `Fewer steps cost less but draw rougher. DDPM, an early image model, took ${DDPM} steps a picture.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What does each step cost, and what does a bigger jump do?',
  },
];
/** Show me: the pinned roughness at each asked count (diffusion-workbench.test.ts keeps it equal to the live runs). */
export const ROUGH: Record<number, number> = { 50: 0.013, 5: 0.073, 1: 0.462 };

function Stage({ state, sync, say }: { state: S; sync: (s: S) => void; say?: Step<S>['say'] }) {
  const job = state.run ? { n: DOTS, steps: state.run, seed: SEED } : null;
  const r = useLearnedPoints(job, pts => {
    if (state.run && state.rough[state.run] === undefined)
      sync({ ...state, rough: { ...state.rough, [state.run]: roughness(META.outline, pts) } });
  });
  const pts = r.pts ?? NOISE,
    running = !!job && r.done < job.steps;
  return (
    <DiffusionStage
      say={say}
      shown={{
        wait:
          job && !r.pts && r.status !== 'ready' ? <Waiting failed={r.status === 'error'} retry={r.retry} /> : undefined,
        print: { kind: 'points', pts, name: job ? 'DOTS' : 'NOISE' },
        steps: state.run ?? state.steps,
        done: job ? r.done : undefined,
        frames: job && r.snaps && !running ? dotFrames(r.snaps, job.steps) : undefined,
        stripLabel: job ? `${DOTS} dots developed in ${stepWords(job.steps)}` : undefined,
        caption: !job
          ? `${DOTS} dots of pure noise, waiting to develop.`
          : running
            ? `Developing: step ${r.done} of ${job.steps}.`
            : `${stepWords(job.steps)}: ${dotWords(pts)}.`,
      }}
    />
  );
}

export default function StepByStep() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, steps: 50, run: null, rough: {}, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => <Stage state={state} sync={sync} say={say} />}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        steps: ({ state, sync }) => (
          <>
            <StepsRange value={state.steps} onChange={steps => sync({ ...state, steps })} />
            <button
              type="button"
              className="big"
              style={{ marginTop: 10 }}
              onClick={() => sync({ ...state, run: state.steps })}
            >
              Develop: {stepWords(state.steps)}
            </button>
          </>
        ),
        results: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={1} />
            <table className="tc-ledger" style={{ marginTop: 10 }} data-runs={Object.keys(state.rough).length}>
              <caption>Each run, its cost and its roughness</caption>
              <thead>
                <tr>
                  <th scope="col">Steps</th>
                  <th scope="col">Denoiser runs</th>
                  <th scope="col">Roughness</th>
                </tr>
              </thead>
              <tbody>
                {COUNTS.filter(n => state.rough[n] !== undefined)
                  .reverse()
                  .map(n => (
                    <tr key={n} data-steps={n}>
                      <th scope="row">{n}</th>
                      <td>{n}</td>
                      <td>{two(state.rough[n]!)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            <ToyNote />
          </>
        ),
        quiz: ({ state, apply, sync }) => (
          <>
            <Fact id="ddpm" />
            <Quiz
              {...QUIZ}
              unsure
              value={state.quiz}
              onAnswer={(_, q) => apply({ ...state, quiz: q })}
              onUnsure={() => sync({ ...state, quiz: UNSURE })}
            />
          </>
        ),
      }}
    />
  );
}
