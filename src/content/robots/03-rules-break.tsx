// Chapter 3: rules break. Mira's rule is the moves that worked on bin A, played blind (rules.ts). The reader runs it on
// bin A (done), predicts bin B, and runs it there: it never reads the camera, so it fails (pinned).
import { useState } from 'react';
import StepRunner from '../../components/story/StepRunner';
import type { Say, Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { CLAW_PARTS } from '../../components/scenes/clawScene';
import { NEW_BIN, RULE, RULE_BIN, runRule } from '../../lib/robots/rules';
import { PERSON } from '../../lib/robots/story';
import { Outcome } from '../tool-calling/kit';
import { Fact, ReplayStage, SimNote, type View } from './kit';

const MODULE = 'robots',
  ID = '03-rules-break';
export const PARTS = CLAW_PARTS;
const BINS = { A: RULE_BIN, B: NEW_BIN } as const;
type Bin = keyof typeof BINS;
const RUNS = { A: runRule(RULE_BIN), B: runRule(NEW_BIN) };
/** how the rule ends on bin B, in words (pinned: off the grid) */
export const B_END = RUNS.B.end;

export interface S {
  ran: Bin[];
  view: View;
  p1: number | null;
  quiz: number | null;
}

export const P1 = {
  question: 'Bin B has its part and tray in new places. Does the same rule work there?',
  options: ['No: it drives where bin A’s part was', 'Yes: the moves are the same', 'Yes, if it runs slower'],
};
export const OUTCOME = B_END === 'done' ? 1 : 0;

export const QUIZ = {
  question: 'Larkspur has 500 bin layouts and adds more each week. Why not write a rule for each?',
  options: [
    'Layouts keep changing, so the rules never catch up',
    'A rule runs too slowly',
    'An arm can hold only one rule',
  ],
  correct: 0,
  explanation: 'A fixed list of moves fits one layout; every new layout needs a person to write another.',
  why: [
    'Right: each new layout needs new moves, and someone has to write them first.',
    'Speed isn’t the problem: the rule runs fast, just in the wrong places.',
    'An arm can store many rules; the cost is writing one for every layout.',
  ],
};

const ended =
  B_END === 'off-grid' ? 'Off the grid: it drove where bin A’s tray was.' : 'Stuck: it gripped where bin A’s part was.';

export const STEPS: Step<S>[] = [
  {
    id: 'run',
    focus: 'stage',
    visibleControls: [],
    narration: `${PERSON}’s rule: the ${RULE.length} moves that worked on bin A, played blind. A rule never reads the camera.`,
    act: 'Press Run on bin A.',
    say: { block: 'claw', text: 'Played blind' },
    predicate: s => s.ran.includes('A'),
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'Part in the tray. Bin B has a new layout: crates, part and tray elsewhere.',
    act: 'Predict first.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'run-b',
    focus: 'stage',
    visibleControls: [],
    narration: 'Your pick is locked.',
    act: 'Press Run on bin B.',
    say: { block: 'part', text: 'Its part' },
    predicate: s => s.ran.includes('B'),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'note', 'quiz'],
    narration: `${ended} Every layout would need its own rule.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Who has to write the moves for a layout nobody has seen?',
  },
];

function RuleStage({
  s,
  onRan,
  say,
  setView,
}: {
  s: S;
  onRan: (b: Bin) => void;
  say?: Say;
  setView: (v: View) => void;
}) {
  const [bin, setBin] = useState<Bin>(s.ran.includes('B') ? 'B' : 'A');
  const [go, setGo] = useState(0);
  const r = RUNS[bin];
  const run = (b: Bin) => {
    setBin(b);
    setGo(g => g + 1);
  };
  return (
    <ReplayStage
      layout={BINS[bin]}
      states={r.states}
      actions={RULE.slice(0, r.states.length - 1)}
      end={r.end}
      go={go}
      onEnd={() => onRan(bin)}
      say={say}
      view={s.view}
      onView={setView}
      caption={`Bin ${bin}, simulated. The rule’s moves come from bin A.`}
    >
      <div className="rb-run">
        {(['A', 'B'] as const).map(b => (
          <button
            key={b}
            type="button"
            className="chip"
            disabled={b === 'B' && !s.ran.includes('A')}
            onClick={() => run(b)}
          >
            {`Run on bin ${b}`}
          </button>
        ))}
      </div>
    </ReplayStage>
  );
}

export default function RulesBreak() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ran: [], view: 'scene', p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => (
        <RuleStage
          s={state}
          say={say}
          setView={view => sync({ ...state, view })}
          onRan={b => sync({ ...state, ran: state.ran.includes(b) ? state.ran : [...state.ran, b] })}
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        note: () => (
          <>
            <Fact id="hand-designed-grasp" />
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
