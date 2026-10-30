// Chapter 5: mistakes snowball. Mira's four demos clear bin C; with the rail forced to slip once (bins.json snowball),
// the claw lands past the part, a frame no demo showed, and the nearest demo frame says grip: it stalls to the step
// cap (pinned). The reader takes the wheel; every move at a frame the policy reached is a correction (DAgger, Ross et
// al. 2011, cited), and the next hand-over clears the bin.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { CLAW_PARTS } from '../../components/scenes/clawScene';
import pinned from '../../../data/robots/pinned.json' with { type: 'json' };
import { correctionsOf } from '../../lib/robots/dagger';
import { demoPairs, PERSON, SNOWBALL } from '../../lib/robots/story';
import { Outcome } from '../tool-calling/kit';
import { BAY, type Bay, DriveBench, Fact, SimNote, type View } from './kit';

const MODULE = 'robots',
  ID = '05-mistakes-snowball';
export const PARTS = CLAW_PARTS;
const BASE = demoPairs(SNOWBALL.demos),
  FORCED = [SNOWBALL.slipAt];
/** the expert's corrections on the slipped run: what Show me applies */
export const FIXES = correctionsOf(BASE, [SNOWBALL.layout], { forced: FORCED });

export interface S {
  bay: Bay;
  view: View;
  p1: number | null;
  quiz: number | null;
}

export const P1 = {
  question: 'Why does the policy stall after one slip?',
  options: [
    'Its frame is off-demo, so it copies the wrong move',
    'The slip broke the claw',
    'The part moved when the rail slipped',
  ],
};
export const OUTCOME = 0;

export const QUIZ = {
  question: 'A copied driving policy drifts toward the kerb, a place no demo went. What helps most?',
  options: [
    'Record a person’s moves from those drifted spots',
    'More demos of perfect driving down the middle',
    'Drive slower',
  ],
  correct: 0,
  explanation: 'Corrections teach the frames the policy itself reaches, which perfect demos never show.',
  why: [
    'Right: that is DAgger, labelling where the policy goes, not where people go.',
    'Perfect demos never reach the kerb, so the policy still has nothing to copy there.',
    'Slower driving drifts the same way; it just takes longer to get there.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'slip',
    focus: 'stage',
    visibleControls: [],
    narration: `${PERSON}’s ${SNOWBALL.demos} demos clear bin C. This time the rail will slip on step ${SNOWBALL.slipAt}.`,
    act: 'Press Hand over.',
    say: { block: 'claw', text: 'It will slip' },
    predicate: s => s.bay.runs > 0,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `Stuck: ${pinned.snowball.slipped.steps} steps. The claw went past the part and never came back.`,
    act: 'Predict first.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'wheel',
    focus: 'stage',
    visibleControls: ['out1'],
    narration: 'Past the part, its frame is off-demo: the nearest demo frame says grip, so it grips air.',
    act: 'Take the wheel; finish the pick.',
    say: { block: 'part', text: 'Overshot' },
    predicate: s => s.bay.fixes.length > 0,
    hint: 'The part is one cell to the left: press ←, Grip, then drive right to the tray and Drop.',
  },
  {
    id: 'again',
    focus: 'stage',
    visibleControls: [],
    narration: 'Each move you made is a correction: a frame the policy reached, with the right move.',
    act: 'Press Hand over again.',
    say: { block: 'machine', text: 'Learns fixes' },
    predicate: s => s.bay.fixes.length > 0 && s.bay.last?.end === 'done',
    hint: 'If it still stalls, take the wheel again where it stops.',
    solution: s => ({
      ...s,
      bay: { ...s.bay, fixes: FIXES, runs: s.bay.runs + 1, last: pinned.snowball.corrected as Bay['last'] },
    }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['fact', 'quiz'],
    narration:
      'Cleared, slip and all. DAgger does this at scale: run the policy, label the frames it reached, add them, repeat.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which frames do perfect demos never show?',
  },
];

export default function MistakesSnowball() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ bay: BAY, view: 'scene', p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => (
        <DriveBench
          bay={state.bay}
          onBay={bay => sync({ ...state, bay })}
          fresh={SNOWBALL.layout}
          base={BASE}
          forced={FORCED}
          wheel
          say={say}
          view={state.view}
          onView={view => sync({ ...state, view })}
          caption={`Bin C, simulated. The rail slips on step ${SNOWBALL.slipAt}. Corrections so far: ${state.bay.fixes.length}.`}
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        fact: () => (
          <>
            <Fact id="dagger" />
            <SimNote />
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
