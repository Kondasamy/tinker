// Chapter 3: the open padlock, public-key encryption in toy-size RSA. The supplier's open padlocks sit on the counter;
// the reader predicts who can open a crate once one is shut, snaps it shut on the order number, and opens it at the
// supplier's end with the private key. "Never build your own" is said here, once in the module (R18).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { PAINT_PARTS, type PaintOpts } from '../../components/scenes/paintScene';
import { KEYS, decrypt, encrypt } from '../../lib/encryption/toy';
import { ORDER_NUMBER, SUPPLIER } from '../../lib/encryption/story';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { EncryptionStage, Fact } from './kit';

const MODULE = 'encryption',
  ID = '03-the-open-padlock';
export const PARTS = PAINT_PARTS;
const K = KEYS.supplier,
  SHORT = SUPPLIER.short;
/** the order number in the shut padlock: toy-size RSA */
export const LOCKED = encrypt(ORDER_NUMBER, K);
export const OPENED = decrypt(LOCKED, K);

export const P1 = {
  question: 'Larkspur snaps one of the open padlocks shut on its order. Who can open it now?',
  options: [
    `Only ${SHORT}, with its private key`,
    'Anyone who picked up a padlock too',
    'Larkspur, since it closed it',
  ],
};
export const OUTCOME = 0;

export const QUIZ = {
  question: 'A customer wants to send Larkspur a secret. What should Larkspur hand out?',
  options: [
    'An open padlock, keeping its key',
    'Its private key, so the customer can lock with it',
    `A copy of ${SHORT}’s padlock`,
  ],
  correct: 0,
  explanation: 'Hand out the public key; the private key never leaves its owner.',
  why: [
    'Right: anyone can close Larkspur’s padlock, and only Larkspur’s private key opens it.',
    'A private key handed out is no longer private: anyone holding it could open everything.',
    `${SHORT}’s padlock opens only for ${SHORT}, so Larkspur could never read the secret.`,
  ],
};

interface S {
  shut: boolean;
  opened: boolean;
  p1: number | null;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `${SHORT} sets open padlocks on the counter: its public key. Anyone may take one.`,
    act: 'Predict who can open one once it’s shut.',
    say: { block: 'counter', text: 'Open padlocks' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'shut',
    focus: 'shut',
    visibleControls: ['p1', 'shut'],
    narration: 'Your pick is locked. In toy-size RSA, shutting it raises the order number to the lock’s power, mod n.',
    act: 'Snap the padlock shut.',
    say: { block: 'us', text: 'Order number' },
    predicate: s => s.shut,
  },
  {
    id: 'open',
    focus: 'open',
    visibleControls: ['maths', 'open'],
    narration: `The crate reads ${LOCKED}: even Larkspur can’t undo it. Only the private key turns it back.`,
    act: `Open it at ${SHORT}’s end.`,
    say: { block: 'them', text: 'Private key' },
    predicate: s => s.opened,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'maths', 'fact', 'quiz'],
    narration: `Back to ${OPENED}. Real keys run to thousands of bits. Never build your own: use well-tested code.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which half of the pair can anyone hold?',
  },
];

/** The toy maths, as far as the reader has gone. */
function Maths({ s }: { s: S }) {
  return (
    <ul className="ek-checks">
      <li>{`Toy size: n = ${K.n}, the lock’s power ${K.e}. A message must be below ${K.n}.`}</li>
      <li>{`Shut: ${ORDER_NUMBER}^${K.e} mod ${K.n} → ${LOCKED}.`}</li>
      {s.opened && <li>{`Opened: ${LOCKED}^${K.d} mod ${K.n} → ${OPENED}, with the private power ${K.d}.`}</li>}
    </ul>
  );
}

export function sceneOf(s: Pick<S, 'shut' | 'opened'>): Omit<PaintOpts, 'scale' | 'say' | 'names'> {
  const key = { kind: 'key' as const, label: `KEY ${K.d}`, short: 'KEY', owner: 'them' as const };
  const lock = { kind: 'lock' as const, label: `PADLOCK ${K.e}`, short: 'PADLOCK', open: true };
  if (!s.shut)
    return { us: [{ kind: 'box', label: `ORDER ${ORDER_NUMBER}`, short: 'ORDER' }], counter: [lock], them: [key] };
  const crate = { kind: 'box' as const, label: `${LOCKED}`, locked: true, owner: 'them' as const };
  if (!s.opened)
    return { us: [], counter: [{ ...crate, lit: true, fresh: true }, lock], them: [key], eve: `SEES ${LOCKED}` };
  return {
    us: [],
    counter: [lock],
    them: [key, { kind: 'box', label: `ORDER ${OPENED}`, short: 'ORDER', lit: true, fresh: true }],
    eve: `SEES ${LOCKED}`,
  };
}

export default function TheOpenPadlock() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ shut: false, opened: false, p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => (
        <EncryptionStage
          say={say}
          show={{
            scene: sceneOf(state),
            caption: !state.shut
              ? `Order ${ORDER_NUMBER} and ${SHORT}’s open padlocks.`
              : !state.opened
                ? `Shut: the crate reads ${LOCKED}.`
                : `Opened at ${SHORT}’s end: ${OPENED}.`,
            toy: true,
          }}
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        shut: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, shut: true })}>
            Snap it shut
          </button>
        ),
        maths: ({ state }) => <Maths s={state} />,
        open: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, opened: true })}>
            Open with the private key
          </button>
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        fact: () => (
          <>
            <Fact id="rsa" />
            <Fact id="key-sizes" />
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
