// Chapter 2: a hidden pattern. Larkspur mini's pinned marked reply (pinned.json reply, seed 1) on the light table; the
// reader sweeps the UV lamp along it, predicts the green share, lights the whole page and reads the checker's count.
// Green and red come from the previous token and the key alone (greenlist.ts), which the quiz turns on.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { UV_PARTS, WINDOW } from '../../components/scenes/uvScene';
import { CTX, MARK } from '../../lib/watermarks/story';
import { Outcome } from '../tool-calling/kit';
import { Fact, PIN, REPLY_IDS, UvStage, type Lamp } from './kit';

const MODULE = 'watermarks',
  ID = '02-a-hidden-pattern';
export const PARTS = UV_PARTS;
const pct = (x: number) => `${Math.round(x * 100)}%`;
const SHARE = PIN.reply.green / PIN.reply.pairs;

export interface S {
  lamp: Lamp;
  p1: number | null;
  quiz: number | null;
}

export const P1 = {
  question: `By chance, ${pct(MARK.gamma)} of tokens would be green. In this reply, what share do you expect?`,
  options: [`About ${pct(MARK.gamma)}, as chance gives`, `Well over ${pct(MARK.gamma)}`, 'Every one of them'],
};
/** Most pairs are green, but not all. */
export const OUTCOME = SHARE > MARK.gamma + 0.1 && SHARE < 1 ? 1 : SHARE >= 1 ? 2 : 0;

export const QUIZ = {
  question:
    'A rival copies a marked Larkspur reply word for word, but has no key. Can they tell which tokens are green?',
  options: [
    'No: the key decides green after each token',
    'Yes: green tokens are the common words',
    'Yes: green tokens are the longer words',
  ],
  correct: 0,
  explanation: 'Green depends on the token before and a secret key; without the key every token looks the same.',
  why: [
    'Right: the green list after each token is picked by the key, so without it nothing marks green from red.',
    'Common and rare words land green or red alike; the split is random, seeded by the key.',
    'Length plays no part; the key picks a random half of all tokens after each one.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'sweep',
    focus: 'lamp',
    visibleControls: [],
    narration: 'Larkspur mini wrote this reply with the mark on. Under the UV lamp, each token shows green or red.',
    act: `Drag Lamp past token ${WINDOW}.`,
    say: { block: 'lamp', text: 'UV lamp' },
    predicate: s => typeof s.lamp === 'number' && s.lamp >= WINDOW,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `A token’s colour depends on the token before it. The key picks a green list of ${pct(MARK.gamma)} of all tokens after each one.`,
    act: 'Predict first.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'all',
    focus: 'lamp',
    visibleControls: [],
    narration: 'Your pick is locked. Now see the whole reply at once.',
    act: 'Press Light all.',
    say: { block: 'page', text: 'Count them' },
    predicate: s => s.lamp === 'all',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'note', 'quiz'],
    narration: `${PIN.reply.green} of ${PIN.reply.pairs} pairs are green: before each pick, the writer boosted green tokens.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What decides the green list after each token?',
  },
];

export default function AHiddenPattern() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ lamp: 0, p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say, apply, sync, focus }) => (
        <UvStage
          say={say}
          ids={REPLY_IDS}
          lamp={state.lamp}
          // moving the lamp is the step's act only while it is the focus; otherwise it is free play
          onLamp={lamp => (focus === 'lamp' ? apply : sync)({ ...state, lamp })}
          caption={`Larkspur mini’s marked reply, ${REPLY_IDS.length} tokens: it reads only its last ${CTX}.`}
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        note: () => (
          <>
            <p className="note">
              {`Larkspur mini is tiny and writes poor text. It is unsure at almost every token, so the boost tips many picks and the pattern is easy to see: the lesson is the mechanism. ${pct(SHARE)} of pairs are green. `}
              <a href="/transformers/05-choosing-the-next-token/">Picking each token is Transformers’ chapter 5.</a>
            </p>
            <Fact id="green-list" />
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
