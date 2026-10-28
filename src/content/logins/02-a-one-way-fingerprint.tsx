// Chapter 2: a one-way fingerprint. The table keeps SHA-256 fingerprints (Locks and keys' sha256.ts); the reader
// predicts how many crack in a second, then plays the cracking race: the thief hashes the leaked list and compares.
// Locks and keys chapter 5 teaches the hash itself (R17).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { CLOAK_PARTS, type CloakOpts } from '../../components/scenes/cloakScene';
import { ACCOUNTS, LEAKED } from '../../lib/logins/store';
import { LAST, WORK, boardAt } from '../../lib/logins/race';
import { chapterHref, moduleOf, nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, LoginsStage, RaceControls, drawersOf, raceScene, raceSaid, type Race } from './kit';

const MODULE = 'logins',
  ID = '02-a-one-way-fingerprint';
export const PARTS = CLOAK_PARTS;
const N = ACCOUNTS.length,
  FINGERPRINT = moduleOf('encryption').chapters[4];
const listed = ACCOUNTS.filter(a => LEAKED.includes(a.password)).map(a => a.id);
/** after the race: who fell in the first second, and by the year */
export const FIRST = boardAt('sha256', WORK[0], 0).cracked,
  END = boardAt('sha256', WORK[0], LAST).cracked;

export const P1 = {
  question: 'The thief has the fingerprints and one graphics card. How many accounts crack within a second?',
  options: ['Those on the leaked list', 'None: a hash can’t run backwards', `All ${N} at once`],
};
export const outcomeOf = () =>
  FIRST.length === N ? 2 : FIRST.length && listed.every(id => FIRST.includes(id)) ? 0 : 1;

export const QUIZ = {
  question: 'A site keeps plain SHA-256 fingerprints. Which password holds out longest?',
  options: [
    'A long phrase nobody has used before',
    'A common word with a digit on the end',
    'Any password: the hash hides them all',
  ],
  correct: 0,
  explanation: 'The thief hashes guesses: a password no list holds, and too long to try every one, outlasts the rest.',
  why: [
    'Right: no list holds it, and there are far too many long phrases to try them all.',
    'Word-plus-digit is exactly what leaked lists and guessing tools try first.',
    'A hash can’t run backwards, but guesses run forwards, billions a second.',
  ],
};

interface S extends Race {
  hashed: boolean;
  p1: number | null;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'hash',
    focus: 'hash',
    visibleControls: ['hash'],
    narration:
      'A hash is a one-way fingerprint. The table can keep SHA-256 of each password, and nobody can run it backwards.',
    act: 'Store fingerprints instead.',
    say: { block: 'cabinet', text: 'Fingerprints' },
    predicate: s => s.hashed,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration:
      'The thief steals the fingerprints anyway. She hashes every password on a leaked list and looks for matches.',
    act: 'Predict how many crack in a second.',
    say: { block: 'thief', text: 'Hashes guesses' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'race',
    focus: 'race',
    visibleControls: ['p1', 'race'],
    narration: 'Your pick is locked. Cracking is guessing: hash a guess, compare, repeat, billions of times a second.',
    act: 'Play the race to a year.',
    say: { block: 'cabinet', text: 'Cracked' },
    predicate: s => s.tick >= LAST,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'race', 'link', 'fact', 'quiz'],
    narration: `${FIRST.length} fell in the first second, ${END.length} of ${N} within a year. Common and short passwords go first.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which passwords does the thief try first?',
  },
];

export function sceneOf(s: Pick<S, 'hashed' | 'p1' | 'tick'>): Omit<CloakOpts, 'scale' | 'say'> {
  if (!s.hashed) return { drawers: drawersOf('plain'), table: 'AS WRITTEN', tableShort: 'PLAIN', desk: 'LARKSPUR' };
  if (s.p1 === null)
    return {
      drawers: drawersOf('sha256'),
      table: 'SHA-256',
      desk: 'LARKSPUR',
      thief: { label: 'HAS THE TABLE', short: 'THIEF', holds: 'table' },
    };
  return { ...raceScene('sha256', WORK[0], s.tick), desk: 'LARKSPUR' };
}

export default function AOneWayFingerprint() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ hashed: false, form: 'sha256', work: WORK[0], tick: 0, p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => (
        <LoginsStage
          say={say}
          show={{
            scene: sceneOf(state),
            caption: state.p1 === null ? 'Demo accounts, each kept as a SHA-256 fingerprint.' : raceSaid(state),
          }}
        />
      )}
      controls={{
        hash: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, hashed: true })}>
            Store fingerprints
          </button>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        // the race's ticks are never attempts: only reaching the year moves the step on
        race: ({ state, sync }) => (
          <RaceControls race={state} forms={['sha256']} onChange={r => sync({ ...state, ...r })} />
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        link: () => (
          <p className="tc-fact">
            How a hash works:{' '}
            <a href={chapterHref('encryption', FINGERPRINT.id)}>Locks and keys, {FINGERPRINT.title}</a>
          </p>
        ),
        fact: () => <Fact id="gpu-sha256" />,
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
