// Chapter 7: the workbench. The reader sets the line (energy threshold and silence as ranges over their lists, streaming,
// barge-in and read-back as switches). Under it, a row per call with what went wrong, if anything, and the wait; a live
// total against the best. The puzzle accepts every plan tied for the best (WINNERS); Show me applies one of them.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { DEFAULT_LINE } from '../../lib/voice/engine';
import { SILENCES, THRESHOLDS } from '../../lib/voice/turns';
import { ms } from '../../lib/voice/latency';
import { FEWEST, LEAST_WAIT, WINNERS, solved, totals, type Plan } from '../../lib/voice/workbench';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { PHONE_PARTS } from '../../components/scenes/phoneScene';
import { PlanNote, Range, RecordedNote, Toggle, VoiceStage, segmentsOf, type View } from './kit';

const MODULE = 'voice',
  ID = '07-workbench';
export const PARTS = PHONE_PARTS;
/** where the line stood before the chapters: the default detector, no host rules */
export const START: Plan = {
  threshold: DEFAULT_LINE.threshold,
  silence: DEFAULT_LINE.silence,
  streaming: false,
  bargeIn: false,
  readBack: false,
};
/** the plan in a run's state; anything missing or unknown falls back to START's */
export const planOf = (s: Partial<Plan>): Plan => ({
  threshold: THRESHOLDS.includes(s.threshold!) ? s.threshold! : START.threshold,
  silence: SILENCES.includes(s.silence!) ? s.silence! : START.silence,
  streaming: typeof s.streaming === 'boolean' ? s.streaming : START.streaming,
  bargeIn: typeof s.bargeIn === 'boolean' ? s.bargeIn : START.bargeIn,
  readBack: typeof s.readBack === 'boolean' ? s.readBack : START.readBack,
});

export interface S extends Plan {
  view: View;
  quiz: number | null;
}

export const QUIZ = {
  question:
    'A line has no cut-offs and no errors, but two calls end in dead air. Its silence setting is the longest on offer. What should the team try first?',
  options: [
    'A shorter silence setting, then check that nobody is cut off again',
    'Turn read-back on for every call',
    'Raise the energy threshold as far as it goes',
  ],
  correct: 0,
  explanation:
    'Dead air after the caller has finished is the silence setting’s price; trim it until the slowest speaker is still heard whole.',
  why: [
    'Right: every millisecond of silence is waited out on every call, so the shortest setting that still hears the pauses wins.',
    'Read-back fixes misheard numbers; it adds a turn and doesn’t shorten the wait.',
    'A high threshold turns quiet speech into silence: it cuts quiet callers off instead.',
  ],
};

const PROBLEM: Record<string, string> = {
  'cut-off': 'cut off',
  'dead air': 'dead air',
  wrong: 'wrong order',
  'talked-over': 'talked over',
};

export const STEPS: Step<S>[] = [
  {
    id: 'tune',
    focus: 'tune',
    visibleControls: ['score', 'tune'],
    narration: 'Your energy threshold, silence setting and host rules run live over every call.',
    act: `Find the fewest problems (${FEWEST}), then the least wait.`,
    say: { block: 'phone', text: 'Worst call' },
    predicate: s => solved(planOf(s)),
    hint: 'Each chapter fixed one call: streaming (2), the silence and threshold that hear Ravi whole on both his calls (3), barge-in (4), read-back (5).',
    solution: s => ({ ...s, ...WINNERS[0] }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['score', 'tune', 'quiz'],
    narration: `${FEWEST === 0 ? 'No problems' : `${FEWEST} problems`}, ${ms(LEAST_WAIT)} total wait: the best any line does. Every rule is needed; no one setting serves every call.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What does every caller pay for a long silence setting?',
  },
];

/** The headline, then each call's result. */
function Score({ s }: { s: S }) {
  const p = planOf(s),
    t = totals(p),
    best = solved(p);
  return (
    <div role="status" data-problems={t.problems} data-best={best ? '1' : '0'}>
      <p className="vo-headline">
        <strong>{t.problems}</strong> problem{t.problems === 1 ? '' : 's'} · total wait {ms(t.wait)}
        <span className={`stamp ${best ? 'correct' : 'neutral'}`}>
          {best ? 'BEST' : `BEST IS ${FEWEST} · ${ms(LEAST_WAIT)}`}
        </span>
      </p>
      {best && <p className="vo-note">One of {WINNERS.length} that work.</p>}
      <table className="tc-ledger" style={{ marginTop: 10 }}>
        <caption>Your line, call by call</caption>
        <thead>
          <tr>
            <th scope="col">Call</th>
            <th scope="col">Result</th>
            <th scope="col">Wait</th>
          </tr>
        </thead>
        <tbody>
          {t.rows.map(r => (
            <tr key={r.call.id} data-call={r.call.id} data-problem={r.problem ?? 'none'}>
              <th scope="row">
                {r.call.title}
                <span className="vo-why">
                  {r.call.about} {r.recording.note}
                </span>
              </th>
              <td className={r.problem ? 'bad' : 'ok'}>{r.problem ? PROBLEM[r.problem] : 'ok'}</td>
              <td>{r.wait === null ? '–' : ms(r.wait)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <PlanNote />
      <RecordedNote />
    </div>
  );
}

export default function Workbench() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ...START, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, focus, say }) => {
        const p = planOf(state),
          t = totals(p),
          worst = t.rows.find(r => r.problem) ?? t.rows[1];
        return (
          <VoiceStage
            step={focus}
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            shown={{
              phone: {
                stage: 'reply',
                wait: worst.wait,
                interrupt: worst.problem === 'cut-off' || worst.problem === 'talked-over',
                stopped: worst.call.id === 'slots' && p.bargeIn,
                unsure: worst.call.id === 'mishear',
              },
              timeline: segmentsOf(worst),
              caption: `${t.problems} problem${t.problems === 1 ? '' : 's'}. Showing ${worst.call.title.toLowerCase()}: ${worst.problem ? PROBLEM[worst.problem] : 'ok'}.`,
            }}
          />
        );
      }}
      controls={{
        score: ({ state }) => <Score s={state} />,
        // changing the line is an attempt only while it is the puzzle
        tune: ({ state, apply, sync, focused }) => {
          const set = focused ? apply : sync,
            p = planOf(state);
          return (
            <div className="vo-bench">
              <Range
                label="Energy threshold"
                values={THRESHOLDS}
                value={p.threshold}
                show={String}
                onChange={v => set({ ...state, threshold: v })}
              />
              <Range
                label="Silence setting"
                values={SILENCES}
                value={p.silence}
                show={ms}
                onChange={v => set({ ...state, silence: v })}
              />
              <div className="vo-row">
                <Toggle label="Streaming" on={p.streaming} onChange={v => set({ ...state, streaming: v })} />
                <Toggle label="Barge-in" on={p.bargeIn} onChange={v => set({ ...state, bargeIn: v })} />
                <Toggle
                  label="Read back unsure numbers"
                  on={p.readBack}
                  onChange={v => set({ ...state, readBack: v })}
                />
              </div>
            </div>
          );
        },
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
