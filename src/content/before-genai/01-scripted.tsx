// Chapter 1: the bot that followed a script. The kiosk answers "Where is my order?" by its keyword; the reader predicts
// what it does with the same question in other words (it falls back), then adds one word of that message to the
// tracking rule. Every word in WINNERS is accepted (KTD7); any other word takes over a message another rule answered,
// and the chapter names which.
import StepRunner from '../../components/story/StepRunner';
import Select from '../../components/story/Select';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import { KIOSK_PARTS } from '../../components/scenes/kioskScene';
import {
  CANDIDATES,
  MISSED,
  MISSED_RULE,
  messageOf,
  RULES,
  run,
  stolen,
  WINNERS,
  withWord,
} from '../../lib/before-genai/bots';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { BeforeGenaiStage, Fact, Transcript } from './kit';

const MODULE = 'before-genai',
  ID = '01-scripted';
export const PARTS = KIOSK_PARTS;
const FIRST = run(messageOf('where-order')),
  MISS = run(messageOf(MISSED)),
  KEYWORD = RULES.find(r => r.id === MISSED_RULE)!.keywords[0];

export interface S {
  p1: number | null;
  revealed: boolean;
  word: string;
  quiz: number | null;
}
export const INITIAL: S = { p1: null, revealed: false, word: '', quiz: null };

export const P1 = {
  question: `“${MISS.message.text}” What does the script do?`,
  options: ['It answers with the tracking card', 'It falls back'],
};
export const OUTCOME = MISS.scripted.answered ? 0 : 1;

/** a question none of the script's keywords covers */
export const QUIZ_MSG = 'Has my drill shipped?';
export const QUIZ = {
  question: `A customer writes “${QUIZ_MSG}” No rule has those words. What does the kiosk do?`,
  options: ['It raises its fallback card', 'It guesses the closest rule', 'It writes a new reply'],
  correct: 0,
  explanation: 'A script answers only what someone wrote a rule for; anything else gets the fallback card.',
  why: [
    'Right: with no keyword in the message, no rule fires, so the fallback card is all it has.',
    'A script never guesses; a rule fires only when its keyword is in the message.',
    'Every reply is a card someone wrote ahead, and the kiosk can only raise one.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['first', 'p1'],
    narration: `The script spotted the keyword “${KEYWORD}” and raised its tracking card. Now someone rephrases it.`,
    act: 'Predict: does the script answer?',
    say: { block: 'cards', text: 'Reply cards' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['p1', 'reveal'],
    narration: 'Your pick is locked. The kiosk checks each rule’s keywords against the message, in order.',
    act: 'Send the message.',
    predicate: s => s.revealed,
  },
  {
    id: 'fix',
    focus: 'fix',
    visibleControls: ['out1', 'missed', 'eliza', 'fix'],
    narration: 'No keyword matched, so the kiosk raised its fallback card.',
    act: 'Add a word from the message to the tracking rule.',
    say: { block: 'cards', text: 'Add a keyword' },
    predicate: s => WINNERS.includes(s.word),
    hint: 'Pick a word only this message uses.',
    solution: s => ({ ...s, word: WINNERS[0] }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['missed', 'fix', 'quiz'],
    narration:
      'Fixed, for this wording. Every new wording needs another hand-written rule, and each new keyword can clash with the rest.',
    act: 'One question to finish.',
    say: { block: 'kiosk', text: 'Answered' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Can a script raise a card no rule points to?',
  },
];

/** what the kiosk shows: the first message until the reveal, then the missed one; once a word is added, the message
 * it takes over from another rule, if any, else the missed one answered */
function runOf(s: S) {
  if (!s.revealed) return FIRST;
  if (!s.word) return MISS;
  return run(stolen(s.word) ?? MISS.message, withWord(s.word));
}

/** The picked word's effect, in words: it answers the message, or which message it would take over. */
function Picked({ word }: { word: string }) {
  if (!word) return null;
  const took = stolen(word);
  return (
    <p className="note" role="status">
      {took
        ? `“${word}” is in “${took.text}” too: that message would get the tracking card instead of its own.`
        : `“${word}” is only in this message: the tracking rule now answers it, and every other message keeps its card.`}
    </p>
  );
}

export default function Scripted() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={INITIAL}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => {
        const r = runOf(state);
        return (
          <BeforeGenaiStage
            run={r}
            say={say}
            caption={
              r.message !== MISS.message && r !== FIRST
                ? `Wrong card: “${r.message.text}” now gets the tracking reply.`
                : r.scripted.answered
                  ? `The script answered “${r.message.text}”`
                  : `The script fell back on “${r.message.text}”`
            }
          />
        );
      }}
      controls={{
        first: () => <Transcript run={FIRST} bots={['script']} />,
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        reveal: ({ state, apply }) => (
          <Reveal
            prediction={state.p1 === null ? null : P1.options[state.p1]}
            outcome={P1.options[OUTCOME]}
            revealed={state.revealed}
            onReveal={() => apply({ ...state, revealed: true })}
            label="Send it"
          />
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        missed: ({ state }) => <Transcript run={runOf(state)} bots={['script']} />,
        eliza: () => (
          <>
            <Fact id="eliza" />
            <Fact id="eliza-no-keyword" />
          </>
        ),
        fix: ({ state, apply, focused }) => (
          <>
            <p>
              <label>
                Keyword to add to the tracking rule:{' '}
                <Select
                  value={state.word}
                  disabled={!focused}
                  onChange={e => apply({ ...state, word: e.target.value })}
                >
                  <option value="">Choose a word</option>
                  {CANDIDATES.map(w => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </Select>
              </label>
            </p>
            <Picked word={state.word} />
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
