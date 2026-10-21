// Chapter 7: the workbench. The reader picks a method and a size for each kind of document (a native select each). Under
// it, a row per document with its fields right, its cost and the reading's note; a live total against the best. The puzzle
// accepts every plan tied for the best (WINNERS); Show me applies one of them. The plan and the tab are step state.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { METHODS, METHOD_NAME, SIZES, type Method, type Size } from '../../lib/multimodal/readings';
import { image, type ImageId } from '../../lib/multimodal/images';
import { thousands } from '../../lib/multimodal/patches';
import { KIND_IDS, LEAST_COST, MOST_RIGHT, WINNERS, solved, totals, type Choice, type Plan } from '../../lib/multimodal/workbench';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { MultimodalStage, RecordedNote, px, type View } from './kit';

const MODULE = 'multimodal', ID = '07-workbench';
/** “Vision at the largest size, to be safe”: where the meeting started */
export const START: Plan = Object.fromEntries(KIND_IDS.map(k => [k, { method: 'vision', size: 3200 }]));
const ok = (c: Partial<Choice> | undefined): c is Choice => !!c && METHODS.includes(c.method!) && SIZES.includes(c.size!);
/** the plan in a run's state; a missing or unknown choice falls back to START's */
export const planOf = (p: Partial<Plan> | undefined): Plan => Object.fromEntries(KIND_IDS.map(k => [k, ok(p?.[k]) ? p![k] : START[k]]));

export interface S { plan: Plan; show: ImageId; view: View; quiz: number | null }

const QUIZ = {
  question: 'A team reads typed letters with vision at the largest size. Every field is right. What does the workbench say?',
  options: [
    'Try OCR on the letters: if the fields stay right, it reads far fewer tokens',
    'Leave it: every field is right',
    'Switch everything to OCR to save money',
  ],
  correct: 0,
  explanation: 'With the fields tied, cost decides, and clean print is where OCR is right for a fraction of the tokens.',
  why: [
    'Right. Same fields, far fewer tokens: that is a better plan, as long as a test set shows the fields stay right.',
    'Right isn’t the same as best: two plans with the same fields right are not equal if one costs several times more.',
    'Not everything: OCR breaks tables and handwriting, where vision is worth its tokens.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'plan', focus: 'plan', visibleControls: ['score', 'plan'],
    narration: `The proposal on the table: vision at the largest size for everything, to be safe. The bench reads the recorded reading for your plan, document by document, and grades every field live. The best plan gets the most fields right (${MOST_RIGHT} is the most any plan gets) for the fewest tokens. Pick a method and a size for each kind of document.`,
    predicate: s => solved(planOf(s.plan)),
    hint: 'Take each document on its own: chapter 3 showed which method each needs, chapter 2 how small it can go.',
    solution: s => ({ ...s, plan: WINNERS[0] }),
  },
  {
    id: 'quiz', focus: 'quiz', visibleControls: ['score', 'plan', 'quiz'],
    narration: `${MOST_RIGHT} fields for ${thousands(LEAST_COST)} tokens: the best any plan does. Yours is ${WINNERS.length === 1 ? 'the one plan' : `one of ${WINNERS.length} plans`} that ${WINNERS.length === 1 ? 'reaches' : 'reach'} it, and it mixes methods: OCR where the print is clean, vision where layout or handwriting matters, each at the smallest size that keeps its fields. Change the plan if you like; the bench is yours. One question to finish.`,
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'With the same fields right, what decides between two plans?',
  },
];

/** The headline, then the plan's result document by document. */
function Score({ s }: { s: S }) {
  const p = planOf(s.plan), t = totals(p), best = solved(p);
  return (
    <div role="status" data-right={t.right} data-cost={t.cost} data-best={best ? '1' : '0'}>
      <p className="mm-headline"><strong>{t.right} of {t.of}</strong> fields right · {thousands(t.cost)} tokens
        <span className={`stamp ${best ? 'correct' : 'neutral'}`}>{best ? 'BEST' : `BEST IS ${MOST_RIGHT} FOR ${thousands(LEAST_COST)}`}</span></p>
      {best && <p className="mm-note">One of {WINNERS.length} that work.</p>}
      <table className="tc-ledger" style={{ marginTop: 10 }}>
        <caption>Your plan, document by document</caption>
        <thead><tr><th scope="col">Document</th><th scope="col">Fields right</th><th scope="col">Tokens</th></tr></thead>
        <tbody>
          {t.rows.map(r => (
            <tr key={r.image} data-doc={r.image}>
              <th scope="row">{image(r.image).title}, {METHOD_NAME[r.method]} at {px(r.size)}<span className="mm-why">{r.note}</span></th>
              <td>{r.right} of {r.of}</td><td>{thousands(r.cost)}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
      initial={{ plan: START, show: 'invoice', view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync }) => {
        const p = planOf(state.plan), show = KIND_IDS.includes(state.show) ? state.show : KIND_IDS[0], c = p[show], t = totals(p);
        return (
          <MultimodalStage view={state.view} onView={view => sync({ ...state, view })} shown={{
            image: show, size: c.size, method: c.method,
            caption: `${image(show).title}: ${METHOD_NAME[c.method]} at ${px(c.size)}. Plan total: ${t.right} of ${t.of} fields, ${thousands(t.cost)} tokens.`,
            stamp: solved(p) ? 'APPROVED' : undefined,
          }} />
        );
      }}
      controls={{
        score: ({ state }) => <Score s={state} />,
        // changing the plan is an attempt only while it is the puzzle
        plan: ({ state, apply, sync, focused }) => {
          const set = focused ? apply : sync, p = planOf(state.plan);
          const change = (k: ImageId, c: Partial<Choice>) => set({ ...state, show: k, plan: { ...p, [k]: { ...p[k], ...c } } });
          return (
            <div className="mm-bench">
              {KIND_IDS.map(k => (
                <fieldset key={k} data-kind={k}>
                  <legend>{image(k).title}</legend>
                  <label>Method
                    <select value={p[k].method} onChange={e => change(k, { method: e.currentTarget.value as Method })}>
                      {METHODS.map(m => <option key={m} value={m}>{METHOD_NAME[m]}</option>)}
                    </select>
                  </label>
                  <label>Size
                    <select value={p[k].size} onChange={e => change(k, { size: Number(e.currentTarget.value) as Size })}>
                      {SIZES.map(z => <option key={z} value={z}>{px(z)}</option>)}
                    </select>
                  </label>
                </fieldset>
              ))}
            </div>
          );
        },
        quiz: ({ state, apply, sync }) => (
          <Quiz {...QUIZ} unsure value={state.quiz} onAnswer={(_, q) => apply({ ...state, quiz: q })} onUnsure={() => sync({ ...state, quiz: UNSURE })} />
        ),
      }}
    />
  );
}
