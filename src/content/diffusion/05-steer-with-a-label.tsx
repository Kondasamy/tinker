// Chapter 5: steer with a label. Eight seeds, one label, a guidance scale from a finite list: the ideal denoiser draws
// each live (one picture per animation frame, kit's useJobs) and the strip shows all eight, each named by the part it
// came out as. Scale 0 ignores the label; 1 follows the toy's half-learned label; above 1 pushes past it, at two
// predictions a step.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { nearest, type Label } from '../../lib/diffusion/drawings';
import { GUIDANCE, LABEL_PRIOR, passes, sampleDrawing, type Guidance } from '../../lib/diffusion/ideal';
import { SEEDS } from '../../lib/diffusion/workbench';
import { DARKROOM_PARTS } from '../../components/scenes/darkroomScene';
import type { StripFrame } from '../../components/scenes/denoiseStrip';
import { Outcome } from '../tool-calling/kit';
import { DiffusionStage, Fact, GuidanceRange, LabelPick, NAME, ToyNote, printWords, useJobs } from './kit';

const MODULE = 'diffusion',
  ID = '05-steer-with-a-label';
export const PARTS = DARKROOM_PARTS;
export const STEPS_5 = 20;
/** The scales the chapter asks the reader to try. */
export const ASKED: Guidance[] = [0, 1, 4];

export interface S {
  p1: number | null;
  label: Label;
  scale: Guidance;
  /** scales tried so far */
  tried: number[];
  quiz: number | null;
}

const P1 = {
  question: `At guidance scale 0, how many of the ${SEEDS.length} pictures come out drills?`,
  options: [
    `All ${SEEDS.length}: the card asks for a drill`,
    'Only some, by chance: scale 0 ignores the label',
    'None: scale 0 blocks drills',
  ],
};

export const QUIZ = {
  question:
    'Every picture from an image tool looks alike and a little overdone. Which setting is most likely too high?',
  options: ['The guidance scale', 'The number of steps', 'The picture size'],
  correct: 0,
  explanation: 'Strong guidance pushes every picture hard toward the label, trading variety for a stronger match.',
  why: [
    'Right: high guidance trades variety for a closer match to the label, so pictures converge and look pushed.',
    'More steps make a picture cleaner, not more alike.',
    'Size changes the cost and the detail, not how strongly every picture leans toward the label.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `${SEEDS.length} pictures from ${SEEDS.length} seeds. The label card asks for a drill; the guidance scale says how hard to push.`,
    act: 'Predict first.',
    say: { block: 'label', text: 'Asks for a drill' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'sweep',
    focus: 'scale',
    visibleControls: ['scale', 'results'],
    narration:
      'Scale 1 follows the label as trained. Above 1, classifier-free guidance pushes past it, at two predictions a step.',
    act: `Try scales ${ASKED.join(', ')}.`,
    say: { block: 'label', text: 'Push harder' },
    predicate: s => ASKED.every(g => s.tried.includes(g)),
    hint: 'Drag the Guidance slider from 0 to the top, one notch at a time.',
    solution: s => ({ ...s, scale: 4, tried: [...new Set([...s.tried, ...ASKED])] }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['results', 'quiz'],
    narration:
      'More guidance, more of the label’s part, but each step needs two predictions: with the label and without.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What does pushing harder toward the label do to variety?',
  },
];

/** The eight pictures for a label and a scale, drawn one per animation frame. */
function useSamples(label: Label, scale: Guidance) {
  return useJobs(
    SEEDS.map(seed => ({ key: `5:${label}:${scale}:${seed}`, run: () => sampleDrawing(STEPS_5, seed, label, scale) })),
  );
}
const rightOf = (label: Label, xs: (Float64Array | undefined)[]) =>
  xs.filter(x => x && nearest(x).drawing.label === label).length;

function Stage({ state, say }: { state: S; say?: Step<S>['say'] }) {
  const xs = useSamples(state.label, state.scale),
    ready = xs.every(Boolean),
    right = rightOf(state.label, xs);
  const frames: StripFrame[] | undefined = ready
    ? xs.map((x, i) => {
        const n = nearest(x!).drawing.label;
        return {
          print: { kind: 'pixels', px: x!, name: '' },
          pill: n.toUpperCase(),
          words: `Seed ${SEEDS[i]}: ${printWords(x!)}${n === state.label ? '' : `, not a ${NAME[state.label]}`}`,
        };
      })
    : undefined;
  const first = xs[0];
  return (
    <DiffusionStage
      say={say}
      shown={{
        print: first ? { kind: 'pixels', px: first, name: nearest(first).drawing.label.toUpperCase() } : undefined,
        steps: STEPS_5,
        label: state.label,
        guidance: state.scale,
        frames,
        stripLabel: `${SEEDS.length} pictures asked for a ${NAME[state.label]} at guidance scale ${state.scale}`,
        caption: ready
          ? `Scale ${state.scale}: ${right} of ${SEEDS.length} came out a ${NAME[state.label]}. The Strip tab shows all ${SEEDS.length}.`
          : 'Drawing the pictures…',
      }}
    />
  );
}

function Results({ state }: { state: S }) {
  const rows = GUIDANCE.filter(g => state.tried.includes(g));
  return (
    <>
      <Outcome {...P1} prediction={state.p1} outcome={1} />
      <table className="tc-ledger" style={{ marginTop: 10 }}>
        <caption>
          Asked for a {NAME[state.label]}, {STEPS_5} steps
        </caption>
        <thead>
          <tr>
            <th scope="col">Scale</th>
            <th scope="col">Right part</th>
            <th scope="col">Predictions a picture</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(g => (
            <Row key={g} label={state.label} scale={g} />
          ))}
        </tbody>
      </table>
      <p className="df-note">
        This toy’s labelled denoiser only half-learned its labels: it weighs the label’s drawings {LABEL_PRIOR} times
        the others. That is a choice made for this site, so guidance has something to fix.
      </p>
      <Fact id="cfg" />
      <ToyNote />
    </>
  );
}
function Row({ label, scale }: { label: Label; scale: Guidance }) {
  const xs = useSamples(label, scale),
    ready = xs.every(Boolean);
  return (
    <tr data-scale={scale} data-right={ready ? rightOf(label, xs) : ''}>
      <th scope="row">{scale}</th>
      <td>{ready ? `${rightOf(label, xs)} of ${SEEDS.length}` : '…'}</td>
      <td>{STEPS_5 * passes(scale)}</td>
    </tr>
  );
}

export default function SteerWithALabel() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, label: 'drill', scale: 0, tried: [0], quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => <Stage state={state} say={say} />}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        scale: ({ state, sync }) => (
          <>
            <GuidanceRange
              value={state.scale}
              onChange={scale => sync({ ...state, scale, tried: [...new Set([...state.tried, scale])] })}
            />
            <LabelPick value={state.label} onChange={label => sync({ ...state, label })} />
          </>
        ),
        results: ({ state }) => <Results state={state} />,
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
