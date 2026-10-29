// Chapter 4: counting green. The checker needs only the key: it re-reads the text, counts green pairs once each and
// scores a z against chance (detect.ts). The reader opens the Strip tab's meter, predicts how much text the call needs,
// cuts the reply to its first few tokens (PREFIXES, pinned in pinned.json counting) and grows it back until it reads
// marked, then checks the forwarded email, which scores like any unmarked text.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { ListRange } from '../../components/story/ListRange';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { UV_PARTS } from '../../components/scenes/uvScene';
import { LINE, MIN_PAIRS, type Check } from '../../lib/watermarks/detect';
import { CUSTOMER, FORWARDED, HUMAN, LOWER_LINE, MACHINE, PREFIXES } from '../../lib/watermarks/story';
import { Outcome } from '../tool-calling/kit';
import { Fact, PIN, REPLY_IDS, signed, UvStage, zText, type View } from './kit';

const MODULE = 'watermarks',
  ID = '04-counting-green';
export const PARTS = UV_PARTS;
const prefix = (n: number) => PIN.counting.prefixes.find(p => p.tokens === n)!;
/** The fewest tokens the checker calls marked. */
export const FIRST_MARKED = PIN.counting.prefixes.find(p => p.verdict === 'marked')!.tokens;
const FWD = PIN.counting.forwarded as Check;
/** The highest score any hand-written reply gets. */
export const HUMAN_MAX = Math.max(...PIN.human.zs);
const SHORT = PREFIXES[0];

export interface S {
  tokens: number;
  view: View;
  p1: number | null;
  quiz: number | null;
}

export const P1 = {
  question: 'How many of the reply’s tokens does the checker need to call it marked?',
  options: [`${PREFIXES[1]} or fewer`, `${PREFIXES[2]} to ${PREFIXES[3]}`, `${PREFIXES[4]} or more`],
};
export const OUTCOME = FIRST_MARKED <= PREFIXES[1] ? 0 : FIRST_MARKED <= PREFIXES[3] ? 1 : 2;

export const QUIZ = {
  question: 'Larkspur’s checker reads an email and says unsure. What does that tell you?',
  options: [
    'Only that Larkspur’s mark isn’t in it',
    'That a person wrote it',
    'That a model wrote it and hid the mark',
  ],
  correct: 0,
  explanation: 'The checker can prove its own mark is there; with no mark, who wrote the text stays unknown.',
  why: [
    'Right: the checker looks for one pattern, and an unsure score only says that pattern is missing.',
    'Any other model, or a person, leaves no mark, so the score can’t tell them apart.',
    'An unsure score fits any unmarked text; it is no evidence of a mark removed.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'meter',
    focus: 'view',
    visibleControls: [],
    narration:
      'The checker counts green pairs and compares with chance. How far above chance, in standard deviations, is the z-score.',
    act: 'Open the Strip tab.',
    say: { block: 'page', text: 'Green pairs' },
    predicate: s => s.view === 'strip',
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `The whole reply scores z ${signed(PIN.reply.z)}, past the line at ${LINE}. Now cut it short.`,
    act: 'Predict first.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'short',
    focus: 'tokens',
    visibleControls: ['tokens'],
    narration: 'Your pick is locked. The checker now reads only the first tokens of the reply.',
    act: `Drag Tokens down to ${SHORT}.`,
    say: { block: 'page', text: 'Cut short' },
    predicate: s => s.tokens === SHORT,
  },
  {
    id: 'grow',
    focus: 'tokens',
    visibleControls: ['tokens'],
    narration: `${SHORT} tokens: too short to say. Below ${MIN_PAIRS} pairs, chance alone can look like a mark.`,
    act: 'Drag Tokens up until the meter reads marked.',
    predicate: s => prefix(s.tokens).verdict === 'marked',
  },
  {
    id: 'email',
    focus: 'quiz',
    visibleControls: ['out1', 'email', 'quiz'],
    narration: `${CUSTOMER.name}’s email scores z ${signed(FWD.z!)}: no mark. Hand-written replies stay under ${signed(HUMAN_MAX)}: the line at ${LINE} raises no false alarm.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which pattern is the checker looking for, and who else could have written the email?',
  },
];

function Email() {
  return (
    <>
      <article className="wm-reply wm-email" aria-label="The forwarded email">
        <p className="note">{`From ${FORWARDED.from} · ${FORWARDED.subject}`}</p>
        <p>{FORWARDED.body}</p>
        <p>
          <strong>{zText(FWD)}</strong>
        </p>
      </article>
      <p className="note">
        {`At a lower line of ${LOWER_LINE}, ${PIN.human.atLowerLine} of ${HUMAN.length} hand-written replies would be flagged. ${PIN.machine.atLine === 0 ? 'None' : PIN.machine.atLine} of the large model’s ${MACHINE.length} recorded replies reads marked either: no key, no mark.`}
      </p>
      <Fact id="z-line" />
      <Fact id="short-text" />
    </>
  );
}

export default function CountingGreen() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ tokens: REPLY_IDS.length, view: 'scene', p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say, apply, sync, focus }) => (
        <UvStage
          say={say}
          ids={REPLY_IDS.slice(0, state.tokens)}
          lamp="all"
          view={state.view}
          onView={view => (focus === 'view' ? apply : sync)({ ...state, view })}
          caption={`The first ${state.tokens} tokens of the marked reply: ${zText(prefix(state.tokens) as Check)}`}
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        tokens: ({ state, apply, sync, focused }) => (
          <ListRange
            className="wm-range"
            label="Tokens"
            list={PREFIXES}
            value={state.tokens}
            words={n => `the first ${n} tokens`}
            onChange={tokens => (focused ? apply : sync)({ ...state, tokens })}
          />
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        email: () => <Email />,
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
