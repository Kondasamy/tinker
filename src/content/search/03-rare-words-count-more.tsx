// Chapter 3: rare words count more. "Larkspur forklift" counted word by word puts a page about security on top,
// because "Larkspur" is on so many pages; the reader reads the drawers' sizes on the Postings tab, predicts, then
// weighs each word by its rarity (tf-idf) and the forklift page wins.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import pinned from '../../../data/search/pinned.json' with { type: 'json' };
import { DEFAULT, N, idf, pageName, pageOf, postings, termsOf, type Settings } from '../../lib/search/engine';
import { CABINET_PARTS, cabinetAt } from '../../components/scenes/cabinetScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, Maths, SearchStage, SimNote, type View } from './kit';

const MODULE = 'search',
  ID = '03-rare-words-count-more';
export const PARTS = CABINET_PARTS;
export const QUERY = pinned.rare.query;
const [COMMON, RARE] = termsOf(QUERY, DEFAULT.clean);
const on = (w: string) => postings(w, DEFAULT.clean).doc.length;
const COUNT: Settings = { ...DEFAULT, weighting: 'count' },
  RARITY: Settings = { ...DEFAULT, weighting: 'tfidf' };
const COUNT_TOP = pageName(pageOf(pinned.rare.count)),
  RARITY_TOP = pageName(pageOf(pinned.rare.tfidf));

export const P1 = {
  question: 'If each word counts by its rarity, which page tops the podium?',
  options: [
    `${COUNT_TOP} again: it says “Larkspur” most`,
    `${RARITY_TOP}: it says “forklift”, the rare word`,
    'A page with neither word',
  ],
};
export const OUTCOME = 1;

export const QUIZ = {
  question:
    'On a help site, “the” is on every page and “warranty” on a few. How should a search for “the warranty” rank?',
  options: [
    'By “warranty”: on few pages, it weighs far more',
    'By “the”: it appears most often',
    'By both equally: each word counts once',
  ],
  correct: 0,
  explanation: 'A word on every page tells pages apart least, so rarity weighs it near zero.',
  why: [
    'Right: the rare word is what separates the pages about warranties from the rest.',
    'Being everywhere is exactly why “the” says nothing about which page is the answer.',
    'Counting each word the same is what let a common word win the forklift search.',
  ],
};

interface S {
  counted: boolean;
  view: View;
  p1: number | null;
  rare: boolean;
  quiz: number | null;
}
const fix = (n: number) => n.toFixed(1);

export const STEPS: Step<S>[] = [
  {
    id: 'count',
    focus: 'count',
    visibleControls: ['count'],
    narration: 'Each page gets a score: here, a point each time a search word is on it.',
    act: `Search “${QUERY}”, every word the same.`,
    say: { block: 'podium', text: 'Top score' },
    predicate: s => s.counted,
  },
  {
    id: 'drawers',
    focus: 'tab',
    visibleControls: ['tab'],
    narration: `“${COMMON}” is on ${on(COMMON)} pages, “${RARE}” on ${on(RARE)}. The common word carried the top page.`,
    act: 'Open the Postings tab.',
    predicate: s => s.view === 'postings',
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'Rarity is how few pages a word is on: the fewer, the more it tells pages apart.',
    act: 'Predict the top page by rarity.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'weigh',
    focus: 'rare',
    visibleControls: ['p1', 'rare'],
    narration: 'Your pick is locked.',
    act: 'Weigh each word by its rarity.',
    say: { block: 'podium', text: 'Rare word wins' },
    predicate: s => s.rare && s.p1 !== null,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'quiz'],
    narration: `Now “${RARE}” weighs ${fix(idf(RARE, DEFAULT.clean))} and “${COMMON}” ${fix(idf(COMMON, DEFAULT.clean))}: the rare word decides.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which word separates the warranty pages from the others?',
  },
];

export default function RareWordsCountMore() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ counted: false, view: 'scene', p1: null, rare: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const s = state.rare ? RARITY : COUNT;
        return (
          <SearchStage
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            show={
              state.counted
                ? {
                    scene: cabinetAt(QUERY, s),
                    postings: { query: QUERY, settings: s },
                    caption: state.rare
                      ? `Weighed by rarity: ${RARITY_TOP} on top.`
                      : `Every word the same: ${COUNT_TOP} on top.`,
                  }
                : { scene: { query: QUERY, words: 0, drawers: [] }, caption: 'The search waits on the desk.' }
            }
          />
        );
      }}
      controls={{
        count: ({ state, apply }) => (
          <button type="button" className="chip" onClick={() => apply({ ...state, counted: true })}>
            {`Search “${QUERY}”`}
          </button>
        ),
        tab: ({ state, apply }) => (
          <button type="button" className="chip" onClick={() => apply({ ...state, view: 'postings' })}>
            Open the Postings tab
          </button>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        rare: ({ state, apply }) => (
          <button type="button" className="chip" onClick={() => apply({ ...state, rare: true, view: 'scene' })}>
            Weigh words by rarity
          </button>
        ),
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />
            <Fact id="idf" />
            <Maths>
              {`Rarity = log(${N} pages ÷ pages with the word). A page’s score adds, for each search word, the times it says the word × the word’s rarity. This is tf-idf: term frequency × inverse document frequency.`}
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
