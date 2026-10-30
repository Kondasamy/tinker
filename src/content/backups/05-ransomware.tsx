// Chapter 5: ransomware. Copies go to the server room's cabinet and over the network to the warehouse. The reader
// predicts whether the warehouse copy survives an attacker on the network, strikes Ransomware and sees every reachable
// copy padlocked, then adds the courier's lockbox: offline, it survives, a few hours older. Locks and keys and
// Replication are one link away.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { ASSUMPTIONS, STRIKES, policyOf, restore, weekOf } from '../../lib/backups/sim';
import { SAFE_PARTS } from '../../components/scenes/safeScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { BackupsStage, Fact, SimNote, StrikeBar, Toggle, type Struck } from './kit';

const MODULE = 'backups',
  ID = '05-ransomware';
export const PARTS = SAFE_PARTS;
export const STRIKE = STRIKES.ransom;
export const COURIER = `${String(ASSUMPTIONS.courierHour).padStart(2, '0')}:00`;
export const weekFor = (lockbox: boolean) => weekOf(policyOf({ every: 6, warehouse: true, lockbox }));

export const P1 = {
  question: 'Ransomware is loose on Larkspur’s network. Does the warehouse copy survive?',
  options: ['No: the network reaches it too', 'Yes: it is in another building', 'Only its oldest copies survive'],
};
export const outcomeOf = (hour = STRIKE.hour) =>
  restore(weekFor(false), { kind: 'ransomware', hour }).hit.includes('warehouse') ? 0 : 1;

export const QUIZ = {
  question: 'Attackers are inside a firm’s network. Which of its backups is safest?',
  options: [
    'A drive unplugged and locked in a safe',
    'A cloud folder that syncs every minute',
    'A second server in the next rack',
  ],
  correct: 0,
  explanation: 'Whatever the network can reach, an attacker on it can reach; an offline copy is out of reach.',
  why: [
    'Right: nothing on the network can touch an unplugged drive.',
    'A folder that syncs every minute syncs the encrypted files too.',
    'The next rack is on the same network, a step away for the attacker.',
  ],
};

interface S extends Struck {
  lockbox: boolean;
  p1: number | null;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'Ransomware encrypts every file it can reach over the network, then asks for money.',
    act: 'Predict: does the warehouse copy survive?',
    say: { block: 'warehouse', text: 'On the network' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'strike',
    focus: 'stage',
    visibleControls: ['p1'],
    narration: 'Your pick is locked.',
    act: 'Pick Ransomware and press Strike.',
    predicate: s => s.p1 !== null && s.kind === 'ransomware' && s.struck,
  },
  {
    id: 'lockbox',
    focus: 'lockbox',
    visibleControls: ['out1', 'lockbox'],
    narration: 'It locked the server, the tapes and the warehouse. A copy nothing can reach must be offline.',
    act: 'Add the courier’s lockbox.',
    say: { block: 'lockbox', text: 'Offline' },
    predicate: s => s.lockbox && s.kind === 'ransomware' && s.struck,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['lockbox', 'quiz'],
    narration: `Restored from the lockbox: safe, but only as new as the courier’s ${COURIER} pickup.`,
    act: 'One question to finish.',
    say: { block: 'lockbox', text: 'Restored' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which backup could an attacker on the network not touch?',
  },
];

export default function Ransomware() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ hour: STRIKE.hour, kind: 'fire', struck: false, view: 'scene', lockbox: false, p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, say }) => (
        <BackupsStage
          week={weekFor(state.lockbox)}
          s={state}
          say={say}
          onView={view => sync({ ...state, view })}
          bar={
            <StrikeBar
              s={state}
              kinds={['fire', 'ransomware']}
              onChange={(n, strike) => (strike ? apply : sync)({ ...state, ...n })}
            />
          }
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf(state.hour)} />
            <Fact id="backups-targeted" />
            <p className="note bk-note">
              A live copy kept in step, like a <a href="/consistency/">replica</a>, copies the damage just as fast.
            </p>
          </>
        ),
        lockbox: ({ state, apply }) => (
          <>
            <Toggle
              on={state.lockbox}
              label={`The courier takes a full tape to the lockbox at ${COURIER} daily`}
              onChange={lockbox => apply({ ...state, lockbox })}
            />
            <Fact id="offline" />
            <p className="note bk-note">
              Encrypting the lockbox’s tape keeps a stolen one unreadable: <a href="/encryption/">Locks and keys</a>.
            </p>
          </>
        ),
        quiz: ({ state, apply, sync }) => (
          <>
            <SimNote />
            <Quiz
              {...QUIZ}
              unsure
              value={state.quiz}
              onAnswer={(_, q) => apply({ ...state, quiz: q })}
              onUnsure={() => sync({ ...state, quiz: UNSURE })}
            />
          </>
        ),
      }}
    />
  );
}
