// Chapter 6: total versus active. Every room's weights sit in memory, but a token runs two per floor: the toy's total
// and active counts (meta.json), then its held-out top-5 against a dense toy with about the same active weights
// (measured once in training, KTD3), then the vendor's card in bytes by Inference's memory maths, linked.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { chapterHref, nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { ROOMS, pct, promptOf } from '../../lib/mixture-of-experts/routes';
import { billions, bytesAt, cardOf, fmtGB } from '../../lib/mixture-of-experts/cards';
import { ROOMS_PARTS } from '../../components/scenes/officeRoomsScene';
import pinned from '../../../data/mixture-of-experts/pinned.json' with { type: 'json' };
import { Outcome } from '../tool-calling/kit';
import { Fact, RoomsStage, ToyNote, n } from './kit';

const MODULE = 'mixture-of-experts',
  ID = '06-total-versus-active';
export const PARTS = ROOMS_PARTS;
export const PROMPT = promptOf(pinned.chapters.total);
const VENDOR = cardOf('mixtral-8x7b');
/** the dense toy beat or matched? the reveal reads it off the measured scores */
export const OUTCOME = ROOMS.heldoutTop5 > ROOMS.dense.top5 ? 0 : ROOMS.heldoutTop5 < ROOMS.dense.top5 ? 1 : 2;
const RATIO = (ROOMS.params / ROOMS.dense.params).toFixed(1);

export interface S {
  counted: boolean;
  p1: number | null;
  compared: boolean;
  memory: boolean;
  quiz: number | null;
}

export const P1 = {
  question: `Each toy runs about ${n(ROOMS.active)} weights per token. Which guesses unseen text better?`,
  options: [
    `The experts toy, holding ${n(ROOMS.params)} in all`,
    `The dense toy, holding ${n(ROOMS.dense.params)}`,
    'Neither: the same work gives the same score',
  ],
};

export const QUIZ = {
  question: 'Model A: 100B total, 10B active. Model B: dense, 30B. Which needs more memory for its weights?',
  options: [
    'A: memory holds every weight, used or not',
    'B: it uses more weights per token',
    'The same: both do similar work per token',
  ],
  correct: 0,
  explanation: 'Memory follows the total; the active count sets the work per token instead.',
  why: [
    'Right: all 100B of A’s weights must sit in memory, three times B’s 30B.',
    'B does more work per token, but memory holds every weight, so A’s total wins.',
    'Work per token and memory are different costs; A is cheaper per token, dearer in memory.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'count',
    focus: 'count',
    visibleControls: ['count'],
    narration: 'Every room’s weights wait in memory, ready, but each token works through only two rooms a floor.',
    act: 'Count the toy’s weights.',
    say: { block: 'rooms', text: 'All in memory' },
    predicate: s => s.counted,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['counts', 'p1'],
    narration: `Total parameters: all ${n(ROOMS.params)}. Active parameters: the ${n(ROOMS.active)} one token uses. Larkspur also trained a dense toy.`,
    act: 'Predict first.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'compare',
    focus: 'compare',
    visibleControls: ['counts', 'p1', 'compare'],
    narration: 'Your pick is locked.',
    act: 'Compare the two.',
    predicate: s => s.compared,
  },
  {
    id: 'memory',
    focus: 'memory',
    visibleControls: ['out1', 'scores', 'memory'],
    narration: `Same work per token, better guesses, but ${RATIO}× the weights to keep. The vendor’s total must fit in memory.`,
    act: 'Work out the memory.',
    say: { block: 'guess', text: 'Better guess' },
    predicate: s => s.memory,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['bytes', 'quiz'],
    narration: 'The total sets the memory; the active count sets the work per token.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which weights must sit in memory: the ones a token uses, or all of them?',
  },
];

function Counts() {
  return (
    <table className="tc-ledger">
      <caption>Larkspur’s toy experts model, counted</caption>
      <tbody>
        <tr>
          <th scope="row">Total weights (all in memory)</th>
          <td>{n(ROOMS.params)}</td>
        </tr>
        <tr>
          <th scope="row">Active weights per token</th>
          <td>{n(ROOMS.active)}</td>
        </tr>
      </tbody>
    </table>
  );
}
function Scores() {
  return (
    <table className="tc-ledger">
      <caption>Right in the top 5 on unseen Larkspur text, measured once</caption>
      <thead>
        <tr>
          <th scope="col">Toy</th>
          <th scope="col">Weights in all</th>
          <th scope="col">Top 5</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">Experts</th>
          <td>{n(ROOMS.params)}</td>
          <td>{pct(ROOMS.heldoutTop5)}</td>
        </tr>
        <tr>
          <th scope="row">Dense</th>
          <td>{n(ROOMS.dense.params)}</td>
          <td>{pct(ROOMS.dense.top5)}</td>
        </tr>
      </tbody>
    </table>
  );
}
function Bytes() {
  return (
    <>
      <table className="tc-ledger">
        <caption>{`${VENDOR.name}’s weights at 16 bits (2 bytes each)`}</caption>
        <tbody>
          <tr>
            <th scope="row">{`Total, ${billions(VENDOR.total)}`}</th>
            <td>{`${fmtGB(bytesAt(VENDOR.total, 16))} of memory`}</td>
          </tr>
          <tr>
            <th scope="row">{`Active, ${billions(VENDOR.active)}`}</th>
            <td>the work per token</td>
          </tr>
        </tbody>
      </table>
      <p className="note me-note">
        Bytes per weight come from the memory maths in{' '}
        <a href={chapterHref('inference', '04-smaller-numbers')}>Smaller numbers</a>.
      </p>
      <Fact id="mixtral-8x7b" />
    </>
  );
}

export default function TotalVersusActive() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ counted: false, p1: null, compared: false, memory: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => (
        <RoomsStage
          say={say}
          ids={PROMPT.ids}
          sel={Math.min(8, PROMPT.ids.length) - 1}
          caption={() =>
            state.counted
              ? `Larkspur’s toy: ${n(ROOMS.params)} weights in memory, ${n(ROOMS.active)} at work per token.`
              : `“${PROMPT.text}”`
          }
        />
      )}
      controls={{
        count: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, counted: true })}>
            Count the weights
          </button>
        ),
        counts: () => <Counts />,
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        compare: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, compared: true })}>
            Compare the two
          </button>
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        scores: () => (
          <>
            <Scores />
            <ToyNote />
          </>
        ),
        memory: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, memory: true })}>
            Work out the memory
          </button>
        ),
        bytes: () => <Bytes />,
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
