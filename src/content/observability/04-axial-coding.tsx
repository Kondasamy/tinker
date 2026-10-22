// Chapter 4: axial coding (R12.4, KTD8). Every failed trace, with the reader's note from chapter 3 (or its suggested
// note), is moved into one of five groups with buttons. The puzzle accepts any grouping that puts traces together
// exactly when they share a reference mode, whatever the reader names the groups (groupingMatches). Then the groups are
// counted. Group names are the reader's own, kept in the step state and shown as text only.
import { useEffect, useState } from 'react';
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { puzzle, Verdict } from '../../components/quiz/Puzzle';
import { FAILED, MODE_IDS, traceOf, type ModeId } from '../../lib/observability/traces';
import {
  DAY1_COUNTS,
  GROUPS,
  MAX_NOTE,
  REFERENCE_GROUPING,
  clampNote,
  groupingMatches,
  modeOfGroup,
  mostFrequent,
  type Grouping,
} from '../../lib/observability/coding';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { Fact, MODULE, ObsStage, modeName, savedNotes, wallOf, type View } from './kit';

const ID = '04-axial-coding';
const GROUP_IDS = Array.from({ length: GROUPS }, (_, i) => i);
const P1_MODES: ModeId[] = ['missed-doc', 'stale-doc', 'wrong-order'];
export const P1 = {
  question: 'Once the notes are grouped, which kind of failure do you expect to be the most common?',
  options: ['The search finding nothing useful', 'Answers from old passages', 'Looking up the wrong order'],
};
export const OUT1 = P1_MODES.indexOf(mostFrequent(DAY1_COUNTS));

const QUIZ = {
  question:
    'Two reviewers group the same 50 traces. One calls a group “stale docs”, the other “old policy answers”, but the same traces are in each. Did they agree?',
  options: [
    'No: they named the group differently',
    'Yes: the same traces are grouped together; the names can be settled afterwards',
    'Only if they also wrote the same notes',
  ],
  correct: 1,
  explanation: 'A grouping is about which traces belong together; a name is a label for that.',
  why: [
    'The names are labels. Your own groups in this chapter passed whatever you called them.',
    'Right. Same traces together, same grouping. Then agree on a name and count.',
    'Notes are free text in each reviewer’s words; they rarely match, and don’t need to.',
  ],
};

interface S {
  groups: Grouping;
  names: Record<number, string>;
  p1: number | null;
  view: View;
  quiz: number | null;
}
const sizeOf = (s: S, g: number) => FAILED.filter(t => s.groups[t.id] === g).length;
const nameOf = (s: S, g: number) => s.names[g]?.trim() || `Group ${g + 1}`;

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `Every failed trace has a note now: yours where you wrote one, the suggested one where you didn’t. Axial coding sorts the notes into groups that share a cause. Each group is a failure mode. Before you sort:`,
    predicate: s => s.p1 !== null,
  },
  puzzle<S>({
    id: 'sort',
    focus: 'sort',
    visibleControls: ['p1', 'sort'],
    narration: `Move each trace into one of ${GROUPS} groups so that traces with the same cause share a group. Group by what went wrong, not by topic. Name the groups if you like: the names are yours and aren’t checked.`,
    broken: s => ({ ...s, groups: {} }),
    verdict: s => groupingMatches(s.groups),
    solution: s => ({
      ...s,
      groups: REFERENCE_GROUPING,
      names: Object.fromEntries(MODE_IDS.map((m, i) => [i, modeName(m)])),
    }),
    hint: 'A price and a warranty can share a cause: both answered from last year’s passage. Read the first failure, not the topic.',
  }),
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'tally', 'facts', 'quiz'],
    narration: `Counted, the ${FAILED.length} failures fall into ${GROUPS} modes. The most common: ${modeName(mostFrequent(DAY1_COUNTS)).toLowerCase()}, ${DAY1_COUNTS[mostFrequent(DAY1_COUNTS)]} traces. These traces were written by hand for this module, so the counts show the method, not any real assistant’s failure rates. One question to finish.`,
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Is a grouping about names or about which traces belong together?',
  },
];

/** chapter 3's notes, read once the page is in the browser (never during the static render) */
function useNotes() {
  const [notes, setNotes] = useState<Record<string, string>>({});
  useEffect(() => setNotes(savedNotes()), []);
  return notes;
}

// a move is never a failed try: the grouping is only right once every trace is placed, so moves sync
function Sort({ s, sync }: { s: S; sync: (s: S) => void }) {
  const notes = useNotes(),
    ok = groupingMatches(s.groups);
  return (
    <div className="tc-bench">
      <fieldset className="tc-pick">
        <legend>Group names (optional)</legend>
        <div className="ob-groups">
          {GROUP_IDS.map(g => (
            <label key={g} className="ob-field">
              <span className="lbl">
                Group {g + 1} · {sizeOf(s, g)}
              </span>
              <input
                type="text"
                maxLength={MAX_NOTE}
                value={s.names[g] ?? ''}
                autoComplete="off"
                onChange={e => sync({ ...s, names: { ...s.names, [g]: clampNote(e.target.value) } })}
              />
            </label>
          ))}
        </div>
      </fieldset>
      <p className="tc-status" role="status">
        <Verdict fixed={ok} /> {FAILED.filter(t => s.groups[t.id] !== undefined).length} of {FAILED.length} sorted.
      </p>
      <ol className="ob-list">
        {FAILED.map((t, i) => {
          const mine = notes[t.id];
          return (
            <li key={t.id} className="ob-trace" data-trace={t.id} data-ok={0}>
              <p className="ob-note">
                <span className="lbl">{mine ? 'Your note' : 'Suggested note'}</span> {mine ?? t.note}
              </p>
              <p className="ob-a">
                {t.customer}: “{t.question}”
              </p>
              <div className="ob-moves" role="group" aria-label={`Move trace ${i + 1} to a group`}>
                {GROUP_IDS.map(g => (
                  <button
                    key={g}
                    type="button"
                    className="chip"
                    aria-pressed={s.groups[t.id] === g}
                    aria-label={`Move trace ${i + 1} to ${nameOf(s, g)}`}
                    onClick={() => sync({ ...s, groups: { ...s.groups, [t.id]: g } })}
                  >
                    {g + 1}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function Tally({ s }: { s: S }) {
  return (
    <table className="tc-ledger">
      <caption>Your groups, counted</caption>
      <thead>
        <tr>
          <th scope="col">Your name</th>
          <th scope="col">Mode</th>
          <th scope="col">Traces</th>
        </tr>
      </thead>
      <tbody>
        {GROUP_IDS.map(g => {
          const m = modeOfGroup(s.groups, g);
          return (
            <tr key={g}>
              <th scope="row">{nameOf(s, g)}</th>
              <td>{m ? modeName(m) : '—'}</td>
              <td>{sizeOf(s, g)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function AxialCoding() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ groups: {}, names: {}, p1: null, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync }) => {
        const last = FAILED.filter(t => state.groups[t.id] !== undefined).at(-1) ?? null;
        const bins = GROUP_IDS.map(g => ({ label: `G${g + 1}`, count: sizeOf(state, g) }));
        return (
          <ObsStage
            room={{
              cards: wallOf(FAILED, last?.id),
              bins,
              board: `SORTED ${FAILED.filter(t => state.groups[t.id] !== undefined).length} OF ${FAILED.length}`,
            }}
            trace={last ? traceOf(last.id) : null}
            view={state.view}
            onView={view => sync({ ...state, view })}
            caption={
              <>
                <span className="lbl">Groups, front left to right</span>
                <span>{GROUP_IDS.map(g => `${nameOf(state, g)}: ${sizeOf(state, g)}`).join(' · ')}</span>
              </>
            }
          />
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        sort: ({ state, sync }) => <Sort s={state} sync={sync} />,
        tally: ({ state }) => <Tally s={state} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUT1} />,
        facts: () => <Fact id="axial-coding" />,
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
