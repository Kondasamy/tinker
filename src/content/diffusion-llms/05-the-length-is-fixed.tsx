// Chapter 5: the length is fixed. One release-note phrase filled carefully (one a pass, surest first) into frames of
// 4, 8 and 16 slots, live. Every slot gets a token, and the model writes the reply's end early (the last slot is stamped
// before the first). Pinned in pinned.json `lengths` and replayed by diffusion-llms-workbench.test.ts.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import pinned from '../../../data/diffusion-llms/pinned.json' with { type: 'json' };
import { text } from '../../lib/diffusion-llms/decode';
import { ASKED_LENGTHS, LENGTHS, type Len } from '../../lib/diffusion-llms/chapters';
import { FRAME_PARTS } from '../../components/scenes/typeFrameScene';
import { Outcome } from '../tool-calling/kit';
import { Fact, FrameStage, ListRange, ToyNote, Waiting, frameOf, given, phrase, replyAt, tokens, useFill } from './kit';

const MODULE = 'diffusion-llms',
  ID = '05-the-length-is-fixed';
export const PARTS = FRAME_PARTS;
export const SEED = 6;
/** The reply lengths the frame can take (the phrase fills the window's first 16 slots). */
export { LENGTHS };
/** The lengths the chapter asks for. */
export const ASKED = ASKED_LENGTHS;
const P = phrase(SEED);

interface Ran {
  ids: number[];
  /** the pass each slot was stamped on */
  at: number[];
}
export interface S {
  p1: number | null;
  n: Len;
  run: Len | null;
  runs: Partial<Record<string, Ran>>;
  quiz: number | null;
}
/** Show me: the pinned fills (diffusion-llms-workbench.test.ts keeps them equal to live ones). */
export const PINNED_RUNS = pinned.lengths as Record<string, Ran>;
/** The slot stamped first, counting from 1. */
export const firstSlot = (r: Ran) => r.at.indexOf(0) + 1;

const P1 = {
  question: 'Give the frame 4 slots for an answer that needs more. What comes out?',
  options: [
    'Exactly 4 tokens, shaped to end there',
    '4 tokens, then it keeps writing',
    'Fewer than 4: it stops when unsure',
  ],
};

export const QUIZ = {
  question: 'Which reply suits a model that fixes its length before it writes?',
  options: [
    'An order status in a set format, a known number of tokens',
    'An apology to a customer, as long as it needs to be',
    'A summary that should stop when the facts run out',
  ],
  correct: 0,
  explanation: 'A known shape gives a known length, so the frame can be sized exactly.',
  why: [
    'Right: a fixed format fills a fixed frame, with nothing cut and nothing padded.',
    'A free reply’s length isn’t known in advance, so a fixed frame cuts it or pads it.',
    'The model can’t stop early: it fills every slot the frame was given.',
  ],
};

const tried = (s: S) => ASKED.every(n => s.runs[n]);
export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration:
      'The reply length is set before the first pass: the frame holds exactly that many blanks, and every one gets a token.',
    act: 'Predict first.',
    say: { block: 'frame', text: 'Size set first' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'sweep',
    focus: 'n',
    visibleControls: ['n', 'results'],
    narration: 'Watch which slot fills first. The model knows where the reply ends, so it can write the end early.',
    act: `Fill at ${ASKED.join(', then ')} slots.`,
    say: { block: 'frame', text: 'The end first?' },
    predicate: tried,
    hint: 'Set Reply length, press Fill, wait for the frame, then the next length.',
    solution: s => ({ ...s, runs: { ...s.runs, ...PINNED_RUNS } }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['results', 'quiz'],
    narration:
      'Each frame came out exactly full. Real models pad a long frame with an end-of-text token and drop the rest.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which reply’s length do you know before it is written?',
  },
];

function Stage({ state, sync, say }: { state: S; sync: (s: S) => void; say?: Step<S>['say'] }) {
  const job = state.run ? { seed: SEED, k: 1, rule: 'confidence' as const, length: state.run } : null;
  const r = useFill(job, f => {
    if (state.run && !state.runs[state.run])
      sync({ ...state, runs: { ...state.runs, [state.run]: { ids: f.reply, at: f.at } } });
  });
  const fr = frameOf(r.fill, r.shown, 1, state.n);
  return (
    <FrameStage
      say={say}
      shown={{
        wait:
          job && !r.fill && r.status !== 'ready' ? (
            <Waiting w="mlm" failed={r.status === 'error'} retry={r.retry} />
          ) : undefined,
        given: P.ids.length,
        ...fr,
        fill: r.done ? r.fill : null,
        stripLabel: state.run ? `A ${state.run}-slot reply, pass by pass` : undefined,
        caption: !r.fill
          ? `“${given(SEED)}” and ${tokens(state.n)} of room.`
          : `${r.fill.reply.length} slots, pass ${r.shown} of ${fr.passes}: “${replyAt(r.fill, r.shown)}”`,
      }}
    />
  );
}

export default function TheLengthIsFixed() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, n: 4, run: null, runs: {}, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => <Stage state={state} sync={sync} say={say} />}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        n: ({ state, sync }) => (
          <>
            <ListRange
              label="Reply length"
              list={LENGTHS}
              value={state.n}
              words={n => `${n} slots`}
              onChange={n => sync({ ...state, n })}
            />
            <button
              type="button"
              className="big"
              style={{ marginTop: 10 }}
              onClick={() => sync({ ...state, run: state.n })}
            >
              Fill: {state.n} slots
            </button>
          </>
        ),
        results: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={0} />
            <table className="tc-ledger" style={{ marginTop: 10 }} data-runs={Object.keys(state.runs).length}>
              <caption>Each frame, filled one slot a pass</caption>
              <thead>
                <tr>
                  <th scope="col">Slots</th>
                  <th scope="col">Reply</th>
                  <th scope="col">Stamped first</th>
                </tr>
              </thead>
              <tbody>
                {LENGTHS.filter(n => state.runs[n]).map(n => {
                  const x = state.runs[n]!;
                  return (
                    <tr key={n} data-n={n} data-first={firstSlot(x)}>
                      <th scope="row">{n}</th>
                      <td>“{text(x.ids)}”</td>
                      <td>
                        slot {firstSlot(x)} of {n}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="note">
              A reply with a set shape, like the order statuses in <a href="/structured-outputs/">Structured outputs</a>
              , knows its length before it is written.
            </p>
            <Fact id="llada-length" />
            <Fact id="mdlm" />
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
