// Chapter 6: label the hard ones first. The triage model, counted on the gold tickets, ranks the rest by how sure it
// is. The reader predicts which order needs fewer labels (least sure first against the median of 20 seeded random
// orders, pinned), tries both, then seats the model machine for the twenty least-sure tickets: one recorded run of a
// big model and a smaller cross-check, both right on all twenty. Links Evals (model judge) and Synthetic data.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { longDate } from '../../lib/format';
import { LABEL_PARTS } from '../../components/scenes/pigeonholeScene';
import { GOLD, HARD, LABELLERS, MODEL_RUN, MODELS, UNCHECKED, ticketOf } from '../../lib/labelling/story';
import pinned from '../../../data/labelling/pinned.json' with { type: 'json' };
import { Outcome } from '../tool-calling/kit';
import { Fact, RackStage, StandInNote, pct, picksOf } from './kit';

const MODULE = 'labelling',
  ID = '06-label-the-hard-ones-first';
export const PARTS = LABEL_PARTS;
type Order = 'least' | 'random';
const LS = pinned.leastSure,
  M = pinned.models,
  N = HARD.length;
/** the least-sure ticket, and one the model is sure of (the first unchecked ticket not in the hard twenty) */
const FIRST = ticketOf(HARD[0]),
  SURE = UNCHECKED.find(t => !HARD.includes(t.id))!;
/** a hard ticket the people split on, for the model's slip to land beside theirs */
export const SPLIT = ticketOf('t038');
const DATE = longDate(MODEL_RUN.date);
const right = (x: number) => `${Math.round(x * N)} of ${N}`;

interface S {
  p1: number | null;
  order: Order | null;
  seen: Order[];
  model: boolean;
  quiz: number | null;
}

export const P1 = {
  question: `Labelling one ticket at a time, which order needs fewer labels to score ${pct(LS.bar)} on test tickets?`,
  options: ['Least sure first', 'A random order', 'They need about the same'],
};
export const OUTCOME = LS.active < LS.random ? 0 : LS.active > LS.random ? 1 : 2;

export const QUIZ = {
  question: `Larkspur paid a second model to cross-check the first on these ${N}. What did that buy here?`,
  options: [
    `Nothing: both got all ${N} right, so it caught no mistakes`,
    'It fixed the main model’s mistakes',
    'It halved the cost of the labels',
  ],
  correct: 0,
  explanation:
    'A cross-check pays only when the first labeller makes mistakes it can catch; this run had none to catch.',
  why: [
    'Right: two right answers agree, so it added cost and caught nothing.',
    `The main model made no mistakes on these ${N} to fix.`,
    'Two models label every ticket twice, so it costs more, not less.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `The triage model, counted on the ${GOLD.length} gold tickets alone, ranks the other ${UNCHECKED.length} by how sure it is.`,
    act: 'Predict first.',
    say: { block: 'ticket', text: 'How sure?' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'order',
    focus: 'order',
    visibleControls: ['order'],
    narration: 'Your pick is locked. Least sure: tickets where its top two intents score nearly level.',
    act: 'Try both orders.',
    predicate: s => s.seen.includes('least') && s.seen.includes('random'),
  },
  {
    id: 'model',
    focus: 'model',
    visibleControls: ['out1', 'order', 'model'],
    narration: `Least sure first: ${LS.active} labels. Random: ${LS.random}, the median of ${LS.orders}. Now a model labeller takes the ${N} hardest.`,
    act: 'Seat the model.',
    say: { block: 'model', text: 'A model labels' },
    predicate: s => s.model,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['model', 'quiz'],
    narration: `Recorded ${DATE}: model and cross-check both got all ${N} right. The word-counter’s hard tickets weren’t hard for them.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'When two labellers are both right, what can the second one catch?',
  },
];

function Stage({ s, say }: { s: S; say?: { block: string; text: string } }) {
  const t = s.model ? SPLIT : s.order === 'random' ? SURE : FIRST;
  return (
    <RackStage
      rack={{
        ticket: t,
        model: s.model,
        picks: s.model ? { ...picksOf(t.id), model: MODELS.main.labels[t.id] } : undefined,
        drop: s.model,
        say,
      }}
      caption={
        s.model
          ? `One of the ${N} hardest, with the model’s slip beside the people’s (recorded).`
          : s.order === 'random'
            ? 'A random order hands out tickets the model is already sure of.'
            : `The ticket the triage model is least sure of, out of ${UNCHECKED.length}.`
      }
    />
  );
}

export default function LabelTheHardOnesFirst() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, order: null, seen: [], model: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => <Stage s={state} say={say} />}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        order: ({ state, apply, sync, focused }) => (
          <>
            <div className="lb-pairs" role="group" aria-label="Labelling order">
              {(['least', 'random'] as const).map(o => (
                <button
                  key={o}
                  type="button"
                  className="chip"
                  aria-pressed={state.order === o}
                  onClick={() =>
                    (focused ? apply : sync)({
                      ...state,
                      order: o,
                      seen: state.seen.includes(o) ? state.seen : [...state.seen, o],
                    })
                  }
                >
                  {o === 'least' ? 'Least sure first' : 'Random order'}
                </button>
              ))}
            </div>
            {state.order && (
              <p className="lb-headline" role="status">
                {state.order === 'least'
                  ? `${LS.active} labels to reach ${pct(LS.bar)} on tickets kept aside for testing.`
                  : `${LS.random} labels to reach ${pct(LS.bar)}: the median of ${LS.orders} random orders.`}
              </p>
            )}
          </>
        ),
        model: ({ state, apply }) =>
          state.model ? (
            <table className="lb-scores">
              <caption className="sr">{`Right on the ${N} hardest tickets`}</caption>
              <tbody>
                <tr>
                  <th scope="row">{`Model: ${MODELS.main.id}`}</th>
                  <td>{right(M.main)}</td>
                </tr>
                <tr>
                  <th scope="row">{`Cross-check: ${MODELS.check.id}`}</th>
                  <td>{right(M.check)}</td>
                </tr>
                {LABELLERS.map(l => (
                  <tr key={l.id}>
                    <th scope="row">{l.name}</th>
                    <td>{right(M.people[l.id])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <button type="button" className="big" onClick={() => apply({ ...state, model: true })}>
              Seat the model
            </button>
          ),
        quiz: ({ state, apply, sync }) => (
          <>
            <p className="note lb-note">
              {`Model labels recorded once on ${DATE}, at the model’s least random setting, with the written guideline. Replies vary between runs, so the file is the record. The ${UNCHECKED.length}-ticket orders are Larkspur’s toy triage model, tested on ${pinned.triage.heldOut} tickets kept aside for testing.`}
            </p>
            <p className="note lb-note">
              A model also grades answers in <a href="/evals/03-graders/">Evals</a>, and writes examples in{' '}
              <a href="/synthetic-data/">Synthetic data</a>.
            </p>
            <Fact id="uncertainty-sampling" />
            <Fact id="model-labellers" />
            <StandInNote />
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
