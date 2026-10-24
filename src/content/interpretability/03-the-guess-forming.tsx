// Chapter 3: the guess forming. The reader opens the Lens tab (the logit lens: each stage's residual read out through
// the model's own last step), predicts where the expected token first reaches the top 5, then tries other prompts.
// After the embedding the model mostly echoes the token it is on; block 1 finds the answer. Ranks are computed live;
// data/interpretability/prompts.json pins them.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import type { Model } from '../../lib/lm/model';
import { encode } from '../../lib/lm/bpe';
import { LENS, STAGES, lens } from '../../lib/interpretability/probe';
import { FUSE_PARTS } from '../../components/scenes/fuseScene';
import { Fact, InterpStage, ModelGate, OURS, said, useBase, whenLoaded, type View } from './kit';

const MODULE = 'interpretability',
  ID = '03-the-guess-forming';
export const PARTS = FUSE_PARTS;
const TRY = 3;
/** The prediction's prompt. */
export const PREDICT = LENS.find(p => p.id === 'expenses')!;
const promptOf = (id: string) => LENS.find(p => p.id === id) ?? LENS[0];
/** The first stage where a prompt's expected token is in the top 5 (STAGES.length if never). */
export function firstStage(m: Model, id: string): number {
  const p = promptOf(id),
    r = lens(m, p.text)
      .ranks(encode(p.expected)[0])
      .findIndex(x => x < 5);
  return r < 0 ? STAGES.length : r;
}

const P1 = {
  question: `On “${PREDICT.text}”, where does ${said(PREDICT.expected)} first reach the top 5?`,
  options: [`${STAGES[0]}, before any block`, `${STAGES[1]}`, `Only at the ${STAGES[2].toLowerCase()}`],
};

export const QUIZ = {
  question:
    'A team reads a large model’s middle layers through its final output step and sees the right answer already on top halfway up. What does that tell them?',
  options: [
    'The later layers do nothing and can be deleted',
    'The guess formed by the middle; later layers refine it, which removing them would test',
    'The lens is broken: a guess can only exist at the output',
  ],
  correct: 1,
  explanation:
    'The logit lens shows when a guess becomes readable; it doesn’t say the rest is idle. Larkspur mini found its answer in block 1 and the output kept it.',
  why: [
    'Readable early is not the same as unused later; only switching the layers off would show that.',
    'Right: the lens shows where the guess appears, and an ablation would show what the later layers still add.',
    'You read guesses after the embedding and after block 1 yourself; any stage can be read the same way.',
  ],
};

interface S {
  view: View;
  prompt: string;
  seen: string[];
  p1: number | null;
  revealed: boolean;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'open',
    focus: 'open',
    visibleControls: ['open'],
    narration: 'The logit lens reads the guess partway up, as if the model stopped there and answered.',
    act: 'Open the Lens tab.',
    say: { block: 'layer-1', text: 'Read here too' },
    predicate: whenLoaded(s => s.view === 'lens'),
    hint: 'Press “Lens” above the picture.',
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'Three readings: after the embedding, after block 1, and the output.',
    act: 'Predict first.',
    setup: s => ({ ...s, prompt: PREDICT.id, view: 'scene' }),
    predicate: s => s.p1 !== null,
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['p1', 'reveal'],
    narration: 'Locked in.',
    act: 'Read the lens.',
    predicate: s => s.revealed,
  },
  {
    id: 'prompts',
    focus: 'prompts',
    visibleControls: ['out1', 'prompts'],
    narration: 'After the embedding it mostly echoes the token it sits on. Block 1 finds the answer.',
    act: 'Try two more prompts.',
    predicate: s => s.seen.length >= TRY,
    hint: `Pick ${TRY - 1} more prompts under the result.`,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: 'In big models the guess firms up over many layers; the lens lets you watch it happen.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Does readable early mean the later layers are idle?',
  },
];

export default function TheGuessForming() {
  const { model } = useBase();
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      ready={!!model}
      initial={{ view: 'scene', prompt: LENS[0].id, seen: [], p1: null, revealed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const p = promptOf(state.prompt);
        return (
          <InterpStage
            say={say}
            prompt={p.text}
            watch={p.expected}
            view={state.view}
            onView={v => sync({ ...state, view: v })}
            locked={state.prompt === PREDICT.id && state.p1 === null}
            caption={`${p.text} … · ${said(p.expected)} marked in the Lens tab`}
          />
        );
      }}
      controls={{
        open: () => (
          <ModelGate weights="base">{() => <p className="tc-status">The Lens tab is above the picture.</p>}</ModelGate>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        reveal: ({ state, apply }) => (
          <button
            type="button"
            className="chip"
            onClick={() => apply({ ...state, revealed: true, view: 'lens', seen: [PREDICT.id] })}
          >
            Show the lens
          </button>
        ),
        out1: ({ state }) => (
          <ModelGate weights="base">
            {m => (
              <>
                <Outcome {...P1} prediction={state.p1} outcome={Math.min(firstStage(m, PREDICT.id), 2)} />
                <Fact id="logit-lens" />
              </>
            )}
          </ModelGate>
        ),
        prompts: ({ state, apply }) => (
          <ModelGate weights="base">
            {m => {
              const p = promptOf(state.prompt),
                ranks = lens(m, p.text).ranks(encode(p.expected)[0]);
              return (
                <>
                  <div role="group" aria-label="Pick a prompt" className="ip-fuses">
                    {LENS.map(x => (
                      <button
                        key={x.id}
                        type="button"
                        className="chip"
                        aria-pressed={state.prompt === x.id}
                        onClick={() =>
                          apply({ ...state, prompt: x.id, view: 'lens', seen: [...new Set([...state.seen, x.id])] })
                        }
                      >
                        {x.text}
                      </button>
                    ))}
                  </div>
                  <p className="tc-status" role="status">
                    {`${said(p.expected)} ranks ${ranks.map((r, i) => `${r + 1} ${STAGES[i].toLowerCase()}`).join(', ')}. Tried ${state.seen.length} of ${TRY}.`}
                  </p>
                  <p className="note">{OURS}</p>
                </>
              );
            }}
          </ModelGate>
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
