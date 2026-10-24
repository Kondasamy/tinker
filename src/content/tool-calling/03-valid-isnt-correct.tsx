// Chapter 3: the schema catches a wrong type (a string order id gets INVALID and an isError result the model
// retries from), but not a wrong value: a real, well-formed order id of another customer's passes and the answer is
// wrong. The reader turns on an ownership check (DOMAINS['wrong-id'].check) that catches it.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { puzzle } from '../../components/quiz/Puzzle';
import { toolLanes, transcript, callText } from '../../components/scenes/toolSequence';
import { run, type Run } from '../../lib/tools/host';
import { RECORDINGS } from '../../lib/tools/turns';
import { ORDERS } from '../../lib/tools/server';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, Messages, Outcome, Play, ToolDef, GET_ORDER, ToolStage } from './kit';
import { OFFICE_PARTS } from '../../components/scenes/officeScene';

const MODULE = 'tool-calling',
  ID = '03-valid-isnt-correct';
const LANES = toolLanes();
type Scene = 'invalid' | 'wrong' | 'checked';
const REC = { invalid: RECORDINGS['invalid-arg'], wrong: RECORDINGS['wrong-id'], checked: RECORDINGS['wrong-id'] };
const RUN: Record<Scene, Run> = {
  invalid: run(REC.invalid),
  wrong: run(REC.wrong, { check: false }),
  checked: run(REC.wrong, { check: true }),
};
const MSGS = {
  invalid: transcript(REC.invalid, RUN.invalid),
  wrong: transcript(REC.wrong, RUN.wrong),
  checked: transcript(REC.wrong, RUN.checked),
};

const firstCheck = (r: Run) => r.steps.find(s => s.kind === 'validation')!;
const BAD = firstCheck(RUN.invalid),
  WRONG = firstCheck(RUN.wrong);
const ASKED = Number(REC.wrong.ask.match(/\d{4}/)![0]);
const WRONG_ORDER = ORDERS.find(o => o.id === WRONG.call.arguments.order_id)!;
const ID_SCHEMA = GET_ORDER.inputSchema.properties!.order_id;

interface S {
  scene: Scene;
  shown: number;
  p1: number | null;
  p2: number | null;
  quiz: number | null;
}

const P1 = {
  question: `The model sends ${callText(BAD.call)}: the number as text. What does the host do?`,
  options: [
    `Runs it anyway: "${BAD.call.arguments.order_id}" means ${BAD.call.arguments.order_id}`,
    'Rejects it and sends the error back to the model',
    'Stops the whole assistant',
  ],
};
const OUT1 = BAD.errors.length ? 1 : 0;
const P2 = {
  question: `Now the model misreads the number and sends ${callText(WRONG.call)}. Will the schema catch it?`,
  options: ['Yes: the validator rejects it', 'No: it is a whole number in range, so the call runs'],
};
const OUT2 = WRONG.errors.length ? 0 : 1;

export const PARTS = OFFICE_PARTS;

export const QUIZ = {
  question: `The schema accepted order ${WRONG_ORDER.id}. What does that tell you?`,
  options: [
    'The call is correct',
    'Only that the arguments have the right shape. Whether they are the right ones needs its own check',
    'The schema is broken and should be stricter',
    'The model can now be trusted with this tool',
  ],
  correct: 1,
  explanation:
    'A schema checks shape: type, range, required fields. Meaning, like “this order belongs to this customer”, needs a check in your software.',
  why: [
    `Valid is not correct: ${WRONG_ORDER.id} was a real order, just someone else’s.`,
    'Right: a schema checks shape, and a business rule like ownership catches the wrong value.',
    `No schema can know which customer is on the phone, and ${WRONG_ORDER.id} fits every rule a schema can state.`,
    'One passing check says nothing about the next call: your software still decides what is allowed.',
  ],
};

const done = (s: S) => s.shown >= MSGS[s.scene].length;
export const STEPS: Step<S>[] = [
  {
    id: 'predict-type',
    focus: 'p1',
    visibleControls: ['p1'],
    opensDrawer: 'tool',
    narration: `Same tool. Its schema says order_id is an ${ID_SCHEMA.type} from ${ID_SCHEMA.minimum} to ${ID_SCHEMA.maximum}. Validation checks every call against it first.`,
    act: 'Predict first.',
    say: { block: 'schema', text: 'Checks each call' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'run-invalid',
    focus: 'play',
    visibleControls: ['p1', 'play'],
    narration: 'Your pick is locked.',
    act: 'Run the request and step through the messages.',
    predicate: s => s.scene === 'invalid' && done(s),
    hint: 'Press “Run the request”, then “Next message” until the answer arrives.',
  },
  {
    id: 'invalid',
    focus: 'harder',
    visibleControls: ['out1', 'harder'],
    opensDrawer: 'messages',
    narration: `INVALID: “${BAD.errors.join('. ')}”. Nothing ran: the host sent an error result back, and the model retried.`,
    act: 'Try a harder mistake.',
    say: { block: 'schema', text: 'Rejected' },
    predicate: s => s.scene === 'wrong',
  },
  {
    id: 'predict-wrong',
    focus: 'p2',
    visibleControls: ['p2'],
    narration: `A harder mistake. The employee asks about order ${ASKED}, but the model sends the wrong number.`,
    act: 'Predict first.',
    predicate: s => s.p2 !== null,
  },
  {
    id: 'run-wrong',
    focus: 'play',
    visibleControls: ['p2', 'play'],
    narration: 'Your pick is locked.',
    act: 'Run it and watch what comes back.',
    predicate: s => s.scene === 'wrong' && done(s),
    hint: 'Press “Run the request”, then “Next message” until the answer arrives.',
  },
  puzzle<S>({
    id: 'check',
    focus: 'check',
    visibleControls: ['out2', 'check', 'play'],
    opensDrawer: 'messages',
    narration: `Valid but wrong: order ${WRONG_ORDER.id} belongs to ${WRONG_ORDER.customer}, yet the assistant read it out.`,
    act: 'Turn on an ownership check and run it again.',
    say: { block: 'orders', text: 'Someone else’s' },
    broken: s => ({ ...s, scene: 'wrong', shown: MSGS.wrong.length }),
    verdict: s => s.scene === 'checked' && done(s),
    solution: s => ({ ...s, scene: 'checked', shown: MSGS.checked.length }),
    hint: 'Tick the ownership check, then press “Run the request” and “Next message” until the answer arrives.',
  }),
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: `The ownership check refused order ${WRONG_ORDER.id} with an error result, so the model looked up ${ASKED} instead.`,
    act: 'One question to finish.',
    say: { block: 'owner', text: `Refused ${WRONG_ORDER.id}` },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What does a schema look at: the shape of a value, or what it means?',
  },
];

export default function ValidIsntCorrect() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ scene: 'invalid', shown: 0, p1: null, p2: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, inspect, say }) => (
        <ToolStage
          lanes={LANES}
          msgs={MSGS[state.scene]}
          upTo={state.shown}
          inspect={inspect}
          office={{ tools: REC[state.scene].tools.length, schema: true, owner: state.scene === 'checked' }}
          say={say}
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        p2: ({ state, apply }) => <Predict {...P2} value={state.p2} onPredict={i => apply({ ...state, p2: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUT1} />,
        out2: ({ state }) => <Outcome {...P2} prediction={state.p2} outcome={OUT2} />,
        play: ({ state, sync }) => (
          <Play shown={state.shown} total={MSGS[state.scene].length} onStep={n => sync({ ...state, shown: n })} />
        ),
        harder: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, scene: 'wrong', shown: 0 })}>
            Try a harder mistake →
          </button>
        ),
        check: ({ state, sync }) => (
          <label className="tc-check">
            <input
              type="checkbox"
              checked={state.scene === 'checked'}
              onChange={e => sync({ ...state, scene: e.target.checked ? 'checked' : 'wrong', shown: 0 })}
            />
            <span>
              Ownership check: {GET_ORDER.name} refuses orders that belong to anyone but {REC.wrong.customer}
            </span>
          </label>
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
      inspectPanel="messages"
      panels={{
        tool: { title: `Tool definition: ${GET_ORDER.name}`, render: () => <ToolDef tool={GET_ORDER} /> },
        messages: {
          title: 'Messages',
          render: s => (
            <>
              <Messages lanes={LANES} msgs={MSGS[s.scene]} upTo={s.shown} />
              <Fact id="mcp-tool-errors" />
            </>
          ),
        },
      }}
    />
  );
}
