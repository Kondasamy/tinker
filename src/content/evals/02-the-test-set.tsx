// Chapter 2: building the test set. A support log of candidate cases (data/evals/candidates.json): the reader keeps or
// drops each one and gives each kept case the reference answer it should be graded against. Then they predict whether
// their set would catch a version that makes things up, and the reveal reads their set: which of the three kinds of case
// it covers, and the gap it leaves. The step passes once every kind is covered with the right references.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { EvalStage, Fact, type Shown } from './kit';
import candidates from '../../../data/evals/candidates.json' with { type: 'json' };

const MODULE = 'evals',
  ID = '02-the-test-set';
interface Candidate {
  id: string;
  text: string;
  kind: Kind;
  keep: boolean;
  reference: string | null;
  why: string;
}
type Kind = 'real question' | 'known failure' | 'not in the documents';
const CASES = candidates as Candidate[];
const KINDS: Kind[] = ['real question', 'known failure', 'not in the documents'];
/** the reference for a case no document answers: the assistant should say so */
const DECLINE = 'No document answers this: the assistant should say so.';
const REFS = [...new Set(CASES.flatMap(c => (c.reference ? [c.reference] : []))), DECLINE];
/** the reference a kept case needs */
const rightRef = (c: Candidate) => c.reference ?? DECLINE;

interface Pick {
  keep: boolean;
  ref: string;
}
/** `caught` is the reveal, read off the set as it stood when the reader predicted */
interface S {
  picks: Record<string, Pick>;
  p1: number | null;
  caught: number | null;
  checked: boolean;
  quiz: number | null;
}

const sorted = (s: S, c: Candidate) => {
  const p = s.picks[c.id];
  return !!p && (!p.keep || p.ref !== '');
};
const kept = (s: S) => CASES.filter(c => s.picks[c.id]?.keep);
/** a kind is covered when a kept case of that kind carries its right reference */
const covers = (s: S, k: Kind) => kept(s).some(c => c.kind === k && s.picks[c.id].ref === rightRef(c));
const wrongRef = (s: S) => kept(s).filter(c => s.picks[c.id].ref !== '' && s.picks[c.id].ref !== rightRef(c));
const complete = (s: S) => CASES.every(c => sorted(s, c)) && KINDS.every(k => covers(s, k)) && wrongRef(s).length === 0;
/** the team's own sort: what Show me applies */
const TEAM: Record<string, Pick> = Object.fromEntries(
  CASES.map(c => [c.id, { keep: c.keep, ref: c.keep ? rightRef(c) : '' }]),
);

/** what a missing kind leaves unchecked */
const GAP: Record<Kind, string> = {
  'real question': 'No real question from the log is kept, so the set doesn’t test what people actually ask.',
  'known failure':
    'No known failure is kept, so a mistake the assistant made before could come back and nothing would catch it.',
  'not in the documents':
    'Nothing asks what the documents can’t answer, so no case checks that the assistant says so instead of making something up.',
};

const P1 = {
  question:
    'A new version starts making up answers when no document covers the question, like promising a price match. Will your test set catch it?',
  options: [
    'Yes: my set has a case the documents can’t answer, and its reference says so',
    'No: nothing in my set checks that the assistant says the documents don’t answer',
    'Yes: a version that makes things up fails every case anyway',
  ],
};
const outcome = (s: S) => (covers(s, 'not in the documents') ? 0 : 1);

const QUIZ = {
  question:
    'Larkspur adds an assistant for the HR handbook. The team has a month of staff questions logged. Which first test set is best?',
  options: [
    'The twenty questions asked most often, each with the answer it should get',
    'Real questions from the log, the ones it already got wrong, and a few the handbook can’t answer, each with the answer it should get',
    'Every message in the log, exactly as written, so nothing is missed',
    'Questions the team writes to be as hard as possible',
  ],
  correct: 1,
  explanation:
    'A test set mixes real questions, known failures and asks the documents can’t answer, and every case carries the answer it should get.',
  why: [
    'Popular questions are a good start, but this set has no known failures and nothing the handbook can’t answer, so a made-up answer would pass unseen.',
    'Right. Real use, known failures and the gaps in the documents each catch a different kind of mistake, and each case carries its reference answer to grade against.',
    'Copies and thank-yous add nothing to grade, and a message without a reference answer can’t pass or fail.',
    'Hard questions nobody asks test something, but not what Larkspur’s staff need. Cases start from real use and real failures.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'sort',
    focus: 'log',
    visibleControls: ['log'],
    narration:
      'Larkspur’s test set needs more cases. A test case is one question the assistant is asked on every run, with the answer it should give. The support lead exports a week of the assistant’s chat log. Sort it: keep a message as a case, or drop it. Give each kept case its reference answer: the answer a grader will compare the assistant’s against.',
    predicate: s => CASES.every(c => sorted(s, c)),
    hint: 'Every card needs Keep or Drop, and every kept card a reference answer.',
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['set', 'p1'],
    narration:
      'Your set is sorted. Each change to the assistant will now run all of it. Before you see what it covers:',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'check',
    focus: 'coverage',
    visibleControls: ['out1', 'coverage', 'fix', 'keep'],
    narration:
      'Each card in the log is one of three kinds. A real question: what staff actually asked. A known failure: a question the assistant once got wrong. And an ask no document answers, where the right answer is to say so. A good set covers all three. Fix any gap, then keep the set.',
    predicate: s => s.checked && complete(s),
    hint: 'Keep at least one card of each kind, each with its right reference answer. A card no document answers takes “No document answers this”.',
    solution: s => ({ ...s, picks: TEAM, checked: true }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['team', 'quiz'],
    narration:
      'Cases come from real use and from real failures, not from someone imagining questions. The asks the documents can’t answer matter too: there, a made-up answer is the failure, and only a case can catch it. Each case’s reference answer is what makes it gradeable. One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which set has all three kinds of case, each with its answer?',
  },
];

/** The log: a card per message, Keep / Drop, and for a kept card the reference answer it needs. */
function Log({ s, sync, kinds }: { s: S; sync: (next: S) => void; kinds: boolean }) {
  const set = (id: string, p: Pick) => sync({ ...s, picks: { ...s.picks, [id]: p } });
  return (
    <ul className="ev-log" aria-label="The support log">
      {CASES.map(c => {
        const p = s.picks[c.id],
          flag = p?.keep && p.ref === '',
          wrong = kinds && p?.keep && p.ref !== '' && p.ref !== rightRef(c);
        return (
          <li
            key={c.id}
            className="ev-case"
            data-id={c.id}
            data-state={!p ? 'unsorted' : p.keep ? (flag ? 'flag' : 'kept') : 'dropped'}
          >
            <p className="ev-q">
              “{c.text}”{kinds && <span className="lbl"> · {c.kind}</span>}
            </p>
            <div role="group" aria-label={`Sort: ${c.text}`} className="ev-sort">
              <button
                type="button"
                className="chip"
                aria-pressed={!!p?.keep}
                onClick={() => set(c.id, { keep: true, ref: p?.ref ?? '' })}
              >
                Keep
              </button>
              <button
                type="button"
                className="chip"
                aria-pressed={p ? !p.keep : false}
                onClick={() => set(c.id, { keep: false, ref: '' })}
              >
                Drop
              </button>
              <span className="ev-status">
                {!p
                  ? 'not sorted'
                  : !p.keep
                    ? 'dropped'
                    : flag
                      ? 'kept: needs a reference answer'
                      : wrong
                        ? 'kept: check its reference'
                        : 'kept'}
              </span>
            </div>
            {p?.keep && (
              <label className="ev-ref">
                <span className="lbl">Reference answer</span>
                <select value={p.ref} onChange={e => set(c.id, { keep: true, ref: e.target.value })}>
                  <option value="">Choose…</option>
                  {REFS.map(r => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** What the reader's set covers: a row per kind, and the gaps it leaves. */
function Coverage({ s }: { s: S }) {
  const missing = KINDS.filter(k => !covers(s, k)),
    bad = wrongRef(s);
  return (
    <div className="tc-def ev-coverage" data-gaps={missing.join('|')}>
      <table className="tc-ledger">
        <caption>Your set: {kept(s).length} cases</caption>
        <thead>
          <tr>
            <th scope="col">Kind</th>
            <th scope="col">Kept with its reference</th>
          </tr>
        </thead>
        <tbody>
          {KINDS.map(k => (
            <tr key={k} data-kind={k} data-changed={covers(s, k) ? undefined : ''}>
              <th scope="row">{k}</th>
              <td>{kept(s).filter(c => c.kind === k && s.picks[c.id].ref === rightRef(c)).length || 'none: a gap'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {missing.map(k => (
        <p key={k} className="ev-gap">
          <strong>Gap:</strong> {GAP[k]}
        </p>
      ))}
      {bad.map(c => (
        <p key={c.id} className="ev-gap">
          <strong>Check:</strong> “{c.text}” is graded against an answer that doesn’t fit it.
        </p>
      ))}
      {!missing.length && !bad.length && <p>All three kinds covered, each against its right answer.</p>}
    </div>
  );
}

/** Where the reader's calls differ from the team's, with the team's reason. */
function Team({ s }: { s: S }) {
  const differ = CASES.filter(c => !!s.picks[c.id]?.keep !== c.keep);
  return (
    <div className="tc-def">
      <p className="lbl">The team’s calls{differ.length ? ', where yours differ' : ''}</p>
      {(differ.length ? differ : CASES.filter(c => !c.keep)).map(c => (
        <p key={c.id}>
          <strong>{c.keep ? 'Kept' : 'Dropped'}:</strong> “{c.text}” {c.why}
        </p>
      ))}
      <Fact id="start-from-failures" />
      <Fact id="reference-solution" />
    </div>
  );
}

const show = (s: S) => (): Shown => {
  const k = kept(s),
    unsorted = CASES.filter(c => !s.picks[c.id]).length;
  return {
    scene: { results: k.map(() => true), graded: 0, board: `TEST SET · ${k.length} CASES` },
    cols: [],
    caption: `The test set so far: ${k.length} kept, ${CASES.length - k.length - unsorted} dropped, ${unsorted} not sorted.`,
    table: (
      <table className="tc-ledger ev-table">
        <caption>The test set: {k.length} cases</caption>
        <thead>
          <tr>
            <th scope="col">Case</th>
            <th scope="col">Reference answer</th>
          </tr>
        </thead>
        <tbody>
          {k.map(c => (
            <tr key={c.id}>
              <th scope="row">{c.text}</th>
              <td>{s.picks[c.id].ref || 'none yet'}</td>
            </tr>
          ))}
          {!k.length && (
            <tr>
              <td colSpan={2}>No cases kept yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    ),
  };
};

export default function TheTestSet() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ picks: {}, p1: null, caught: null, checked: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state }) => <EvalStage show={show(state)} />}
      controls={{
        log: ({ state, sync }) => <Log s={state} sync={sync} kinds={false} />,
        fix: ({ state, sync }) => <Log s={state} sync={sync} kinds />,
        set: ({ state }) => (
          <p className="tc-status">
            You kept {kept(state).length} of {CASES.length} messages.
          </p>
        ),
        p1: ({ state, apply }) => (
          <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i, caught: outcome(state) })} />
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={state.caught ?? outcome(state)} />,
        coverage: ({ state }) => <Coverage s={state} />,
        keep: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, checked: true })}>
            Keep this set
          </button>
        ),
        team: ({ state }) => <Team s={state} />,
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
