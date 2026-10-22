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
import { fact } from '../../lib/tools/facts';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, Messages, Play, ToolDef, getOrder, GET_ORDER, ToolStage } from './kit';

const MODULE = 'tool-calling',
  ID = '02-first-tool';
const REC = RECORDINGS['order-status'];
const LANES = toolLanes();
const DESCS = DOMAINS['order-status'].desc as Desc[];
const RUNS = Object.fromEntries(DESCS.map(d => [d, transcript(REC, run(REC, { desc: d }))])) as Record<Desc, Shown[]>;
const OTHER = REC.tools.find(t => t !== GET_ORDER.name)!;
const called = (d: Desc) => RUNS[d].find(m => m.from === 'model' && m.kind === 'request');
const ANSWER = RUNS.clear[RUNS.clear.length - 1].text;

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

const QUIZ = {
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
    'Same recorded model both times. Only what it could read changed.',
    'Right. The model chooses a tool by reading its definition, and the description is the part that says when to use it.',
    'The host only offered the tools. Choosing one was the model’s call; the host ran what it proposed.',
    `The name stayed ${GET_ORDER.name} in both runs. Only the description changed.`,
  ],
};

const done = (s: S) => s.shown >= RUNS[s.desc].length;
export const STEPS: Step<S>[] = [
  {
    id: 'meet',
    focus: 'open',
    visibleControls: ['open'],
    narration: `The team gives the assistant its first tool, ${GET_ORDER.name}. ${fact('tool-definition').claim} Open the definition they wrote.`,
    predicate: s => s.opened,
  },
  {
    id: 'predict',
    focus: 'predict',
    visibleControls: ['predict'],
    opensDrawer: 'tool',
    narration: `Look at the description: “${GET_ORDER.vague}” The host also offers a second tool, ${OTHER}. Before you run it:`,
    predicate: s => s.prediction !== null,
  },
  {
    id: 'run-vague',
    focus: 'reveal',
    visibleControls: ['predict', 'reveal'],
    narration: 'Now run the request with this description.',
    predicate: s => s.desc === 'vague' && done(s),
  },
  puzzle<S>({
    id: 'fix',
    focus: 'desc',
    visibleControls: ['desc', 'play'],
    opensDrawer: 'tool',
    narration: `The model could not tell which tool checks orders, so it guessed. Pick a better description for ${GET_ORDER.name}, then run the request and step through each message.`,
    broken: s => ({ ...s, desc: 'vague', shown: RUNS.vague.length }),
    verdict: s => s.desc === 'clear' && done(s),
    solution: s => ({ ...s, desc: 'clear', shown: RUNS.clear.length }),
    hint: 'Choose the description that says what the tool looks up, then press “Run the request” and “Next message” until the answer arrives.',
  }),
  {
    id: 'grounded',
    focus: 'see',
    visibleControls: ['see'],
    narration: `This time the model proposed a call. The host ran it on the order system and sent the result back, and the answer comes from it: “${ANSWER}”`,
    predicate: s => s.seen,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    opensDrawer: 'messages',
    narration:
      'The drawer shows the exact call and result. Notice that the model never touched the order system: it asked, and the host did the work. One question to finish.',
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
      stage={({ state, inspect }) => (
        <ToolStage
          lanes={LANES}
          msgs={RUNS[state.desc]}
          upTo={state.shown}
          inspect={inspect}
          office={{ tools: REC.tools.length }}
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
