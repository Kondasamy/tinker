// Chapter 6: keep it out. The output filter runs live over the canary model's reply and redacts the PIN; the pinned
// bypass (ask one token at a time, each reply a single digit) gets it past the filter, live. Then scrubbing: the run
// trained with every PIN replaced by a placeholder (runs.json) has no PIN to give.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { drip, extract, replyText } from '../../lib/memorisation/extract';
import { caught, filterReply } from '../../lib/memorisation/filter';
import { PLACEHOLDER, RUNS, canaryOf, firstName, pct, scoreOf } from '../../lib/memorisation/story';
import PINNED from '../../../data/memorisation/pinned.json' with { type: 'json' };
import { RECITAL_PARTS } from '../../components/scenes/recitalScene';
import { Fact, LoadLine, RecitalStage, ToyNote, Waiting, ledgerOf, useModel } from './kit';

const MODULE = 'memorisation',
  ID = '06-keep-it-out';
export const PARTS = RECITAL_PARTS;
const R = PINNED.bypass.repeats,
  C = canaryOf(R),
  NAME = firstName(C);
const SCRUBBED = replyText(scoreOf('scrubbed', R).reply).trim();

export const P1 = {
  question: `The filter hides any four digits in a row. Does it keep ${NAME}’s PIN safe?`,
  options: [
    'Not fully: a reply shaped differently slips past',
    'Yes: no reply can show four digits in a row',
    'No: a filter can’t read replies at all',
  ],
};
/** The pinned bypass gets every digit past the filter. */
export const OUTCOME = PINNED.bypass.drip.some(caught) ? 1 : 0;

export const QUIZ = {
  question: 'A chat model was trained on staff emails holding door codes. Which fix keeps the codes safe?',
  options: [
    'Replace the codes in the emails before training',
    'Add a filter that blocks replies containing a code',
    'Tell the model in its instructions never to share codes',
  ],
  correct: 0,
  explanation: 'A secret that never reaches training can’t be memorised, so nothing is left to leak.',
  why: [
    'Right: scrubbed text holds no code, so no prompt can pull one out.',
    'A filter only spots the shapes it knows; split or spaced out, a code slips past.',
    'Instructions change what the model tends to say, not what it has stored.',
  ],
};

export interface S {
  p1: number | null;
  plain: string | null;
  drip: string[] | null;
  scrub: boolean;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'An output filter checks each reply before it is shown and hides any four digits in a row.',
    act: 'Predict first.',
    say: { block: 'filter', text: 'Output filter' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'ask',
    focus: 'ask',
    visibleControls: ['p1', 'ask'],
    narration: `The filter is on. The attacker asks for ${NAME}’s line again.`,
    act: 'Ask.',
    predicate: s => s.plain !== null,
  },
  {
    id: 'drip',
    focus: 'drip',
    visibleControls: ['drip'],
    narration: 'Redacted. Now the attacker asks for one more piece each time, adding the last reply to the prompt.',
    act: 'Ask one digit at a time.',
    say: { block: 'reply', text: 'One digit each' },
    predicate: s => s.drip !== null,
  },
  {
    id: 'scrub',
    focus: 'scrub',
    visibleControls: ['out', 'scrub'],
    narration: `Each reply held one digit, so all four passed. Scrubbing swaps every PIN for a placeholder, ${PLACEHOLDER}, before training.`,
    act: 'Scrub the training text.',
    say: { block: 'ledger', text: 'Scrubbed' },
    predicate: s => s.scrub,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['scrub', 'facts', 'quiz'],
    narration: `The scrubbed model says “${SCRUBBED}”: no PIN is left to leak. Held-out top-5 stays at ${pct(RUNS.runs.scrubbed.heldout.top5)}.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which fix leaves nothing to leak?',
  },
];

function Live({ s, set, which }: { s: S; set: (s: S) => void; which: 'ask' | 'drip' }) {
  const { model, status } = useModel();
  const run = () => {
    if (!model) return;
    if (which === 'ask') set({ ...s, plain: filterReply(extract(model, C).text) });
    else set({ ...s, drip: drip(model, C) });
  };
  return (
    <>
      <div className="mem-actions">
        <button type="button" className="big" disabled={!model} onClick={run}>
          {which === 'ask' ? 'Ask' : 'Ask one digit at a time'}
        </button>
      </div>
      <LoadLine status={status} />
    </>
  );
}

const replyOf = (s: S) =>
  s.scrub
    ? { text: `SAYS ${SCRUBBED}`, leak: false }
    : s.drip
      ? { text: s.drip.join(' ').trim(), leak: true }
      : s.plain !== null
        ? { text: `SAYS ${s.plain.trim()}`, leak: false }
        : null;

export default function KeepItOut() {
  const { status, retry } = useModel();
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, plain: null, drip: null, scrub: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => (
        <RecitalStage
          say={say}
          run={state.scrub ? 'scrubbed' : 'canary'}
          repeats={R}
          wait={status === 'ready' || state.scrub ? undefined : <Waiting failed={status === 'error'} retry={retry} />}
          desk={{ ledger: ledgerOf(R, { scrub: state.scrub }), filter: !state.scrub, reply: replyOf(state) }}
          readout={
            state.scrub
              ? [`Scrubbed model: “${SCRUBBED}”`]
              : state.drip
                ? [
                    ...state.drip.map((d, i) => `reply ${i + 1}: “${d}” passes`),
                    `together: ${state.drip.join('').trim()}`,
                  ]
                : state.plain !== null
                  ? [`after the filter: “${state.plain.trim()}”`]
                  : []
          }
          caption={
            state.scrub ? 'Trained on scrubbed text (recorded).' : `${NAME}’s line, asked live, through the filter.`
          }
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        ask: ({ state, apply }) => <Live s={state} set={apply} which="ask" />,
        drip: ({ state, apply }) => <Live s={state} set={apply} which="drip" />,
        out: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />
            <ToyNote />
          </>
        ),
        scrub: ({ state, apply, sync, focused }) => (
          <fieldset className="mem-bench">
            <legend>Training text</legend>
            <label>
              <input
                type="checkbox"
                checked={state.scrub}
                onChange={e => (focused ? apply : sync)({ ...state, scrub: e.currentTarget.checked })}
              />{' '}
              Scrub PINs before training
            </label>
          </fieldset>
        ),
        facts: () => <Fact id="nasr-2023" />,
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
