// Chapter 6: when to hand over. Back to the assistant's stand-in answers: a hand-over line sends every answer stated
// below it to a person. Coverage falls and accuracy rises as the line rises; the puzzle is the lowest line that keeps
// wrong answers to customers within the team's limit. Links Small models, whose router uses the same idea.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { ANSWERS, MIN_ANSWERS, THRESHOLDS, itemsOf, type Threshold } from '../../lib/calibration/answers';
import { RULES } from '../../lib/calibration/workbench';
import { bins, coverage } from '../../lib/calibration/score';
import { JAR_PARTS } from '../../components/scenes/jarScene';
import { Outcome } from '../tool-calling/kit';
import { CalibrationStage, Fact, StandIn, ThresholdRange, pct, thresholdWords } from './kit';

const MODULE = 'calibration',
  ID = '06-when-to-hand-over';
export const PARTS = JAR_PARTS;
const JARS = bins(itemsOf(), MIN_ANSWERS);
export const COV = THRESHOLDS.map(t => coverage(itemsOf(), t));
const ok = (c: (typeof COV)[number]) => c.kept === 0 || c.wrong / c.kept <= RULES.wrongRate + 1e-9;
/** The lowest line that keeps wrong answers within the limit (the puzzle's answer). */
export const LOWEST = COV.find(ok)!.threshold as Threshold;
const ASKED = 0.9;
const at = (t: number) => COV.find(c => c.threshold === t)!;

export interface S {
  p1: number | null;
  t: Threshold;
  quiz: number | null;
}

export const P1 = {
  question: `Hand every answer stated below ${pct(ASKED)} to a person. What happens to the accuracy of the answers still sent?`,
  options: ['It rises', 'It stays the same', 'It falls'],
};
export const OUTCOME = at(ASKED).accuracy > at(0).accuracy ? 0 : at(ASKED).accuracy === at(0).accuracy ? 1 : 2;

export const QUIZ = {
  question:
    'A bank’s chatbot answers 95% of questions itself, and too many are wrong. What does a higher hand-over line do?',
  options: [
    'Fewer answered by the bot, but more of those right; more work for staff',
    'More answered by the bot, and more of them right',
    'Nothing, unless the bot is perfectly calibrated',
  ],
  correct: 0,
  explanation: 'A higher line trades coverage for accuracy: fewer answers go out, more of them right, more go to people.',
  why: [
    'Right: the unsure answers it now hands over were the likeliest to be wrong.',
    'Raising the line can only take answers away from the bot, never add them.',
    'It needs the confidence’s order to be right more often at the top, not perfect calibration.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration:
      'A hand-over line sends every answer stated below it to a person. Coverage is the share the assistant still answers itself.',
    act: 'Predict first.',
    say: { block: 'desk', text: 'A person answers' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'line',
    focus: 'line',
    visibleControls: ['result', 'line'],
    narration: `Accuracy: the share of sent answers that are right. The team allows at most ${pct(RULES.wrongRate)} wrong.`,
    act: 'Set the lowest line that keeps within that limit.',
    say: { block: 'low', text: 'Handed over' },
    predicate: s => s.t === LOWEST,
    hint: 'Raise the line one notch at a time and watch the wrong answers sent.',
    solution: s => ({ ...s, t: LOWEST }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['table', 'quiz'],
    narration:
      'Every notch up hands more to people and lets fewer wrong answers out. The limit and the desk decide where to stop.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What happens to the unsure answers when the line goes up?',
  },
];

function Table({ t }: { t: number }) {
  return (
    <table className="tc-ledger" style={{ marginTop: 10 }} data-coverage>
      <caption>The {ANSWERS.length} answers at each hand-over line</caption>
      <thead>
        <tr>
          <th scope="col">Line</th>
          <th scope="col">Coverage</th>
          <th scope="col">Accuracy</th>
          <th scope="col">Wrong sent</th>
        </tr>
      </thead>
      <tbody>
        {COV.map(c => (
          <tr key={c.threshold} data-threshold={c.threshold} aria-current={c.threshold === t ? 'true' : undefined}>
            <th scope="row">{c.threshold === 0 ? 'None' : `Below ${pct(c.threshold)}`}</th>
            <td>{pct(c.coverage)}</td>
            <td>{pct(c.accuracy)}</td>
            <td>
              {c.wrong} of {c.kept}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function WhenToHandOver() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, t: 0, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => {
        const c = at(state.t);
        return (
          <CalibrationStage
            say={say}
            shown={{
              booth: { jars: JARS, threshold: state.t, handed: c.handed },
              caption: `${thresholdWords(state.t)}: ${c.handed} to the help desk, ${c.kept} sent, ${c.wrong} of them wrong (${pct(c.kept ? c.wrong / c.kept : 0)}).`,
              stamp: state.t === LOWEST ? 'APPROVED' : undefined,
            }}
          />
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        result: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />
            <StandIn />
          </>
        ),
        // moving the line is an attempt only while it is the puzzle
        line: ({ state, apply, sync, focused }) => (
          <>
            <ThresholdRange value={state.t} onChange={t => (focused ? apply : sync)({ ...state, t })} />
            <Table t={state.t} />
          </>
        ),
        table: ({ state }) => (
          <>
            <Table t={state.t} />
            <Fact id="selective" />
            <p className="cb-note">
              <a href="/small-models/">Small models</a> uses the same idea to send unsure answers up to a larger model.
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
