// Chapter 7: the workbench (R6a.7). Six binders, a label each (vague, long catch-all, or sharp), run against all twelve
// tickets: each run turns the carousel a full way round and marks each spine green (its tickets found it) or red, with
// the tally and the words loaded in all. The puzzle accepts every label set in WINNERS (the most right picks, then the
// fewest words), recomputed in tests/unit/skills.test.ts. The pick is the word-matching stand-in (ToyNote).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import Select from '../../components/story/Select';
import { CAROUSEL_PARTS } from '../../components/scenes/carouselScene';
import { fact } from '../../lib/skills/facts';
import { BENCH_START, benchOptions, benchScore, REQUESTS, SKILLS, WINNERS } from '../../lib/skills/skills';
import { num } from '../../lib/format';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { benchCarousel, Fact, SkillsStage, ToyNote } from './kit';

const MODULE = 'skills',
  ID = '07-workbench';
const N = REQUESTS.length;
export const START = benchScore(BENCH_START),
  BEST = benchScore(WINNERS[0]);
const isWinner = (c: number[] | null) => !!c && WINNERS.some(w => w.join() === c.join());

interface S {
  choice: number[];
  ran: number[] | null;
  runs: number;
  prediction: number | null;
  revealed: boolean;
  quiz: number | null;
}

export const PREDICT = {
  question: 'Which kind of label gets every ticket to the right binder, for the fewest words?',
  options: [
    'Short labels saying what each skill does and when',
    'Long labels listing everything a customer might ask',
    'The vaguest labels, since they cost the fewest words',
  ],
};
const OUTCOME = 0;

export const QUIZ = {
  question:
    'Someone suggests one huge label per skill, listing every word a customer might use, so nothing is ever missed. What happens?',
  options: [
    'Labels overlap and steal each other’s tickets, and every prompt grows',
    'Every ticket finds its skill, with no downside',
    'Nothing changes: labels never enter the prompt',
  ],
  correct: 0,
  explanation: fact('pick-from-many').claim,
  why: [
    `Right: here the long labels picked wrong and loaded more words; the sharp set got ${BEST.right} of ${N} right.`,
    'Shared words make labels fight, so more words can mean more wrong picks.',
    'Every label rides in every prompt, so its length is paid on every request.',
  ],
};

export const PARTS = CAROUSEL_PARTS;
const run = (s: S): S => ({ ...s, ran: [...s.choice], runs: s.runs + 1 });

export const STEPS: Step<S>[] = [
  {
    id: 'run',
    focus: 'run',
    visibleControls: ['labels', 'run'],
    narration: 'Each binder’s label is a draft: some vague, some long catch-alls.',
    act: `Run all ${N} tickets.`,
    say: { block: 'carousel', text: 'Drafts' },
    status: `The carousel turned through ${N} tickets; red spines mark binders their tickets missed.`,
    predicate: s => s.runs > 0,
    hint: 'Press Run all tickets in the step card.',
  },
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['predict'],
    narration: `${START.right} of ${N} found the right binder, loading ${num(START.words)} words in all.`,
    act: 'Predict which labels win.',
    say: { block: 'carousel', text: 'Red spines' },
    status: 'Red spines still mark the binders their tickets missed.',
    predicate: s => s.prediction !== null,
  },
  {
    id: 'bench',
    focus: 'labels',
    visibleControls: ['predict', 'labels', 'run', 'score'],
    narration: 'Pick locked. Change labels and run again: the best set gets every ticket right with the fewest words.',
    act: 'Find the best label set.',
    status: `Every spine is green: all ${N} tickets found their binder.`,
    predicate: s => isWinner(s.ran),
    hint: 'Give each binder the label that names what it does and when, no more.',
    solution: s => run({ ...s, choice: [...WINNERS[0]] }),
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal', 'fact'],
    narration: 'Every ticket right, and no word spent on catch-alls.',
    act: 'Check your prediction.',
    closeUp: ['carousel'],
    status: `The close-up shows ${SKILLS.length} green spines on the carousel.`,
    predicate: s => s.revealed,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'quiz'],
    narration: 'Good labels are short and sharp: what the skill does, and when to use it.',
    act: 'One question to finish.',
    status: `${SKILLS.length} green spines; the tally reads ${N} of ${N}.`,
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Where does every label go, on every request?',
  },
];

export default function Workbench() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ choice: [...BENCH_START], ran: null, runs: 0, prediction: null, revealed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say, closeUp }) => (
        <SkillsStage scene={benchCarousel(state.ran, state.runs)} tickets={[]} say={say} closeUp={closeUp} />
      )}
      controls={{
        labels: ({ state, sync }) => (
          <div className="sk-bench">
            {SKILLS.map((k, i) => (
              <label key={k.id} className="sk-label">
                <span>{k.name}</span>
                <Select
                  value={state.choice[i]}
                  onChange={e =>
                    sync({ ...state, choice: state.choice.map((c, j) => (j === i ? Number(e.target.value) : c)) })
                  }
                >
                  {benchOptions(k.id).map((o, j) => (
                    <option key={o} value={j}>
                      {o}
                    </option>
                  ))}
                </Select>
              </label>
            ))}
          </div>
        ),
        run: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply(run(state))}>
            Run all tickets
          </button>
        ),
        score: ({ state }) => {
          if (!state.ran) return null;
          const sc = benchScore(state.ran);
          return (
            <p className="sk-score" aria-live="polite">
              Last run: {sc.right} of {N} right, {num(sc.words)} words in all.
              {isWinner(state.ran) ? ' Best possible.' : ''}
            </p>
          );
        },
        predict: ({ state, apply }) => (
          <Predict {...PREDICT} value={state.prediction} onPredict={i => apply({ ...state, prediction: i })} />
        ),
        reveal: ({ state, apply }) => (
          <Reveal
            prediction={state.prediction === null ? null : PREDICT.options[state.prediction]}
            outcome={PREDICT.options[OUTCOME]}
            revealed={state.revealed}
            onReveal={() => apply({ ...state, revealed: true })}
            label="See the winning set"
          />
        ),
        fact: ({ state }) =>
          state.revealed ? (
            <>
              <p>
                Best set: {BEST.right} of {N} right, {num(BEST.words)} words in all. The drafts: {START.right} of {N},{' '}
                {num(START.words)} words, fewer only because missed tickets opened no binder.
              </p>
              <Fact id="avoid-vague" />
              <Fact id="pick-from-many" />
              <ToyNote />
            </>
          ) : null,
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
