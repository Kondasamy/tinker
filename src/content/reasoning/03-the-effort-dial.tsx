// Chapter 3: the effort dial. The reader predicts the shape of the curve, then sweeps the six multi-step questions across
// every effort: a pass/fail row per question, and the Accuracy tab's chart gaining a point per level seen. The answers
// are recorded and illustrate Snell et al. (2024); they were not measured.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { EFFORTS, kindOf, ofKind, run, sweep, type Effort } from '../../lib/reasoning/engine';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { pct } from '../../components/scenes/effortChart';
import { Outcome } from '../tool-calling/kit';
import { THINK_PARTS } from '../../components/scenes/thinkScene';
import { EffortRange, Fact, ReasoningStage, type View } from './kit';

const MODULE = 'reasoning',
  ID = '03-the-effort-dial';
export const PARTS = THINK_PARTS;
const QS = ofKind('multistep').map(q => q.id),
  SWEEP = sweep(QS),
  KIND = kindOf('multistep');

interface S {
  p1: number | null;
  effort: Effort;
  seen: Effort[];
  view: View;
  quiz: number | null;
}

const P1 = {
  question: `Run the ${QS.length} multi-step questions at every effort, from none to high. How does accuracy move?`,
  options: [
    'Up at every step, all the way to high',
    'Up, then flat: high adds little or nothing over medium',
    'Flat: thinking doesn’t change the answers',
    'Down: more thinking, more mistakes',
  ],
};
/** read off the sweep */
export function outcome() {
  const a = SWEEP.map(p => p.right),
    up = a.slice(1).every((x, i) => x > a[i]),
    rose = a[2] > a[0];
  return up ? 0 : rose && a[3] <= a[2] ? 1 : a[3] < a[0] ? 3 : 2;
}

export const QUIZ = {
  question:
    'A team’s sweep on its contract questions reads 50%, 75%, 90%, 90% from none to high. It runs at high today. What should it try?',
  options: [
    'Stay at high: it is the best',
    'Medium: the same accuracy for less thinking, cost and wait',
    'None: thinking is too expensive',
    'Higher than high',
  ],
  correct: 1,
  explanation: 'Past the point where accuracy flattens, more effort only buys cost and wait.',
  why: [
    'High ties medium on accuracy and costs more, and a tie is no reason to pay more.',
    'Right: medium already reaches the top of the curve, so check it through the gate (chapter 6) and save the difference.',
    'None loses 40 points of accuracy here, and on multi-step questions thinking pays for itself, up to a point.',
    'The curve is flat at the top already; more effort has nothing left to buy.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `Effort tells a reasoning model how much work to put in: none, low, medium or high. The test set: ${QS.length} multi-step questions.`,
    act: 'Predict first.',
    say: { block: 'dial', text: 'Four levels' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'sweep',
    focus: 'dial',
    visibleControls: ['p1', 'dial'],
    narration:
      'A sweep runs the same questions at every setting. Each answer is graded; accuracy is the share that pass.',
    act: 'Turn the dial through every level.',
    say: { block: 'dial', text: 'Starts at none' },
    // entering the sweep runs the dial's starting level
    setup: s => ({ ...s, seen: [...new Set([...s.seen, s.effort])] }),
    predicate: s => EFFORTS.every(e => s.seen.includes(e)),
    hint: 'Drag the dial, or use the arrow keys, until you have seen none, low, medium and high.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['curve', 'quiz'],
    narration: `${SWEEP.map(p => `${p.effort} ${pct(p.accuracy)}`).join(', ')}. Accuracy rises, then flattens, while the cost keeps climbing.`,
    act: 'One question to finish.',
    say: { block: 'pad', text: 'Cost climbs' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Compare the last two levels: what does high add?',
  },
];

export default function TheEffortDial() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, effort: 'none', seen: [], view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const seen = SWEEP.filter(p => state.seen.includes(p.effort)),
          cur = SWEEP[EFFORTS.indexOf(state.effort)];
        const thinking = QS.reduce((n, q) => n + run(q, state.effort).thinkingTokens, 0);
        return (
          <ReasoningStage
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            shown={{
              desk: {
                effort: state.effort,
                thinking: state.seen.length ? thinking : 0,
                wait: state.seen.length ? cur.wait : 0,
                right: state.seen.length ? cur.right / cur.of >= 0.8 : undefined,
              },
              series: seen.length ? [{ id: 'multistep', label: KIND.short, points: seen }] : undefined,
              caption: state.seen.length
                ? `Effort ${state.effort}: ${cur.right} of ${cur.of} right, ${thinking} thinking tokens over the set, an average wait of ${cur.wait.toFixed(1)} s.`
                : `The ${QS.length} multi-step questions, ready to sweep.`,
              thinking: state.seen.length ? run(QS[0], state.effort).thinking : undefined,
            }}
          />
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        dial: ({ state, sync }) => (
          <>
            <EffortRange
              value={state.effort}
              onChange={e => sync({ ...state, effort: e, seen: [...new Set([...state.seen, e])], view: 'chart' })}
            />
            <table className="tc-ledger" style={{ marginTop: 10 }} data-effort={state.effort}>
              <caption>
                At effort {state.effort}
                {state.seen.includes(state.effort) ? '' : ' (move the dial to run it)'}
              </caption>
              <tbody>
                {ofKind('multistep').map(q => {
                  const r = run(q.id, state.effort),
                    shown = state.seen.includes(state.effort);
                  return (
                    <tr key={q.id} data-q={q.id}>
                      <th scope="row">
                        {q.query}
                        <span className="rs-why">{shown ? r.note : ''}</span>
                      </th>
                      <td>{shown ? (r.right ? 'right' : 'wrong') : '–'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        ),
        curve: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcome()} />
            <p className="rs-note">
              These answers were written for this site to illustrate the finding below; they were not measured.
            </p>
            <Fact id="snell" />
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
