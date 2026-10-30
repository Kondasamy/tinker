// Chapter 6: keep the real data. The two-option radio (replace, accumulate) is the prediction (KTD15): it locks once
// picked. Then the reader shows each arm at generation 5 with the range and a second radio, and the outcome is read
// off runs.json. Gerstgrasser et al. is cited apart, as a large-model finding; Pre-training's data mixes are linked.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { nextOf, moduleOf, chapterHref } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { ARMS, LAST, genOf, loss, pct, type Arm } from '../../lib/synthetic-data/runs';
import { COPIER_PARTS, copierAt } from '../../components/scenes/copierScene';
import { ARM_WORDS, ArmRadio, CopierStage, Fact, GenRange, ToyNote } from './kit';

const MODULE = 'synthetic-data',
  ID = '06-keep-the-real-data';
export const PARTS = COPIER_PARTS;
const R5 = genOf('replace', LAST),
  A5 = genOf('accumulate', LAST);
/** The arm whose generation 5 stays closer to real text (lower held-out loss). */
export const CLOSER: Arm = A5.heldout < R5.heldout ? 'accumulate' : 'replace';
const MIXES = moduleOf('pre-training').chapters.find(c => c.id === '04-data-is-the-curriculum')!;

export const QUIZ = {
  question:
    'A team retrains its model every month on the web, which holds more model-written text each time. What keeps it anchored?',
  options: [
    'Keep the original human-written data in every training run, and add the new on top',
    'Train only on the newest crawl: it is the most up to date',
    'Nothing: drift is unavoidable either way',
  ],
  correct: 0,
  explanation: 'Accumulating keeps the real data in the mix, so each run is pulled back toward it.',
  why: [
    'Right: real data in every run anchors each generation, as accumulate did here.',
    'That is replace: each run learns mostly from the last models’ writing, and drifts.',
    'Drift is far smaller when real data stays in, though rare words still slip.',
  ],
};

export interface S {
  pick: Arm | null;
  arm: Arm;
  gen: number;
  seen: string[];
  quiz: number | null;
}
const both = (s: S) => ARMS.every(a => s.seen.includes(`${a}${LAST}`));

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'pick',
    visibleControls: ['pick'],
    narration:
      'Replace trains each generation only on the last one’s text. Accumulate keeps the real text and adds each generation’s.',
    act: 'Predict: which stays closer?',
    say: { block: 'originals', text: 'Keep or drop?' },
    predicate: s => s.pick !== null,
  },
  {
    id: 'compare',
    focus: 'show',
    visibleControls: ['pick', 'show'],
    narration: 'Accumulate changes the data mix: Larkspur’s real documents stay in every generation’s training.',
    act: `Show generation ${LAST} both ways.`,
    say: { block: 'originals', text: 'Real text stays' },
    predicate: both,
    hint: `Set the generation to ${LAST}, then switch between Replace and Accumulate.`,
    solution: s => ({ ...s, arm: 'accumulate', gen: LAST, seen: [...s.seen, `replace${LAST}`, `accumulate${LAST}`] }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out', 'show', 'quiz'],
    narration: `Loss ${loss(R5.heldout)} replace, ${loss(A5.heldout)} accumulate. Rare words guessed ${pct(R5.rareTop5)} versus ${pct(A5.rareTop5)}: slowed, not stopped.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which way kept the real documents?',
  },
];

const mark = (s: S, arm: Arm, gen: number) => (s.seen.includes(`${arm}${gen}`) ? s.seen : [...s.seen, `${arm}${gen}`]);

export default function KeepTheRealData() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ pick: null, arm: 'replace', gen: 0, seen: [], quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => (
        <CopierStage
          say={say}
          readout
          room={copierAt(state.arm, state.gen)}
          caption={`${state.arm === 'replace' ? 'Replace' : 'Accumulate'}, generation ${state.gen}: held-out loss ${loss(genOf(state.arm, state.gen).heldout)}.`}
        />
      )}
      controls={{
        // the prediction: native radios that lock once picked
        pick: ({ state, apply }) => (
          <fieldset className="sd-arms" disabled={state.pick !== null} data-pick={state.pick ?? ''}>
            <legend>Your prediction: which keeps generation {LAST} closer to real text?</legend>
            {ARMS.map(a => (
              <label key={a}>
                <input
                  type="radio"
                  name="sd-pick"
                  checked={state.pick === a}
                  onChange={() => apply({ ...state, pick: a, arm: a })}
                />{' '}
                {ARM_WORDS[a]}
              </label>
            ))}
          </fieldset>
        ),
        show: ({ state, sync }) => (
          <>
            <ArmRadio
              legend="Show"
              value={state.arm}
              onChange={arm => sync({ ...state, arm, seen: mark(state, arm, state.gen) })}
            />
            <GenRange value={state.gen} onChange={gen => sync({ ...state, gen, seen: mark(state, state.arm, gen) })} />
          </>
        ),
        out: ({ state }) => (
          <>
            <p className="sd-headline" data-outcome={CLOSER}>
              You predicted <strong>{state.pick}</strong>. Closer to real text: <strong>{CLOSER}</strong>
              <span className={`stamp ${state.pick === CLOSER ? 'correct' : 'wrong'}`}>
                {state.pick === CLOSER ? 'RIGHT' : 'NOT QUITE'}
              </span>
            </p>
            <ToyNote />
            <Fact id="gerstgrasser-2024" />
            <p className="sd-note">
              Choosing what goes into training is the data mix:{' '}
              <a href={chapterHref('pre-training', MIXES.id)}>Pre-training chapter 4, {MIXES.title}</a>.
            </p>
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
