// Chapter 4: when more thinking hurts. Three simple counts with distracting details: run at low (all right), predict
// whether high helps (the pick locks), then run at high. The answers are hand-written to illustrate Gema et al. (2025)
// and were not measured; each carries its note, and the reveal cites the paper.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { ofKind, run, sweep, type Effort } from '../../lib/reasoning/engine';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { Answer, Fact, ReasoningStage, type View } from './kit';

const MODULE = 'reasoning',
  ID = '04-when-more-thinking-hurts';
const QS = ofKind('distractor'),
  IDS = QS.map(q => q.id);
const [LOW, HIGH] = sweep(IDS, ['low', 'high']);

interface S {
  low: boolean;
  p1: number | null;
  high: boolean;
  view: View;
  quiz: number | null;
}

const P1 = {
  question: 'All three are right at low effort. Now run them at high. Will high effort help?',
  options: [
    'Yes: more thinking can only catch more',
    'No change: they are already right',
    'It gets worse: the extra thinking chases the distracting details',
  ],
};
const outcome = () => (HIGH.right > LOW.right ? 0 : HIGH.right === LOW.right ? 1 : 2);

const QUIZ = {
  question:
    'A hotel assistant is asked “How many guests are in room 12?” next to a note about towel counts, late checkout and last month’s refit. At which setting is a wrong count most likely?',
  options: ['No thinking', 'Low effort', 'High effort: more chances to build on the notes'],
  correct: 2,
  explanation: 'A simple count beside stray details is the shape of question where longer thinking wanders.',
  why: [
    'Possible, but a direct answer has little room to wander off; a quick count is often right.',
    'A short think usually reads the count and stops.',
    'Right. The longest thinking has the most room to pick up the towels or the refit and build a wrong answer on them.',
  ],
};

const desk = (e: Effort) => {
  const p = e === 'low' ? LOW : HIGH,
    t = IDS.reduce((n, q) => n + run(q, e).thinkingTokens, 0);
  return { effort: e, thinking: t, wait: p.wait, right: p.right === p.of };
};

export const STEPS: Step<S>[] = [
  {
    id: 'low',
    focus: 'low',
    visibleControls: ['questions', 'low'],
    narration:
      'Chapter 3’s dial suggests turning effort up for everything, just in case. Try it on the simplest questions Larkspur gets: counts. Each comes with a distractor, a detail near the question that has nothing to do with the answer. Run them at low effort first.',
    predicate: s => s.low,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['lowAnswers', 'p1'],
    narration: `${LOW.right} of ${LOW.of} right at low. Before you turn the dial up:`,
    predicate: s => s.p1 !== null,
  },
  {
    id: 'high',
    focus: 'high',
    visibleControls: ['p1', 'high'],
    narration: 'Run the same three questions at high effort.',
    predicate: s => s.high,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['highAnswers', 'quiz'],
    narration: `${HIGH.right} of ${HIGH.of} right at high. Each long think picked up a distractor (the cartons, the K3’s speed, last week’s holiday) and built on it. That is overthinking: thinking past the answer until the extra steps change it. When more of something makes results worse, researchers call it inverse scaling. These answers were written for this site to illustrate that finding; they were not measured.`,
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which setting gives a simple count the most room to wander?',
  },
];

export default function WhenMoreThinkingHurts() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ low: false, p1: null, high: false, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync }) => {
        const e: Effort = state.high ? 'high' : 'low',
          p = e === 'low' ? LOW : HIGH,
          ran = state.low;
        const points = state.high ? [LOW, HIGH] : ran ? [LOW] : [];
        return (
          <ReasoningStage
            view={state.view}
            onView={view => sync({ ...state, view })}
            shown={{
              desk: ran ? desk(e) : { effort: 'low', thinking: 0, wait: 0 },
              series: points.length ? [{ id: 'distractor', label: 'Distractions', points }] : undefined,
              caption: ran
                ? `Effort ${e}: ${p.right} of ${p.of} counts right.`
                : 'Three simple counts, each with a distracting detail.',
              thinking: ran ? run(IDS[0], e).thinking : undefined,
              stamp: ran ? (p.right === p.of ? 'PASS' : 'FAIL') : undefined,
            }}
          />
        );
      }}
      controls={{
        questions: () => (
          <ul className="rs-qs">
            {QS.map(q => (
              <li key={q.id}>
                “{q.query}” <span className="note">Beside it: {q.given}</span>
              </li>
            ))}
          </ul>
        ),
        low: ({ state, sync }) => (
          <button type="button" className="big" onClick={() => sync({ ...state, low: true })}>
            Run at low effort
          </button>
        ),
        lowAnswers: () => (
          <>
            {IDS.map(q => (
              <Answer key={q} q={q} effort="low" note={false} />
            ))}
          </>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        high: ({ state, sync }) => (
          <button type="button" className="big" onClick={() => sync({ ...state, high: true })}>
            Run at high effort
          </button>
        ),
        highAnswers: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcome()} />
            {IDS.map(q => (
              <Answer key={q} q={q} effort="high" />
            ))}
            <Fact id="gema" />
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
