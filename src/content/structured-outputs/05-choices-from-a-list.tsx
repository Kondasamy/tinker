// Chapter 5: choices from a list. The status field as free text gives odd text; as an enum it is a pick between two
// values, and the model's preference between them shows live (shares). Draws at temperature 1, seeds 1 to 6, can land
// on either value. Every share and pick is read off the live runs.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import type { Model } from '../../lib/lm/model';
import { shares } from '../../lib/structured-outputs/decode';
import { RUNS, SCHEMAS, play, run } from '../../lib/structured-outputs/prompts';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Answer, Fact, PinnedStage, Waiting, pct, useModel, whenLoaded } from './kit';

const MODULE = 'structured-outputs',
  ID = '05-choices-from-a-list';
export const FREE = run('free'),
  LIST = run('mask');
export const DRAWS = RUNS.filter(r => r.id.startsWith('draw-'));
export const VALUES = SCHEMAS.status.properties.status.enum as string[];
const statusOf = (model: Model, id: string) => JSON.parse(play(model, run(id)).decoded.text).status as string;

/** Each value's share of probability where the values part ways, on the greedy run. */
export function sharesOf(model: Model) {
  const { grammar, decoded } = play(model, LIST);
  return shares(grammar!, decoded, 'status')!.values;
}
/** 0: it reads the real status, 1: its own preference, 2: always the first value. The run's pick is the preferred
 * value, whatever the order holds; and that value isn't the list's first. */
export function answerOf(model: Model) {
  const sh = sharesOf(model),
    top = sh.reduce((a, b) => (b.p > a.p ? b : a)).value;
  return statusOf(model, LIST.id) === top && top !== VALUES[0] ? 1 : 2;
}

interface S {
  listed: boolean;
  p1: number | null;
  draws: number;
  quiz: number | null;
}

const P1 = {
  question: `Status is now a list: ${VALUES.join(' or ')}. The prompt names order 1042 and nothing else. What decides which value Larkspur mini writes?`,
  options: [
    'It works out order 1042’s real status',
    'Its own preference between the two allowed values',
    'It always picks the first value in the list',
  ],
};

const QUIZ = {
  question:
    'Larkspur’s returns form has a field “reason”. As free text the model writes all sorts; as a list (damaged, wrong item, changed mind) it must pick one. What does the list buy?',
  options: [
    'Correct reasons: the model now knows why each item came back',
    'Answers the program can always act on, one of three known values; whether the pick is right still depends on what the model knows',
    'Nothing: the model ignores lists',
    'Faster answers, because lists are shorter',
  ],
  correct: 1,
  explanation:
    'A list turns a blank into a pick among known values, so every answer is something the program can handle. The pick follows the model’s preference among them; it is only as right as what the model knows.',
  why: [
    'The list limits what can be written; it adds no knowledge. You saw Larkspur mini pick a status for an order it knows nothing about.',
    'Right. Every answer becomes one of the values the program expects, which free text never guarantees. Being right is a separate question, chapter 6’s.',
    'Under the mask the model can’t ignore the list: tokens outside it are blocked.',
    'Speed isn’t the point, and a pick can take as many tokens as a short free answer.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'free',
    focus: 'free',
    visibleControls: ['free'],
    narration:
      'The answers are valid JSON now. Here is the status field as free text, capped at 8 characters: the mask keeps the JSON in shape, but inside the quotes Larkspur mini writes whatever it finds likely. The order system knows two statuses, and this isn’t either.',
    predicate: whenLoaded(s => s.listed),
    hint: 'Press “Make status a list”.',
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'A list, in JSON Schema an enum, turns the blank into a choice. Before you see the pick:',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'draw',
    focus: 'draw',
    visibleControls: ['out1', 'shares', 'draw'],
    narration: `The pick follows the model’s preference: at the step where the values part ways, the allowed tokens split the probability, and the likeliest wins. Picking the likeliest every time is greedy decoding. A draw instead picks at random by those shares. Draw a few times (seeds 1 to ${DRAWS.length}).`,
    predicate: s => s.draws >= 3,
    hint: 'Press “Draw again” three times.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['draws', 'quiz'],
    narration:
      'Larkspur mini knows nothing about order 1042: its preference comes from its training text, not the order. The list made the answer usable; it didn’t make it true. One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Does a list add knowledge, or limit what can be written?',
  },
];

function Draws({ n }: { n: number }) {
  const { model } = useModel();
  if (!model) return <Waiting />;
  return (
    <ol className="so-checks" data-testid="draws">
      {DRAWS.slice(0, n).map((r, i) => (
        <li key={r.id}>{`Draw ${i + 1} (seed ${r.seed}): ${statusOf(model, r.id)}`}</li>
      ))}
    </ol>
  );
}

export default function ChoicesFromAList() {
  const { model } = useModel();
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      ready={!!model}
      initial={{ listed: false, p1: null, draws: 0, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state }) => (
        <PinnedStage
          id={!state.listed ? FREE.id : state.draws ? DRAWS[state.draws - 1].id : LIST.id}
          at={state.listed && state.p1 === null ? 0 : 32}
          caption={
            !state.listed
              ? 'Status as free text, up to 8 characters.'
              : state.draws
                ? `Draw ${state.draws}: a random pick by the shares (seed ${DRAWS[state.draws - 1].seed}).`
                : `Status as a list: ${VALUES.join(' or ')}.`
          }
        />
      )}
      controls={{
        free: ({ state, apply }) => (
          <>
            {model ? <Answer label="Status as free text" text={play(model, FREE).decoded.text} /> : <Waiting />}
            <button type="button" className="big" disabled={!model} onClick={() => apply({ ...state, listed: true })}>
              Make status a list
            </button>
          </>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) =>
          model ? (
            <>
              <Outcome {...P1} prediction={state.p1} outcome={answerOf(model)} />
              <Answer label="Greedy: the likeliest value" text={play(model, LIST).decoded.text} />
            </>
          ) : (
            <Waiting />
          ),
        shares: () =>
          model ? (
            <ul className="so-checks" data-testid="shares" aria-label="The model’s preference between the values">
              {sharesOf(model).map(v => (
                <li key={v.value}>{`${v.value}: ${pct(v.p)}`}</li>
              ))}
            </ul>
          ) : (
            <Waiting />
          ),
        draw: ({ state, apply }) => (
          <>
            <Draws n={state.draws} />
            <button
              type="button"
              className="big"
              disabled={state.draws >= DRAWS.length}
              onClick={() => apply({ ...state, draws: state.draws + 1 })}
            >
              {state.draws ? 'Draw again' : 'Draw'}
            </button>
          </>
        ),
        draws: ({ state }) => <Draws n={state.draws} />,
        quiz: ({ state, apply, sync }) => (
          <>
            <Quiz
              {...QUIZ}
              unsure
              value={state.quiz}
              onAnswer={(_, q) => apply({ ...state, quiz: q })}
              onUnsure={() => sync({ ...state, quiz: UNSURE })}
            />
            <Fact id="openai-limits" />
          </>
        ),
      }}
    />
  );
}
