// Chapter 5: "Refund" and "refunds". "Refunds" as typed matches one page; lower case folds capitals, the stemmer folds
// endings (the reader predicts it first), and stop words shrink the cabinet. Each cleaning rebuilds the index live.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import pinned from '../../../data/search/pinned.json' with { type: 'json' };
import { DEFAULT, fmt, search, type Settings } from '../../lib/search/engine';
import { ALL_CLEAN, RAW, type Clean } from '../../lib/search/stem';
import { CABINET_PARTS, cabinetAt, drawerCount } from '../../components/scenes/cabinetScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { SearchStage, SimNote, type View } from './kit';

const MODULE = 'search',
  ID = '05-cleaning-words';
export const PARTS = CABINET_PARTS;
export const QUERY = pinned.clean.query;
const at = (clean: Clean): Settings => ({ ...DEFAULT, clean });
const found = (clean: Clean) => search(QUERY, at(clean)).length;
const LOWER: Clean = { lower: true, stop: false, stem: false },
  STEMMED: Clean = { lower: true, stop: false, stem: true };
const pages = (n: number) => `${fmt(n)} page${n === 1 ? '' : 's'}`;

export const P1 = {
  question: `A stemmer folds “refunds” and “refunded” into “refund”. How many pages will “${QUERY}” find?`,
  options: [
    `${found(LOWER)}: the same pages`,
    `More than ${found(LOWER)}: every form now shares one drawer`,
    'Fewer: the stemmer throws words away',
  ],
};
export const OUTCOME = 1;

export const QUIZ = {
  question: 'A stemmer folds “university” and “universe” into one drawer, “univers”. What goes wrong?',
  options: [
    'A search for one finds pages about the other: it folds spellings, not meanings',
    'Nothing: words with one stem share one meaning',
    'Both words disappear from the index',
  ],
  correct: 0,
  explanation: 'A stemmer cuts letters by rule, so it can join words that only look alike.',
  why: [
    'Right: the stemmer sees letters, so two unrelated words that share a start land in one drawer.',
    'A shared stem is a spelling coincidence here, which is exactly the stemmer’s blind spot.',
    'Stemming keeps every word, filed under its cut-down form.',
  ],
};

interface S {
  searched: boolean;
  lower: boolean;
  p1: number | null;
  stem: boolean;
  stop: boolean;
  view: View;
  quiz: number | null;
}
const cleanOf = (s: S): Clean => ({ lower: s.lower, stop: s.stop, stem: s.stem });

export const STEPS: Step<S>[] = [
  {
    id: 'typed',
    focus: 'search',
    visibleControls: ['search'],
    narration:
      'So far the index has filed words exactly as written, so “Refunds” and “refunds” sit in different drawers.',
    act: `Search for “${QUERY}”.`,
    say: { block: 'cabinet', text: 'Exact words only' },
    predicate: s => s.searched,
  },
  {
    id: 'lower',
    focus: 'clean',
    visibleControls: ['clean'],
    narration: `As typed: ${pages(found(RAW))}. Lower case folds every capital, in pages and searches alike.`,
    act: 'Turn on lower case.',
    predicate: s => s.lower,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `Lower case: ${pages(found(LOWER))}. Pages saying “refund” or “refunded” are still in other drawers.`,
    act: 'Predict the stemmer.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'stem',
    focus: 'clean',
    visibleControls: ['p1', 'clean'],
    narration: 'Your pick is locked.',
    act: 'Turn on the stemmer.',
    predicate: s => s.stem && s.lower && s.p1 !== null,
  },
  {
    id: 'stop',
    focus: 'clean',
    visibleControls: ['out1', 'clean'],
    narration: `The stemmer: ${pages(found(STEMMED))}. A stop word, like “for” or “the”, is on nearly every page and tells nothing.`,
    act: 'Drop the stop words too.',
    say: { block: 'cabinet', text: 'Fewer drawers' },
    predicate: s => s.stop && s.stem && s.lower,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    narration: `Cleaning reshaped the cabinet: ${fmt(drawerCount(at(RAW)))} drawers as typed, ${fmt(drawerCount(at(ALL_CLEAN)))} with every cleaning on.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Does a stemmer know what a word means?',
  },
];

const SWITCHES: [keyof Clean, string][] = [
  ['lower', 'Lower case'],
  ['stem', 'Stemmer'],
  ['stop', 'Drop stop words'],
];

export default function CleaningWords() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ searched: false, lower: false, p1: null, stem: false, stop: false, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const s = at(cleanOf(state));
        return (
          <SearchStage
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            show={
              state.searched
                ? {
                    scene: cabinetAt(QUERY, s),
                    postings: { query: QUERY, settings: s },
                    caption: `“${QUERY}” finds ${pages(found(s.clean))}; the index holds ${fmt(drawerCount(s))} drawers.`,
                  }
                : { scene: { query: QUERY, words: 0, drawers: [] }, caption: 'The search waits on the desk.' }
            }
          />
        );
      }}
      controls={{
        search: ({ state, apply }) => (
          <button type="button" className="chip" onClick={() => apply({ ...state, searched: true })}>
            {`Search for “${QUERY}”`}
          </button>
        ),
        clean: ({ state, apply }) => (
          <fieldset className="sx-controls">
            <legend>Word cleaning</legend>
            <div className="db-row-btns">
              {SWITCHES.map(([k, name]) => (
                <label key={k} className="chip">
                  <input type="checkbox" checked={state[k]} onChange={() => apply({ ...state, [k]: !state[k] })} />{' '}
                  {name}
                </label>
              ))}
            </div>
          </fieldset>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />
            <SimNote />
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
