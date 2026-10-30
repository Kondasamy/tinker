// Chapter 3: ask it to finish. Live extraction on the canary model: the reader picks one of the four canary prefixes
// (no free text) and asks; the model's greedy reply shows on the slip. 64 and 16 copies are recited; 4 and 1 come back
// as the 64-copy PIN (pinned in data/memorisation/pinned.json, rerun by the engine test).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { extract } from '../../lib/memorisation/extract';
import { CANARIES, REPEATS, canaryOf, firstName } from '../../lib/memorisation/story';
import PINNED from '../../../data/memorisation/pinned.json' with { type: 'json' };
import { RECITAL_PARTS } from '../../components/scenes/recitalScene';
import { Fact, LoadLine, PrefixPicker, RecitalStage, ToyNote, Waiting, ledgerOf, useModel } from './kit';

const MODULE = 'memorisation',
  ID = '03-ask-it-to-finish';
export const PARTS = RECITAL_PARTS;
type Reply = { text: string; extracted: boolean };
const PIN = PINNED.extract as Record<string, Reply>;
const RECITED = REPEATS.filter(r => PIN[r].extracted),
  MISSED = REPEATS.filter(r => !PIN[r].extracted);
const MOST = canaryOf(Math.max(...REPEATS));

export const P1 = {
  question: 'You ask the model to finish all four lines. Which PINs come back?',
  options: [
    'Only the ones with many copies',
    'All four: each was in the training text',
    'None: four lines among thousands are too few',
  ],
};
/** Recited exactly the most-copied canaries: the outcome the chapter teaches. */
export const OUTCOME =
  RECITED.length === 0 ? 2 : RECITED.length === REPEATS.length ? 1 : Math.min(...RECITED) > Math.max(...MISSED) ? 0 : 1;

/** Whose PIN a reply gives, if any. */
export const whosePin = (text: string) => CANARIES.find(c => text.includes(c.pin));

export const QUIZ = {
  question:
    'A model was trained on a staff list with one manager’s phone number repeated in hundreds of emails. Asked for an intern’s number, what is likely?',
  options: [
    'It gives the manager’s number, the one it saw most',
    'It says it doesn’t know the intern’s number',
    'It gives the intern’s real number, seen once',
  ],
  correct: 0,
  explanation: 'A model fills the slot with what it saw most often in that shape of sentence.',
  why: [
    'Right: the most repeated number is the likeliest answer for any name in that line.',
    'A tiny model has no sense of not knowing; it always gives its likeliest next words.',
    'One copy is rarely enough to be recited, as the 1-copy PIN showed.',
  ],
};

export interface S {
  p1: number | null;
  pick: number | null;
  asked: Record<string, Reply>;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration:
      'An attacker types a prefix, the start of a line; the model finishes it the greedy way, taking its likeliest next piece.',
    act: 'Predict first.',
    say: { block: 'model', text: 'Finishes lines' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'ask',
    focus: 'ask',
    visibleControls: ['p1', 'ask'],
    narration: 'This is extraction, run live on the canary model in your browser.',
    act: 'Ask it to finish all four.',
    say: { block: 'reply', text: 'The reply' },
    predicate: s => REPEATS.every(r => s.asked[r]),
    hint: 'Pick a line, press Ask, then pick the next.',
    solution: s => ({ ...s, pick: MISSED[0] ?? REPEATS[0], asked: { ...PIN } }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out', 'replies', 'quiz'],
    narration: `${RECITED.map(r => firstName(canaryOf(r))).join(' and ')} came back. The others got ${firstName(MOST)}’s PIN: the slot filled with the PIN seen most.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which number did the model see most in that sentence?',
  },
];

const replyWords = (r: number, a: Reply) => {
  const who = whosePin(a.text),
    c = canaryOf(r);
  return `${firstName(c)}: “${a.text.trim()}”${who ? (who === c ? ', their own PIN' : `, ${firstName(who)}’s PIN`) : ''}`;
};

function Ask({ s, set, pick }: { s: S; set: (s: S) => void; pick: (s: S) => void }) {
  const { model, status } = useModel();
  return (
    <>
      <PrefixPicker value={s.pick} onChange={r => pick({ ...s, pick: r })} />
      <div className="mem-actions">
        <button
          type="button"
          className="big"
          disabled={!model || s.pick === null}
          onClick={() => {
            if (!model || s.pick === null) return;
            const e = extract(model, canaryOf(s.pick));
            set({ ...s, asked: { ...s.asked, [s.pick]: { text: e.text, extracted: e.extracted } } });
          }}
        >
          Ask
        </button>
      </div>
      <LoadLine status={status} />
    </>
  );
}

function Replies({ s }: { s: S }) {
  return (
    <>
      <ul className="mem-replies">
        {CANARIES.filter(c => s.asked[c.repeats]).map(c => (
          <li key={c.repeats} data-extracted={s.asked[c.repeats].extracted ? '1' : '0'}>
            {c.repeats} copies · {replyWords(c.repeats, s.asked[c.repeats])}
          </li>
        ))}
      </ul>
      <Fact id="carlini-2021" />
      <p className="mem-note">{`Where the toy stops matching: this tiny model needed ${Math.min(...RECITED)} copies to recite a PIN, while GPT-2, far larger, gave back text from a single document.`}</p>
      <ToyNote />
    </>
  );
}

export default function AskItToFinish() {
  const { status, retry } = useModel();
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, pick: null, asked: {}, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => {
        const a = state.pick === null ? undefined : state.asked[state.pick];
        return (
          <RecitalStage
            say={say}
            repeats={state.pick}
            wait={status === 'ready' ? undefined : <Waiting failed={status === 'error'} retry={retry} />}
            desk={{
              ledger: ledgerOf(state.pick),
              reply: a ? { text: `SAYS ${a.text.trim()}`, leak: !!whosePin(a.text) } : null,
            }}
            readout={a && state.pick !== null ? [replyWords(state.pick, a)] : []}
            caption="The canary model, asked to finish a planted line."
          />
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        ask: ({ state, apply, sync, focused }) => <Ask s={state} set={focused ? apply : sync} pick={sync} />,
        out: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        replies: ({ state }) => <Replies s={state} />,
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
