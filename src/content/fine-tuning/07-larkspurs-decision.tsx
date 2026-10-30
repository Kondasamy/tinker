// Chapter 7: Larkspur's decision, the workbench. The reader sends each kind of request to one version (prompted, RAG or
// fine-tuned). The bench leads with one number, the plan's score: quality read off the recorded answers (graded live),
// minus cost and upkeep from the team's fixed notes. The puzzle accepts every plan tied for the best score (WINNERS,
// computed over the whole domain). The plan and the tab are step state, so a reload keeps the bench as it was.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { ALL_QUESTIONS, VERSION_IDS, VERSIONS, type VersionId } from '../../lib/fine-tuning/engine';
import { BEST, KINDS, WINNERS, cell, solved, totals, type Plan } from '../../lib/fine-tuning/workbench';
import { TRAIN_PARTS } from '../../components/scenes/trainScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, FineTuneStage, RecordedNote, versionCols, type View } from './kit';

const MODULE = 'fine-tuning',
  ID = '07-larkspurs-decision';
const label = (v: VersionId) => VERSIONS.find(x => x.id === v)!.label;
const minus = (x: number) => (x ? `−${x}` : '0');
const pts = (x: number) => (Number.isInteger(x) ? String(x) : x.toFixed(1)).replace('-', '−');
/** “Just fine-tune it”: every kind to the fine-tuned version, where chapter 1's meeting started */
export const START: Plan = { voice: 'finetuned', facts: 'finetuned', changed: 'finetuned' };
/** the plan in a run's state; a kind missing from a saved run, or an unknown version, falls back to START's */
export const planOf = (s: Partial<Plan>): Plan =>
  Object.fromEntries(KINDS.map(k => [k.id, VERSION_IDS.includes(s[k.id]!) ? s[k.id]! : START[k.id]])) as Plan;
/** every version scores the same on replies with no facts (they all keep the sign-off), so only the notes decide that row */
export const VOICE_TIE = new Set(VERSION_IDS.map(v => cell('voice', v).quality)).size === 1;
const planWords = (p: Plan) => KINDS.map(k => `${k.label.toLowerCase()} → ${label(p[k.id])}`).join('; ');

export interface S extends Plan {
  view: View;
  quiz: number | null;
}

export const QUIZ = {
  question:
    'A travel company’s assistant must answer in the brand’s voice, quote fares that change hourly, and fill in a booking form in one exact format. Which plan fits?',
  options: [
    'Fine-tune for all three: one training run covers everything',
    'The prompt for the voice, documents (or a live lookup) for the fares, and measure whether the prompt alone gets the form right before training for it',
    'Documents for all three: put the voice and the form in the documents too',
    'The prompt for all three: paste the fares into it every hour',
  ],
  correct: 1,
  explanation:
    'Match the lever to the need: a voice to the prompt, changing facts to documents, and train only for a skill the cheaper levers miss, once the evals show they miss it.',
  why: [
    'Fares learnt in training are stale within the hour, and every change means a new run and a new round of evals.',
    'Right: each need goes to the cheapest lever that meets it, and training waits for evidence, since a fixed output format is one job fine-tuning is used for.',
    'Passages are read as facts, not followed as habits, so a voice and a format are better set by the prompt or by training.',
    'The prompt goes with every request, so hourly fares there are slow, costly and easy to forget, while documents are fetched only when they match.',
  ],
};

/** the bench's parts a callout can point at */
export const PARTS = TRAIN_PARTS;

export const STEPS: Step<S>[] = [
  {
    id: 'plan',
    focus: 'plan',
    visibleControls: ['score', 'plan'],
    narration: `“Just fine-tune it” sends everything to ${label('finetuned')}. Plan score: quality minus cost and upkeep, the team’s own notes, not measured facts.`,
    act: 'Find the best plan.',
    say: { block: 'model', text: 'All fine-tuned' },
    predicate: s => solved(planOf(s)),
    hint: 'Look at each kind on its own: which version scores most there? Facts that change belong where they are read fresh.',
    solution: s => ({ ...s, ...WINNERS[0] }),
  },
  {
    id: 'ties',
    focus: 'quiz',
    visibleControls: ['score', 'plan', 'ties', 'quiz'],
    narration: `${pts(BEST)} points: the best, shared by ${WINNERS.length} plans. ${VOICE_TIE ? 'No-fact replies tie, so the team’s own notes decide' : 'No-fact replies differ, and the team’s own notes weigh in'}; facts go to documents.`,
    act: 'One question to finish.',
    say: { block: 'documents', text: 'Facts go here' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which lever suits a fact that changes, and which suits a habit that doesn’t?',
  },
];

/** The headline number, then the plan's breakdown by kind. */
function Score({ s }: { s: S }) {
  const t = totals(planOf(s)),
    best = solved(planOf(s));
  return (
    <div role="status" data-score={t.score} data-best={best ? '1' : '0'}>
      <p className="ft-headline">
        <strong>{pts(t.score)}</strong> points{' '}
        <span className={`stamp ${best ? 'correct' : 'neutral'}`}>{best ? 'BEST' : `BEST IS ${pts(BEST)}`}</span>
      </p>
      <table className="tc-ledger" style={{ marginTop: 10 }}>
        <caption>Your plan, kind by kind (cost and upkeep are the team’s own notes)</caption>
        <thead>
          <tr>
            <th scope="col">Kind, sent to</th>
            <th scope="col">Quality</th>
            <th scope="col">Cost</th>
            <th scope="col">Upkeep</th>
            <th scope="col">Score</th>
          </tr>
        </thead>
        <tbody>
          {t.rows.map(r => (
            <tr key={r.kind.id} data-kind={r.kind.id}>
              <th scope="row">
                {r.kind.label}: {label(r.version)}
                <span className="note">
                  {r.passed} of {r.of} pass. Cost: {r.note.costWhy} Upkeep: {r.note.upkeepWhy}
                </span>
              </th>
              <td>{pts(r.quality)}</td>
              <td>{minus(r.cost)}</td>
              <td>{minus(r.upkeep)}</td>
              <td>{pts(r.score)}</td>
            </tr>
          ))}
          <tr>
            <th scope="row">Plan</th>
            <td>{pts(t.quality)}</td>
            <td>{minus(t.cost)}</td>
            <td>{minus(t.upkeep)}</td>
            <td>
              <strong>{pts(t.score)}</strong>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function LarkspursDecision() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ...START, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const p = planOf(state),
          uses = (v: VersionId) => KINDS.some(k => p[k.id] === v);
        return (
          <FineTuneStage
            view={state.view}
            onView={view => sync({ ...state, view })}
            say={say}
            show={() => ({
              scene: {
                lit: uses('finetuned') ? 'weights' : uses('rag') ? 'documents' : 'prompt',
                weights: uses('finetuned') ? 'finetuned' : 'base',
              },
              results: { cols: versionCols(VERSION_IDS, ALL_QUESTIONS), questions: ALL_QUESTIONS },
              caption: `Plan score ${pts(totals(p).score)}: ${planWords(p)}.`,
              stamp: solved(p) ? 'APPROVED' : undefined,
            })}
          />
        );
      }}
      controls={{
        score: ({ state }) => <Score s={state} />,
        // changing the plan is an attempt only while it is the puzzle
        plan: ({ state, apply, sync, focused }) => {
          const set = focused ? apply : sync;
          return (
            <div className="tc-bench">
              {KINDS.map(k => (
                <fieldset key={k.id} className="tc-pick" data-kind={k.id}>
                  <legend>{k.label}</legend>
                  <p className="note">{k.about}</p>
                  <div className="ft-row">
                    {VERSION_IDS.map(v => (
                      <button
                        key={v}
                        type="button"
                        className="chip"
                        aria-pressed={planOf(state)[k.id] === v}
                        onClick={() => set({ ...state, [k.id]: v })}
                      >
                        {label(v)}
                      </button>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          );
        },
        ties: () => (
          <>
            <Fact id="fine-tune-for" />
            <p className="note">
              Teaching a smaller, cheaper model from a big one, and routing to it:{' '}
              <a href="/small-models/">the Small models module</a>.
            </p>
            <p className="tc-status">
              Upkeep includes where a fine-tune is trained and served, and providers’ offers change. Two that changed
              this year, each with the date it was checked:
            </p>
            <Fact id="openai-wind-down" />
            <Fact id="openai-inference-stays" />
            <RecordedNote />
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
