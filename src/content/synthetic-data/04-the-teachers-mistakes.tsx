// Chapter 4: the teacher's mistakes. Larkspur mini (the teacher) answers the nine rare requests live, greedy, one per
// frame, graded by Evals' key-fact rule; then generation 1 (a student trained only on its writing) answers them, as
// recorded in runs.json and graded live the same way.
import { useEffect, useState } from 'react';
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import PINNED from '../../../data/synthetic-data/pinned.json' with { type: 'json' };
import { RARE, factOf, gradeIds, teacher } from '../../lib/synthetic-data/generate';
import { genOf, sampleText } from '../../lib/synthetic-data/runs';
import { COPIER_PARTS, copierAt } from '../../components/scenes/copierScene';
import { CopierStage, LoadLine, ToyNote, Waiting, useModel } from './kit';

const MODULE = 'synthetic-data',
  ID = '04-the-teachers-mistakes';
export const PARTS = COPIER_PARTS;
const N = RARE.length,
  PASSES = PINNED.teacher.passes;
/** Generation 1 under replace: trained only on the teacher's writing. */
export const STUDENT = genOf('replace', 1).rareReplies.map((ids, i) => ({ ids, ok: gradeIds(ids, i) }));
const STUDENT_PASSES = STUDENT.filter(x => x.ok).length;

export const P1 = {
  question: `How many of the teacher’s ${N} answers hold their key fact?`,
  options: [`All ${N}: each fact is in a training document`, 'About half', 'None, or almost none'],
};
export const OUTCOME = PASSES === N ? 0 : PASSES >= N / 3 ? 1 : 2;

export const QUIZ = {
  question:
    'A team has a model write 5,000 answers about a new warranty policy it never saw. What will a model trained on them learn?',
  options: [
    'The writer’s guesses about the policy, wrong ones included',
    'The real policy, because 5,000 examples is a lot',
    'Nothing: synthetic text can’t teach anything',
  ],
  correct: 0,
  explanation: 'A student learns what the teacher wrote, so the teacher’s gaps become the student’s.',
  why: [
    'Right: the student can only copy what the teacher knew, or guessed.',
    'More copies of a guess are still a guess; volume adds no facts.',
    'Synthetic text teaches well where the writer is right, like style and common topics.',
  ],
};

export interface S {
  p1: number | null;
  asked: boolean;
  answered: number;
  student: boolean;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `The teacher is the model that writes the examples. Here, Larkspur mini answers the ${N} rare requests.`,
    act: 'Predict first.',
    say: { block: 'copier', text: 'The teacher' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'ask',
    focus: 'ask',
    visibleControls: ['p1', 'ask', 'answers'],
    narration: 'Each answer is graded on its key fact, the way Evals grades Larkspur’s assistant.',
    act: 'Ask the teacher.',
    predicate: s => s.answered === N,
    hint: 'Press Ask the teacher and wait for all the answers.',
    solution: s => ({ ...s, asked: true, answered: N }),
  },
  {
    id: 'student',
    focus: 'student',
    visibleControls: ['out', 'answers', 'student'],
    narration: `${PASSES} of ${N} hold their fact. A student is trained only on the teacher’s writing.`,
    act: 'See the student’s answers.',
    say: { block: 'copies', text: 'The student' },
    predicate: s => s.student,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['answers', 'quiz'],
    narration: `The student gets ${STUDENT_PASSES} of ${N}. A model can only teach what it knows; no sieve catches a fluent wrong answer.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Where would the student learn a fact the teacher never wrote?',
  },
];

/** The teacher's answers, written a prompt per frame once asked (kept for the page). */
const written: ReturnType<typeof teacher>[] = [];
function useTeacher(on: boolean, onEach: (n: number) => void) {
  const { model, status, retry } = useModel();
  const [n, setN] = useState(written.length);
  useEffect(() => {
    if (!on || !model) return;
    let raf = 0;
    const tick = () => {
      if (written.length < N) written.push(teacher(model, written.length));
      setN(written.length);
      onEach(written.length);
      if (written.length < N) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [on, model]);
  return { n, status, retry };
}

function Stage({ state, sync, say }: { state: S; sync: (s: S) => void; say?: Step<S>['say'] }) {
  const t = useTeacher(state.asked, n => {
    if (n > state.answered) sync({ ...state, answered: n });
  });
  const room = copierAt('replace', state.student ? 1 : 0, { copying: state.asked && t.n < N });
  return (
    <CopierStage
      say={say}
      wait={t.status === 'error' ? <Waiting failed retry={t.retry} /> : undefined}
      room={room}
      caption={
        state.student
          ? `Generation 1, the student: ${STUDENT_PASSES} of ${N} key facts.`
          : state.asked
            ? `The teacher: ${t.n} of ${N} answered, ${written.slice(0, t.n).filter(x => x.ok).length} with the key fact.`
            : `${N} rare requests, each answered by one or two documents.`
      }
    />
  );
}

function Ask({ state, sync }: { state: S; sync: (s: S) => void }) {
  const { status } = useModel();
  return (
    <>
      <button
        type="button"
        className="big"
        disabled={status !== 'ready' || state.asked}
        onClick={() => sync({ ...state, asked: true })}
      >
        Ask the teacher
      </button>
      <LoadLine status={status} />
    </>
  );
}

function Answers({ student }: { student: boolean }) {
  const rows = RARE.map((r, i) => ({
    prompt: r.text,
    fact: factOf(i),
    teacher: written[i],
    student: student ? STUDENT[i] : undefined,
  }));
  if (!rows.some(r => r.teacher)) return null;
  return (
    <>
      <table className="tc-ledger" style={{ marginTop: 10 }}>
        <caption>Rare requests: does the answer hold the key fact?</caption>
        <thead>
          <tr>
            <th scope="col">Request (key fact)</th>
            <th scope="col">Teacher</th>
            {student && <th scope="col">Student</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.prompt} data-ok={r.teacher?.ok ? '1' : '0'}>
              <th scope="row">
                …{r.prompt.split(' ').slice(-6).join(' ')} (“{r.fact}”)
                {r.teacher && <span className="dl-why"> → “{r.teacher.text}”</span>}
              </th>
              <td>{r.teacher ? (r.teacher.ok ? 'has it' : 'misses') : '…'}</td>
              {student && (
                <td>
                  {r.student!.ok ? 'has it' : 'misses'}
                  <span className="dl-why"> “{sampleText(r.student!.ids)}”</span>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      <ToyNote />
    </>
  );
}

export default function TheTeachersMistakes() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, asked: false, answered: 0, student: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => <Stage state={state} sync={sync} say={say} />}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        ask: ({ state, sync }) => <Ask state={state} sync={sync} />,
        answers: ({ state }) => <Answers student={state.student} />,
        out: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        student: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, student: true })}>
            See the student’s answers
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
    />
  );
}
