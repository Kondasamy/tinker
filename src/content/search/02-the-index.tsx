// Chapter 2: the index, word to pages. The reader files three page cards into their words' drawers (KTD15: pick then
// place, by keyboard, tap or drag), the clerk files the rest, the reader predicts and runs a search that opens one
// drawer, then reads that drawer's postings on the Postings tab.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import pinned from '../../../data/search/pinned.json' with { type: 'json' };
import { DEFAULT, N, fmt, lookup, pageOf } from '../../lib/search/engine';
import { CABINET_PARTS, cabinetAt, drawerCount, type Drawer } from '../../components/scenes/cabinetScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, FilingBench, SearchStage, SimNote, type View } from './kit';

const MODULE = 'search',
  ID = '02-the-index';
export const PARTS = CABINET_PARTS;
export const QUERY = pinned.scan.query;
/** The three cards the reader files, and the drawers on the bench (one too many, so the choice is real). */
export const CARDS = ['warehouse-safety-handbook-2023#2', 'refund-policy-2025#1', 'wren-printer-quickstart-2022#1'].map(
  pageOf,
);
export const DRAWERS = ['forklift', 'refund', 'printer', 'invoice'];
export const WORDS = drawerCount(DEFAULT);
export const FOUND = lookup(QUERY).found.length;

export const P1 = {
  question: `How many pages will the index read to answer “${QUERY}”?`,
  options: [
    `All ${N}, like the scan`,
    `None: it opens one drawer, which lists the ${FOUND} pages`,
    'About half: it stops once it finds them',
  ],
};
export const OUTCOME = 1;

export const QUIZ = {
  question: 'A recipe site with 50,000 recipes builds an index. What does a search for “basil” do now?',
  options: [
    'Opens the “basil” drawer and reads off its list of recipes',
    'Reads all 50,000 recipes, only faster',
    'Reads the recipes until it has found ten with basil',
  ],
  correct: 0,
  explanation: 'The index was filled once, ahead of time; a search reads the word’s list, not the recipes.',
  why: [
    'Right: the work of reading was done once, when every recipe was filed under its words.',
    'An index replaces the reading, so the search never opens a recipe to look for the word.',
    'That is still a scan, just one that stops early, and it can miss the best recipes.',
  ],
};

interface S {
  filed: Record<number, string>;
  /** the drawer filed last, for the card dropping in */
  last?: string;
  p1: number | null;
  found: boolean;
  view: View;
  quiz: number | null;
}
const allFiled = (s: S) => CARDS.every(c => c in (s.filed ?? {}));

export const STEPS: Step<S>[] = [
  {
    id: 'file',
    focus: 'bench',
    visibleControls: ['bench'],
    narration: 'An index is built once, before any search: each page is filed in the drawer of every word on it.',
    act: 'File the three page cards.',
    say: { block: 'cabinet', text: 'Drawer per word' },
    predicate: allFiled,
    hint: 'Each card’s text shows one of the drawers’ words.',
    solution: s => ({ ...s, filed: { [CARDS[0]]: 'forklift', [CARDS[1]]: 'refund', [CARDS[2]]: 'printer' } }),
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `The clerk files the other ${N - CARDS.length} pages the same way: ${fmt(WORDS)} drawers, one per word.`,
    act: 'Predict the search.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'find',
    focus: 'find',
    visibleControls: ['p1', 'find'],
    narration: 'Your pick is locked.',
    act: `Search for “${QUERY}”.`,
    predicate: s => s.found && s.p1 !== null,
  },
  {
    id: 'postings',
    focus: 'tab',
    visibleControls: ['out1', 'tab'],
    narration: `One drawer, ${FOUND} pages: the scan’s pages, with none read. A drawer’s list of pages is its postings.`,
    act: 'Open the Postings tab.',
    say: { block: 'cabinet', text: 'One drawer' },
    predicate: s => s.view === 'postings',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['facts', 'quiz'],
    narration: 'An index swaps reading every page at search time for filing each page once, ahead of time.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'When were the recipes read?',
  },
];

/** The bench's drawers as the cabinet draws them: cards filed so far, the newest one dropping in. */
const benchDrawers = (filed: Record<number, string>, last?: string): Drawer[] =>
  DRAWERS.map(word => {
    const n = Object.values(filed).filter(w => w === word).length;
    return { word, cards: n, out: true, fresh: n > 0 && word === last };
  });

export default function TheIndex() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ filed: {}, p1: null, found: false, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const filed = state.filed ?? {},
          last = state.last;
        return (
          <SearchStage
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            show={
              state.found
                ? {
                    scene: cabinetAt(QUERY, DEFAULT),
                    postings: { query: QUERY, settings: DEFAULT },
                    caption: `“${QUERY}” through the index: one drawer opened, ${FOUND} pages listed, no page read.`,
                  }
                : {
                    scene: { words: allFiled(state) ? WORDS : DRAWERS.length, drawers: benchDrawers(filed, last) },
                    caption: allFiled(state)
                      ? `Every page filed: ${fmt(WORDS)} drawers.`
                      : `${Object.keys(filed).length} of ${CARDS.length} cards filed.`,
                  }
            }
          />
        );
      }}
      controls={{
        bench: ({ state, apply, sync }) => (
          <FilingBench
            cards={CARDS}
            drawers={DRAWERS}
            filed={state.filed ?? {}}
            clean={DEFAULT.clean}
            onFile={(page, word) => {
              const next = { ...state, filed: { ...(state.filed ?? {}), [page]: word }, last: word };
              // only the last card is the step's answer; the ones before it are progress, not misses
              (allFiled(next) ? apply : sync)(next);
            }}
          />
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        find: ({ state, apply }) => (
          <button type="button" className="chip" onClick={() => apply({ ...state, found: true })}>
            {`Search for “${QUERY}”`}
          </button>
        ),
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />
            <SimNote />
          </>
        ),
        tab: ({ state, apply }) => (
          <button type="button" className="chip" onClick={() => apply({ ...state, view: 'postings' })}>
            Open the Postings tab
          </button>
        ),
        facts: () => <Fact id="inverted-index" />,
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
