// Chapter 1: a shared secret. The reader predicts what the eavesdropper can read when the key travels with the crate,
// locks the order with real AES-GCM (a demo key), watches only noise cross, then sends the key and sees it copied.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { PAINT_PARTS, type PaintOpts } from '../../components/scenes/paintScene';
import { ORDER, SUPPLIER } from '../../lib/encryption/story';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { CipherLine, DemoNote, EncryptionStage, Fact } from './kit';

const MODULE = 'encryption',
  ID = '01-a-shared-secret';
export const PARTS = PAINT_PARTS;

export const P1 = {
  question: 'Larkspur locks the order and sends the key across with it. What can the eavesdropper read?',
  options: ['The whole order: the key crossed too', 'Nothing: the crate is locked', 'Only the order number'],
};
/** she copies the key as it crosses, so she reads everything */
export const OUTCOME = 0;

export const QUIZ = {
  question: 'Larkspur phones the supplier to read out the key, and the eavesdropper taps the phone. Is the order safe?',
  options: [
    'No: whoever hears the key can open the crate',
    'Yes: the key went by phone, not with the crate',
    'Yes, as long as the key is long enough',
  ],
  correct: 0,
  explanation: 'A shared key is only as safe as the way it travels.',
  why: [
    'Right: any route the key takes is a route an eavesdropper can watch.',
    'A different line is still a line; she listened to that one too.',
    'Length stops guessing, not copying: a copied key opens the crate at any length.',
  ],
};

interface S {
  locked: boolean;
  sent: boolean;
  p1: number | null;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration:
      'Encryption turns the order into noise that only a key turns back. Whatever crosses the counter, the eavesdropper sees.',
    act: 'Predict what she can read.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'lock',
    focus: 'lock',
    visibleControls: ['p1', 'lock'],
    narration: 'Your pick is locked. Lock the order with a real AES key, a demo one made for this site.',
    act: 'Lock the order.',
    say: { block: 'us', text: 'Your order' },
    predicate: s => s.locked,
  },
  {
    id: 'send',
    focus: 'send',
    visibleControls: ['cipher', 'send'],
    narration: `The ciphertext is noise: she copies it but can’t read it. Nor can ${SUPPLIER.short}, without the key.`,
    act: 'Send the key across too.',
    say: { block: 'counter', text: 'Only noise' },
    predicate: s => s.sent,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'fact', 'quiz'],
    narration: 'She copied the key as it crossed and opened the crate. A shared key works only if it arrives unseen.',
    act: 'One question to finish.',
    say: { block: 'eve', text: 'Has the key' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Could she hear the phone?',
  },
];

/** The counter: the order at Larkspur's end, then locked and crossing, then the key crossing after it. */
export function sceneOf(s: Pick<S, 'locked' | 'sent'>): Omit<PaintOpts, 'scale' | 'say' | 'names'> {
  const crate = { kind: 'box' as const, owner: 'us' as const };
  if (!s.locked) return { us: [{ ...crate, label: 'ORDER' }], counter: [], them: [], eve: '' };
  const key = { kind: 'key' as const, label: 'KEY', owner: 'us' as const };
  const locked = { ...crate, label: 'LOCKED ORDER', short: 'LOCKED', locked: true };
  if (!s.sent) return { us: [key], counter: [{ ...locked, lit: true, fresh: true }], them: [], eve: 'SEES NOISE' };
  return { us: [key], counter: [locked, { ...key, lit: true, fresh: true }], them: [], eve: 'HAS THE KEY' };
}

export default function ASharedSecret() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ locked: false, sent: false, p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => (
        <EncryptionStage
          say={say}
          show={{
            scene: sceneOf(state),
            caption: !state.locked
              ? 'The order, written out at Larkspur’s end.'
              : !state.sent
                ? 'The locked order crosses; she copies the noise.'
                : 'The key crossed too; she copied it.',
          }}
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        lock: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, locked: true })}>
            Lock the order
          </button>
        ),
        cipher: () => (
          <>
            <p className="ek-line">{`The order: “${ORDER}”`}</p>
            <CipherLine text={ORDER} />
            <DemoNote />
          </>
        ),
        send: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, sent: true })}>
            Send the key
          </button>
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        fact: () => <Fact id="aes-gcm" />,
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
