// Chapter 2: your own questions. The same three machines are run on Larkspur's 20 support questions (hand-set results,
// labelled), weighed on quality alone. The reader predicts where B, second in public, lands; the run puts it last and
// the order changes (pinned, checked by the chapter test). Cites contamination; links Evals' test set.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { STEELYARD_PARTS } from '../../components/scenes/steelyardScene';
import { QUESTIONS, QUESTIONS_NOTE, passesOf, rank, machineOf } from '../../lib/choosing-models/machines';
import { rowsOf, type Weights } from '../../lib/choosing-models/score';
import { qualityText } from '../../lib/choosing-models/story';
import { Outcome } from '../tool-calling/kit';
import { Fact, MachinesNote, SteelyardStage } from './kit';

const MODULE = 'choosing-models',
  ID = '02-your-own-questions';
export const PARTS = STEELYARD_PARTS;
const N = QUESTIONS.length;
const W: Weights = { quality: 2, cost: 0, wait: 0 };
export const PUBLIC = rank(id => machineOf(id).public);
export const OWN = rank(id => passesOf(id));
const SECOND = PUBLIC[1];

export interface S {
  ran: boolean;
  p1: number | null;
  quiz: number | null;
}

export const P1 = {
  question: `On Larkspur’s ${N}, where does Machine ${SECOND}, second in public, land?`,
  options: ['Still second', 'First', 'Last'],
};
/** where the second public machine lands on Larkspur's questions (the chapter test checks it) */
export const OUTCOME = P1.options.indexOf(['First', 'Still second', 'Last'][OWN.indexOf(SECOND)]);

export const QUIZ = {
  question: 'A model tops a coding benchmark. Your team needs it to summarise supplier contracts. Next step?',
  options: [
    'Run it and its rivals on a set of your own contracts with checked answers',
    'Pick it: a top score carries over to any task',
    'Pick the second-placed model, to be safe',
  ],
  correct: 0,
  explanation: 'Only your own questions, with checked answers, show how a model does on your job.',
  why: [
    'Right: your own set, with reference answers, is the test that matches the job.',
    'A coding test asks nothing about contracts, and orders change between tests.',
    'Second place on someone else’s test is no better a guide than first.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `Larkspur’s question set: ${N} real support questions, each with a reference answer. Same machines, same quality poise.`,
    act: 'Predict first.',
    say: { block: `machine-${SECOND.toLowerCase()}`, text: 'Second in public' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'run',
    focus: 'run',
    visibleControls: ['run'],
    narration: `Each machine answers all ${N}; each reply is graded against its reference answer.`,
    act: `Run Larkspur’s ${N}.`,
    predicate: s => s.ran,
    solution: s => ({ ...s, ran: true }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'facts', 'quiz'],
    narration: `${SECOND} drops to last, ${passesOf(SECOND)} of ${N}. Public tests also suffer contamination: their questions leak into training.`,
    act: 'One question to finish.',
    say: { block: `machine-${SECOND.toLowerCase()}`, text: 'Last now' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which test asks the questions your team will really get?',
  },
];

export default function YourOwnQuestions() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ran: false, p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say, focus }) => {
        const source = state.ran ? 'larkspur' : 'public',
          q = qualityText(source);
        return (
          <SteelyardStage
            rows={rowsOf(source)}
            weights={W}
            quality={q}
            pills={q.pills}
            say={say}
            step={focus}
            caption={
              state.ran
                ? `Larkspur’s ${N}: A ${q.text.A}, B ${q.text.B}, C ${q.text.C}.`
                : `Public test: A ${q.text.A}, B ${q.text.B}, C ${q.text.C}.`
            }
          >
            <MachinesNote />
          </SteelyardStage>
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        run: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, ran: true })}>
            {`Run Larkspur’s ${N}`}
          </button>
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        facts: () => (
          <>
            <p className="note">{QUESTIONS_NOTE}</p>
            <Fact id="contamination" />
            <p className="note">
              <a href="/evals/02-the-test-set/">Evals’ The test set shows how to build a question set like this one.</a>
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
