// Chapter 2: learning from a teacher. The reader compares the one right next piece with the teacher's odds on the same
// sentence (live, raised to the distillation run's temperature), predicts how the student's held-out loss compares with
// the teacher's, then opens the student's recorded training run (meta.json `student`). The general idea is cited
// (Hinton, Vinyals and Dean, 2015), not claimed.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { PROMPTS, softTop5, top5 } from '../../lib/small-models/compare';
import { loss } from '../../components/scenes/lossChart';
import { num } from '../../lib/format';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { ModelGate } from '../fine-tuning/kit';
import { ROUTER_PARTS } from '../../components/scenes/routerScene';
import { Fact, META, SmallStage, STUDENT_SERIES, ToyNote, modelNow, type View } from './kit';

export const PARTS = ROUTER_PARTS;
const MODULE = 'small-models',
  ID = '02-learning-from-a-teacher';
const RUN = META.student!,
  T = RUN.training as { temperature: number; hard: number; steps: number };
/** the sentence the lesson is shown on: one where the teacher splits its bets */
const LESSON = PROMPTS.find(p => p.id === 'returns') ?? PROMPTS[0];
const pct = (p: number) => `${Math.round(p * 100)}%`;
const GAP = RUN.heldout.loss - META.heldout.loss;

interface S {
  lesson: boolean;
  p1: number | null;
  curve: boolean;
  view: View;
  quiz: number | null;
}

export const P1 = {
  question: `The student trained for ${num(T.steps)} steps on the teacher’s odds over Larkspur’s documents. Score both on held-out text, which neither trained on. How will the student’s loss compare with the teacher’s?`,
  options: [
    'Lower: it learnt from the teacher and the text, so it beats both',
    'A little higher: it is smaller, so it holds less than the teacher',
    'Far higher: with a third of the weights it keeps a third of the skill',
  ],
};
/** read off the recorded held-out losses */
export const gapOutcome = (gap: number) => (gap < 0 ? 0 : gap < 1 ? 1 : 2);

export const QUIZ = {
  question:
    'A team distils a large email classifier into a small one. Why train on the large model’s odds (“spam 70%, promo 25%, personal 5%”) instead of only the label “spam”?',
  options: [
    'The odds show which wrong labels are close, extra information in every example',
    'The large model’s odds are always more correct than the labels',
    'Odds take less memory than labels',
    'So the small model never needs any data of its own',
  ],
  correct: 0,
  explanation:
    'Soft targets carry the teacher’s sense of what is nearly right, so each example teaches the student more.',
  why: [
    'Right: “promo is close, personal isn’t” is in the odds and not in the label.',
    'The teacher can be wrong; that is why a little weight usually stays on the true label.',
    'A full set of odds is more to store than one label; it is used because it teaches more.',
    'The student still reads examples; the teacher gives odds on them.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'lesson',
    focus: 'lesson',
    visibleControls: ['lesson'],
    narration:
      'Text alone teaches one right piece at a time. Distillation teaches the teacher’s whole set of odds instead.',
    act: 'Open one lesson.',
    say: { block: 'small', text: 'Learns the odds' },
    predicate: s => s.lesson && !!modelNow('base'),
    hint: 'Press “Show the teacher’s lesson”.',
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['targets', 'p1'],
    narration: `Raised to temperature ${T.temperature}, near-misses count more. These soft targets show which other pieces were nearly right: extra the right answer lacks.`,
    act: 'Predict first.',
    say: { block: 'big', text: 'Soft targets' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'curve',
    focus: 'curve',
    visibleControls: ['p1', 'curve'],
    narration: `Teacher and student ran once, ahead of time: the student learnt the odds, plus a small weight (${T.hard}) on the right piece.`,
    act: 'Open the run.',
    predicate: s => s.curve,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['scores', 'facts', 'quiz'],
    narration:
      'Loss falls fast, then flattens. On held-out text the student ends a little behind its teacher, not far.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What do the odds tell the student that one right answer doesn’t?',
  },
];

export default function LearningFromATeacher() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ lesson: false, p1: null, curve: false, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => (
        <SmallStage
          say={say}
          view={state.view}
          onView={view => sync({ ...state, view })}
          show={() => ({
            scene: { mode: 'distill', lessons: state.lesson, lit: state.lesson ? 'small' : null },
            chart: state.curve ? { series: STUDENT_SERIES } : undefined,
            caption: state.curve
              ? `The student’s training run: ${num(T.steps)} steps, loss recorded every ${num(RUN.lossCurve[1].step - RUN.lossCurve[0].step)}.`
              : state.lesson
                ? 'Lessons run down the chute: the teacher’s odds on every piece of Larkspur’s documents.'
                : 'The teacher at the back, the student in front, the chute between them.',
          })}
        />
      )}
      controls={{
        lesson: ({ state, sync }) => (
          <ModelGate weights="base">
            {() => (
              <button type="button" className="big" onClick={() => sync({ ...state, lesson: true })}>
                Show the teacher’s lesson
              </button>
            )}
          </ModelGate>
        ),
        targets: () => (
          <ModelGate weights="base">
            {m => {
              const plain = top5(m, LESSON.text),
                soft = softTop5(m, LESSON.text, T.temperature);
              return (
                <table className="tc-ledger sm-top" data-lesson>
                  <caption>
                    After “{LESSON.text}”: the right piece, then the teacher’s odds (computed in your browser)
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Next piece</th>
                      <th scope="col">Right answer</th>
                      <th scope="col">Teacher</th>
                      <th scope="col">At temperature {T.temperature}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plain.map((c, i) => (
                      <tr key={c.id}>
                        <th scope="row">
                          <code>{JSON.stringify(c.text)}</code>
                        </th>
                        <td>{c.text === LESSON.expected ? '100%' : '0%'}</td>
                        <td>{pct(c.p)}</td>
                        <td>{pct(soft[i].p)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              );
            }}
          </ModelGate>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        curve: ({ state, sync }) => (
          <button type="button" className="big" onClick={() => sync({ ...state, curve: true, view: 'chart' })}>
            Show the training run
          </button>
        ),
        scores: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={gapOutcome(GAP)} />
            <p className="tc-status" role="status">
              Held-out loss, recorded: Larkspur mini <strong>{loss(META.heldout.loss)}</strong>, the student{' '}
              <strong>{loss(RUN.heldout.loss)}</strong>.
            </p>
          </>
        ),
        facts: () => (
          <>
            <Fact id="distillation" />
            <Fact id="soft-targets" />
            <p className="note">{`The student’s run follows that recipe at toy size: temperature ${T.temperature}, ${num(T.steps)} steps.`}</p>
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
