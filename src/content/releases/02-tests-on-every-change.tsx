// Chapter 2: tests on every change. The reader runs the coupon fix through the pipeline (a test stops it), predicts
// what happens to the address tweak whose bug no test checks, runs it, and sees every gate pass.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { SCENES, changeOf, runOf } from '../../lib/releases/sim';
import { GATES, pipelineOf } from '../../lib/releases/pipeline';
import { SIGNAL_PARTS } from '../../components/scenes/signalScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, ReleasesStage, type View } from './kit';

const MODULE = 'releases',
  ID = '02-tests-on-every-change';
export const PARTS = SIGNAL_PARTS;
export const CAUGHT = changeOf('coupon'),
  UNTESTED = changeOf('address');
const STOP = GATES.find(g => g.id === pipelineOf(CAUGHT.id).stoppedAt)!;
const RUN = runOf(SCENES.calm);

export const P1 = {
  question: `The ${UNTESTED.short} has a bug no test checks. What does the pipeline do with it?`,
  options: ['Stops it at a test gate', 'Lets it through, bug and all', 'Stops it at the build'],
};
export const outcomeOf = () => {
  const p = pipelineOf(UNTESTED.id);
  return p.ships ? 1 : p.stoppedAt === 'build' ? 2 : 0;
};

export const QUIZ = {
  question:
    'A team’s pipeline is all green. A customer then finds a bug in a rarely used form. Why didn’t the pipeline stop it?',
  options: ['No test checked that form', 'The pipeline must be broken', 'The bug must have come after the release'],
  correct: 0,
  explanation: 'A pipeline only stops the bugs its tests look for.',
  why: [
    'Right: green means every test passed, and none of them looked at that form.',
    'A working pipeline passes untested bugs too; green is not proof of no bugs.',
    'The bug shipped with the change; no test was there to notice it.',
  ],
};

interface S {
  ran: string[];
  p1: number | null;
  view: View;
  quiz: number | null;
}
const run = (s: S, id: string): S => ({ ...s, ran: [...s.ran.filter(x => x !== id), id] });

export const STEPS: Step<S>[] = [
  {
    id: 'coupon',
    focus: 'run',
    visibleControls: ['run'],
    narration: `Every change rides through the pipeline: ${GATES.map(g => g.name.toLowerCase()).join(', then ')}. A gate that fails stops it.`,
    act: `Run the ${CAUGHT.short} through.`,
    say: { block: 'gates', text: 'Every change' },
    predicate: s => s.ran.includes(CAUGHT.id),
    solution: s => run(s, CAUGHT.id),
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `Stopped at ${STOP.name.toLowerCase()}: a test there catches that ${CAUGHT.bug}.`,
    act: `Predict what happens to the ${UNTESTED.short}.`,
    say: { block: 'gates', text: 'Stopped' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'address',
    focus: 'run',
    visibleControls: ['p1', 'run'],
    narration: 'Your pick is locked.',
    act: `Run the ${UNTESTED.short} through.`,
    predicate: s => s.p1 !== null && s.ran.includes(UNTESTED.id),
    solution: s => run(s, UNTESTED.id),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'quiz'],
    narration: `Every gate passed, yet ${UNTESTED.bug}. Tests catch only bugs someone wrote a test for.`,
    act: 'One question to finish.',
    say: { block: 'gates', text: 'All green' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What does a test look for?',
  },
];

export default function TestsOnEveryChange() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ran: [], p1: null, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const last = state.ran.at(-1),
          p = last ? pipelineOf(last) : undefined;
        return (
          <ReleasesStage
            run={RUN}
            t={0}
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            {...(p ? { pipeline: p } : {})}
            caption={
              last && p
                ? `The ${changeOf(last).short}: ${p.ships ? 'passed every gate' : `stopped at ${GATES.find(g => g.id === p.stoppedAt)!.name}`}.`
                : 'No change in the pipeline yet.'
            }
          />
        );
      }}
      controls={{
        run: ({ state, apply }) => (
          <div className="rl-row">
            {[CAUGHT, UNTESTED].map(c => (
              <button key={c.id} type="button" className="chip" onClick={() => apply(run(state, c.id))}>
                {`Run the ${c.short}`}
              </button>
            ))}
          </div>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />
            <ul className="rl-gates" aria-label={`Gates for the ${UNTESTED.short}`}>
              {pipelineOf(UNTESTED.id).gates.map(g => (
                <li key={g.id} className={`stamp ${g.pass ? 'correct' : 'wrong'}`}>
                  {`${g.name}: ${g.pass ? 'pass' : 'fail'}`}
                </li>
              ))}
            </ul>
            <Fact id="crowdstrike-tests" />
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
