// Chapter 7: the workbench (KTD9). The reader sets Larkspur's labelling budget for the 80 unchecked pool tickets: one
// label or a vote of three, gold tickets per person first (anyone under the bar is dropped), and who labels the twenty
// hardest. Each setup's pinned result (labels right, people's and model labels, cost) shows beside the room drawn for
// it. The puzzle accepts every setup in WINNERS (pinned, recomputed in a test). Costs and the bar are planning numbers.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { money, num } from '../../lib/format';
import { LABEL_PARTS } from '../../components/scenes/pigeonholeScene';
import { HARD, LABELLERS, labellerOf, ticketOf } from '../../lib/labelling/story';
import {
  BENCH,
  COSTS,
  type Hard,
  START,
  type Setup,
  WINNERS,
  passes,
  resultOf,
  share,
  wins,
} from '../../lib/labelling/workbench';
import { Fact, RackStage, StandInNote, pct } from './kit';

const MODULE = 'labelling',
  ID = '07-workbench';
export const PARTS = LABEL_PARTS;
const BEST = resultOf(WINNERS[0]);
/** The setup the quiz holds up: the winner's gold and model, with a vote of three on every ticket. */
export const VOTED: Setup = { ...WINNERS[0], votes: 3 };
const T = ticketOf(HARD[0]);
const HARD_NAMES: Record<Hard, string> = { people: 'People', model: 'The model', check: 'Model + cross-check' };
const voteWords = (v: number) => (v === 1 ? '1 person' : `Vote of ${v}`);
const goldWords = (g: number) => (g ? `${g} gold each` : 'No gold');

export const QUIZ = {
  question: `A vote of ${VOTED.votes} on every ticket, with the same gold and model, also clears the bar. Why is it not best?`,
  options: [
    `It costs ${money(resultOf(VOTED).cost - BEST.cost)} more for the same labels right`,
    'It gets fewer tickets right',
    'A vote cannot be used with gold tickets',
  ],
  correct: 0,
  explanation: 'Once gold has dropped the careless labeller, extra votes buy little and cost a label each.',
  why: [
    `Right: ${money(resultOf(VOTED).cost)} against ${money(BEST.cost)}, both ${resultOf(VOTED).right} of ${BEST.tickets} right.`,
    `Both get ${BEST.right} of ${BEST.tickets} right; only the cost differs.`,
    'Gold scores who labels; a vote combines what they label, and the two work together.',
  ],
};

interface S extends Setup {
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'bench',
    focus: 'bench',
    visibleControls: ['score', 'bench'],
    narration: `Workbench bar: ${pct(BENCH.bar)} of the ${BEST.tickets} tickets right. The bar and a person’s price are planning numbers.`,
    act: 'Find the cheapest setup that clears the bar.',
    say: { block: 'gold', text: 'Check first' },
    predicate: s => wins(s),
    hint: 'Gold finds the careless labeller; a model takes the hard twenty for very little.',
    solution: s => ({ ...s, ...WINNERS[0] }),
  },
  {
    id: 'ties',
    focus: 'quiz',
    visibleControls: ['score', 'bench', 'quiz'],
    narration: `${BEST.right} of ${BEST.tickets} right for ${money(BEST.cost)}: no setup here clears the bar for less.`,
    act: 'One question to finish.',
    say: { block: 'model', text: 'Hard twenty' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Compare the two costs for the same number of labels right.',
  },
];

function Score({ s }: { s: S }) {
  const r = resultOf(s),
    best = wins(s),
    ok = passes(r);
  return (
    <div role="status" data-best={best ? '1' : '0'} data-ok={ok ? '1' : '0'}>
      <p className="lb-headline">
        <strong>{pct(share(r))}</strong>
        {` right, ${money(r.cost)} `}
        <span className={`stamp ${best ? 'correct' : ok ? 'neutral' : 'wrong'}`}>
          {best ? 'BEST' : ok ? 'COSTS MORE' : 'UNDER THE BAR'}
        </span>
      </p>
    </div>
  );
}

function Radios<T extends string | number>({
  legend,
  name,
  values,
  value,
  words,
  set,
}: {
  legend: string;
  name: string;
  values: readonly T[];
  value: T;
  words: (v: T) => string;
  set: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend>{legend}</legend>
      {values.map(v => (
        <label key={v}>
          <input type="radio" name={name} checked={value === v} onChange={() => set(v)} />
          {words(v)}
        </label>
      ))}
    </fieldset>
  );
}

function Bench({ s, set }: { s: S; set: (s: S) => void }) {
  const r = resultOf(s);
  const rows: [string, string, boolean | null][] = [
    [`Right (bar ${pct(BENCH.bar)})`, `${r.right} of ${r.tickets} (${pct(share(r))})`, passes(r)],
    ['People’s labels', num(r.personLabels), null],
    ['Model labels', num(r.modelLabels), null],
    ['Dropped by gold', r.dropped.map(id => labellerOf(id).name).join(', ') || 'No one', null],
    ['Cost', money(r.cost), null],
  ];
  return (
    <div className="tc-bench">
      <section className="lb-bench" aria-label="Labelling setup">
        <Radios
          legend="Labels per ticket"
          name="lb-votes"
          values={BENCH.votes}
          value={s.votes}
          words={voteWords}
          set={votes => set({ ...s, votes })}
        />
        <Radios
          legend="Gold first"
          name="lb-gold"
          values={BENCH.gold}
          value={s.gold}
          words={goldWords}
          set={gold => set({ ...s, gold })}
        />
        <Radios
          legend={`The ${HARD.length} hardest`}
          name="lb-hard"
          values={BENCH.hard as Hard[]}
          value={s.hard}
          words={h => HARD_NAMES[h]}
          set={hard => set({ ...s, hard })}
        />
      </section>
      <table className="tc-ledger lb-table">
        <caption>{`${voteWords(s.votes)}, ${goldWords(s.gold).toLowerCase()}, ${HARD_NAMES[s.hard].toLowerCase()} on the hardest`}</caption>
        <tbody>
          {rows.map(([name, v, ok]) => (
            <tr key={name}>
              <th scope="row">{name}</th>
              <td className={ok === null ? undefined : ok ? 'ok' : 'bad'}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="note lb-note">
        {`Planning numbers, not measured: ${money(COSTS.person)} a person’s label and the ${pct(BENCH.bar)} bar. A model’s label costs $${COSTS.model}, the price in the study below. Model labels are the recorded run; where it has none, a simulated labeller stands in.`}
      </p>
      <Fact id="model-labellers" />
      <StandInNote />
    </div>
  );
}

function Stage({ s, say }: { s: S; say?: { block: string; text: string } }) {
  const r = resultOf(s);
  const kept = LABELLERS.map(l => l.id).filter(id => !r.dropped.includes(id));
  return (
    <RackStage
      rack={{ ticket: T, labellers: kept, model: s.hard !== 'people', gold: s.gold, say }}
      caption={`${kept.map(id => labellerOf(id).name).join(', ')} at the table${s.hard === 'people' ? '' : ', and the model'}; ${s.gold ? `${s.gold} gold tickets each first` : 'no gold check'}.`}
    />
  );
}

export default function Workbench() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ...START, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => <Stage s={state} say={say} />}
      controls={{
        score: ({ state }) => <Score s={state} />,
        // changing the setup is an attempt only while it is the puzzle
        bench: ({ state, apply, sync, focused }) => <Bench s={state} set={focused ? apply : sync} />,
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
