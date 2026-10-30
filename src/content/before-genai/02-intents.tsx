// Chapter 2: the bot that sorted messages. Labelling's triage model, trained on Larkspur's labelled tickets, drops each
// message in one of five intent bins. The reader sorts two messages the script missed (one per step, a Select of the
// bins, the sorter's own pick wins), then predicts what it does with a message that fits no bin (it falls back). Every
// reply is still a card someone wrote per intent.
import StepRunner from '../../components/story/StepRunner';
import Select from '../../components/story/Select';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import { KIOSK_PARTS } from '../../components/scenes/kioskScene';
import { messageOf, run } from '../../lib/before-genai/bots';
import { INTENTS, type Intent, nameOf } from '../../lib/labelling/story';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { BeforeGenaiStage, Fact, Transcript } from './kit';

const MODULE = 'before-genai',
  ID = '02-intents';
export const PARTS = KIOSK_PARTS;
/** the two messages the reader sorts, in order: both missed by the script, both caught by the sorter */
export const SORTED = ['parcel', 'gloves'] as const;
type Sorted = (typeof SORTED)[number];
export const OFF = 'off-list';
const EXAMPLE = run(messageOf('refund-drill')),
  RUNS = Object.fromEntries(SORTED.map(id => [id, run(messageOf(id))])) as Record<Sorted, ReturnType<typeof run>>,
  OFF_RUN = run(messageOf(OFF));
const binOf = (id: Sorted) => RUNS[id].intent.intent;

export interface S {
  bins: Partial<Record<Sorted, Intent>>;
  p1: number | null;
  revealed: boolean;
  quiz: number | null;
}
export const INITIAL: S = { bins: {}, p1: null, revealed: false, quiz: null };

export const P1 = {
  question: `“${OFF_RUN.message.text}” What does the sorter do?`,
  options: ['It drops it in the closest bin', 'It falls back', 'It makes a new bin for it'],
};
export const OUTCOME = OFF_RUN.intent.answered ? 0 : 1;

export const QUIZ = {
  question: 'Larkspur adds a sixth intent, gift cards. What must people do before the sorter can answer them?',
  options: [
    'Label example tickets and write its reply',
    'Nothing: the sorter writes the reply itself',
    'Add a keyword rule for every wording',
  ],
  correct: 0,
  explanation: 'The sorter learns an intent from labelled examples, and every reply it sends was written by a person.',
  why: [
    'Right: the sorter learns a bin from labelled tickets, and the bin’s reply is a card a person writes.',
    'The sorter only picks a bin; every reply it sends was written ahead by a person.',
    'The sorter needs no keyword rules, since it learns its words from labelled tickets.',
  ],
};

const sorted = (s: S, id: Sorted) => s.bins[id] === binOf(id);

export const STEPS: Step<S>[] = [
  {
    id: 'sort-parcel',
    focus: 'sort-parcel',
    visibleControls: ['sort-parcel'],
    narration:
      'The sorter was trained on labelled tickets. It scores a message against each intent and picks the top bin.',
    act: 'Pick the bin it uses.',
    say: { block: 'sorter', text: 'Intent bins' },
    predicate: s => sorted(s, 'parcel'),
    hint: 'Which team would chase a parcel?',
  },
  {
    id: 'sort-gloves',
    focus: 'sort-gloves',
    visibleControls: ['sort-gloves'],
    narration:
      'The script fell back on that one; the sorter caught it from words in labelled tickets. Here is another.',
    act: 'Pick the bin it uses.',
    say: { block: 'sorter', text: 'Caught it' },
    predicate: s => sorted(s, 'gloves'),
    hint: 'A swap sends the item back.',
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['off', 'p1'],
    narration: 'Sorted again, with no keyword rule. But the sorter knows only its list of intents. This fits none.',
    act: 'Predict what the sorter does.',
    say: { block: 'customer', text: 'Off the list' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['off', 'p1', 'reveal'],
    narration: 'Your pick is locked.',
    act: 'Send the message.',
    predicate: s => s.revealed,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'off', 'facts', 'quiz'],
    narration: 'No bin scored high enough, so it fell back. And each bin’s reply is still a card someone wrote.',
    act: 'One question to finish.',
    say: { block: 'sorter', text: 'Fell back' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Where does a bin’s reply come from?',
  },
];

/** what the counter shows: the example until the reader sorts, then the last message sorted, then the off-list one */
const runOf = (s: S) =>
  s.revealed ? OFF_RUN : sorted(s, 'gloves') ? RUNS.gloves : sorted(s, 'parcel') ? RUNS.parcel : EXAMPLE;

function Sort({ id, s, apply, focused }: { id: Sorted; s: S; apply: (s: S) => void; focused: boolean }) {
  const pick = s.bins[id],
    right = sorted(s, id);
  return (
    <>
      <Transcript run={RUNS[id]} bots={right ? ['script', 'sorter'] : []} />
      <p>
        <label>
          Bin:{' '}
          <Select
            value={pick ?? ''}
            disabled={!focused}
            onChange={e => apply({ ...s, bins: { ...s.bins, [id]: e.target.value as Intent } })}
          >
            <option value="">Choose an intent</option>
            {INTENTS.map(i => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </Select>
        </label>
      </p>
      {pick && !right && (
        <p className="note" role="status">
          {`Not ${nameOf(pick)}: the sorter scores another bin higher.`}
        </p>
      )}
    </>
  );
}

export default function Intents() {
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
              r.intent.answered
                ? `The sorter put “${r.message.text}” in ${nameOf(r.intent.intent)}.`
                : `The sorter fell back on “${r.message.text}”`
            }
          />
        );
      }}
      controls={{
        'sort-parcel': p => <Sort id="parcel" s={p.state} apply={p.apply} focused={p.focused} />,
        'sort-gloves': p => <Sort id="gloves" s={p.state} apply={p.apply} focused={p.focused} />,
        off: ({ state }) => <Transcript run={OFF_RUN} bots={state.revealed ? ['script', 'sorter'] : []} />,
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
        facts: () => (
          <>
            <Fact id="siri" />
            <Fact id="fallback-intent" />
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
