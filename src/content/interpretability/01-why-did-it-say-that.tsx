// Chapter 1: why did it say that? The reader reads Larkspur mini's top 5 for one prompt, recaps Transformers' attention
// by lighting every head, then predicts whether the heaviest thread proves what caused the guess. The reveal is the
// research finding (Jain and Wallace): attention maps describe, they don't prove. Every number is computed live.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { LENS, nextTop } from '../../lib/interpretability/probe';
import { FUSE_PARTS } from '../../components/scenes/fuseScene';
import META from '../../../public/data/lm/meta.json' with { type: 'json' };
import { Fact, InterpStage, ModelGate, OURS, TopFive, said, useBase, whenLoaded } from './kit';

const MODULE = 'interpretability',
  ID = '01-why-did-it-say-that';
export const PARTS = FUSE_PARTS;
const LM = META.model;
/** The chapter's prompt and the token it is shown with (in the top 5; the engine test holds the lens prompts). */
export const PROMPT = LENS[0];
const HEADS = Array.from({ length: LM.n_layer * LM.n_head }, (_, i) => [Math.floor(i / LM.n_head), i % LM.n_head]);
const headId = (l: number, h: number) => `${l}-${h}`;

const P1 = {
  question: `A head’s heaviest thread runs to one token. Does that prove that token, through that head, made the model say ${said(PROMPT.expected)}?`,
  options: [
    'Yes: the heaviest thread is what caused the guess',
    'No: it shows where the head looked, not what that changed',
    'Only if the weight is above 0.5',
  ],
};
/** The research finding the reveal shows (fact attention-not-explanation): a map describes, it doesn't prove. */
export const OUTCOME = 1;

export const QUIZ = {
  question:
    'A vendor’s dashboard highlights the words its model “attended to” when it flagged an invoice as fraud. The auditor asks if that explains the flag. What do you say?',
  options: [
    'Yes: the highlighted words are why it flagged the invoice',
    'Not on its own: it shows where attention went; to show cause, change those parts and see if the flag changes',
    'No: attention has nothing to do with the output',
  ],
  correct: 1,
  explanation:
    'Attention maps describe where a model looked. Cause needs an experiment: switch a part off, or change it, and watch the output.',
  why: [
    'A head can look hard at a word that changes nothing, and different patterns can give the same output.',
    'Right: the map is a lead, and an experiment on the parts is what tests it.',
    'Attention does feed the output, so the map isn’t useless; it just isn’t proof on its own.',
  ],
};

interface S {
  layer: number;
  head: number;
  heads: string[];
  seen: boolean;
  p1: number | null;
  revealed: boolean;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'top',
    focus: 'top',
    visibleControls: ['top'],
    narration: `Larkspur mini says ${said(PROMPT.expected)} next. Interpretability asks why: which parts inside made that guess?`,
    act: 'Show its top 5.',
    say: { block: 'query', text: 'Guess after this' },
    predicate: whenLoaded(s => s.seen),
  },
  {
    id: 'heads',
    focus: 'heads',
    visibleControls: ['heads'],
    narration: 'Recall Transformers: each head weighs earlier tokens, drawn as threads. That is an attention map.',
    act: 'Light every head.',
    say: { block: 'head', text: 'One head' },
    predicate: whenLoaded(s => HEADS.every(([l, h]) => s.heads.includes(headId(l, h)))),
    hint: 'Press each head’s button once.',
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'A heavy thread tempts a story.',
    act: 'Predict first.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['p1', 'reveal'],
    narration: 'Locked in.',
    act: 'See what researchers found.',
    predicate: s => s.revealed,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'quiz'],
    narration: 'A map describes where heads look. To test what a part does, switch it off: the next chapter’s fuses.',
    act: 'One question to finish.',
    say: { block: 'fuses', text: 'Next: pull one' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What would show the highlighted words caused the flag?',
  },
];

export default function WhyDidItSayThat() {
  const { model } = useBase();
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      ready={!!model}
      initial={{ layer: 0, head: 0, heads: [headId(0, 0)], seen: false, p1: null, revealed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => (
        <InterpStage
          say={say}
          prompt={PROMPT.text}
          layer={state.layer}
          head={state.head}
          threads
          watch={PROMPT.expected}
          caption={`${PROMPT.text} … · threads from the last token, layer ${state.layer + 1} head ${state.head + 1}`}
        />
      )}
      controls={{
        top: ({ state, apply }) => (
          <ModelGate weights="base">
            {m =>
              state.seen ? (
                <>
                  <TopFive top={nextTop(m, PROMPT.text)} mark={PROMPT.expected} />
                  <p className="note">{OURS}</p>
                </>
              ) : (
                <button type="button" className="big" onClick={() => apply({ ...state, seen: true })}>
                  Show the top 5
                </button>
              )
            }
          </ModelGate>
        ),
        heads: ({ state, apply }) => (
          <>
            <div role="group" aria-label="Light a head" className="ip-fuses">
              {HEADS.map(([l, h]) => (
                <button
                  key={headId(l, h)}
                  type="button"
                  className="chip"
                  aria-pressed={state.layer === l && state.head === h}
                  onClick={() =>
                    apply({ ...state, layer: l, head: h, heads: [...new Set([...state.heads, headId(l, h)])] })
                  }
                >
                  {`Layer ${l + 1}, head ${h + 1}`}
                </button>
              ))}
            </div>
            <p className="note">
              New to attention? <a href="/transformers/">Transformers</a> builds it step by step.
            </p>
          </>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        reveal: ({ state, apply }) => (
          <button type="button" className="chip" onClick={() => apply({ ...state, revealed: true })}>
            Show the finding
          </button>
        ),
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />
            <Fact id="attention-not-explanation" />
            <p className="note">{OURS}</p>
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
