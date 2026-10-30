// Chapter 4: long pages and repeats. "price" weighed by rarity crowns the page that says it most; BM25 makes each
// repeat add less (saturation) and scores a page against its length, so a short page saying it twice wins; with length
// set to count not at all, the repeating page wins again.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import pinned from '../../../data/search/pinned.json' with { type: 'json' };
import { BS, DEFAULT, PAGES, pageName, pageOf, postings, type B, type Settings } from '../../lib/search/engine';
import { wordsOf } from '../../lib/search/stem';
import { CABINET_PARTS, cabinetAt } from '../../components/scenes/cabinetScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, Maths, SearchStage, SimNote, type View } from './kit';
import { LENGTH_NAMES } from '../../lib/search/workbench';

const MODULE = 'search',
  ID = '04-long-pages-and-repeats';
export const PARTS = CABINET_PARTS;
export const QUERY = pinned.repeats.query;
const REPEATER = pageOf(pinned.repeats.tfidf),
  SHORT = pageOf(pinned.repeats.bm25);
const [WORD] = wordsOf(QUERY, DEFAULT.clean);
const tfOn = (page: number) => {
  const p = postings(WORD, DEFAULT.clean);
  return p.tf[p.doc.indexOf(page)];
};
const lengthOf = (page: number) => wordsOf(PAGES[page].text, DEFAULT.clean).length;

export const P1 = {
  question: 'BM25 makes each repeat add less and counts a page’s length. Which page tops the podium?',
  options: [
    `${pageName(REPEATER)} again: ${tfOn(REPEATER)} mentions beat everything`,
    `${pageName(SHORT)}: a short page that says it ${tfOn(SHORT)} times`,
    `A page that never says “${QUERY}”`,
  ],
};
export const OUTCOME = 1;

export const QUIZ = {
  question: 'A product page repeats “waterproof” twenty times to rank higher. What does BM25 give it?',
  options: [
    'A little more than a page saying it twice: repeats saturate',
    'Twenty times the score of a page saying it once',
    'Nothing: BM25 ignores repeated words',
  ],
  correct: 0,
  explanation: 'Under BM25 each repeat adds less than the one before, so stuffing a word buys little.',
  why: [
    'Right: the first mentions do most of the work, and the twentieth adds almost nothing.',
    'That is plain counting, which BM25 replaced so that repeating a word can’t buy the top spot.',
    'Repeats still help a little; they just help less each time.',
  ],
};

interface S {
  searched: boolean;
  p1: number | null;
  bm25: boolean;
  b: B;
  view: View;
  quiz: number | null;
}
const settingsOf = (s: S): Settings => (s.bm25 ? { ...DEFAULT, b: s.b } : { ...DEFAULT, weighting: 'tfidf' });

export const STEPS: Step<S>[] = [
  {
    id: 'rarity',
    focus: 'search',
    visibleControls: ['search'],
    narration:
      'Weighed by rarity, every repeat of a word adds the same again, and a long page has more room for repeats.',
    act: `Search for “${QUERY}”.`,
    say: { block: 'podium', text: 'Most repeats' },
    predicate: s => s.searched,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `${pageName(REPEATER)} says “${QUERY}” ${tfOn(REPEATER)} times in ${lengthOf(REPEATER)} words.`,
    act: 'Predict BM25’s top page.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'bm25',
    focus: 'bm25',
    visibleControls: ['p1', 'bm25'],
    narration: 'Your pick is locked.',
    act: 'Score with BM25.',
    say: { block: 'podium', text: 'Short page wins' },
    predicate: s => s.bm25 && s.p1 !== null,
  },
  {
    id: 'length',
    focus: 'length',
    visibleControls: ['out1', 'length'],
    narration: `Saturation: each repeat adds less than the last. And ${lengthOf(SHORT)} words saying it ${tfOn(SHORT)} times is dense.`,
    act: 'Set long pages to count “Not at all”.',
    predicate: s => s.bm25 && s.b === 0,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['facts', 'quiz'],
    narration: `With length ignored, ${pageName(pageOf(pinned.repeats.flat))} wins again: here, length moved the ranking more than repeats.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Does the twentieth mention add as much as the first?',
  },
];

export default function LongPagesAndRepeats() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ searched: false, p1: null, bm25: false, b: DEFAULT.b, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const s = settingsOf(state);
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
                    caption: state.bm25
                      ? `BM25, long pages counted “${LENGTH_NAMES[state.b] ?? ''}”.`
                      : 'Weighed by rarity: every repeat counts in full.',
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
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        bm25: ({ state, apply }) => (
          <button type="button" className="chip" onClick={() => apply({ ...state, bm25: true })}>
            Score with BM25
          </button>
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        length: ({ state, apply }) => (
          <fieldset className="sx-controls">
            <legend>How much a long page counts against it</legend>
            <div className="db-row-btns">
              {BS.map(b => (
                <label key={b} className="chip">
                  <input
                    type="radio"
                    name="sx-length"
                    checked={state.b === b}
                    onChange={() => apply({ ...state, b })}
                  />{' '}
                  {LENGTH_NAMES[b]}
                </label>
              ))}
            </div>
          </fieldset>
        ),
        facts: () => (
          <>
            <Fact id="bm25" />
            <Fact id="bm25-defaults" />
            <Maths>
              {`BM25 adds, for each search word: rarity × tf × (k1 + 1) ÷ (tf + k1 × (1 − b + b × length ÷ average length)). tf is how often the page says the word; k1 (here ${DEFAULT.k1}) sets how fast repeats saturate; b is how much length counts.`}
            </Maths>
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
