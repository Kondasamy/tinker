// Chapter 3: open coding (R12.3, KTD8). A note per failed trace, in the reader's own words or from a suggestion chip.
// Notes are never graded: they live in this chapter's saved run (localStorage, this module's progress), are capped at
// MAX_NOTE characters, render as text only and never leave the browser. Reset clears them with the run. Chapter 4 reads
// them back; a trace left without a note carries its suggested note there.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { FAILED, MODES, traceOf } from '../../lib/observability/traces';
import { MAX_NOTE, NEEDED_NOTES, clampNote, notedIds, suggestionsFor } from '../../lib/observability/coding';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { Fact, MODULE, ObsStage, ToyNote, TraceCard, wallOf, type View } from './kit';
import { TRACE_PARTS } from '../../components/scenes/traceScene';

export const PARTS = TRACE_PARTS;

const ID = '03-open-coding';
export const P1 = {
  question: `You’ll read ${FAILED.length} failed traces with no list of categories. What do you expect to find?`,
  options: [
    'One bug behind them all',
    'A handful of kinds of failure, each seen several times',
    `${FAILED.length} different problems`,
  ],
};
const KINDS = MODES.length;
export const OUT1 = KINDS === 1 ? 0 : KINDS >= FAILED.length ? 2 : 1;

export const QUIZ = {
  question:
    'A team starts reviewing its chatbot’s failures with a checklist of ten categories from a blog post. What does open coding do differently?',
  options: [
    'It starts from the traces: a free note on each failure, and the categories come later, from the notes',
    'It uses a longer checklist, so nothing is missed',
    'It lets a model label every trace, so nobody has to read them',
  ],
  correct: 0,
  explanation:
    'Open coding reads the data first and names what it sees; categories are built from the notes afterwards.',
  why: [
    'Right: a borrowed checklist names someone else’s failures, while notes on your own traces name yours.',
    'A longer list written before reading the traces still decides in advance what you can see.',
    'A model’s labels can help later, but you check them against notes a person wrote first.',
  ],
};

interface S {
  stopped: boolean;
  notes: Record<string, string>;
  at: string | null;
  p1: number | null;
  view: View;
  quiz: number | null;
}
const enough = (s: S) => notedIds(s.notes).length >= NEEDED_NOTES;
// the step moves on only when the reader says so: advancing mid-word would pull the card out from under the cursor

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'So you read each failed trace and write a short note in your own words. That is open coding.',
    act: 'Predict first.',
    say: { block: 'wall', text: 'Nothing to tick' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'note',
    focus: 'notes',
    visibleControls: ['p1', 'notes', 'stop'],
    narration: 'What went wrong first, in a few words. Notes are never graded and stay in this browser.',
    act: `Note at least ${NEEDED_NOTES} traces, then press Done.`,
    say: { block: 'wall', text: 'Focus lights it' },
    predicate: s => enough(s) && s.stopped,
    hint: `Type your own, or press a suggestion (you can edit it after). Any ${NEEDED_NOTES} traces will do.`,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'notes', 'facts', 'quiz'],
    narration: `Some notes say the same thing in different words. Across all ${FAILED.length} traces there are ${KINDS} kinds of failure.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which comes first: the notes, or the categories?',
  },
];

function Notes({ s, sync }: { s: S; sync: (s: S) => void }) {
  const set = (id: string, text: string) => sync({ ...s, at: id, notes: { ...s.notes, [id]: clampNote(text) } });
  return (
    <div className="tc-bench">
      <p className="tc-status" role="status">
        {notedIds(s.notes).length} of {FAILED.length} traces noted
        {notedIds(s.notes).length < NEEDED_NOTES ? `; ${NEEDED_NOTES} needed` : ''}.
      </p>
      <ol className="ob-list">
        {FAILED.map((t, i) => (
          <li key={t.id}>
            <TraceCard trace={t}>
              <label className="ob-field">
                <span className="lbl">Note on trace {i + 1}</span>
                <input
                  type="text"
                  maxLength={MAX_NOTE}
                  value={s.notes[t.id] ?? ''}
                  autoComplete="off"
                  onFocus={() => s.at !== t.id && sync({ ...s, at: t.id })}
                  onChange={e => set(t.id, e.target.value)}
                />
              </label>
              <div className="ob-chips" role="group" aria-label={`Suggestions for trace ${i + 1}`}>
                {suggestionsFor(t).map(n => (
                  <button
                    key={n}
                    type="button"
                    className="chip"
                    aria-pressed={s.notes[t.id] === n}
                    onClick={() => set(t.id, n)}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </TraceCard>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default function OpenCoding() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ stopped: false, notes: {}, at: null, p1: null, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const t = state.at ? traceOf(state.at) : null;
        return (
          <ObsStage
            say={say}
            room={{
              cards: wallOf(FAILED, state.at),
              board: `NOTED ${notedIds(state.notes).length} OF ${FAILED.length}`,
            }}
            trace={t}
            view={state.view}
            onView={view => sync({ ...state, view })}
            caption={
              t ? (
                <>
                  <span className="lbl">
                    Trace {t.id} · {t.customer}
                  </span>
                  <span>“{t.question}”</span>
                </>
              ) : (
                'Yesterday’s failed traces on the wall. Focus a note to light its trace.'
              )
            }
          />
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        notes: ({ state, sync }) => <Notes s={state} sync={sync} />,
        stop: ({ state, apply }) => (
          <button
            type="button"
            className="big"
            disabled={!enough(state)}
            onClick={() => apply({ ...state, stopped: true })}
          >
            Done noting for now
          </button>
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUT1} />,
        facts: () => (
          <>
            <p className="tc-fact">
              Keep writing if you like: traces you leave carry their suggested note into chapter 4, where notes become
              groups.
            </p>
            <Fact id="open-coding" />
            <Fact id="criteria-drift" />
            <ToyNote>
              Here {NEEDED_NOTES} notes are enough to go on; a real review notes far more before trusting any help.
            </ToyNote>
            <Fact id="annotate-yourself" />
            <Fact id="domain-expert" />
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
