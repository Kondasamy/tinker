// Chapter 4: patching. Two prompts the same length in tokens answer differently ("customer" → manager, "Kestrel" →
// team). The reader copies one residual at a time from the Kestrel run into the clean run, on a grid of stages by
// positions, and finds where the answer flips: at the swapped word before block 1, at the last token after it. Every
// cell is computed live (patchGrid); data/interpretability/prompts.json pins the flips.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import type { Model } from '../../lib/lm/model';
import { encode } from '../../lib/lm/bpe';
import { PATCH, STAGES, nextTop, patchGrid } from '../../lib/interpretability/probe';
import { pieceLabel } from '../../components/scenes/attentionMap';
import { FUSE_PARTS } from '../../components/scenes/fuseScene';
import { Fact, InterpStage, ModelGate, OURS, TopFive, said, useBase, whenLoaded } from './kit';

const MODULE = 'interpretability',
  ID = '04-patching';
export const PARTS = FUSE_PARTS;
const A = encode(PATCH.clean.text),
  B = encode(PATCH.swapped.text);
/** The position where the two prompts differ, and the last one. */
export const SWAP = A.findIndex((id, i) => id !== B[i]),
  LAST = A.length - 1;
const cellId = (stage: number, pos: number) => `${stage}:${pos}`;

let grid: { m: Model; g: ReturnType<typeof patchGrid> } | undefined;
/** The grid, computed once per model (39 forward passes). */
export const gridOf = (m: Model) =>
  grid?.m === m ? grid.g : (grid = { m, g: patchGrid(m, PATCH.clean.text, PATCH.swapped.text) }).g;

const P1 = {
  question: `Before block 1, copying which position’s activation flips the answer to ${said(PATCH.swapped.answer)}?`,
  options: [`Only the swapped word’s, ${said(' customer')}`, 'Only the last token’s', 'Every position’s'],
};
/** The option row 0 of the grid lands on. */
export function outcomeOf(m: Model): number {
  const flips = gridOf(m).cells[0].flatMap((c, i) => (c.flipped ? [i] : []));
  return flips.length === 1 && flips[0] === SWAP ? 0 : flips.length === 1 && flips[0] === LAST ? 1 : 2;
}

export const QUIZ = {
  question:
    'A model answers “Paris” to “The Eiffel Tower is in the city of”. You patch activations from a run about the Colosseum, one at a time. Patching the subject’s tokens in early layers flips the answer to “Rome”. What does that suggest?',
  options: [
    'The model stores the fact about the subject at those tokens in those layers, before moving it on',
    'The last token holds every fact from the start',
    'Patching broke the model, so nothing can be read from it',
  ],
  correct: 0,
  explanation:
    'Where a patch moves the answer is where the information sits at that point in the run; later it moves, as “customer” moved to the last token.',
  why: [
    'Right: the answer follows the copied activation, so that is where the information sat at that stage.',
    'You saw the last token carry nothing about “customer” until block 1 had moved it there.',
    'A patch that leaves most cells alone and flips a few is a precise result, not a broken model.',
  ],
};

interface S {
  ran: boolean;
  tried: string[];
  picked: string | null;
  p1: number | null;
  revealed: boolean;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'swap',
    focus: 'swap',
    visibleControls: ['swap'],
    narration: `Swap ${said(' customer')} for ${said(' Kestrel')} and the guess flips from ${said(PATCH.clean.answer)} to ${said(PATCH.swapped.answer)}. Where does that change travel?`,
    act: 'Run both prompts.',
    say: { block: 'query', text: 'Guess made here' },
    predicate: whenLoaded(s => s.ran),
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['swap', 'p1'],
    narration: 'Activation patching copies one activation from the Kestrel run into this run, then reads the guess.',
    act: 'Predict first.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['p1', 'reveal'],
    narration: 'Locked in.',
    act: 'Patch every position before block 1.',
    predicate: s => s.revealed,
  },
  {
    id: 'after',
    focus: 'grid',
    visibleControls: ['out1', 'grid'],
    narration: 'Only the swapped word moves it there. After block 1, one other cell does.',
    act: 'Find that cell.',
    say: { block: 'layer-1', text: 'Block 1' },
    predicate: s => s.tried.includes(cellId(1, LAST)),
    hint: 'Try the row after block 1, at the last token.',
    solution: s => ({ ...s, tried: [...new Set([...s.tried, cellId(1, LAST)])], picked: cellId(1, LAST) }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['grid', 'quiz'],
    narration: `Block 1 carried ${said(' customer')} to the last token. Patching shows where information sits, and when it moves.`,
    act: 'One question to finish.',
    say: { block: 'query', text: 'Moved here' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Where did the answer follow the copied activation?',
  },
];

/** The grid: a row per stage, a button per position; a tried cell shows the guess it gave, flipped cells mint. */
function Grid({ m, s, onPick }: { m: Model; s: S; onPick: (stage: number, pos: number) => void }) {
  const g = gridOf(m),
    picked = s.picked?.split(':').map(Number);
  const cell = picked && g.cells[picked[0]][picked[1]];
  return (
    <>
      <div className="ip-scroll" role="region" aria-label="Patch grid, scrolls" tabIndex={0}>
        <table className="ip-grid">
          <caption>Copy one activation from the Kestrel run</caption>
          <thead>
            <tr>
              <th scope="col">Stage</th>
              {g.tokens.map((t, i) => (
                <th key={i} scope="col" data-swap={i === SWAP ? '1' : undefined}>
                  {pieceLabel(t)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {STAGES.map((st, stage) => (
              <tr key={st}>
                <th scope="row">{st}</th>
                {g.cells[stage].map((c, pos) => {
                  const done = s.tried.includes(cellId(stage, pos));
                  return (
                    <td key={pos}>
                      <button
                        type="button"
                        aria-pressed={s.picked === cellId(stage, pos)}
                        data-cell={cellId(stage, pos)}
                        data-flip={done && c.flipped ? '1' : undefined}
                        aria-label={`${st}, token ${pos + 1} (${pieceLabel(g.tokens[pos])})${done ? `: ${pieceLabel(c.top)}` : ''}`}
                        onClick={() => onPick(stage, pos)}
                      >
                        {done ? (c.flipped ? '⇄' : '·') : '?'}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="tc-status" role="status">
        {cell && picked
          ? `${STAGES[picked[0]]}, token ${picked[1] + 1}: the guess is ${said(cell.top)}${cell.flipped ? ', flipped' : ', unchanged'}.`
          : 'Press a cell to patch it.'}
      </p>
      <p className="note">{`⇄ flipped to ${said(PATCH.swapped.answer)}; · unchanged. ${OURS}`}</p>
    </>
  );
}

export default function Patching() {
  const { model } = useBase();
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      ready={!!model}
      initial={{ ran: false, tried: [], picked: null, p1: null, revealed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ say }) => (
        <InterpStage
          say={say}
          prompt={PATCH.clean.text}
          watch={PATCH.clean.answer}
          caption={`${PATCH.clean.text} … · the clean run`}
        />
      )}
      controls={{
        swap: ({ state, apply }) => (
          <ModelGate weights="base">
            {m =>
              state.ran ? (
                <>
                  <TopFive
                    caption={`${PATCH.clean.text} …`}
                    top={nextTop(m, PATCH.clean.text)}
                    mark={PATCH.clean.answer}
                  />
                  <TopFive
                    caption={`${PATCH.swapped.text} …`}
                    top={nextTop(m, PATCH.swapped.text)}
                    mark={PATCH.swapped.answer}
                  />
                </>
              ) : (
                <button type="button" className="big" onClick={() => apply({ ...state, ran: true })}>
                  Run both prompts
                </button>
              )
            }
          </ModelGate>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        reveal: ({ state, apply }) => (
          <button
            type="button"
            className="chip"
            onClick={() =>
              apply({ ...state, revealed: true, tried: A.map((_, pos) => cellId(0, pos)), picked: cellId(0, SWAP) })
            }
          >
            Patch every position before block 1
          </button>
        ),
        out1: ({ state }) => (
          <ModelGate weights="base">{m => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf(m)} />}</ModelGate>
        ),
        grid: ({ state, apply, sync, focused }) => (
          <ModelGate weights="base">
            {m => (
              <Grid
                m={m}
                s={state}
                onPick={(stage, pos) =>
                  (focused ? apply : sync)({
                    ...state,
                    picked: cellId(stage, pos),
                    tried: [...new Set([...state.tried, cellId(stage, pos)])],
                  })
                }
              />
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
            <Fact id="rome" />
          </>
        ),
      }}
    />
  );
}
