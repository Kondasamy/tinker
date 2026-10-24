// Chapter 6: why it costs what it costs. The work for one picture is counted, not measured: steps × predictions a step ×
// positions the denoiser reads (pixels, or latent cells). The reader tries each size, then switches latent diffusion on
// (its factor from facts.json); few-step models close the chapter as a fact.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { drawing } from '../../lib/diffusion/drawings';
import { fact } from '../../lib/diffusion/facts';
import { DARKROOM_PARTS } from '../../components/scenes/darkroomScene';
import { Outcome } from '../tool-calling/kit';
import { DiffusionStage, Fact, ToyNote } from './kit';

const MODULE = 'diffusion',
  ID = '06-why-it-costs';
export const PARTS = DARKROOM_PARTS;
export const STEPS_6 = 50;
/** Picture sizes (width = height, px) the chapter offers. */
export const SIZES = [256, 512, 1024] as const;
/** Latent diffusion's shrink factor each way, from the paper (fact `latent`). */
export const F = Number(fact('latent').value);
const n = (x: number) => x.toLocaleString('en-US');
/** Positions the denoiser reads each step, and the work for one picture (steps × positions). */
export const positions = (size: number, latent: boolean) => (latent ? size / F : size) ** 2;
export const work = (size: number, latent: boolean) => STEPS_6 * positions(size, latent);

export interface S {
  p1: number | null;
  size: number;
  tried: number[];
  latent: boolean;
  quiz: number | null;
}

const P1 = {
  question: 'Double a picture’s width and its height. How much more work is each step?',
  options: ['Twice as much', 'Four times as much', 'The same: it is still one picture'],
};

export const QUIZ = {
  question: 'A team needs a picture within a moment, for a live preview while someone types. What fits best?',
  options: [
    'A few-step model, such as a consistency model',
    'The same diffusion model, set to 1 step',
    'The same model on a bigger picture',
  ],
  correct: 0,
  explanation:
    'Few-step models are trained to land a good picture in one or a few steps; a normal model at 1 step is rough.',
  why: [
    'Right: a few-step model is trained to finish in very few steps, so it stays sharp where a normal model can’t.',
    'Chapter 2 showed what one step gives an ordinary diffusion model: a rough picture.',
    'A bigger picture means more positions to read each step, so more work, not less.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration:
      'Each step, the denoiser reads every pixel of the picture. Larkspur’s toy prints are tiny; catalogue images are not.',
    act: 'Predict first.',
    say: { block: 'tray', text: 'Every pixel' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'size',
    focus: 'size',
    visibleControls: ['size', 'work'],
    narration: 'Work per picture is steps × positions read, and positions grow with width times height.',
    act: 'Try every size.',
    say: { block: 'dial', text: `× ${STEPS_6} steps` },
    predicate: s => SIZES.every(z => s.tried.includes(z)),
    hint: 'Press each size button in turn.',
  },
  {
    id: 'latent',
    focus: 'latent',
    visibleControls: ['size', 'latent', 'work'],
    narration: `Latent diffusion shrinks the picture ${F} times each way, denoises that small copy, then decodes it once.`,
    act: 'Switch latent on.',
    say: { block: 'tray', text: 'A small copy' },
    predicate: s => s.latent,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['work', 'quiz'],
    narration: 'Fewer positions cut the work per step. Few-step models cut the steps instead, some to a single step.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which lever is left once the picture is small: positions or steps?',
  },
];

export default function WhyItCosts() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, size: SIZES[0], tried: [SIZES[0]], latent: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => (
        <DiffusionStage
          say={say}
          shown={{
            print: { kind: 'pixels', px: drawing('drill-pistol').pixels, name: state.latent ? 'LATENT' : 'PICTURE' },
            steps: STEPS_6,
            caption: `${state.size} × ${state.size} px${state.latent ? `, latent ${state.size / F} × ${state.size / F}` : ''}: ${n(positions(state.size, state.latent))} positions × ${STEPS_6} steps = ${n(work(state.size, state.latent))} units of work.`,
          }}
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        size: ({ state, sync }) => (
          <div className="df-labels" role="group" aria-label="Picture size">
            {SIZES.map(z => (
              <button
                key={z}
                type="button"
                className="chip"
                aria-pressed={state.size === z}
                onClick={() => sync({ ...state, size: z, tried: [...new Set([...state.tried, z])] })}
              >
                {z} × {z}
              </button>
            ))}
          </div>
        ),
        latent: ({ state, sync }) => (
          <label className="df-range">
            <input
              type="checkbox"
              checked={state.latent}
              onChange={e => sync({ ...state, latent: e.currentTarget.checked })}
            />{' '}
            Latent diffusion ({F}× smaller each way)
          </label>
        ),
        work: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={1} />
            <table className="tc-ledger" style={{ marginTop: 10 }}>
              <caption>Work for one picture, {STEPS_6} steps (counted, not timed)</caption>
              <thead>
                <tr>
                  <th scope="col">Size</th>
                  <th scope="col">In pixels</th>
                  <th scope="col">In the latent</th>
                </tr>
              </thead>
              <tbody>
                {SIZES.filter(z => state.tried.includes(z)).map(z => (
                  <tr key={z} data-size={z}>
                    <th scope="row">
                      {z} × {z}
                    </th>
                    <td>{n(work(z, false))}</td>
                    <td>{state.latent ? n(work(z, true)) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Fact id="pixel-cost" />
            {state.latent && <Fact id="latent" />}
            {state.latent && <Fact id="consistency" />}
            {state.latent && <Fact id="flow-matching" />}
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
