// Chapter 6: every look costs. Each screenshot is an image the model reads, ⌈w / 28⌉ × ⌈h / 28⌉ tokens (Multimodal's
// patch rule, computed). The reader predicts what halving the width does, then runs the re-order at each size: the
// smallest is cheapest but its rows are so thin the agent's click slips onto the next order.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { lookTokens } from '../../lib/computer-use/loop';
import { PATCH } from '../../lib/multimodal/patches';
import { linesWords, shotOf, SIZES, type Size } from '../../lib/computer-use/screens';
import { PUPPET_PARTS } from '../../components/scenes/puppetScene';
import { Outcome } from '../tool-calling/kit';
import { beatsOf, CuStage, Fact, play, RecordedNote, thousands, type CuView } from './kit';

const MODULE = 'computer-use',
  ID = '06-every-look-costs';
export const PARTS = PUPPET_PARTS;
export const runOf = (size: Size) => play({ case: 'hinges', size });
const BIG = SIZES[SIZES.length - 1],
  SMALL = SIZES[0];
const ordered = (size: Size) => linesWords(runOf(size).charges[0]?.lines ?? []);

export interface S {
  p1: number | null;
  size: Size;
  ran: Size[];
  tab: CuView;
  quiz: number | null;
}

const P1 = {
  question: `A ${BIG}-pixel screenshot costs ${thousands(lookTokens(BIG))} tokens. What does one half as wide (and half as tall) cost?`,
  options: ['About a quarter as much', 'About half as much', 'The same: it is the same page'],
};
/** half the width and height leaves about a quarter of the patches */
const P1_ANSWER = 0;

export const QUIZ = {
  question:
    'A team shrinks screenshots to cut costs, and its agent starts ticking the wrong checkbox in long lists. Why?',
  options: [
    'Small targets get too few pixels for the agent to aim at reliably',
    'Smaller images make the model forget the task',
    'The host stops scaling clicks once images are small',
  ],
  correct: 0,
  explanation: 'A shrunken screenshot shrinks every target with it; the smallest ones get missed first.',
  why: [
    'Right: a checkbox a few pixels tall leaves no room for error, so the click lands on its neighbour.',
    'The task is unchanged; what shrinks is the room the agent has to aim.',
    'Scaling back still happens; the aim itself is off by a row on a tiny target.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `Every screenshot is an image the model reads, cut into ${PATCH}-pixel squares. Each square is one visual token.`,
    act: 'Predict first.',
    say: { block: 'camera', text: 'Tokens per look' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'sizes',
    focus: 'size',
    visibleControls: ['size', 'table'],
    narration: 'The screenshot size sets the cost of every look, and a re-order takes several looks.',
    act: 'Run the re-order at each size.',
    say: { block: 'film', text: 'Every look paid' },
    predicate: s => SIZES.every(z => s.ran.includes(z)),
    hint: 'Pick each size in turn and run it.',
    solution: s => ({ ...s, ran: [...SIZES], size: SMALL }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['reveal', 'table', 'quiz'],
    narration: `At ${SMALL} pixels it was cheapest, but the click slipped a row: it ordered ${ordered(SMALL)}.`,
    act: 'One question to finish.',
    say: { block: 'screen', text: 'Wrong row' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'How tall is one order row in the smallest screenshot?',
  },
];

function Table({ ran }: { ran: Size[] }) {
  return (
    <table className="tc-ledger" style={{ marginTop: 10 }}>
      <caption>The re-order at each screenshot size</caption>
      <thead>
        <tr>
          <th scope="col">Width</th>
          <th scope="col">Looks</th>
          <th scope="col">Tokens</th>
          <th scope="col">Ordered</th>
        </tr>
      </thead>
      <tbody>
        {SIZES.filter(z => ran.includes(z)).map(z => {
          const r = runOf(z);
          return (
            <tr key={z} data-size={z} data-ok={r.caseDone ? '1' : '0'}>
              <th scope="row">{shotOf(z).w} px</th>
              <td>{r.looks}</td>
              <td>{thousands(r.tokens)}</td>
              <td>
                {ordered(z)}{' '}
                <span className={`stamp ${r.caseDone ? 'correct' : 'wrong'}`}>{r.caseDone ? 'RIGHT' : 'WRONG'}</span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function EveryLookCosts() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, size: BIG, ran: [], tab: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const r = runOf(state.size),
          done = state.ran.includes(state.size);
        return (
          <CuStage
            run={r}
            at={done ? beatsOf(r).length : 1}
            say={say}
            view={state.tab}
            onView={tab => sync({ ...state, tab })}
            caption={
              done
                ? `${shotOf(state.size).w}-pixel screenshots: ${r.looks} looks × ${thousands(lookTokens(state.size))} tokens = ${thousands(r.tokens)} tokens. Ordered ${ordered(state.size)}.`
                : `${shotOf(state.size).w}-pixel screenshots: ${thousands(lookTokens(state.size))} tokens a look.`
            }
          />
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        size: ({ state, apply }) => (
          <div className="df-labels" role="group" aria-label="Screenshot size">
            {SIZES.map(z => (
              <button
                key={z}
                type="button"
                className="chip"
                aria-pressed={state.size === z}
                onClick={() => apply({ ...state, size: z, ran: state.ran.includes(z) ? state.ran : [...state.ran, z] })}
              >
                Run at {z} px
              </button>
            ))}
          </div>
        ),
        table: ({ state }) => <Table ran={state.ran} />,
        reveal: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={P1_ANSWER} />
            <Fact id="patches" />
            <RecordedNote />
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
