// Chapter 5: steering. The direction is the mean residual after block 1 of four shipping prompts minus that of four
// billing prompts (data/interpretability/prompts.json steer). The reader predicts what adding it does to “Please contact
// the”, sets the strength on a native range over a finite list, and watches “warehouse” rise into the top 5; at the
// strongest the model stops making sense. Every top 5 is computed live; the engine test pins the rise.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import type { Model } from '../../lib/lm/model';
import { encode } from '../../lib/lm/bpe';
import { softmax } from '../../lib/lm/model';
import { topK } from '../../lib/transformers/trace';
import { STEER, rankOf, steerDirection, steered } from '../../lib/interpretability/probe';
import { FUSE_PARTS } from '../../components/scenes/fuseScene';
import { Fact, InterpStage, ModelGate, OURS, TopFive, said, useBase, whenLoaded } from './kit';

const MODULE = 'interpretability',
  ID = '05-steering';
export const PARTS = FUSE_PARTS;
const MAX = Math.max(...STEER.scales);
const TARGET = encode(STEER.target)[0];

let dir: { m: Model; v: Float64Array } | undefined;
const directionOf = (m: Model) =>
  dir?.m === m ? dir.v : (dir = { m, v: steerDirection(m, STEER.toward, STEER.away, STEER.layer) }).v;
/** The top 5 after the prompt, steered at this strength. */
export const steeredTop = (m: Model, scale: number) =>
  topK(softmax(steered(m, STEER.prompt, directionOf(m), scale, STEER.layer)), 5);

const P1 = {
  question: `Steered at ×${STEER.scale}, what happens to ${said(STEER.target)} after “${STEER.prompt}”?`,
  options: ['It rises into the top 5', 'It stays out: the prompt’s words win', 'The model stops making sense'],
};
/** The option the steered run lands on. */
export function outcomeOf(m: Model): number {
  const r = rankOf(steered(m, STEER.prompt, directionOf(m), STEER.scale, STEER.layer), TARGET);
  return r < 5 ? 0 : 1;
}

export const QUIZ = {
  question:
    'A support team wants their model to sound more apologetic without retraining it. Someone suggests adding a direction made from apologetic replies minus neutral ones. What should they expect?',
  options: [
    'It works at any strength: more is always more apologetic',
    'A small push shifts the tone; too strong a push and the replies stop making sense',
    'It can’t work: only training changes what a model says',
  ],
  correct: 1,
  explanation:
    'Adding a direction moves the residual stream toward one side; a little moves the output, and a lot pushes it somewhere the later layers never saw.',
  why: [
    `At ×${MAX} Larkspur mini’s top guess became a scrap of a word, so strength has a limit.`,
    'Right: you saw a small push lift the target, and a big one break the output.',
    'You moved the guess without changing a single weight: steering edits the run, not the model.',
  ],
};

interface S {
  built: boolean;
  scale: number;
  p1: number | null;
  revealed: boolean;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'build',
    focus: 'build',
    visibleControls: ['build'],
    narration:
      'Steering pushes a model without retraining it. The direction: shipping prompts’ average activation minus billing prompts’.',
    act: 'Build the direction.',
    say: { block: 'layer-2', text: 'Added here' },
    predicate: whenLoaded(s => s.built),
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['build', 'p1'],
    narration: 'It is added to every token’s residual stream, after block 1, at a strength you choose.',
    act: 'Predict first.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'reveal',
    focus: 'strength',
    visibleControls: ['p1', 'strength'],
    narration: 'Locked in.',
    act: `Set the strength to ×${STEER.scale}.`,
    predicate: s => s.scale === STEER.scale,
    hint: `Drag the slider to ×${STEER.scale}.`,
  },
  {
    id: 'push',
    focus: 'strength',
    visibleControls: ['out1', 'strength'],
    narration: `${said(STEER.target)} rose from outside the top 5: the model drifts toward shipping. Push harder and it stops making sense.`,
    act: `Try ×${MAX}.`,
    say: { block: 'query', text: 'Drifts here' },
    predicate: s => s.scale === MAX,
    hint: 'Drag the slider all the way right.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['strength', 'quiz'],
    narration:
      'Researchers steer big models this way, with directions found by methods that go beyond two prompt sets.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What happened at the strongest push?',
  },
];

export default function Steering() {
  const { model } = useBase();
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      ready={!!model}
      initial={{ built: false, scale: 0, p1: null, revealed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => (
        <InterpStage
          say={say}
          prompt={STEER.prompt}
          caption={`${STEER.prompt} … · ${state.scale ? `steered ×${state.scale} toward shipping, after block 1` : 'not steered'}`}
        />
      )}
      controls={{
        build: ({ state, apply }) =>
          state.built ? (
            <details className="tc-def" open>
              <summary>The two sets</summary>
              <p>
                <strong>Toward (shipping):</strong>
              </p>
              <ul>
                {STEER.toward.map(t => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
              <p>
                <strong>Away (billing):</strong>
              </p>
              <ul>
                {STEER.away.map(t => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </details>
          ) : (
            <ModelGate weights="base">
              {() => (
                <button type="button" className="big" onClick={() => apply({ ...state, built: true })}>
                  Build the direction
                </button>
              )}
            </ModelGate>
          ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        strength: ({ state, apply, sync, focused }) => (
          <ModelGate weights="base">
            {m => {
              const i = Math.max(0, STEER.scales.indexOf(state.scale));
              return (
                <>
                  <div className="ip-range">
                    <label htmlFor="ip-steer">
                      <strong>{`Strength ×${STEER.scales[i]}`}</strong>
                    </label>
                    <input
                      id="ip-steer"
                      type="range"
                      min={0}
                      max={STEER.scales.length - 1}
                      step={1}
                      value={i}
                      aria-valuetext={`times ${STEER.scales[i]}`}
                      onChange={e =>
                        (focused ? apply : sync)({ ...state, scale: STEER.scales[Number(e.target.value)] })
                      }
                    />
                  </div>
                  <TopFive
                    caption={`After “${STEER.prompt}”, steered ×${STEER.scales[i]}`}
                    top={steeredTop(m, STEER.scales[i])}
                    before={steeredTop(m, 0)}
                    mark={STEER.target}
                  />
                  <p className="note">{OURS}</p>
                </>
              );
            }}
          </ModelGate>
        ),
        out1: ({ state }) => (
          <ModelGate weights="base">
            {m => (
              <>
                <Outcome {...P1} prediction={state.p1} outcome={outcomeOf(m)} />
                <Fact id="actadd" />
              </>
            )}
          </ModelGate>
        ),
        quiz: ({ state, apply, sync }) => (
          <>
            <Quiz
              {...QUIZ}
              unsure
              value={state.quiz}
              onAnswer={(_, q) => apply({ ...state, quiz: q })}
              onUnsure={() => sync({ ...state, quiz: UNSURE })}
            />
            <Fact id="scaling-monosemanticity" />
          </>
        ),
      }}
    />
  );
}
