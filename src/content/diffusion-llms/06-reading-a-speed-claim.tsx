// Chapter 6: reading a speed claim. Tokens a second = tokens a pass × passes a second. The vendor's figure is its own
// (facts.json, dated); passes a second is Larkspur's planning number (assumptions.json). The reader turns tokens a pass
// up until the arithmetic reaches the claim, then reads the toy's quality at that setting (prompts.json).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import PINNED from '../../../data/diffusion-llms/prompts.json' with { type: 'json' };
import ASSUME from '../../../data/diffusion-llms/assumptions.json' with { type: 'json' };
import { KS, L, MASK, passesFor, pct, type K } from '../../lib/diffusion-llms/decode';
import { CLAIM, NEED, RATE } from '../../lib/diffusion-llms/chapters';
import { FRAME_PARTS } from '../../components/scenes/typeFrameScene';
import { Outcome } from '../tool-calling/kit';
import { Fact, FrameStage, KRange, ToyNote, phrase, tokens } from './kit';

const MODULE = 'diffusion-llms',
  ID = '06-reading-a-speed-claim';
export const PARTS = FRAME_PARTS;
export { CLAIM, NEED, RATE };
const n = (x: number) => x.toLocaleString('en-US');
const QUALITY = PINNED.quality.confidence as Record<string, number>,
  REPEATS = PINNED.repeats.confidence as Record<string, number>;
const P = phrase(1);

export interface S {
  p1: number | null;
  k: K;
  quiz: number | null;
}

const P1 = {
  question: 'What does a model’s tokens a second depend on?',
  options: ['Tokens a pass times passes a second', 'Only the model’s size', 'How good its replies are'],
};

export const QUIZ = {
  question: 'A vendor quotes 2,000 tokens a second. Which question matters most before you buy?',
  options: [
    'How many tokens a pass it used, and how good replies were at that setting',
    'Which brand of chips it ran on',
    'Whether it is a diffusion model or a left-to-right one',
  ],
  correct: 0,
  explanation: 'Speed is tokens a pass times passes a second, and more tokens a pass costs quality.',
  why: [
    'Right: a figure measured at many tokens a pass may come with replies you wouldn’t ship.',
    'Hardware changes passes a second, but says nothing about the replies’ quality.',
    'Either kind can be fast; what matters is the quality at the speed quoted.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `A vendor claim: ${n(CLAIM)} tokens a second. Larkspur’s server runs ${RATE} passes a second, its planning number.`,
    act: 'Predict first.',
    say: { block: 'press', text: `${RATE} a second` },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'dial',
    focus: 'k',
    visibleControls: ['k'],
    narration: 'Tokens a second: tokens a pass times passes a second.',
    act: 'Turn Tokens a pass up to reach the claim.',
    say: { block: 'dial', text: 'Tokens a pass' },
    predicate: s => s.k === NEED,
    hint: `Each notch doubles tokens a pass. Stop at the first that reaches ${n(CLAIM)}.`,
    solution: s => ({ ...s, k: NEED }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['reveal', 'quiz'],
    narration: `At ${NEED} a pass the toy keeps ${pct(QUALITY[NEED])} of the careful fill. Ask what quality that speed came with.`,
    act: 'One question to finish.',
    say: { block: 'frame', text: 'Fast, but rough' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What did chapter 4 show happens as tokens a pass rises?',
  },
];

const speed = (k: number) => k * RATE;
function Stage({ state, say }: { state: S; say?: Step<S>['say'] }) {
  return (
    <FrameStage
      say={say}
      shown={{
        given: P.ids.length,
        slots: Array.from({ length: L }, () => ({ state: 'mask', tok: MASK, p: 0 })),
        k: state.k,
        caption: `${tokens(state.k)} a pass × ${RATE} passes a second = ${n(speed(state.k))} tokens a second; a ${L}-token reply in ${passesFor(state.k)} pass${passesFor(state.k) === 1 ? '' : 'es'}.`,
      }}
    />
  );
}

export default function ReadingASpeedClaim() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, k: 1, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => <Stage state={state} say={say} />}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        k: ({ state, sync }) => (
          <>
            <KRange value={state.k} onChange={k => sync({ ...state, k })} />
            <p className="dl-headline" role="status" data-speed={speed(state.k)}>
              <strong>{n(speed(state.k))}</strong> tokens a second
              <span className={`stamp ${speed(state.k) >= CLAIM ? 'correct' : 'neutral'}`}>
                {speed(state.k) >= CLAIM ? 'REACHES THE CLAIM' : `CLAIM IS ${n(CLAIM)}`}
              </span>
            </p>
            <p className="dl-note">{ASSUME.note}</p>
          </>
        ),
        reveal: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={0} />
            <table className="tc-ledger" style={{ marginTop: 10 }}>
              <caption>The toy at each setting, every pinned phrase, surest first</caption>
              <thead>
                <tr>
                  <th scope="col">Tokens a pass</th>
                  <th scope="col">Tokens a second</th>
                  <th scope="col">Same as careful</th>
                  <th scope="col">Repeats</th>
                </tr>
              </thead>
              <tbody>
                {KS.map(k => (
                  <tr key={k} data-k={k}>
                    <th scope="row">{k}</th>
                    <td>{n(speed(k))}</td>
                    <td>{pct(QUALITY[k])}</td>
                    <td>{pct(REPEATS[k])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Fact id="mercury-2" />
            <Fact id="fast-dllm" />
            <Fact id="gemini-diffusion" />
            <Fact id="sedd" />
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
