// Chapter 1: the sticky note. The first build keeps every password as written; the reader predicts what a stolen table
// shows, copies it, and sees every drawer open at once.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { CLOAK_PARTS, type CloakOpts } from '../../components/scenes/cloakScene';
import { ACCOUNTS } from '../../lib/logins/store';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, LoginsStage, drawersOf } from './kit';

const MODULE = 'logins',
  ID = '01-the-sticky-note';
export const PARTS = CLOAK_PARTS;
const N = ACCOUNTS.length;

export const P1 = {
  question: 'A thief copies the table. How many passwords can she read?',
  options: [`All ${N}, as typed`, 'Only the weak ones', 'None: the table is private'],
};
/** Kept as written, every password reads straight off the copy. */
export const outcomeOf = () =>
  drawersOf(
    'plain',
    ACCOUNTS.map(a => a.id),
  ).every(d => d.state === 'cracked')
    ? 0
    : 1;

export const QUIZ = {
  question: 'A gym’s member table leaks, with passwords kept as typed. Who is at risk?',
  options: [
    'Members who use that password anywhere else too',
    'Only the members’ gym accounts',
    'Nobody, once the gym resets every password',
  ],
  correct: 0,
  explanation: 'A password read in the clear works wherever its owner reused it.',
  why: [
    'Right: the thief now holds working passwords, and people reuse them on other sites.',
    'The gym can reset its own accounts, but the same passwords still open other sites.',
    'A reset fixes the gym; it can’t change the password at the member’s bank.',
  ],
};

interface S {
  stolen: boolean;
  p1: number | null;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'Each drawer holds one builder’s password on a sticky note. Thieves copy tables like this in a breach.',
    act: 'Predict what a stolen table shows.',
    say: { block: 'cabinet', text: 'Passwords' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'breach',
    focus: 'steal',
    visibleControls: ['p1', 'steal'],
    narration: 'Your pick is locked. Somebody has found a way into the database.',
    act: 'Copy the table.',
    say: { block: 'cabinet', text: 'Readable' },
    predicate: s => s.stolen,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'fact', 'quiz'],
    narration: `All ${N} passwords, readable at once. Builders reuse passwords, so each one may open other sites too.`,
    act: 'One question to finish.',
    say: { block: 'thief', text: `Has all ${N}` },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Where else might a member type the same password?',
  },
];

export function sceneOf(s: Pick<S, 'stolen'>): Omit<CloakOpts, 'scale' | 'say'> {
  return {
    drawers: drawersOf('plain', s.stolen ? ACCOUNTS.map(a => a.id) : [], s.stolen ? ACCOUNTS.map(a => a.id) : []),
    table: s.stolen ? `${N} OF ${N} READ` : 'AS WRITTEN',
    tableShort: s.stolen ? `${N}/${N}` : 'PLAIN',
    desk: 'LARKSPUR',
    thief: s.stolen ? { label: 'HAS THE TABLE', short: 'THIEF', holds: 'table' } : undefined,
  };
}

export default function TheStickyNote() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ stolen: false, p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => (
        <LoginsStage
          say={say}
          show={{
            scene: sceneOf(state),
            caption: state.stolen
              ? `The copied table: all ${N} demo passwords readable.`
              : `${N} demo accounts, each password kept as typed.`,
          }}
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        steal: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, stolen: true })}>
            Copy the table
          </button>
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        fact: () => <Fact id="nist-storage" />,
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
