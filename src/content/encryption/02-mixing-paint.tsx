// Chapter 2: mixing paint, Diffie–Hellman. The reader picks a secret colour (KTD15: one native radio group), mixes it
// into the public base, predicts whether the eavesdropper can make the final colour, swaps the pots and adds the
// secret again. Every pot's pill carries its toy-size number; both ends reach the same shared number.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import {
  DH_STAGES,
  PAINT_PARTS,
  paintAt,
  secretOf,
  type DhStage,
  type Pigment,
} from '../../components/scenes/paintScene';
import { DH, TOY, publicOf, sharedOf } from '../../lib/encryption/toy';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { EncryptionStage, Fact, SECRETS, SecretPicker } from './kit';

const MODULE = 'encryption',
  ID = '02-mixing-paint';
export const PARTS = PAINT_PARTS;
const B = publicOf(TOY.dh.supplier.secret);

export const P1 = {
  question:
    'Each side will add its own secret to the pot it receives. Can the eavesdropper, who saw both mixed pots, make the final colour?',
  options: [
    'No: she would have to unmix a pot first',
    'Yes: she saw every pot that crossed',
    'Yes, by mixing the two pots she saw',
  ],
};
/** her two pots mixed hold the base twice: a different colour, and a different number */
export const OUTCOME = 0;

export const QUIZ = {
  question: 'Real Diffie–Hellman uses huge numbers, not paint. What plays the part of “unmixing”?',
  options: [
    'Working a secret back out of a public number',
    'Reading the public numbers off the line',
    'Guessing the base number',
  ],
  correct: 0,
  explanation: 'Mixing forward is quick; working a secret back out of a public number is what takes too long.',
  why: [
    'Right: at real sizes, getting the secret back out of a public number would take longer than anyone can wait.',
    'Anyone may read the public numbers; that is why they are called public.',
    'The base is public from the start, so there is nothing to guess.',
  ],
};

interface S {
  secret: Pigment | null;
  stage: DhStage;
  p1: number | null;
  quiz: number | null;
}
const at = (s: S, stage: DhStage) => DH_STAGES.indexOf(s.stage) >= DH_STAGES.indexOf(stage);

export const STEPS: Step<S>[] = [
  {
    id: 'pick',
    focus: 'secret',
    visibleControls: ['secret'],
    narration: 'Diffie–Hellman works like paint. The base pot is public; each side keeps one secret colour.',
    act: 'Pick your secret colour.',
    say: { block: 'counter', text: 'Public base' },
    predicate: s => s.secret !== null,
  },
  {
    id: 'mix',
    focus: 'mix',
    visibleControls: ['secret', 'mix'],
    narration: 'Your secret stays at your end. Mixed into the base, it makes your public number, shown in toy size.',
    act: 'Mix your pot.',
    say: { block: 'us', text: 'Your secret' },
    predicate: s => at(s, 'mixed'),
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'Both mixed pots must now cross the open middle, in full view.',
    act: 'Predict whether she can make the final colour.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'swap',
    focus: 'swap',
    visibleControls: ['p1', 'swap'],
    narration: 'Your pick is locked. She will see the base and both mixed pots.',
    act: 'Swap the pots.',
    say: { block: 'counter', text: 'Both cross' },
    predicate: s => at(s, 'swapped'),
  },
  {
    id: 'final',
    focus: 'final',
    visibleControls: ['final'],
    narration: 'Each side adds its own secret to the pot it got.',
    act: 'Add your secret.',
    say: { block: 'eve', text: 'Sees all three' },
    predicate: s => at(s, 'final'),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'numbers', 'fact', 'quiz'],
    narration:
      'Both ends hold one colour: the shared secret. Her two pots mixed hold the base twice, so hers is wrong.',
    act: 'One question to finish.',
    say: { block: 'them', text: 'Same colour' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What can’t she do with a pot she sees?',
  },
];

/** The toy maths behind the pots, for the reader's secret. */
function Numbers({ secret }: { secret: Pigment }) {
  const a = secretOf(secret),
    A = publicOf(a),
    s = sharedOf(B, a);
  return (
    <ul className="ek-checks">
      <li>{`Toy size: base ${DH.g}; after each power, keep the remainder after dividing by ${DH.p}.`}</li>
      <li>{`Your public number: ${DH.g} to the power ${a} → ${A}.`}</li>
      <li>{`Theirs to your power: ${B}^${a} → ${s}. Yours to theirs: ${A}^${TOY.dh.supplier.secret} → ${sharedOf(A, TOY.dh.supplier.secret)}.`}</li>
    </ul>
  );
}

export default function MixingPaint() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ secret: null, stage: 'start', p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => {
        const scene = paintAt(state.secret ?? SECRETS[0], state.stage);
        return (
          <EncryptionStage
            say={say}
            show={{
              scene: state.secret ? scene : { ...scene, us: [] },
              caption:
                state.stage === 'final'
                  ? `Both ends: shared secret ${sharedOf(B, secretOf(state.secret ?? SECRETS[0]))}.`
                  : 'Pots mix evenly: order never matters.',
              toy: true,
            }}
          />
        );
      }}
      controls={{
        secret: ({ state, apply, sync, focused }) => (
          <SecretPicker value={state.secret} onPick={p => (focused ? apply : sync)({ ...state, secret: p })} />
        ),
        mix: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, stage: 'mixed' })}>
            Mix your pot
          </button>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        swap: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, stage: 'swapped' })}>
            Swap the pots
          </button>
        ),
        final: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, stage: 'final' })}>
            Add your secret
          </button>
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        numbers: ({ state }) => <Numbers secret={state.secret ?? SECRETS[0]} />,
        fact: () => (
          <>
            <Fact id="dh" />
            <Fact id="x25519" />
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
