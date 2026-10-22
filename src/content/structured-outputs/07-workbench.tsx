// Chapter 7: the workbench. The reader designs Larkspur's order-status schema field by field (src/lib/structured-outputs/
// workbench.ts): free text, a list or a number, or left to the order system. Every order is decoded live under it and
// read for validity and correctness. The policy lives in the step state, so a resumed run keeps the reader's bench.
// Every policy that gives valid, right answers for every order is a right answer (WINNERS, precomputed as SOLVED).
import { useMemo } from 'react';
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { puzzle } from '../../components/quiz/Puzzle';
import { Outcome } from '../tool-calling/kit';
import type { Model } from '../../lib/lm/model';
import {
  FIELDS,
  ORDERS,
  SOLVED,
  bench,
  choiceLabel,
  promptFor,
  schemaFor,
  type Choice,
  type FieldId,
  type Policy,
} from '../../lib/structured-outputs/workbench';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Answer, Fact, StructuredStage, Waiting, decodeWith, modelNow, useModel, whenLoaded } from './kit';

const MODULE = 'structured-outputs',
  ID = '07-workbench';
/** The bench the puzzle starts on: the model asked for every field. */
export const ALL_MODEL: Policy = { team: 'list', status: 'list', days: 'number' };

/** 0: all four, 1: some, 2: none. */
export function answerOf(model: Model) {
  const s = bench(model, ALL_MODEL).score;
  return s === ORDERS.length ? 0 : s > 0 ? 1 : 2;
}

interface S {
  p1: number | null;
  policy: Policy;
  quiz: number | null;
}

const P1 = {
  question: `Larkspur mini fills all three fields for each of ${ORDERS.length} orders: team and status from lists, days as a number. How many orders come back valid and right?`,
  options: [`All ${ORDERS.length}`, 'Some of them', 'None'],
};

const QUIZ = {
  question: 'Larkspur adds a field: the order’s tracking number. Where should it come from?',
  options: [
    'The model, as free text: it can copy it from the conversation',
    'The order system, outside the model’s schema: the model can’t know it, and a mask would force it to write some number anyway',
    'The model, as a whole number, so the mask keeps it valid',
    'A list of every tracking number Larkspur has ever issued',
  ],
  correct: 1,
  explanation:
    'Ask the model only for what it can know or decide. Facts the system already holds come from the system; a mask would make the model invent them in a valid shape.',
  why: [
    'You saw Larkspur mini given 1042 in the prompt and still write another number. Even a strong model can miscopy; the order system has the real one.',
    'Right. The schema is for what the model decides. Facts come from the system that holds them, the way Tool calling’s host fetched them.',
    'Valid isn’t right: a whole number under a mask is still a guess.',
    'A list that long stops nothing: the model would pick one, valid and wrong.',
  ],
};

const policyName = (p: Policy) =>
  FIELDS.map(f => `${f.label}: ${p[f.id] === 'system' ? 'order system' : p[f.id]}`).join(' · ');

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `Larkspur’s order-status answer has three fields: the team that handles it, the status, and the days to arrive. Here are ${ORDERS.length} real orders; the order system knows each one’s status and days, but not which team handles it. The team’s first draft asks the model for everything. Before you run it:`,
    predicate: s => s.p1 !== null,
  },
  puzzle<S>({
    id: 'design',
    focus: 'bench',
    visibleControls: ['out1', 'bench'],
    narration:
      'Now design the schema. For each field choose: the model writes free text, the model picks from a list (or writes a number), or leave it out of the schema and let the order system fill it in. The table decodes every order live under your schema. Get every order valid and right.',
    broken: s => ({ ...s, policy: ALL_MODEL }),
    verdict: whenLoaded(s => bench(modelNow()!, s.policy).score === ORDERS.length),
    solution: s => ({ ...s, policy: SOLVED[0] }),
    hint: 'The model can’t know an order’s status or days, and two fields don’t fit its window. What can only the model decide?',
  }),
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['bench', 'quiz'],
    narration:
      'The model fills one field, the one only it decides: which team. The list keeps it to a known team, and the facts come from the order system. This is the shape of real structured outputs: a small schema for the model’s decisions, and the facts from tools. One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Can the model know a tracking number, or does a system hold it?',
  },
];

function Bench({ s, apply }: { s: S; apply: (s: S) => void }) {
  const { model } = useModel();
  if (!model) return <Waiting />;
  const b = bench(model, s.policy),
    done = b.score === ORDERS.length;
  const n = SOLVED.length;
  const set = (f: FieldId, c: Choice) => apply({ ...s, policy: { ...s.policy, [f]: c } });
  const schema = schemaFor(s.policy);
  return (
    <div className="so-bench">
      {FIELDS.map(f => (
        <label key={f.id}>
          {f.label}
          <select value={s.policy[f.id]} onChange={e => set(f.id, e.target.value as Choice)}>
            {f.choices.map(c => (
              <option key={c} value={c}>
                {choiceLabel(f.id, c)}
              </option>
            ))}
          </select>
        </label>
      ))}
      <Answer label="The model’s schema" text={schema ? JSON.stringify(schema) : 'None: the model writes nothing'} />
      <div className="so-table-wrap" tabIndex={0} role="region" aria-label="Results, one row per order">
        <table className="so-table">
          <thead>
            <tr>
              <th scope="col">Order</th>
              <th scope="col">Model wrote</th>
              <th scope="col">Valid</th>
              <th scope="col">Right</th>
              <th scope="col">Why</th>
            </tr>
          </thead>
          <tbody>
            {b.rows.map(r => (
              <tr key={r.order.id} data-order={r.order.id}>
                <th scope="row">{r.order.id}</th>
                <td>
                  <code>{r.output || '(nothing)'}</code>
                </td>
                <td data-ok={r.valid}>{r.valid ? 'yes' : 'no'}</td>
                <td data-ok={r.right}>{r.right ? 'yes' : 'no'}</td>
                <td>{r.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="so-total" role="status" data-testid="score">
        {`${b.score} of ${ORDERS.length} orders valid and right`}
        {done ? ` · one of ${n} schema${n === 1 ? '' : 's'} that work.` : ''}
      </p>
    </div>
  );
}

function Stage({ policy, locked }: { policy: Policy; locked: boolean }) {
  const { model } = useModel();
  const prompt = promptFor(ORDERS[0]),
    schema = schemaFor(policy);
  // no schema: the model writes nothing, as bench()'s rows say, so nothing is decoded
  const d = useMemo(
    () => (model && schema ? decodeWith(model, prompt, schema).decoded : null),
    [model, prompt, policy.team, policy.status, policy.days],
  );
  const caption = schema
    ? `Order ${ORDERS[0].id} under your schema: ${policyName(policy)}.`
    : `Order ${ORDERS[0].id}: the order system fills every field, so the model writes nothing.`;
  return (
    <StructuredStage prompt={prompt} d={d} at={locked ? 0 : 32} locked={locked} masked={!!schema} caption={caption} />
  );
}

export default function Workbench() {
  const { model } = useModel();
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      ready={!!model}
      initial={{ p1: null, policy: ALL_MODEL, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state }) => <Stage policy={state.policy} locked={state.p1 === null} />}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) =>
          model ? <Outcome {...P1} prediction={state.p1} outcome={answerOf(model)} /> : <Waiting />,
        bench: ({ state, apply }) => <Bench s={state} apply={apply} />,
        quiz: ({ state, apply, sync }) => (
          <>
            <Quiz
              {...QUIZ}
              unsure
              value={state.quiz}
              onAnswer={(_, q) => apply({ ...state, quiz: q })}
              onUnsure={() => sync({ ...state, quiz: UNSURE })}
            />
            <Fact id="anthropic-limits" />
          </>
        ),
      }}
    />
  );
}
