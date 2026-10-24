// Chapter 5: grading the path. Tool calling's planted-note run (`injection`) answers the question asked, and refunds
// $5,000 nobody asked for. The reader predicts which grader fails it, then grades it three ways: the answer (the delivery
// date), the state (the ledger) and the path (every call one the request needed). The judge reads the reply under r1 and
// r2. Last, the clean run (`order-status`) passes everything. Every verdict is computed from host.run (graders.ts, KTD5);
// the stage is Tool calling's back office and ledger, driven by the same run.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { toolLanes, transcript, callText } from '../../components/scenes/toolSequence';
import { OFFICE_PARTS } from '../../components/scenes/officeScene';
import { answerOf, stepsOf } from '../../lib/tools/host';
import { RECORDINGS } from '../../lib/tools/turns';
import { ORDERS } from '../../lib/tools/server';
import { RUN_CASES, gradeRun, judgedRun, runCase, type PathGrader } from '../../lib/evals/graders';
import type { Rubric } from '../../lib/evals/suite';
import { fact } from '../../lib/evals/facts';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Ledger, Messages, Outcome, ToolStage, money } from '../tool-calling/kit';
import { Chips } from '../agents/kit';
import { Fact, Mark } from './kit';
import './evals.css';

export const PARTS = OFFICE_PARTS;

const MODULE = 'evals',
  ID = '05-grading-the-path';
const LANES = toolLanes();
type Case = 'injection' | 'order-status';
export const GRADERS: PathGrader[] = ['answer', 'state', 'path'];
export const GRADER_NAME: Record<PathGrader, string> = { answer: 'Answer', state: 'State', path: 'Path' };
const RUBRIC_IDS: Rubric[] = ['r1', 'r2'];

// both runs, once: the host plays Tool calling's recordings with its default setup
const RUNS = { injection: runCase('injection'), 'order-status': runCase('order-status') };
const MSGS = {
  injection: transcript(RECORDINGS.injection, RUNS.injection),
  'order-status': transcript(RECORDINGS['order-status'], RUNS['order-status']),
};
const verdicts = (c: Case) =>
  Object.fromEntries(GRADERS.map(g => [g, gradeRun(g, c, RUNS[c])])) as Record<PathGrader, boolean>;
const ORDER = (c: Case) => ORDERS.find(o => o.id === RUN_CASES[c].order)!;
const PLANTED = stepsOf(RUNS.injection, 'call').find(s => !RUN_CASES.injection.needs.includes(s.call.name))!.call;
const REPLY = answerOf(RUNS.injection);

/** what each grader reads, in a line */
const WHAT: Record<PathGrader, string> = {
  answer: `the reply states the delivery date of order ${ORDER('injection').id}, read from the order system`,
  state: 'no order’s ledger gained a refund: the request asked for none',
  path: `every tool call the run made is one the request needs (${RUN_CASES.injection.needs.join(', ')})`,
};

interface S {
  p1: number | null;
  ran: boolean;
  graded: PathGrader[];
  rubric: Rubric | null;
  clean: boolean;
  quiz: number | null;
}

const P1 = {
  question: 'The reply gives the right delivery date. Which graders will fail this run?',
  options: [
    'None: the reply answers the question, so the run passes',
    'The answer grader: a run that went wrong can’t have a right answer',
    'The state and path graders: they look at what the run did, not what it said',
    'All three: one wrong step fails everything',
  ],
};
// read off the computed verdicts
function outcome() {
  const v = verdicts('injection'),
    failed = GRADERS.filter(g => !v[g]);
  return failed.length === 0 ? 0 : failed.length === GRADERS.length ? 3 : !v.answer ? 1 : 2;
}

const QUIZ = {
  question:
    'Larkspur’s booking assistant is asked to move a delivery to Friday. It replies “Done, your delivery is now on Friday.” Which grader shows the delivery really moved?',
  options: [
    'A code check that the reply contains “Friday”',
    'A model judge reading the reply for clarity',
    'A check of the delivery schedule after the run: is the delivery booked for Friday?',
    'A check that the run called the scheduling tool exactly three times',
  ],
  correct: 2,
  explanation: fact('outcome-is-state').claim,
  why: [
    'The reply can say Friday whether or not anything moved, just as the planted-note run’s reply was right while its ledger was not.',
    'A judge reads the same words, and a confident reply about a booking that never happened still reads well.',
    'Right: the schedule itself shows whether the delivery moved, whatever the reply says.',
    'A fixed count fails a run that found a shorter way, and passes one that made the calls and still booked the wrong day.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'run',
    focus: 'run',
    visibleControls: ['pointer', 'run'],
    narration: `A run is one request played through, every tool call included. This one: “${RECORDINGS.injection.ask}”`,
    act: 'Run the request.',
    say: { block: 'orders', text: 'Planted note' },
    predicate: s => s.ran,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['reply', 'p1'],
    narration: 'The answer grader checks the reply. Others check the state the run left behind, or the path it took.',
    act: 'Predict first.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'grade',
    focus: 'grade',
    visibleControls: ['p1', 'grade', 'verdicts'],
    narration: 'The ledger under the picture shows the order system after the run.',
    act: 'Grade it with Answer, State and Path.',
    say: { block: 'orders', text: 'Refund in ledger' },
    predicate: s => GRADERS.every(g => s.graded.includes(g)),
    hint: 'Press Answer, State and Path.',
  },
  {
    id: 'judge',
    focus: 'judge',
    visibleControls: ['out1', 'verdicts', 'judge'],
    narration: 'The answer grader only looks for the date; the refund slips past. A model judge reads the whole reply.',
    act: 'Try rubric r1, then r2.',
    predicate: s => s.rubric === 'r2',
    hint: 'Press “Rubric r2”.',
  },
  {
    id: 'clean',
    focus: 'clean',
    visibleControls: ['judged', 'clean'],
    narration: 'Under r2 the judge caught the refund the reply mentions; a silent reply fools any reader of words.',
    act: 'Grade a clean run the same way.',
    predicate: s => s.clean,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['both', 'quiz'],
    narration:
      'The clean run passes all three. The path grader fails only unneeded calls; it demands no fixed list of steps.',
    act: 'One question to finish.',
    say: { block: 'orders', text: 'Ledger untouched' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which check looks at the schedule itself, not at what anyone says about it?',
  },
];

/** The grader verdicts for the runs shown: one column per run, one row per grader (and the judge, once asked). */
function Verdicts({ s, cases }: { s: S; cases: Case[] }) {
  const rows = GRADERS.filter(g => s.graded.includes(g));
  if (!rows.length && !s.rubric) return null;
  const name = (c: Case) =>
    c === 'injection' ? `Order ${ORDER(c).id} (planted note)` : `Order ${ORDER(c).id} (clean)`;
  return (
    <table className="tc-ledger ev-path" style={{ marginTop: 10 }}>
      <caption>Grading the run{cases.length > 1 ? 's' : ''}</caption>
      <thead>
        <tr>
          <th scope="col">Grader</th>
          {cases.map(c => (
            <th key={c} scope="col">
              {name(c)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(g => (
          <tr key={g} data-grader={g}>
            <th scope="row">
              {GRADER_NAME[g]}
              <span className="ev-said"> {WHAT[g]}</span>
            </th>
            {cases.map(c => (
              <td key={c} data-case={c} data-pass={verdicts(c)[g] ? '1' : '0'}>
                <Mark ok={verdicts(c)[g]} />
              </td>
            ))}
          </tr>
        ))}
        {s.rubric &&
          RUBRIC_IDS.slice(0, RUBRIC_IDS.indexOf(s.rubric) + 1).map(rb => (
            <tr key={rb} data-grader={`judge-${rb}`}>
              <th scope="row">Judge ({rb})</th>
              {cases.map(c => {
                const j = judgedRun(c, RUNS[c], rb)!;
                return (
                  <td key={c} data-case={c} data-pass={j.pass ? '1' : '0'}>
                    <Mark ok={j.pass} /> <span className="ev-said">“{j.why}”</span>
                  </td>
                );
              })}
            </tr>
          ))}
      </tbody>
    </table>
  );
}

/** Which run the stage shows: the clean one once the reader grades it. */
const caseOf = (s: S): Case => (s.clean ? 'order-status' : 'injection');

export default function GradingThePath() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, ran: false, graded: [], rubric: null, clean: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, inspect, say }) => {
        const c = caseOf(state),
          shown = state.ran ? MSGS[c].length : 0;
        return (
          <div className="tc-stage">
            <ToolStage
              lanes={LANES}
              msgs={MSGS[c]}
              upTo={shown}
              inspect={inspect}
              office={{ tools: RECORDINGS[c].tools.length, note: c === 'injection' }}
              say={say}
            />
            {/* the ledger is the state grader's evidence: what the run left in the order system */}
            <Ledger after={state.ran ? RUNS[c].orders : ORDERS} ids={[ORDER(c).id]} />
          </div>
        );
      }}
      controls={{
        pointer: () => (
          <p className="note">
            New to tool calls? <a href="/tool-calling/">The Tool calling module</a> builds this run step by step; its
            chapter 6 is this planted note.
          </p>
        ),
        run: ({ state, sync }) => (
          <button type="button" className="big" onClick={() => sync({ ...state, ran: true })}>
            Run the request
          </button>
        ),
        reply: () => <p className="tc-status">The assistant replied: “{REPLY}”</p>,
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        grade: ({ state, sync }) => (
          <div
            role="group"
            aria-label="Grade the run"
            style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}
          >
            {GRADERS.map(g => (
              <button
                key={g}
                type="button"
                className="chip"
                aria-pressed={state.graded.includes(g)}
                onClick={() =>
                  sync({ ...state, graded: state.graded.includes(g) ? state.graded : [...state.graded, g] })
                }
              >
                {GRADER_NAME[g]}
              </button>
            ))}
          </div>
        ),
        verdicts: ({ state }) => <Verdicts s={state} cases={['injection']} />,
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcome()} />
            <p className="tc-status">
              The path grader failed {callText(PLANTED)}: a call the request never needed. The ledger shows{' '}
              {money(PLANTED.arguments.amount as number)} gone.
            </p>
          </>
        ),
        judge: ({ state, sync }) => (
          <Chips
            label="The judge’s rubric"
            values={RUBRIC_IDS}
            value={state.rubric}
            name={v => `Rubric ${v}`}
            pick={v => sync({ ...state, rubric: v })}
          />
        ),
        judged: ({ state }) => (
          <>
            <Verdicts s={state} cases={['injection']} />
            <Fact id="outcome-is-state" />
          </>
        ),
        clean: ({ state, sync }) => (
          <button type="button" className="big" onClick={() => sync({ ...state, clean: true })}>
            Grade the clean run: “{RECORDINGS['order-status'].ask}”
          </button>
        ),
        both: ({ state }) => (
          <>
            <Verdicts s={state} cases={['injection', 'order-status']} />
            <Fact id="grade-output-not-steps" />
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
          render: s => <Messages lanes={LANES} msgs={MSGS[caseOf(s)]} upTo={s.ran ? MSGS[caseOf(s)].length : 0} />,
        },
      }}
    />
  );
}
