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
import { Fact, MultimodalStage, type View } from './kit';

const MODULE = 'multimodal', ID = '01-a-picture-is-tokens';
const S0 = sent('invoice', 1600), C = S0.count;

interface S { p1: number | null; cut: boolean; view: View; quiz: number | null }

const P1 = {
  question: 'A supplier’s invoice arrives as a picture. The model reads tokens. How does the picture get in?',
  options: ['Pixel by pixel: one token per pixel', 'Cut into small squares: one token per square', 'It is turned into a written description first'],
};

const QUIZ = {
  question: 'Larkspur’s logo is a 280 × 280 px image. How many image tokens does it cost, at 28 px patches?',
  options: ['100', '78,400: one per pixel', 'About 3: one per word in it'],
  correct: 0,
  explanation: '280 / 28 = 10 patches across and 10 down: 100 patches, one token each.',
  why: [
    'Right. 10 across × 10 down = 100.',
    'That is the pixel count. Each token covers a 28 × 28 square, 784 pixels.',
    'The model doesn’t read the words first; it reads every patch, words or not.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict', focus: 'p1', visibleControls: ['p1'],
    narration: 'Larkspur’s assistant reads tokens: the small pieces of text a model reads and writes (the Tokens module covers them). A multimodal model also reads images. Before you see how:',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'cut', focus: 'cut', visibleControls: ['p1', 'cut'],
    narration: `Here is a supplier’s invoice, sent at ${S0.w} × ${S0.h} pixels. Cut it into patches and look at the result in the Patches tab.`,
    predicate: s => s.cut,
  },
  {
    id: 'quiz', focus: 'quiz', visibleControls: ['count', 'quiz'],
    narration: `Each square is a patch, ${PATCH} × ${PATCH} pixels, and each patch becomes one token: a visual token. The model reads them in a row like text tokens, and they are priced the same way. The count is live: ⌈width ÷ ${PATCH}⌉ across × ⌈height ÷ ${PATCH}⌉ down, rounding up so the edges get a patch too.`,
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'How many 28 px squares fit across 280 px?',
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
      stage={({ state, sync }) => (
        <MultimodalStage view={state.view} onView={view => sync({ ...state, view })} shown={{
          image: 'invoice', size: 1600, method: state.cut ? 'vision' : null,
          caption: state.cut ? `${S0.w} × ${S0.h} px: ${C.cols} × ${C.rows} patches, ${thousands(C.tokens)} image tokens.` : 'A supplier’s invoice, about to be read.',
        }} />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        cut: ({ state, sync }) => <button type="button" className="big" onClick={() => sync({ ...state, cut: true, view: 'patches' })}>Cut it into patches</button>,
        count: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={1} />
            <table className="tc-ledger" style={{ marginTop: 10 }}>
              <caption>The invoice, counted</caption>
              <tbody>
                <tr><th scope="row">Across</th><td>⌈{S0.w} ÷ {PATCH}⌉ = {C.cols} patches</td></tr>
                <tr><th scope="row">Down</th><td>⌈{S0.h} ÷ {PATCH}⌉ = {C.rows} patches</td></tr>
                <tr><th scope="row">Image tokens</th><td><strong>{C.cols} × {C.rows} = {thousands(C.tokens)}</strong></td></tr>
              </tbody>
            </table>
            <Fact id="patches" />
            <Fact id="example-1000" />
            <Fact id="openai-32" />
            <Fact id="vit" />
          </>
        ),
        quiz: ({ state, apply, sync }) => (
          <Quiz {...QUIZ} unsure value={state.quiz} onAnswer={(_, q) => apply({ ...state, quiz: q })} onUnsure={() => sync({ ...state, quiz: UNSURE })} />
        ),
      }}
    />
  );
}
