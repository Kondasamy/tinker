// Chapter 2: the assistant gets its first tool, get_order. The reader picks its description from the prepared
// wordings (DOMAINS['order-status']), runs the host loop, and steps through propose → run → result → answer.
// The vague wording gets no call and a guess; the clear one gets get_order and an answer from the result.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict, { Reveal } from '../../components/quiz/Predict';
import { puzzle } from '../../components/quiz/Puzzle';
import { toolLanes, transcript, type Shown } from '../../components/scenes/toolSequence';
import { DOMAINS, run } from '../../lib/tools/host';
import { RECORDINGS, type Desc } from '../../lib/tools/turns';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, Messages, Play, ToolDef, getOrder, GET_ORDER, ToolStage } from './kit';
import { OFFICE_PARTS } from '../../components/scenes/officeScene';

const MODULE = 'tool-calling',
  ID = '02-first-tool';
const REC = RECORDINGS['order-status'];
const LANES = toolLanes();
const DESCS = DOMAINS['order-status'].desc as Desc[];
const RUNS = Object.fromEntries(DESCS.map(d => [d, transcript(REC, run(REC, { desc: d }))])) as Record<Desc, Shown[]>;
const OTHER = REC.tools.find(t => t !== GET_ORDER.name)!;
const called = (d: Desc) => RUNS[d].find(m => m.from === 'model' && m.kind === 'request');
const ANSWER = RUNS.clear[RUNS.clear.length - 1].text;
const FIRST = `${ANSWER.split('. ')[0].replace(/\.$/, '')}.`; // the answer's first sentence, short enough for a step

interface S {
  opened: boolean;
  desc: Desc;
  prediction: number | null;
  shown: number;
  seen: boolean;
  quiz: number | null;
}

const PREDICT = {
  question: `The employee asks “${RUNS.clear[0].text}” With “${GET_ORDER.vague}” as the description, what does the model do?`,
  options: [`It calls ${GET_ORDER.name}: the name says enough`, 'It calls no tool and guesses', `It calls ${OTHER}`],
};
// read off the recorded vague turn, so the reveal and the recording never disagree
const vagueCall = called('vague');
const OUTCOME = !vagueCall ? 1 : vagueCall.text.startsWith(GET_ORDER.name) ? 0 : 2;

export const PARTS = OFFICE_PARTS;

export const QUIZ = {
  question: `What made the model call ${GET_ORDER.name} the second time?`,
  options: [
    'The model got smarter between the runs',
    'A description that says what the tool does and when to use it',
    `The host forced it to call ${GET_ORDER.name}`,
    `The tool's name changed`,
  ],
  correct: 1,
  explanation:
    'The model picks tools by reading their definitions. The description is how it knows what a tool is for.',
  why: [
    'Same recorded model both times: only what it could read changed.',
    'Right: the model chooses a tool by reading its definition, and the description says when to use it.',
    'The host only offered the tools: choosing one was the model’s call, and the host ran what it proposed.',
    `The name stayed ${GET_ORDER.name} in both runs: only the description changed.`,
  ],
};

const done = (s: S) => s.shown >= RUNS[s.desc].length;
export const STEPS: Step<S>[] = [
  {
    id: 'meet',
    focus: 'open',
    visibleControls: ['open'],
    narration: `The assistant gets its first tool, ${GET_ORDER.name}. Its tool definition tells the model what it does.`,
    act: 'Open the definition they wrote.',
    predicate: s => s.opened,
  },
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['predict'],
    opensDrawer: 'tool',
    narration: `The description reads “${GET_ORDER.vague}” and a JSON Schema sets its arguments. The host app also offers ${OTHER}.`,
    act: 'Predict before you run it.',
    predicate: s => s.prediction !== null,
  },
  {
    id: 'run-vague',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal'],
    narration: 'Your pick is locked.',
    act: 'Run the request with this description.',
    predicate: s => s.desc === 'vague' && done(s),
  },
  puzzle<S>({
    id: 'fix',
    focus: 'desc',
    visibleControls: ['desc', 'play'],
    opensDrawer: 'tool',
    narration: 'No call: the model could not tell which tool checks orders, so it guessed.',
    act: 'Pick a clearer description, then run the request message by message.',
    say: { block: 'model', text: 'Guessed' },
    broken: s => ({ ...s, desc: 'vague', shown: RUNS.vague.length }),
    verdict: s => s.desc === 'clear' && done(s),
    solution: s => ({ ...s, desc: 'clear', shown: RUNS.clear.length }),
    hint: 'Choose the description that says what the tool looks up, then press “Run the request” and “Next message” until the answer arrives.',
  }),
  {
    id: 'grounded',
    focus: 'see',
    visibleControls: ['see'],
    narration: `The model made a tool call, the host ran it, and the tool result gave the answer: “${FIRST}”`,
    say: { block: 'orders', text: 'Looked up' },
    predicate: s => s.seen,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    opensDrawer: 'messages',
    narration: 'The model never touched the order system: it asked, and the host did the work.',
    act: 'One question to finish.',
    say: { block: 'host', text: 'Ran the call' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Compare the two runs. What was different about what the model could read?',
  },
];

export default function FirstTool() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ opened: false, desc: 'vague', prediction: null, shown: 0, seen: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, inspect, say }) => (
        <ToolStage
          lanes={LANES}
          msgs={RUNS[state.desc]}
          upTo={state.shown}
          inspect={inspect}
          office={{ tools: REC.tools.length }}
          say={say}
        />
      )}
      controls={{
        open: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, opened: true })}>
            Open the {GET_ORDER.name} definition
          </button>
        ),
        predict: ({ state, apply }) => (
          <Predict {...PREDICT} value={state.prediction} onPredict={i => apply({ ...state, prediction: i })} />
        ),
        reveal: ({ state, apply }) => (
          <Reveal
            prediction={state.prediction === null ? null : PREDICT.options[state.prediction]}
            outcome={PREDICT.options[OUTCOME]}
            revealed={done(state)}
            onReveal={() => apply({ ...state, shown: RUNS.vague.length })}
            label="Run the request"
          />
        ),
        desc: ({ state, sync }) => (
          <fieldset className="tc-pick">
            <legend>Description for {GET_ORDER.name}</legend>
            {DESCS.map(d => (
              <label key={d}>
                <input
                  type="radio"
                  name="desc"
                  checked={state.desc === d}
                  onChange={() => sync({ ...state, desc: d, shown: 0 })}
                />
                <span>“{getOrder(d).description}”</span>
              </label>
            ))}
          </fieldset>
        ),
        play: ({ state, sync }) => (
          <Play shown={state.shown} total={RUNS[state.desc].length} onStep={n => sync({ ...state, shown: n })} />
        ),
        see: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, seen: true })}>
            See the exact call and result
          </button>
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
        tool: {
          title: `Tool definition: ${GET_ORDER.name}`,
          render: s => (
            <>
              <ToolDef tool={getOrder(s.desc)} />
              <Fact id="tool-definition" />
            </>
          ),
        },
        messages: {
          title: 'Messages',
          render: s => (
            <>
              <Messages lanes={LANES} msgs={RUNS[s.desc]} upTo={s.shown} />
              <Fact id="app-executes" />
            </>
          ),
        },
      }}
    />
  );
}
