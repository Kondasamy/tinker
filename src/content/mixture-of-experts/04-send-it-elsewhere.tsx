// Chapter 4: send it elsewhere. The reader overrides the doorman (KTD15): for the last token, eight checkboxes, at most
// two rooms, applied on every floor, and the guess reruns live. Any pair that changes the guess passes; Show me sends
// it to the pinned pair. "Use router" puts the doorman back.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { encode } from '../../lib/lm/bpe';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { promptOf, quote, roomName, type Override } from '../../lib/mixture-of-experts/routes';
import { ROOMS_PARTS } from '../../components/scenes/officeRoomsScene';
import pinned from '../../../data/mixture-of-experts/pinned.json' with { type: 'json' };
import { Outcome } from '../tool-calling/kit';
import { RoomsStage, ToyNote } from './kit';

const MODULE = 'mixture-of-experts',
  ID = '04-send-it-elsewhere';
export const PARTS = ROOMS_PARTS;
const O = pinned.override;
export const PROMPT = promptOf(O.prompt);
export const LAST = PROMPT.ids.length - 1;
/** the last token's index in the strip */
export const LAST_SHOWN = Math.min(8, PROMPT.ids.length) - 1;
/** the doorman's guess and the pinned override's (the engine test reruns both) */
export const BEFORE = encode(O.before)[0],
  AFTER = encode(O.after)[0];
export const PINNED_ROOMS = O.experts;
const WORD = quote(PROMPT.ids[LAST]);

export interface S {
  sel: number | null;
  p1: number | null;
  override: Override;
  guess: number | null;
  quiz: number | null;
}
const forced = (s: S) => s.override[LAST]?.length ?? 0;

export const P1 = {
  question: `What happens to the guess if ${WORD} goes to two other rooms?`,
  options: [
    'It can change: the rooms do the work',
    'It stays: any room does the same work',
    'Nothing runs: only the doorman’s rooms can',
  ],
};

export const QUIZ = {
  question: 'A support bot’s experts model sends one word to the wrong experts. What happens?',
  options: [
    'The answer around that word can get worse',
    'Nothing: every expert knows everything',
    'The model stops with an error',
  ],
  correct: 0,
  explanation: 'Experts learn different jobs, so the wrong ones do the wrong work and the next guess can slip.',
  why: [
    'Right: each expert learned its own share of the work, so the wrong ones give a worse result.',
    'Experts are trained on different tokens and learn different things; they are not copies.',
    'Any expert can run on any token; it just does work that doesn’t fit, without an error.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'pick',
    focus: 'stage',
    visibleControls: [],
    narration: `Larkspur’s toy reads “${PROMPT.text}” and its guess for the next token lights the booth.`,
    act: `Pick ${WORD} in the strip.`,
    say: { block: 'guess', text: 'The guess' },
    predicate: s => s.sel === LAST_SHOWN,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `The doormen sent ${WORD} to two rooms on each floor. You can send it to others.`,
    act: 'Predict first.',
    say: { block: 'doorman', text: 'Their pick' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'override',
    focus: 'stage',
    visibleControls: ['p1'],
    narration: 'Your pick is locked. An override sends the token to the rooms you check, on every floor.',
    act: 'Check two rooms that change the guess.',
    say: { block: 'rooms', text: 'Your rooms' },
    predicate: s => forced(s) === 2 && s.guess !== null && s.guess !== BEFORE,
    hint: `Try rooms the doorman didn’t pick, such as ${PINNED_ROOMS.map(roomName).join(' and ')}.`,
    solution: s => ({ ...s, sel: LAST_SHOWN, override: { [LAST]: PINNED_ROOMS }, guess: AFTER }),
  },
  {
    id: 'reveal',
    focus: 'stage',
    visibleControls: ['out1'],
    narration: 'The guess moved: the rooms hold the work; the doorman only picks. Wrong rooms, worse guess.',
    act: 'Press Use router.',
    predicate: s => forced(s) === 0,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: `Back with the doorman’s rooms, the guess is ${quote(BEFORE)} again.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Are the experts copies of each other?',
  },
];

export default function SendItElsewhere() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ sel: null, p1: null, override: {}, guess: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, focus, say }) => {
        const set = focus === 'stage' ? apply : sync;
        return (
          <RoomsStage
            say={say}
            ids={PROMPT.ids}
            sel={state.sel}
            override={state.override}
            onPick={i => set({ ...state, sel: i })}
            onOverride={state.p1 === null ? undefined : (override, guess) => set({ ...state, override, guess })}
            caption={live =>
              live
                ? `“${PROMPT.text}” → guess ${quote(live.pass.top[0].tok)}${forced(state) ? ', with your rooms' : ', with the doorman’s rooms'}.`
                : `“${PROMPT.text}”`
            }
          />
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={0} />,
        quiz: ({ state, apply, sync }) => (
          <>
            <ToyNote />
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
