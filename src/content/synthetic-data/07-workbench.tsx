// Chapter 7: the workbench. A recipe is a temperature, a sieve and a real share (a drop-down each), each one of the
// 18 grid runs trained offline. The result table gives the recipe's measures and, when another recipe beats it on
// both loss and rare words, which one. The puzzle accepts every recipe no other beats (WINNERS); Show me applies one.
import StepRunner from '../../components/story/StepRunner';
import Select from '../../components/story/Select';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { genOf } from '../../lib/synthetic-data/runs';
import {
  SHARES,
  SIEVES,
  START,
  TEMPERATURES,
  WINNERS,
  beatenBy,
  isRecipe,
  runOf,
  scoreOf,
  solved,
  type Recipe,
} from '../../lib/synthetic-data/workbench';
import type { SieveKind } from '../../lib/synthetic-data/sieve';
import { COPIER_PARTS } from '../../components/scenes/copierScene';
import { CopierStage, ToyNote } from './kit';

const MODULE = 'synthetic-data',
  ID = '07-workbench';
export const PARTS = COPIER_PARTS;
const G0 = genOf('replace', 0);
export const SIEVE_NAME: Record<SieveKind, string> = {
  off: 'Off',
  dedupe: 'Dedupe',
  facts: 'Dedupe + fact filter',
};
export const recipeWords = (r: Recipe) =>
  `temperature ${r.temperature}, sieve ${SIEVE_NAME[r.sieve].toLowerCase()}, ${r.realShare}% real`;
const pct1 = (x: number) => `${x.toFixed(1)}%`;
/** A 50% recipe keeps the real documents at even places (train_synth.py's fixed mix). */
const realDocs = (r: Recipe) => (r.realShare ? Math.ceil(G0.docs / 2) : 0);

export interface S {
  recipe: Recipe;
  quiz: number | null;
}
const recipeOf = (s: S) => (isRecipe(s.recipe) ? s.recipe : START);

export const QUIZ = {
  question: 'A team will train its next support model partly on model-written replies. What does Larkspur’s bench say?',
  options: [
    'Keep real data in the mix first; temperature and the sieve matter less',
    'Turn the temperature down: cool replies are safest',
    'Sieve hard: the strictest filter always wins',
  ],
  correct: 0,
  explanation: 'Every winning recipe kept half real data; no recipe of copies alone came close.',
  why: [
    'Right: real data did the most to keep loss down and rare words guessed.',
    'A cool temperature lost rare words without beating the winners on loss.',
    'The strictest sieve with no real data kept so little text that it did worst.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'recipe',
    focus: 'recipe',
    visibleControls: ['score', 'recipe'],
    narration:
      'The first recipe is copies only. A recipe wins when none other has lower loss and more rare words guessed.',
    act: 'Change it on the workbench.',
    say: { block: 'copier', text: 'The recipe' },
    predicate: s => solved(recipeOf(s)),
    hint: 'Look at what beats your recipe, and change the one setting they differ in.',
    solution: s => ({ ...s, recipe: WINNERS[0] }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['score', 'recipe', 'quiz'],
    narration:
      'Every winner keeps half real data. Temperature and the sieve move results far less than the real share.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What do all the winners share?',
  },
];

function Score({ s }: { s: S }) {
  const r = recipeOf(s),
    g = runOf(r),
    sc = scoreOf(r),
    by = beatenBy(r),
    best = !by;
  return (
    <div role="status" data-best={best ? '1' : '0'}>
      <p className="sd-headline">
        Loss <strong>{sc.loss.toFixed(2)}</strong> · rare words guessed <strong>{pct1(sc.rare)}</strong>
        <span className={`stamp ${best ? 'correct' : 'neutral'}`}>{best ? 'NONE BETTER' : 'BEATEN'}</span>
      </p>
      {best && <p className="sd-note">One of {WINNERS.length} that work.</p>}
      <table className="tc-ledger" style={{ marginTop: 10 }}>
        <caption>Your recipe, as trained offline</caption>
        <tbody>
          <tr>
            <th scope="row">Recipe</th>
            <td>{recipeWords(r)}</td>
          </tr>
          <tr>
            <th scope="row">Training documents</th>
            <td>
              {g.docs}: {g.docs - realDocs(r)} model-written, {realDocs(r)} real
              {r.realShare ? ` (${Math.round(g.realTokens * 100)}% of tokens)` : ''}
            </td>
          </tr>
          <tr>
            <th scope="row">Held-out loss</th>
            <td>
              {sc.loss.toFixed(2)} (Larkspur mini: {G0.heldout.toFixed(2)})
            </td>
          </tr>
          <tr>
            <th scope="row">Rare words guessed</th>
            <td>
              {pct1(sc.rare)} (Larkspur mini: {pct1(Math.round(G0.rareTop5 * 1000) / 10)})
            </td>
          </tr>
          <tr data-beaten={by ? '1' : '0'}>
            <th scope="row">Beaten by</th>
            <td>
              {by
                ? `${recipeWords(by)}: loss ${scoreOf(by).loss.toFixed(2)}, rare ${pct1(scoreOf(by).rare)}`
                : 'No recipe beats it on both.'}
            </td>
          </tr>
        </tbody>
      </table>
      <ToyNote />
    </div>
  );
}

export default function Workbench() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ recipe: START, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => {
        const r = recipeOf(state),
          g = runOf(r);
        return (
          <CopierStage
            say={say}
            readout={[recipeWords(r), `loss ${g.heldout.toFixed(2)}`, `rare words guessed ${pct1(scoreOf(r).rare)}`]}
            room={{
              gens: [G0.rareTop5, g.rareTop5],
              gen: 1,
              arm: r.realShare ? 'accumulate' : 'replace',
              real: G0.rareTop5,
              sieve: r.sieve,
            }}
            caption={`One generation trained on this recipe: ${g.docs} documents.`}
          />
        );
      }}
      controls={{
        score: ({ state }) => <Score s={state} />,
        // changing the recipe is an attempt only while it is the puzzle
        recipe: ({ state, apply, sync, focused }) => {
          const set = (p: Partial<Recipe>) =>
            (focused ? apply : sync)({ ...state, recipe: { ...recipeOf(state), ...p } });
          const r = recipeOf(state);
          return (
            <fieldset className="sd-bench">
              <legend>Recipe</legend>
              <label>
                Temperature{' '}
                <Select value={r.temperature} onChange={e => set({ temperature: Number(e.currentTarget.value) })}>
                  {TEMPERATURES.map(t => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </label>
              <label>
                Sieve{' '}
                <Select value={r.sieve} onChange={e => set({ sieve: e.currentTarget.value as SieveKind })}>
                  {SIEVES.map(k => (
                    <option key={k} value={k}>
                      {SIEVE_NAME[k]}
                    </option>
                  ))}
                </Select>
              </label>
              <label>
                Real share{' '}
                <Select
                  value={r.realShare}
                  onChange={e => set({ realShare: Number(e.currentTarget.value) as Recipe['realShare'] })}
                >
                  {SHARES.map(x => (
                    <option key={x} value={x}>
                      {x}% real
                    </option>
                  ))}
                </Select>
              </label>
            </fieldset>
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
