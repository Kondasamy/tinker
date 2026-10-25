// Chapter 6: words versus meaning. A paraphrase finds nothing by keywords and its answer first by meaning (RAG's
// committed vectors, read only); a part number is first by keywords and far down by meaning; a blend of the two puts
// both answers in the top five. Links on to RAG.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import pinned from '../../../data/search/pinned.json' with { type: 'json' };
import {
  DEFAULT,
  QUERIES,
  TOP,
  blend,
  pageName,
  queryOf,
  ranked,
  scores,
  search,
  type Hit,
} from '../../lib/search/engine';
import type { Meanings } from '../../lib/search/workbench';
import { CABINET_PARTS, cabinetAt, drawerCount } from '../../components/scenes/cabinetScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Fact, MeaningGate, SearchStage, SimNote, useMeanings } from './kit';

const MODULE = 'search',
  ID = '06-words-vs-meaning';
export const PARTS = CABINET_PARTS;
export const PARA = queryOf(pinned.meaning.words),
  PART = queryOf(pinned.meaning.part);
/** Meaning's share in the blend this chapter shows. */
export const BLEND = 0.7;
const ordinal = (n: number) =>
  `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`;

export type Mode = 'words' | 'meaning' | 'blend';
/** A query's ranking in a mode; meaning needs the loaded scores. */
export function rankingOf(q: typeof PARA, mode: Mode, m: Meanings): Hit[] {
  const kw = scores(q.text, DEFAULT),
    mean = m[QUERIES.indexOf(q)];
  return ranked(mode === 'words' ? kw : mode === 'meaning' ? mean : blend(kw, mean, BLEND));
}
export const rankOf = (hits: Hit[], page: number) => hits.findIndex(h => h.id === page) + 1;

export const P1 = {
  question: 'Search by meaning instead, comparing embeddings. Where does the answer page land?',
  options: [
    'First: its meaning matches the search',
    'Nowhere: none of the words match',
    'Last: meaning flips the order',
  ],
};
export const OUTCOME = 0;

export const QUIZ = {
  question:
    'An IT help desk search must find error codes like “E-4471” and questions like “my screen goes black”. What should it use?',
  options: [
    'A blend: keywords catch exact codes, meaning catches the same idea in other words',
    'Meaning only: it understands every search',
    'Keywords only: codes are what matters',
  ],
  correct: 0,
  explanation: 'Keywords and meaning fail in opposite places, so a blend covers both.',
  why: [
    'Right: an exact code is a word match, and a description in other words is a meaning match.',
    'Meaning blurs exact strings, as the part number ranked far down showed.',
    'Keywords miss every search worded differently from its answer, like the sign-on page.',
  ],
};

interface S {
  q: 'para' | 'part';
  mode: Mode | null;
  p1: number | null;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'words',
    focus: 'words',
    visibleControls: ['words'],
    narration:
      'Keywords find pages that share the search’s words. The page that answers this one says “single sign-on”.',
    act: 'Search by keywords.',
    say: { block: 'podium', text: 'Wrong pages' },
    predicate: s => s.mode === 'words',
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'Keywords never matched the answer. An embedding stands for a text’s meaning as a list of numbers.',
    act: 'Predict a search by meaning.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'meaning',
    focus: 'modes',
    visibleControls: ['p1', 'modes'],
    narration: 'Your pick is locked.',
    act: 'Search by meaning.',
    predicate: s => s.mode === 'meaning' && s.q === 'para' && s.p1 !== null,
  },
  {
    id: 'part',
    focus: 'part',
    visibleControls: ['out1', 'part'],
    narration: `Meaning found it first. Now a part number, “${PART.text}”: by keywords its page is first.`,
    act: 'Search the part number by meaning.',
    predicate: s => s.mode === 'meaning' && s.q === 'part',
  },
  {
    id: 'blend',
    focus: 'modes',
    visibleControls: ['modes'],
    narration: `By meaning it ranked ${ordinal(pinned.meaning.partMeaningRank)}: an embedding blurs exact codes. Hybrid search ranks by both together.`,
    act: 'Blend keywords and meaning.',
    say: { block: 'podium', text: 'Both count' },
    predicate: s => s.mode === 'blend',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['facts', 'quiz'],
    narration: `With meaning at ${Math.round(BLEND * 100)}%, both answers land in the top ${TOP}. RAG retrieves by meaning the same way.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which half catches “E-4471”, and which catches “goes black”?',
  },
];

const MODE_NAMES: [Mode, string][] = [
  ['words', 'Keywords'],
  ['meaning', 'Meaning'],
  ['blend', 'Blend'],
];

export default function WordsVsMeaning() {
  const { meanings, failed, retry } = useMeanings();
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ q: 'para', mode: null, p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => {
        const q = state.q === 'part' ? PART : PARA;
        if (!state.mode)
          return (
            <SearchStage
              say={say}
              show={{ scene: { query: q.text, words: 0, drawers: [] }, caption: 'The search waits on the desk.' }}
            />
          );
        const words = state.mode === 'words';
        const hits = words ? search(q.text) : meanings ? rankingOf(q, state.mode, meanings) : [];
        const base = cabinetAt(q.text, DEFAULT);
        const at = rankOf(hits, q.right[0]);
        return (
          <SearchStage
            say={say}
            show={{
              scene: {
                ...base,
                // meaning alone opens no drawer: it compares whole texts
                drawers: state.mode === 'meaning' ? [] : base.drawers,
                words: drawerCount(DEFAULT),
                podium: hits.slice(0, 3).map(h => ({ name: pageName(h.id), score: h.score })),
              },
              postings: words ? { query: q.text, settings: DEFAULT } : undefined,
              caption:
                !words && !meanings
                  ? 'Loading the meaning vectors…'
                  : `“${q.text}”: the answer, ${pageName(q.right[0])}, ${at ? `ranks ${ordinal(at)}` : 'never matches'}.`,
            }}
          />
        );
      }}
      controls={{
        words: ({ state, apply }) => (
          <button type="button" className="chip" onClick={() => apply({ ...state, mode: 'words' })}>
            {`Search “${PARA.text}” by keywords`}
          </button>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        modes: ({ state, apply }) =>
          meanings ? (
            <div className="db-row-btns" role="group" aria-label="Rank by">
              {MODE_NAMES.map(([m, name]) => (
                <button
                  key={m}
                  type="button"
                  className="chip"
                  aria-pressed={state.mode === m}
                  onClick={() => apply({ ...state, mode: m })}
                >
                  {name}
                </button>
              ))}
            </div>
          ) : (
            <MeaningGate failed={failed} retry={retry} />
          ),
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />
            <SimNote />
          </>
        ),
        part: ({ state, apply }) =>
          meanings ? (
            <button
              type="button"
              className="chip"
              onClick={() => apply({ ...state, q: 'part', mode: 'meaning' })}
            >{`Search “${PART.text}” by meaning`}</button>
          ) : (
            <MeaningGate failed={failed} retry={retry} />
          ),
        facts: () => (
          <>
            <Fact id="beir" />
            <p className="tc-status">
              <a href="/rag/">Next door: RAG, which hands the pages it finds by meaning to a model →</a>
            </p>
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
