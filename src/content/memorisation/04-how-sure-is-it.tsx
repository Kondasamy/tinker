// Chapter 4: how sure is it? The ranking column (KTD13): the reader picks the copies with the repeats radio; the
// column ranks the pinned sample of 200 candidates plus the true PIN live, the true ball settling at its rank. The read-
// out gives the sample's rank and exposure, and the offline rank and exposure over all 10,000 (runs.json) beside it.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { REPEATS, RUNS, bits, scoreOf } from '../../lib/memorisation/story';
import { RECITAL_PARTS } from '../../components/scenes/recitalScene';
import {
  COLUMN_SIZE,
  Fact,
  RecitalStage,
  RepeatsRadio,
  ToyNote,
  Waiting,
  columnLabel,
  ledgerOf,
  rankReadout,
  useColumn,
} from './kit';

const MODULE = 'memorisation',
  ID = '04-how-sure-is-it';
export const PARTS = RECITAL_PARTS;
const N = RUNS.candidates.toLocaleString('en'),
  ONCE = scoreOf('canary', 1),
  TOP = scoreOf('canary', Math.max(...REPEATS));
const byCopies = [...REPEATS].reverse();
/** the copies whose PIN ranks first of all: exposure can't tell them apart */
export const FIRST = byCopies.filter(r => scoreOf('canary', r).rank === 1);

export const P1 = {
  question: `Of all ${N} possible PINs, where does the model rank the 1-copy PIN?`,
  options: [
    'Near the top: far above a random PIN',
    'Around the middle, like any random PIN',
    'Near the bottom: seen once, then forgotten',
  ],
};
/** The 1-copy PIN in the top tenth of all candidates. */
export const OUTCOME = ONCE.rank <= RUNS.candidates / 10 ? 0 : ONCE.rank <= RUNS.candidates / 2 ? 1 : 2;

export const QUIZ = {
  question: 'A model never prints a test password you planted, but ranks it 3rd of a million guesses. Is it safe?',
  options: [
    'No: an attacker trying the likeliest guesses finds it fast',
    'Yes: if the model never says it, it can’t leak',
    'Yes: one in a million is a safe chance',
  ],
  correct: 0,
  explanation: 'A high rank means high exposure: the secret is easy to guess even when never said outright.',
  why: [
    'Right: rank 3 of a million is about 18 bits of exposure; three guesses find it.',
    'Never printing it is not the test; an attacker can rank guesses by the model’s likelihood.',
    'The model doesn’t treat it as one in a million; it puts it third.',
  ],
};

export interface S {
  p1: number | null;
  repeats: number | null;
  seen: number[];
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration:
      'Each candidate, any four digits, gets a likelihood. Sort them likeliest first: the true PIN’s rank shows how close it is.',
    act: 'Predict first.',
    say: { block: 'column', text: 'Likeliest on top' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'rank',
    focus: 'repeats',
    visibleControls: ['p1', 'repeats'],
    narration: `The column ranks ${COLUMN_SIZE - 1} sample candidates plus the true PIN, live. The red ball is the true one.`,
    act: 'Try each number of copies.',
    say: { block: 'column', text: 'True PIN' },
    predicate: s => REPEATS.every(r => s.seen.includes(r)),
    hint: 'Choose every option in the Copies in training list.',
    solution: s => ({ ...s, repeats: Math.min(...REPEATS), seen: [...REPEATS] }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out', 'repeats', 'facts', 'quiz'],
    narration: `All ${N}: ranks ${byCopies.map(r => scoreOf('canary', r).rank).join(', ')}. Exposure, rank in bits, tops out at ${bits(TOP.exposure)}: ${FIRST.join(' and ')} copies tie.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'How many guesses would an attacker need?',
  },
];

export default function HowSureIsIt() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, repeats: null, seen: [], quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => <Stage s={state} say={say} />}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        repeats: ({ state, apply, sync, focused }) => (
          <RepeatsRadio
            value={state.repeats}
            onChange={r =>
              (focused ? apply : sync)({
                ...state,
                repeats: r,
                seen: state.seen.includes(r) ? state.seen : [...state.seen, r],
              })
            }
          />
        ),
        out: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />
            <ToyNote />
          </>
        ),
        facts: () => <Fact id="carlini-2019" />,
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

function Stage({ s, say }: { s: S; say?: { block: string; text: string } }) {
  const col = useColumn(s.repeats);
  return (
    <RecitalStage
      say={say}
      repeats={s.repeats}
      wait={col.status === 'ready' ? undefined : <Waiting failed={col.status === 'error'} retry={col.retry} />}
      desk={{
        ledger: ledgerOf(s.repeats),
        column: col.lps && col.rank ? { lps: col.lps, label: columnLabel(col.rank) } : null,
      }}
      readout={s.repeats === null ? [] : rankReadout(s.repeats, col.rank)}
      caption={`A sample of ${COLUMN_SIZE - 1} candidates and the true PIN, ranked live.`}
    />
  );
}
