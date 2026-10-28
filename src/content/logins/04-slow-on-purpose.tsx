// Chapter 4: slow on purpose. PBKDF2 (Web Crypto, pinned) at three work factors; the reader predicts who survives a
// year at the top factor and plays the race there. The lesson the plan fixes: slow hashing buys time against
// guessing, never against a password already on the leaked list; the fix for those is refusing them at sign-up.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { Hex, useAsync } from '../encryption/kit';
import { CLOAK_PARTS, type CloakOpts } from '../../components/scenes/cloakScene';
import { ACCOUNTS, LEAKED, accountOf, pbkdf2 } from '../../lib/logins/store';
import { LAST, WORK, boardAt } from '../../lib/logins/race';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, LoginsStage, RaceControls, drawersOf, raceScene, raceSaid, type Race } from './kit';
import pinned from '../../../data/logins/pinned.json' with { type: 'json' };

const MODULE = 'logins',
  ID = '04-slow-on-purpose';
export const PARTS = CLOAK_PARTS;
const N = ACCOUNTS.length,
  TOP = WORK[WORK.length - 1],
  TOP_NAME = TOP.toLocaleString('en-GB'),
  DEMO = accountOf(pinned.pbkdf2.account);
const listed = ACCOUNTS.filter(a => LEAKED.includes(a.password)).map(a => a.id);
export const END = boardAt('pbkdf2', TOP, LAST).cracked;

export const P1 = {
  question: `At ${TOP_NAME} rounds, which accounts survive a year of guessing?`,
  options: ['Only those off the leaked list', 'All of them', 'None of them'],
};
export const outcomeOf = () => (END.length === N ? 2 : END.length === 0 ? 1 : 0);

export const QUIZ = {
  question: `A site moves to PBKDF2 at ${TOP_NAME} rounds. A user’s password is on a leaked list. What protects them?`,
  options: ['Refusing leaked passwords when people choose one', 'The slow hash', 'Even more rounds'],
  correct: 0,
  explanation: 'A slow hash only slows guessing; a password the thief tries first falls anyway.',
  why: [
    'Right: checking new passwords against a leaked list keeps them out of the table at all.',
    'It makes each guess cost more, but a listed password needs only a handful of guesses.',
    'More rounds slow every guess, but a handful of guesses still runs quickly.',
  ],
};

interface S extends Race {
  p1: number | null;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'slow',
    focus: 'race',
    visibleControls: ['race'],
    narration: 'PBKDF2 runs a salted hash over and over. The work factor says how many rounds.',
    act: 'Store passwords with PBKDF2.',
    say: { block: 'cabinet', text: 'Slow hashes' },
    predicate: s => s.form === 'pbkdf2',
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'Slow for the site means slow for the thief: she must run every round for every guess.',
    act: 'Predict who survives a year.',
    say: { block: 'thief', text: 'Every round' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'race',
    focus: 'race',
    visibleControls: ['p1', 'race'],
    narration: 'Your pick is locked.',
    act: `Slide to ${TOP_NAME} rounds, then play to a year.`,
    predicate: s => s.form === 'pbkdf2' && s.work === TOP && s.tick >= LAST,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'live', 'fact', 'quiz'],
    narration: `The ${listed.length} leaked-list accounts still fell in the first second. Slow hashing buys time against guessing, never against a known password.`,
    act: 'One question to finish.',
    say: { block: 'cabinet', text: `${END.length} still fell` },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'How many guesses does a password on the list take?',
  },
];

export function sceneOf(s: Pick<S, 'form' | 'work' | 'tick' | 'p1'>): Omit<CloakOpts, 'scale' | 'say'> {
  if (s.form !== 'pbkdf2' || s.p1 === null)
    return {
      drawers: drawersOf(s.form),
      table: s.form === 'pbkdf2' ? `PBKDF2 ${s.work.toLocaleString('en-GB')}` : 'SALTED SHA-256',
      tableShort: s.form === 'pbkdf2' ? 'PBKDF2' : 'SALTED',
      desk: 'LARKSPUR',
    };
  return { ...raceScene(s.form, s.work, s.tick), desk: 'LARKSPUR' };
}

/** PBKDF2 run in this browser at the chosen work factor, for one demo account. */
function LivePbkdf2({ work }: { work: number }) {
  const out = useAsync(() => pbkdf2(DEMO.password, DEMO.salt, work), String(work));
  return (
    <div role="status" data-pbkdf2={out ?? ''}>
      {out === undefined ? (
        <p className="ek-line">Running PBKDF2 here…</p>
      ) : out === null ? (
        <p className="ek-line">This browser can’t run PBKDF2 here.</p>
      ) : (
        <Hex label={`PBKDF2 at ${work.toLocaleString('en-GB')} rounds, run here for a demo account:`} value={out} />
      )}
      <p className="note ek-note">Use a vetted library for this, never your own.</p>
    </div>
  );
}

export default function SlowOnPurpose() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ form: 'salted', work: WORK[0], tick: 0, p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => (
        <LoginsStage
          say={say}
          show={{
            scene: sceneOf(state),
            caption: state.p1 === null ? 'Demo accounts in the table.' : raceSaid(state),
          }}
        />
      )}
      controls={{
        race: ({ state, sync }) => (
          <RaceControls race={state} forms={['salted', 'pbkdf2']} onChange={r => sync({ ...state, ...r })} />
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        live: ({ state }) => <LivePbkdf2 work={state.work} />,
        fact: () => (
          <>
            <Fact id="gpu-pbkdf2" />
            <Fact id="owasp-pbkdf2" />
            <Fact id="nist-blocklist" />
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
