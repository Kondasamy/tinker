// Chapter 5: copies make it worse. The canary run against the dedup run (each canary once), both trained offline
// (runs.json): the reader predicts, then removes duplicates. Nothing is recited any more, yet the 64-copy PIN still
// ranks well above chance; held-out top-5 barely moves. Kandpal et al. is cited apart, as a large-model finding.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { replyText } from '../../lib/memorisation/extract';
import { CANARIES, REPEATS, RUNS, canaryOf, firstName, pct, scoreOf, type RunId } from '../../lib/memorisation/story';
import { RECITAL_PARTS } from '../../components/scenes/recitalScene';
import { Fact, RecitalStage, ToyNote, ledgerOf } from './kit';

const MODULE = 'memorisation',
  ID = '05-copies-make-it-worse';
export const PARTS = RECITAL_PARTS;
const MOST = Math.max(...REPEATS),
  NAME = firstName(canaryOf(MOST)),
  N = RUNS.candidates.toLocaleString('en');
const runOf = (dedup: boolean): RunId => (dedup ? 'dedup' : 'canary');
const DEDUP = scoreOf('dedup', MOST);

export const P1 = {
  question: `With every duplicate removed, does the model still recite ${NAME}’s PIN?`,
  options: [
    'No: one copy is too few to recite',
    'Yes: the line is still in the training text',
    'Only its first two digits',
  ],
};
export const OUTCOME = DEDUP.extracted ? 1 : 0;

export const QUIZ = {
  question:
    'A help-desk archive holds a customer’s address in one ticket, and a product code quoted in thousands. Which is the model likelier to recite?',
  options: [
    'The product code, repeated thousands of times',
    'The address, because personal data stands out',
    'Both equally: each was in the training text',
  ],
  correct: 0,
  explanation: 'Copies drive memorisation: what repeats most is what comes back word for word.',
  why: [
    'Right: the more copies, the likelier a line is recited.',
    'A model has no notion of personal data; it only counts what it sees.',
    'Being in the text once is not the same as being there thousands of times.',
  ],
};

export interface S {
  p1: number | null;
  dedup: boolean;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `Deduplication keeps each line once: ${NAME}’s ${MOST} copies become one.`,
    act: 'Predict first.',
    say: { block: 'ledger', text: 'Copies' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'dedup',
    focus: 'dedup',
    visibleControls: ['p1', 'dedup'],
    narration: 'The team trained a second model on the same text, duplicates removed. Both were trained ahead of time.',
    act: 'Remove duplicates.',
    predicate: s => s.dedup,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out', 'dedup', 'facts', 'quiz'],
    narration: `Nothing recited, but ${NAME}’s PIN still ranks ${DEDUP.rank} of ${N}. Held-out top-5 is ${pct(RUNS.runs.dedup.heldout.top5)}: it still works.`,
    act: 'One question to finish.',
    say: { block: 'column', text: `Rank ${DEDUP.rank}` },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What does a model recite: what matters, or what repeats?',
  },
];

const readout = (run: RunId) => [
  run === 'dedup' ? 'Duplicates removed' : 'As planted',
  ...CANARIES.map(c => `${c.repeats}×: rank ${scoreOf(run, c.repeats).rank}`),
  `held-out top-5 ${pct(RUNS.runs[run].heldout.top5)}`,
];

export default function CopiesMakeItWorse() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, dedup: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => {
        const run = runOf(state.dedup),
          s = scoreOf(run, MOST),
          text = replyText(s.reply).trim();
        return (
          <RecitalStage
            say={say}
            run={run}
            repeats={MOST}
            desk={{
              ledger: ledgerOf(MOST, { dedup: state.dedup }),
              reply: { text: `SAYS ${text}`, leak: s.extracted },
              column: { lps: [], label: `RANK ${s.rank} OF ${N}` },
            }}
            readout={readout(run)}
            caption={`${NAME}’s line, asked of the ${state.dedup ? 'deduplicated' : 'canary'} model (recorded): “${text}”.`}
          />
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        dedup: ({ state, apply, sync, focused }) => (
          <fieldset className="mem-bench">
            <legend>Training text</legend>
            <label>
              <input
                type="checkbox"
                checked={state.dedup}
                onChange={e => (focused ? apply : sync)({ ...state, dedup: e.currentTarget.checked })}
              />{' '}
              Remove duplicates
            </label>
          </fieldset>
        ),
        out: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />
            <ToyNote />
          </>
        ),
        facts: () => <Fact id="kandpal-2022" />,
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
