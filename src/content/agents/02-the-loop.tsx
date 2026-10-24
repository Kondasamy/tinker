// Chapter 2: the cracked printer again, now stepped one model turn at a time: think (the model reads everything so far
// and asks for a call), act (the host runs it), observe (the result goes back), decide. The reader predicts how many
// turns the case takes and who ends the run; the reveal is read off the run: the model ends it by answering without a
// call, long before the host's step budget. Turn counts, texts and the answer all come from the one recorded run.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { agentLanes, agentMessages } from '../../components/scenes/agentSequence';
import { CONTEXT, DEFAULTS, run, stepsOf } from '../../lib/agents/loop';
import { RECORDINGS } from '../../lib/agents/turns';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Messages, Outcome } from '../tool-calling/kit';
import { AgentStage, Fact } from './kit';
import { AGENT_PARTS } from '../../components/scenes/agentScene';

/** the parts a step's callout may name: the back office with the agent's props */
export const PARTS = AGENT_PARTS;

const MODULE = 'agents',
  ID = '02-the-loop';
const REC = RECORDINGS[ID];
const R = run(REC);
const GAUGE = { steps: DEFAULTS.steps, context: CONTEXT };
const TURNS = R.meter.length,
  CALLS = stepsOf(R, 'call').length;
const BUDGET = DEFAULTS.steps,
  LAST = TURNS - 1; // the last turn that asks for calls; the one after it answers
// where each turn starts in the run's steps; showing t turns shows every step up to the start of turn t + 1
const STARTS = R.steps.flatMap((s, i) =>
  'turn' in s && R.steps.findIndex(x => 'turn' in x && x.turn === s.turn) === i ? [i] : [],
);
const upTo = (t: number) => (t === 0 ? 0 : (STARTS[t] ?? R.steps.length));
/** the calls the model asked for on turn t (1-based) */
const asked = (t: number) =>
  stepsOf(R, 'proposal')
    .filter(p => p.turn === t - 1)
    .map(p => p.call.name)
    .join(' and ');
const UNUSED = REC.tools.filter(t => !stepsOf(R, 'call').some(c => c.call.name === t));

interface S {
  t: number;
  p1: number | null;
  p2: number | null;
  quiz: number | null;
}

const P1 = {
  question: 'The agent gets the cracked-printer case and its tools. How many turns will the model take?',
  options: [
    'One: it asks for every call at once',
    'One turn per tool call',
    'One turn per tool call, then one more to say it is done',
    'As many as the host allows',
  ],
};
// read off the run: which rule gives its number of turns
const OUT1 = [1, CALLS, CALLS + 1, BUDGET].indexOf(TURNS);

const P2 = {
  question: 'The email has gone. Who ends the run?',
  options: [
    'The host: the case’s last tool has run',
    'The model: it answers without asking for a call',
    'The host: the run has used its steps',
    'Nobody: the loop asks the model again, forever',
  ],
};
const answered = stepsOf(R, 'answer').length > 0 && R.status === 'done';
const OUT2 = answered ? 1 : R.status === 'out-of-budget' ? 2 : 0;

export const QUIZ = {
  question:
    'A Larkspur agent books a warehouse visit. It has four tools. After its second call it writes “The visit is booked for Tuesday” and asks for no tool. What happens?',
  options: [
    'The run goes on: the host waits until every tool has been used',
    'The run goes on until the host’s step budget is spent',
    'The run ends: a turn with no call is the model’s answer, so the loop stops there',
    'The run ends because the warehouse tool said so',
  ],
  correct: 2,
  explanation: 'The model decides when the case is done. The host’s budget is only a backstop.',
  why: [
    `The host never waits for tools to run out: in the printer case ${UNUSED.join(' and ')} never ran, and the run still ended.`,
    `A budget is a backstop for a run that never ends: the printer case ended after ${TURNS} of its ${BUDGET} turns.`,
    'Right: each turn the model either asks for calls or answers, and an answer with no call is how it says “done”.',
    'A tool result is just more for the model to read; the model decides whether the case is finished.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict-turns',
    focus: 'p1',
    visibleControls: ['p1'],
    opensDrawer: 'loop',
    narration: 'An agent runs a loop: each turn the model asks for a call, the host runs it, and the result goes back.',
    act: 'Predict first.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'turn-1',
    focus: 'play',
    visibleControls: ['p1', 'play'],
    narration: 'The picture stops after each turn, and the gauge on the host’s desk counts them.',
    act: 'Start the run.',
    say: { block: 'gauge', text: 'Counts turns' },
    predicate: s => s.t >= 1,
    hint: 'Press “Start the run”.',
  },
  {
    id: 'observe',
    focus: 'play',
    visibleControls: ['play'],
    opensDrawer: null,
    narration: `Turn 1: the model asked for ${asked(1)}, the host ran it, and the result went back. Now the model decides again.`,
    act: 'Next turn.',
    say: { block: 'model', text: 'Decides again' },
    predicate: s => s.t >= 2,
    hint: 'Press “Next turn”.',
  },
  {
    id: 'decide',
    focus: 'play',
    visibleControls: ['play'],
    narration: `Turn 2: nobody told it to call ${asked(2)}. It chose to, from what the order said.`,
    act: 'Keep stepping until the email goes.',
    predicate: s => s.t >= LAST,
    hint: `Press “Next turn” until the turn that calls ${asked(LAST)}.`,
  },
  {
    id: 'predict-stop',
    focus: 'p2',
    visibleControls: ['p2'],
    narration: `Turn ${LAST}: the replacement is on its way and the customer is told. The host still allows more turns.`,
    act: 'Predict first.',
    predicate: s => s.p2 !== null,
  },
  {
    id: 'last-turn',
    focus: 'play',
    visibleControls: ['p2', 'play'],
    narration: 'Your pick is locked.',
    act: 'Run the next turn.',
    predicate: s => s.t >= TURNS,
    hint: 'Press “Next turn”.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'out2', 'quiz'],
    opensDrawer: 'loop',
    narration: `Turn ${TURNS}. No call this time, so the model is done. The step budget of ${BUDGET} was only a backstop.`,
    act: 'One question to finish.',
    say: { block: 'model', text: 'Answered: done' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What does a turn with no tool call mean?',
  },
];

export default function TheLoop() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ t: 0, p1: null, p2: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, inspect, say }) => (
        <AgentStage run={R} upTo={upTo(state.t)} props={{ gauge: GAUGE }} inspect={inspect} say={say} />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        p2: ({ state, apply }) => <Predict {...P2} value={state.p2} onPredict={i => apply({ ...state, p2: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUT1} />,
        out2: ({ state }) => <Outcome {...P2} prediction={state.p2} outcome={OUT2} />,
        // the button never says how many turns are left: that is what the reader predicts
        play: ({ state, sync }) => (
          <>
            {state.t < TURNS && (
              <button type="button" className="big" onClick={() => sync({ ...state, t: state.t + 1 })}>
                {state.t === 0 ? 'Start the run' : 'Next turn →'}
              </button>
            )}
            {state.t > 0 && (
              <p className="tc-status" role="status">
                Turn {state.t}: the model asked for {asked(state.t) || 'no call, and answered'}.
              </p>
            )}
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
      inspectPanel="messages"
      panels={{
        loop: {
          title: 'The loop',
          render: () => (
            <div className="tc-def">
              <p className="lbl">The task</p>
              <p>{REC.asks.damaged}</p>
              <p className="lbl">The agent’s tools</p>
              <p>{REC.tools.join(', ')}</p>
              <p className="lbl">Each turn</p>
              <p>
                The model reads everything so far, then either asks for calls or answers. The host runs the calls and
                sends the results back.
              </p>
              <Fact id="react-loop" />
              <Fact id="ground-truth" />
            </div>
          ),
        },
        messages: {
          title: 'Steps',
          render: s => (
            <>
              <Messages lanes={agentLanes(R)} msgs={agentMessages(R)} upTo={upTo(s.t)} />
              <Fact id="stopping-conditions" />
            </>
          ),
        },
      }}
    />
  );
}
