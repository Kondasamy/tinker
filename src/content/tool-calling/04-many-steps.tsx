// Chapter 4: two lookups that don't depend on each other go out in one turn (the recorded parallel turn, drawn as one
// batch); a refund that needs the order total waits for it (refund-sequence, two turns). Then the reader lowers the
// host's call cap (DOMAINS['refund-sequence'].cap, host-only, never in the signature) until the loop stops early.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { toolLanes, transcript, type Shown } from '../../components/scenes/toolSequence';
import { DOMAINS, answerOf, run, stepsOf, type Run } from '../../lib/tools/host';
import { RECORDINGS } from '../../lib/tools/turns';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, Messages, Outcome, Play, RecordedNote, Stepper, ToolStage } from './kit';
import { OFFICE_PARTS } from '../../components/scenes/officeScene';

const MODULE = 'tool-calling',
  ID = '04-many-steps';
const LANES = toolLanes();
const PAR = RECORDINGS.parallel,
  SEQ = RECORDINGS['refund-sequence'];
const CAPS = DOMAINS['refund-sequence'].cap as number[];
const FULL = CAPS[0];
type Scene = 'parallel' | 'sequence';
const PAR_RUN = run(PAR);
const SEQ_RUNS = Object.fromEntries(CAPS.map(c => [c, run(SEQ, { cap: c })])) as Record<number, Run>;
const MSGS: Record<Scene, Record<number, Shown[]>> = {
  parallel: { [FULL]: transcript(PAR, PAR_RUN) },
  sequence: Object.fromEntries(CAPS.map(c => [c, transcript(SEQ, SEQ_RUNS[c])])),
};

const turnsOf = (r: Run) => stepsOf(r, 'proposal').map(p => p.turn);
const PAR_IDS = stepsOf(PAR_RUN, 'proposal')
  .map(p => p.call.arguments.order_id)
  .join(' and ');
const [LOOKUP, REFUND] = stepsOf(SEQ_RUNS[FULL], 'proposal').map(p => p.call);
const capped = (c: number) => SEQ_RUNS[c].status === 'capped';

interface S {
  scene: Scene;
  cap: number;
  shown: number;
  p1: number | null;
  p2: number | null;
  quiz: number | null;
}
const msgs = (s: S) => (s.scene === 'parallel' ? MSGS.parallel[FULL] : MSGS.sequence[s.cap]);
const done = (s: S) => s.shown >= msgs(s).length;
const calls = (n: number) => `${n} call${n === 1 ? '' : 's'}`;

const P1 = {
  question: `The employee asks: “${PAR.ask}” The two lookups don’t depend on each other. How does the model ask for them?`,
  options: [
    'One call, waits for its result, then the other',
    'Both calls in one turn; the host runs both',
    'It can only look up one order per question',
  ],
};
// read off the recording: both proposals in the same turn means parallel
const OUT1 = new Set(turnsOf(PAR_RUN)).size === 1 && turnsOf(PAR_RUN).length > 1 ? 1 : 0;
const P2 = {
  question: `Now: “${SEQ.ask}” The model has ${SEQ.tools.join(' and ')}. Can it ask for both at once?`,
  options: [
    `Yes: both in one turn, to save time`,
    `No: it needs the total from ${LOOKUP.name} before it can write the ${REFUND.name} call`,
  ],
};
const OUT2 = new Set(turnsOf(SEQ_RUNS[FULL])).size > 1 ? 1 : 0;

export const PARTS = OFFICE_PARTS;

export const QUIZ = {
  question: `Who stopped the ${REFUND.name} call?`,
  options: [
    'The model: it decided it had done enough',
    'The host: the call cap is a rule in your software, and the model never sees it',
    'The order system: it refused the refund',
    `The schema: ${REFUND.name}’s arguments were invalid`,
  ],
  correct: 1,
  explanation:
    'The model proposes calls; the host decides how many run. A cap is one of the host’s own rules, like validation.',
  why: [
    `The model asked for ${REFUND.name}: it wanted to go on, and the host said no.`,
    'Right: the cap lives in the host, and the model only proposes calls while the host decides what runs.',
    'The order system never saw the call: the host stopped before sending it.',
    `The arguments were fine: the same call ran when the cap was ${FULL}.`,
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict-parallel',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `Hollis Hardware has two orders open and wants news on both. The host offers ${PAR.tools.join(', ')}.`,
    act: 'Predict before you run it.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'run-parallel',
    focus: 'play',
    visibleControls: ['p1', 'play'],
    narration: 'Your pick is locked.',
    act: 'Run the request and step through the messages.',
    predicate: s => s.scene === 'parallel' && done(s),
    hint: 'Press “Run the request”, then “Next message” until the answer arrives.',
  },
  {
    id: 'parallel',
    focus: 'next',
    visibleControls: ['out1', 'next'],
    opensDrawer: 'messages',
    narration: `Orders ${PAR_IDS} were looked up as parallel calls: both came from one model turn, and the host ran both.`,
    act: 'Now try a refund.',
    say: { block: 'orders', text: 'Two at once' },
    predicate: s => s.scene === 'sequence',
  },
  {
    id: 'predict-sequence',
    focus: 'p2',
    visibleControls: ['p2'],
    opensDrawer: null,
    narration: 'A request where the order of the calls matters.',
    act: 'Predict first.',
    predicate: s => s.p2 !== null,
  },
  {
    id: 'run-sequence',
    focus: 'play',
    visibleControls: ['p2', 'play'],
    narration: 'Your pick is locked.',
    act: 'Run it and watch the turns.',
    predicate: s => s.scene === 'sequence' && s.cap === FULL && done(s),
    hint: 'Press “Run the request”, then “Next message” until the answer arrives.',
  },
  {
    id: 'cap',
    focus: 'cap',
    visibleControls: ['out2', 'cap', 'fact'],
    narration: `A sequence: ${REFUND.name} waited for ${LOOKUP.name}’s total. A call cap stops runaway loops; this host allows ${calls(FULL)}.`,
    act: 'Lower it until the refund is stopped.',
    say: { block: 'host', text: 'Counts calls' },
    predicate: s => s.scene === 'sequence' && capped(s.cap) && done(s),
    hint: `Press the “Fewer” button until the cap is too small for both calls.`,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: `Stopped: the host never ran ${REFUND.name}. The model chooses calls; your software sets the limits.`,
    act: 'One question to finish.',
    say: { block: 'host', text: 'Stopped' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Where does the cap live: in what the model reads, or in the software that runs the calls?',
  },
];

export default function ManySteps() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ scene: 'parallel', cap: FULL, shown: 0, p1: null, p2: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, inspect, say }) => (
        <ToolStage
          lanes={LANES}
          msgs={msgs(state)}
          upTo={state.shown}
          inspect={inspect}
          office={{
            tools: (state.scene === 'parallel' ? PAR : SEQ).tools.length,
            schema: true,
            cap: state.scene === 'sequence' ? state.cap : undefined,
          }}
          say={say}
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        p2: ({ state, apply }) => <Predict {...P2} value={state.p2} onPredict={i => apply({ ...state, p2: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUT1} />,
        out2: ({ state }) => <Outcome {...P2} prediction={state.p2} outcome={OUT2} />,
        play: ({ state, sync }) => (
          <Play shown={state.shown} total={msgs(state).length} onStep={n => sync({ ...state, shown: n })} />
        ),
        next: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, scene: 'sequence', shown: 0 })}>
            Now a refund →
          </button>
        ),
        // a new cap re-runs the request at once, so the figure shows its effect straight away
        cap: ({ state, sync }) => (
          <>
            <Stepper
              label="Call cap: most tool calls per request"
              values={CAPS}
              value={state.cap}
              show={calls}
              down="− Fewer"
              up="+ More"
              onChange={c => sync({ ...state, cap: c, shown: MSGS.sequence[c].length })}
            />
            <p className="tc-status" role="status">
              {capped(state.cap)
                ? `Stopped early. ${stepsOf(SEQ_RUNS[state.cap], 'cap')[0].text}`
                : `Finished: “${answerOf(SEQ_RUNS[state.cap])}”`}
            </p>
          </>
        ),
        fact: () => (
          <>
            <p className="note">{`This host counts calls and allows ${calls(FULL)}, a number picked for the story. Real toolkits set their own limit:`}</p>
            <Fact id="max-turns" />
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
        messages: {
          title: 'Messages',
          render: s => (
            <>
              <Messages lanes={LANES} msgs={msgs(s)} upTo={s.shown} />
              <Fact id="parallel-calls" />
              <Fact id="tool-choice" />
              <RecordedNote />
            </>
          ),
        },
      }}
    />
  );
}
