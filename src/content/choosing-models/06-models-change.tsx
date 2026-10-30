// Chapter 6: models change. Machine C's maker ships a new version with a better public score; run on Larkspur's 20 it
// fixes one answer, breaks others and falls under the bar (hand-set, pinned, checked by the chapter test). The steelyard
// weighs cost among the machines that clear the bar, so the pick moves off C until Larkspur keeps the pinned version.
// Cites a provider's retirement notice and the advice to pin snapshots; links Evals' release day.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { STEELYARD_PARTS } from '../../components/scenes/steelyardScene';
import { BAR, IDS, NEXT, QUESTIONS, changed, machineOf, passesOf } from '../../lib/choosing-models/machines';
import { rowsOf, type Weights } from '../../lib/choosing-models/score';
import { passedIn, qualityText } from '../../lib/choosing-models/story';
import { fact } from '../../lib/choosing-models/facts';
import { Outcome } from '../tool-calling/kit';
import { Fact, MachinesNote, SteelyardStage } from './kit';

const MODULE = 'choosing-models',
  ID = '06-models-change';
export const PARTS = STEELYARD_PARTS;
const N = QUESTIONS.length;
const OLD = machineOf(NEXT.id);
export const CHANGED = changed(NEXT.id, NEXT.version);
const FIXED = CHANGED.filter(c => c.now).length,
  BROKE = CHANGED.length - FIXED;
export const AFTER = passesOf(NEXT.version);
const W: Weights = { quality: 0, cost: 2, wait: 0 };
const under = (source: 'larkspur' | 'next') => IDS.filter(id => passedIn(id, source) < BAR);

export interface S {
  ran: boolean;
  p1: number | null;
  quiz: number | null;
}

export const P1 = {
  question: `The new version scores higher in public. On Larkspur’s ${N}, it will…`,
  options: ['Rise, as it did in public', 'Drop under the bar', `Stay at ${passesOf(NEXT.id)}`],
};
/** under the bar (the chapter test checks it) */
export const OUTCOME = 1;

export const QUIZ = {
  question: `Your provider emails: a new version is better overall, and the old one retires in ${fact('retirement').value} days. What now?`,
  options: [
    'Run your question set on the new version now; switch only when it clears your bar',
    'Switch today: newer is better',
    'Do nothing until the old one stops answering',
  ],
  correct: 0,
  explanation: 'Better overall is someone else’s average; test the new version on your own questions before the date.',
  why: [
    'Right: your question set says whether the new version still clears your bar, with time to act.',
    'Better on average can still be worse on your questions, as C’s new version was.',
    'Waiting leaves no time to test, and the day it stops answering is an outage.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `Larkspur pins version ${OLD.version} of C. Its maker ships ${NEXT.version}: public score ${OLD.public} up to ${NEXT.public}.`,
    act: 'Predict first.',
    say: { block: 'machine-c', text: 'Pinned' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'run',
    focus: 'run',
    visibleControls: ['run'],
    narration: `Same ${N} questions, same reference answers, the new version.`,
    act: `Run ${NEXT.version} on Larkspur’s ${N}.`,
    predicate: s => s.ran,
    solution: s => ({ ...s, ran: true }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'changes', 'facts', 'quiz'],
    narration: `${FIXED} answer fixed, ${BROKE} broken: ${AFTER} of ${N}, under the bar. A new version is a new model; keep the pin.`,
    act: 'One question to finish.',
    say: { block: 'machine-c', text: 'Under the bar' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What tells you whether the new version still works for Larkspur?',
  },
];

/** The questions whose result changed, and which way. */
function Changes() {
  return (
    <table className="tc-ledger">
      <caption>{`${OLD.version} against ${NEXT.version}`}</caption>
      <thead>
        <tr>
          <th scope="col">Question</th>
          <th scope="col">Now</th>
        </tr>
      </thead>
      <tbody>
        {CHANGED.map(c => (
          <tr key={c.id}>
            <th scope="row">{c.text}</th>
            <td>{c.now ? '✓ fixed' : '✗ broken'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function ModelsChange() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ran: false, p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say, focus }) => {
        const source = state.ran ? 'next' : 'larkspur',
          q = qualityText(source);
        return (
          <SteelyardStage
            rows={rowsOf(source)}
            weights={W}
            out={under(source)}
            states={state.ran ? { [NEXT.id]: 'warn' } : undefined}
            quality={q}
            pills={q.pills}
            say={say}
            step={focus}
            caption={`Bar ${BAR} of ${N}; weighed on cost among those that clear it. C: ${q.text.C}.`}
          >
            <MachinesNote />
          </SteelyardStage>
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        run: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, ran: true })}>
            {`Run ${NEXT.version}`}
          </button>
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        changes: () => <Changes />,
        facts: () => (
          <>
            <Fact id="snapshot" />
            <Fact id="retirement" />
            <p className="note">
              <a href="/evals/07-release-day/">Evals’ Release day runs a question set before every change ships.</a>
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
