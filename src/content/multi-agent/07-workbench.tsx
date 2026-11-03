// Chapter 7: the workbench (R6c.7). Three hand-written jobs (the 30-catalogue supplier report, an 8-catalogue euro list
// whose parts must talk, a 4-catalogue quote), each with a token budget and a deadline. Per job the reader sets
// helpers (drag cords or the radio), the brief and checks; the lead's timeout is always set and every job hides one
// misread price. A job passes when its report is right, within budget and on time. The puzzle accepts every setup in
// WINNERS (computed by enumeration in sim.ts, pinned and recomputed in tests/unit/multi-agent.test.ts).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Select from '../../components/story/Select';
import { SWITCH_PARTS, DESKS } from '../../components/scenes/switchboardScene';
import { benchRun, JOBS, jobOf, type Setup, WINNERS, wins } from '../../lib/multi-agent/sim';
import { num } from '../../lib/format';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, RunStage, runOf, setupOf, ToyNote, type Run } from './kit';

const MODULE = 'multi-agent',
  ID = '07-workbench';
export const PARTS = SWITCH_PARTS;
const HELPERS = [0, 1, 2, 3, 4, 5] as const;

interface S {
  job: string;
  runs: Record<string, Run>;
  quiz: number | null;
}
const START: Record<string, Run> = Object.fromEntries(
  JOBS.map(j => [j.id, runOf([], { brief: 'vague', timeout: true, ran: true })]),
);
const setOf = (r: Run): Setup => ({ helpers: r.wired.length, brief: r.brief, check: r.check });
const passes = (s: S) => JOBS.every(j => wins(j, setOf(s.runs[j.id])));
/** "Show me": the first winning setup of every job */
const solved = (s: S): S => ({
  ...s,
  runs: Object.fromEntries(
    JOBS.map(j => {
      const w = WINNERS[j.id][0];
      return [j.id, runOf(DESKS.slice(0, w.helpers), { brief: w.brief, check: w.check, timeout: true, ran: true })];
    }),
  ),
});

export const QUIZ = {
  question: 'A new job: summarise 200 separate product reviews by Friday. Which setup fits?',
  options: [
    'A few helpers with detailed briefs, every reply checked',
    'One agent alone: helpers always cost too much',
    'As many helpers as possible, unchecked to save tokens',
  ],
  correct: 0,
  explanation: 'Split work only where the parts don’t need to talk, and check every helper’s answer.',
  why: [
    'Right: the reviews don’t depend on each other, so they split cleanly, and checks catch the slips.',
    'Two hundred reviews won’t fit one agent’s window by Friday; separate parts are where helpers pay.',
    'Past a few helpers the bill grows faster than the time falls, and unchecked slips reach the summary.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'bench',
    focus: 'bench',
    visibleControls: ['score', 'job'],
    narration: 'Three jobs, each with a budget and a deadline. Each hides one misread price; the timeout is set.',
    act: 'Set each job until all three pass.',
    say: { block: 'coil', text: 'Drag to hire' },
    status: 'Each job’s report is right, within its budget and on time.',
    predicate: passes,
    hint: 'Check replies everywhere. The euro list must talk and the quote is small: try the lead alone.',
    solution: solved,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['score', 'fact', 'quiz'],
    narration: 'Helpers paid off only on the big job with separate parts. Every job needed its replies checked.',
    act: 'One question to finish.',
    status: 'All three reports lie right on Ines’s tray.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Do the reviews depend on each other?',
  },
];

function Score({ s }: { s: S }) {
  return (
    <ul className="ma-score" aria-label="Jobs">
      {JOBS.map(j => {
        const r = benchRun(j, setOf(s.runs[j.id])),
          ok = wins(j, setOf(s.runs[j.id]));
        return (
          <li key={j.id} data-pass={ok ? '1' : '0'}>
            <strong>{j.name}</strong>
            {`: ${r.correct ? 'right' : r.finished ? 'wrong' : 'never finished'}, ${num(r.tokens)} of ${num(j.budget)} tokens, ${r.minutes ?? '–'} of ${j.deadline} min `}
            <span className={`stamp ${ok ? 'correct' : 'wrong'}`}>{ok ? 'PASS' : 'FAIL'}</span>
          </li>
        );
      })}
    </ul>
  );
}

export default function Workbench() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ job: JOBS[0].id, runs: START, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, say, focus }) => {
        const r = state.runs[state.job];
        // the bench always shows its job run: any setting change runs it again
        const put = (next: Run) => {
          const s2 = { ...state, runs: { ...state.runs, [state.job]: { ...next, timeout: true, ran: true } } };
          (focus === 'bench' ? apply : sync)(s2);
        };
        return (
          <RunStage
            s={r}
            apply={put}
            sync={put}
            job={jobOf(state.job)}
            sc={{ slip: true }}
            helpers={HELPERS}
            briefs
            checks
            canRun={false}
            say={say}
            extra={
              <label className="ma-job">
                <span>Job</span>
                <Select value={state.job} onChange={e => sync({ ...state, job: e.target.value })} aria-label="Job">
                  {JOBS.map(j => (
                    <option key={j.id} value={j.id}>
                      {j.name}
                    </option>
                  ))}
                </Select>
              </label>
            }
          />
        );
      }}
      controls={{
        score: ({ state }) => <Score s={state} />,
        job: ({ state }) => {
          const j = jobOf(state.job);
          return (
            <p className="note">
              {j.name}: {j.catalogues} catalogues{j.talk ? ' whose helpers must wait on each other' : ''}; budget{' '}
              {num(j.budget)} tokens, deadline {j.deadline} minutes. Setup now: {setupOf(state.runs[state.job]).helpers}{' '}
              helpers.
            </p>
          );
        },
        fact: () => (
          <>
            <Fact id="worth-it" />
            <ToyNote />
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
    />
  );
}
