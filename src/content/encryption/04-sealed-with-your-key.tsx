// Chapter 4: sealed with your key, signatures. The supplier signs its invoice (toy-size RSA, the padlock run
// backwards); the reader predicts what a changed account does to the check, changes it, and watches both the toy check
// and real ECDSA P-256 (a demo key, run in this browser) fail.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { PAINT_PARTS, type PaintOpts } from '../../components/scenes/paintScene';
import { KEYS, sign, verify } from '../../lib/encryption/toy';
import { FORGED, INVOICE, SUPPLIER } from '../../lib/encryption/story';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { DemoNote, EncryptionStage, Fact, VerifyLine } from './kit';

const MODULE = 'encryption',
  ID = '04-sealed-with-your-key';
export const PARTS = PAINT_PARTS;
const K = KEYS.supplier,
  SHORT = SUPPLIER.short;
/** the toy seal on the invoice */
export const SIGNED = sign(INVOICE, K);
export const textOf = (tampered: boolean) => (tampered ? FORGED : INVOICE);
export const checks = (tampered: boolean) => verify(textOf(tampered), SIGNED, K);

export const P1 = {
  question: 'A tamperer swaps the bank account and leaves the seal on. What does Larkspur’s check say?',
  options: [
    'It fails: the seal no longer matches',
    'It passes: the seal is still there',
    `It can’t tell without phoning ${SHORT}`,
  ],
};
/** the seal was made over the old text, so the check fails */
export const outcomeOf = () => (checks(true) ? 1 : 0);

export const QUIZ = {
  question: 'A shop’s software update arrives signed. Someone slips one extra line into it. What happens at install?',
  options: [
    'The check fails and the update is refused',
    'It installs: one line is too small to notice',
    'It installs, since the signature is still attached',
  ],
  correct: 0,
  explanation: 'A signature covers every byte; change one and the check fails.',
  why: [
    'Right: the signature was made over the old bytes, so the changed update no longer matches it.',
    'There is no small enough change: one byte is enough to fail the check.',
    'A signature still attached proves nothing; what counts is whether it matches the bytes.',
  ],
};

interface S {
  signed: boolean;
  tampered: boolean;
  p1: number | null;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'sign',
    focus: 'sign',
    visibleControls: ['invoice', 'sign'],
    narration:
      'A signature runs the padlock backwards: only the private key makes it, anyone checks it with the public key.',
    act: 'Sign the invoice.',
    say: { block: 'them', text: 'The invoice' },
    predicate: s => s.signed,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `In toy size, the seal reads ${SIGNED}. A tamperer on the line wants the payment.`,
    act: 'Predict what changing the account does.',
    say: { block: 'counter', text: 'Sealed' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'tamper',
    focus: 'tamper',
    visibleControls: ['p1', 'tamper'],
    narration: 'Your pick is locked. She can change the words, but she can’t make a new seal without the private key.',
    act: 'Change the account number.',
    predicate: s => s.tampered,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'verify', 'fact', 'quiz'],
    narration: 'Larkspur can verify: the toy check fails, and so does real ECDSA with a demo key, run here.',
    act: 'One question to finish.',
    say: { block: 'us', text: 'Check fails' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What was the signature made over?',
  },
];

export function sceneOf(s: Pick<S, 'signed' | 'tampered'>): Omit<PaintOpts, 'scale' | 'say' | 'names'> {
  const lock = { kind: 'lock' as const, label: `PADLOCK ${K.e}`, short: 'PADLOCK', open: true };
  if (!s.signed) return { us: [lock], counter: [], them: [{ kind: 'card', label: 'INVOICE' }] };
  const card = {
    kind: 'card' as const,
    label: s.tampered ? `CHANGED · SEAL ${SIGNED}` : `INVOICE · SEAL ${SIGNED}`,
    short: s.tampered ? 'CHANGED' : 'SEALED',
    sealed: !s.tampered,
    broken: s.tampered,
    lit: true,
    fresh: !s.tampered,
  };
  return { us: [lock], counter: [card], them: [], eve: s.tampered ? 'CHANGED IT' : '' };
}

export default function SealedWithYourKey() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ signed: false, tampered: false, p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => (
        <EncryptionStage
          say={say}
          show={{
            scene: sceneOf(state),
            caption: !state.signed
              ? `${SHORT}’s invoice, not yet sealed.`
              : `Seal ${SIGNED}: the toy check ${checks(state.tampered) ? 'passes' : 'fails'}.`,
            toy: true,
          }}
        />
      )}
      controls={{
        invoice: () => <p className="ek-line">{`“${INVOICE}”`}</p>,
        sign: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, signed: true })}>
            Sign the invoice
          </button>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        tamper: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, tampered: true })}>
            Change the account
          </button>
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        verify: ({ state }) => (
          <>
            <p className="ek-line">{`“${textOf(state.tampered)}”`}</p>
            <VerifyLine text={textOf(state.tampered)} />
            <DemoNote />
          </>
        ),
        fact: () => <Fact id="ecdsa" />,
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
