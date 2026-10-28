// Chapter 3: a pinch of salt. Two builders share a password, so they share a fingerprint; the reader predicts what a
// per-account salt does, adds it, and replays the race: the twins part, and every crack takes as many times longer as
// there are accounts, but the leaked-list passwords still fall.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { CLOAK_PARTS, type CloakOpts } from '../../components/scenes/cloakScene';
import { ACCOUNTS, fingerprint, firstName } from '../../lib/logins/store';
import { LAST, WORK, boardAt } from '../../lib/logins/race';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, LoginsStage, RaceControls, raceSaid, drawersOf, type Race } from './kit';
import { TWINS } from './module';

const MODULE = 'logins',
  ID = '03-a-pinch-of-salt';
export const PARTS = CLOAK_PARTS;
const N = ACCOUNTS.length,
  [A, B] = TWINS.map(firstName);
export const END = boardAt('salted', WORK[0], LAST).cracked;

export const P1 = {
  question: `Mix a different salt into ${A}’s and ${B}’s passwords. Do their fingerprints still match?`,
  options: [
    'No: different salts, different fingerprints',
    'Yes: same password, same fingerprint',
    'Only if the salts are secret',
  ],
};
export const outcomeOf = () => (fingerprint(TWINS[0], 'salted') !== fingerprint(TWINS[1], 'salted') ? 0 : 1);

export const QUIZ = {
  question: 'Why does every account get its own random salt, not one salt for the whole site?',
  options: [
    'So equal passwords still get different fingerprints',
    'So the salt can be kept secret',
    'So signing in runs faster',
  ],
  correct: 0,
  explanation: 'One salt per account means twins differ and each guess tests one account at a time.',
  why: [
    'Right: with one shared salt, equal passwords would still match, and one guess would test them all.',
    'Salts are stored right beside the fingerprint; they work without being secret.',
    'Salt adds a step to sign-in; it makes nothing faster.',
  ],
};

interface S extends Race {
  salted: boolean;
  p1: number | null;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `${A} and ${B} share a fingerprint. A salt is a random value mixed into each password before hashing.`,
    act: 'Predict what salting does to them.',
    say: { block: 'cabinet', text: 'Twins' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'salt',
    focus: 'salt',
    visibleControls: ['p1', 'salt'],
    narration: 'Your pick is locked. Each account gets its own salt, kept beside its fingerprint.',
    act: 'Add salt.',
    predicate: s => s.salted,
  },
  {
    id: 'race',
    focus: 'race',
    visibleControls: ['out1', 'race'],
    narration: `The salt is not secret. But one guess now tests one account, not all ${N} at once.`,
    act: 'Play the race again.',
    say: { block: 'thief', text: 'One at a time' },
    predicate: s => s.tick >= LAST,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['race', 'fact', 'quiz'],
    narration: `Still ${END.length} cracked within a year, each ${N} times slower. Salt hides twins; it can’t make a common password rare.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What would two accounts with one shared salt look like?',
  },
];

export function sceneOf(s: Pick<S, 'salted' | 'tick'>): Omit<CloakOpts, 'scale' | 'say'> {
  const form = s.salted ? 'salted' : 'sha256',
    cracked = s.salted ? boardAt('salted', WORK[0], s.tick).cracked : [],
    pills = Object.fromEntries(
      TWINS.map(a => [a.id, `${firstName(a).toUpperCase()} ${fingerprint(a, form).slice(0, 6)}`]),
    );
  return {
    drawers: drawersOf(form, cracked).map(d =>
      pills[d.id] ? { ...d, label: pills[d.id], short: pills[d.id].split(' ')[1], lit: true } : d,
    ),
    table: s.salted ? `${cracked.length} OF ${N} CRACKED` : 'SHA-256',
    tableShort: s.salted ? `${cracked.length}/${N}` : 'SHA-256',
    desk: 'LARKSPUR',
    thief: { label: 'HAS THE TABLE', short: 'THIEF', holds: 'table' },
  };
}

export default function APinchOfSalt() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ salted: false, form: 'salted', work: WORK[0], tick: 0, p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => (
        <LoginsStage
          say={say}
          show={{
            scene: sceneOf(state),
            caption: state.salted
              ? raceSaid(state)
              : `${A} and ${B}: one password, one fingerprint, ${fingerprint(TWINS[0], 'sha256').slice(0, 6)}.`,
          }}
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        salt: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, salted: true })}>
            Add salt
          </button>
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        race: ({ state, sync }) => (
          <RaceControls race={state} forms={['salted']} onChange={r => sync({ ...state, ...r })} />
        ),
        fact: () => <Fact id="owasp-salt" />,
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
