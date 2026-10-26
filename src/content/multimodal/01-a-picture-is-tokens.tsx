// Chapter 1: a picture is tokens too. The reader predicts how a model reads a picture, cuts the invoice into patches (the
// Patches tab opens on it) and counts them live: ⌈w/28⌉ × ⌈h/28⌉. The tab is step state here, so the cut can open it.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { sent } from '../../lib/multimodal/readings';
import { PATCH, thousands } from '../../lib/multimodal/patches';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { SCAN_PARTS } from '../../components/scenes/scanScene';
import { Fact, MultimodalStage, type View } from './kit';

const MODULE = 'multimodal',
  ID = '01-a-picture-is-tokens';
export const PARTS = SCAN_PARTS;
const S0 = sent('invoice', 1600),
  C = S0.count;

interface S {
  p1: number | null;
  cut: boolean;
  view: View;
  quiz: number | null;
}

const P1 = {
  question: 'A supplier’s invoice arrives as a picture. The model reads tokens. How does the picture get in?',
  options: [
    'Pixel by pixel: one token per pixel',
    'Cut into small squares: one token per square',
    'It is turned into a written description first',
  ],
};

const SIDE = 10 * PATCH; // a logo exactly 10 patches across and down
export const QUIZ = {
  question: `Larkspur’s logo is a ${SIDE} × ${SIDE} px image. How many image tokens does it cost, at ${PATCH} px patches?`,
  options: [`${10 * 10}`, `${thousands(SIDE * SIDE)}: one per pixel`, 'About 3: one per word in it'],
  correct: 0,
  explanation: `${SIDE} / ${PATCH} = 10 patches across and 10 down: ${10 * 10} patches, one token each.`,
  why: [
    `Right: 10 across × 10 down = ${10 * 10}.`,
    `That is the pixel count, but each token covers a ${PATCH} × ${PATCH} square of ${PATCH * PATCH} pixels.`,
    'The model doesn’t read the words first; it reads every patch, words or not.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration:
      'The scanning table: an invoice under the camera, an empty belt to the model. A multimodal model reads images as well as text.',
    act: 'Predict first.',
    say: { block: 'belt', text: 'Belt is empty' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'cut',
    focus: 'cut',
    visibleControls: ['p1', 'cut'],
    narration: `The invoice is ${S0.w} × ${S0.h} pixels.`,
    act: 'Cut it into patches, then look in the Patches tab.',
    say: { block: 'sheet', text: 'One whole image' },
    predicate: s => s.cut,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['count', 'quiz'],
    narration: `Each ${PATCH} × ${PATCH} square is a patch, and each patch becomes one visual token, read and priced like text tokens.`,
    act: 'One question to finish.',
    say: { block: 'belt', text: 'A token a patch' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: `How many ${PATCH} px squares fit across ${SIDE} px?`,
  },
];

export default function APictureIsTokens() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, cut: false, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => (
        <MultimodalStage
          say={say}
          view={state.view}
          onView={view => sync({ ...state, view })}
          shown={{
            image: 'invoice',
            size: 1600,
            method: state.cut ? 'vision' : null,
            caption: state.cut
              ? `${S0.w} × ${S0.h} px: ${C.cols} × ${C.rows} patches, ${thousands(C.tokens)} image tokens.`
              : 'A supplier’s invoice, about to be read.',
          }}
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        cut: ({ state, sync }) => (
          <button type="button" className="big" onClick={() => sync({ ...state, cut: true, view: 'patches' })}>
            Cut it into patches
          </button>
        ),
        count: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={1} />
            <table className="tc-ledger" style={{ marginTop: 10 }}>
              <caption>The invoice, counted</caption>
              <tbody>
                <tr>
                  <th scope="row">Across</th>
                  <td>
                    ⌈{S0.w} ÷ {PATCH}⌉ = {C.cols} patches
                  </td>
                </tr>
                <tr>
                  <th scope="row">Down</th>
                  <td>
                    ⌈{S0.h} ÷ {PATCH}⌉ = {C.rows} patches
                  </td>
                </tr>
                <tr>
                  <th scope="row">Image tokens</th>
                  <td>
                    <strong>
                      {C.cols} × {C.rows} = {thousands(C.tokens)}
                    </strong>
                  </td>
                </tr>
              </tbody>
            </table>
            <Fact id="patches" />
            <Fact id="example-1000" />
            <Fact id="openai-32" />
            <Fact id="vit" />
            <p className="mm-note">
              Making a picture smaller to store or send is another job: <a href="/compression/">Compression</a>.
            </p>
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
