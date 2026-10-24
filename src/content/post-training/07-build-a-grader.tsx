// Chapter 7: build a grader, the workbench. The reader ticks rules (a checkbox each); the toy policy runs GRPO from its
// reference on each of the four checkable questions, and the table shows which answer ends most likely. The puzzle
// accepts every rule set under which every best answer wins and no gaming one does (WINNERS); Show me applies one.
// The rules and the tab are step state, so a reload keeps the bench as it was.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { RULES, WEAK, question, refOf, rewardsOf, type RuleId } from '../../lib/post-training/graders';
import { ROUNDS, grpoRun, seedOf } from '../../lib/post-training/policy';
import { BENCH, WINNERS, outcome, solved } from '../../lib/post-training/workbench';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { EXAM_PARTS } from '../../components/scenes/examScene';
import { PostStage, RulePicker, TOY, barsOf, cardsOf, groupOf, type View } from './kit';

const MODULE = 'post-training',
  ID = '07-build-a-grader';
export const PARTS = EXAM_PARTS;
/** where chapter 6 started: the weak grader */
export const START: RuleId[] = WEAK;
/** the rules in a run's state; unknown ids drop out, a missing list falls back to START */
export const rulesOf = (s: { rules?: unknown }): RuleId[] =>
  Array.isArray(s.rules) ? RULES.map(r => r.id).filter(id => (s.rules as unknown[]).includes(id)) : START;
const label = (rules: RuleId[]) =>
  rules.length
    ? RULES.filter(r => rules.includes(r.id))
        .map(r => r.label.toLowerCase())
        .join(' + ')
    : 'no rules';

export interface S {
  rules: RuleId[];
  view: View;
  quiz: number | null;
}

export const QUIZ = {
  question:
    'A team adds “the reply mentions the product name” to a grader that already checks the right answer. What should it do before trusting the new grader?',
  options: [
    'Run it on drafts that could game it, and check the right answers still win',
    'Nothing: more rules always make a grader stricter',
    'Remove the right-answer check, since the product name now covers it',
  ],
  correct: 0,
  explanation:
    'Every rule is a new way to score; test the grader against drafts built to game it before training on it.',
  why: [
    'Right: a draft that names the product but gets the answer wrong may now tie the right one, so test before trusting.',
    'A rule adds points, so a wrong draft that passes it can catch up with the right one.',
    'Naming the product says nothing about whether the answer is right, so that would invite gaming.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'build',
    focus: 'build',
    visibleControls: ['why', 'build', 'score'],
    narration: 'The weak grader again, on four questions. Each rule a draft passes earns a point.',
    act: 'Tick rules until every right answer wins.',
    say: { block: 'grader', text: 'Your rules' },
    predicate: s => solved(rulesOf(s)),
    hint: 'Which rule can only a right answer pass? Then check that no other rule lets a gaming draft tie it.',
    solution: s => ({ ...s, rules: WINNERS[0] }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['build', 'score', 'quiz'],
    narration: `Every right answer wins: one of ${WINNERS.length} rule sets that work. Test any rule a draft could satisfy cheaply.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What could a wrong draft do with a new rule?',
  },
];

/** The headline, then a row per question: which answer ends most likely, and whether it is right or gaming. */
function Score({ rules }: { rules: RuleId[] }) {
  const o = outcome(rules),
    best = solved(rules);
  return (
    <div role="status" data-right={o.right} data-best={best ? '1' : '0'}>
      <p className="ft-headline">
        <strong>
          {o.right} of {o.of}
        </strong>{' '}
        right answers win{' '}
        <span className={`stamp ${best ? 'correct' : 'neutral'}`}>{best ? 'WORKS' : `${o.gamed} GAMED`}</span>
      </p>
      {best && <p className="note">One of {WINNERS.length} that work.</p>}
      <table className="tc-ledger">
        <caption>After {ROUNDS} rounds with your grader</caption>
        <thead>
          <tr>
            <th scope="col">Question</th>
            <th scope="col">Ends most likely</th>
          </tr>
        </thead>
        <tbody>
          {o.rows.map(r => {
            const c = question(r.question).candidates[r.winner];
            return (
              <tr key={r.question} data-q={r.question} data-win={r.best ? 'best' : r.gamed ? 'gamed' : 'wrong'}>
                <th scope="row">{question(r.question).query}</th>
                <td>
                  {c.id} ({Math.round(r.after[r.winner] * 100)}%): “{c.text}”
                  <span className="note">{r.best ? 'The right answer.' : c.note}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function BuildAGrader() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ rules: START, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const rules = rulesOf(state),
          o = outcome(rules),
          shownRow = o.rows.find(r => !r.best) ?? o.rows[0],
          q = shownRow.question,
          r = rewardsOf(q, rules),
          last = grpoRun(refOf(q), r, seedOf(q)).at(-1);
        return (
          <PostStage
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            shown={{
              hall: {
                cards: cardsOf(q, shownRow.after, r),
                grader: rules.length ? `${rules.length} RULE${rules.length === 1 ? '' : 'S'}` : undefined,
                group: groupOf(last),
                board: `${BENCH.indexOf(q) + 1} OF ${BENCH.length}`,
                lit: shownRow.winner,
              },
              bars: barsOf(q, refOf(q), shownRow.after, r),
              caption: `Grader: ${label(rules)}. ${o.right} of ${o.of} right answers win. Shown: “${question(q).query}”`,
              stamp: solved(rules) ? 'APPROVED' : undefined,
            }}
          />
        );
      }}
      controls={{
        why: () => <p className="note">{TOY}</p>,
        score: ({ state }) => <Score rules={rulesOf(state)} />,
        // changing the rules is an attempt only while it is the puzzle
        build: ({ state, apply, sync, focused }) => (
          <RulePicker value={rulesOf(state)} onChange={rules => (focused ? apply : sync)({ ...state, rules })} />
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
