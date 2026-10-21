// Chapter 5: from token to vector. An embedding is a list of numbers for a piece of text. Everything here is RAG's
// committed index, read-only (KTD5): the question vectors, the chunk vectors and the 2D map. Cosines are computed live
// in the browser; the reader predicts which of two questions sits closer to a third before they are compared.
import { useMemo } from 'react';
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { cosine, queryIndexOf, queryVector, questionOf, sharedWords } from '../../lib/tokens/neighbours';
import { fact } from '../../lib/tokens/facts';
import { chapterHref, moduleOf, nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { Fact, MapStage, useMapIndex } from './kit';

const MODULE = 'tokens', ID = '05-from-token-to-vector';
const Q = questionOf('stale-hotel-limit'), OTHER = questionOf('same-day-cutoff');
const REWRITE = Q.rewrites[0];
const DIMS = fact('minilm').value;
const RAG4 = moduleOf('rag').chapters[3];
const words = (n: number) => `${n} word${n === 1 ? '' : 's'}`;

interface S { p1: number | null; embedded: boolean; probed: boolean; quiz: number | null }

const P1 = {
  question: `Which of these is closer in meaning to “${Q.query}”, by its embedding?`,
  options: [
    `“${REWRITE}” (shares ${words(sharedWords(Q.query, REWRITE))})`,
    `“${OTHER.query}” (shares ${words(sharedWords(Q.query, OTHER.query))})`,
    'Neither: they are all questions, so their embeddings are the same distance apart',
  ],
};

const QUIZ = {
  question: 'A Larkspur engineer suggests a shortcut for search: compare the token ids of the question and of each document piece, and pick the piece whose ids are closest. What do you tell them?',
  options: [
    'Good idea: tokens with close ids have close meanings',
    'Ids are just positions in the vocabulary and say nothing about meaning. Compare embeddings, which an embedding model made so that similar meanings get similar numbers',
    'It works if you sort the ids first',
    'Embeddings are the same thing as token ids, so either way works',
  ],
  correct: 1,
  explanation: fact('embedding-def').claim,
  why: [
    'An id is a row number in the tokenizer’s list. Id 500 is no closer in meaning to id 501 than to id 9.',
    `Right. An embedding model reads the whole text and gives back ${DIMS} numbers whose direction carries its meaning. That is what RAG’s search compares.`,
    'Sorting ids still compares row numbers in a list, not meanings.',
    'A token id is one number from a fixed list. An embedding is a list of numbers made from the whole text, by a model trained for it.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict', focus: 'p1', visibleControls: ['p1'],
    narration: `A token id is just a row number in the tokenizer’s list: it says nothing about meaning. For search, Larkspur needs numbers where similar meanings sit close together. An embedding model gives them: it reads a piece of text and returns a list of numbers, a vector. RAG’s model gives ${DIMS} numbers per text, and the RAG module already embedded every piece of Larkspur’s documents and every customer question. Before you compare three questions:`,
    predicate: s => s.p1 !== null,
  },
  {
    id: 'embed', focus: 'embed', visibleControls: ['p1', 'embed'],
    narration: 'Locked in. Compare their embeddings.',
    predicate: s => s.embedded,
    hint: 'Press “Compare the embeddings”.',
  },
  {
    id: 'map', focus: 'map', visibleControls: ['out1', 'cosines', 'map'],
    narration: `Cosine similarity scores how alike two vectors point, from -1 to 1; chapter 6 looks at it closely. The same question in other words shares few words with it but means the same thing, and their vectors point much the same way. The picture is RAG’s map of meaning: every dot is one piece of Larkspur’s documents, squeezed from ${DIMS} numbers onto two, and the diamond is the question. Point at a dot, or Tab to one, to read its true similarity.`,
    predicate: s => s.probed,
    hint: 'Move the pointer over a blue dot on the picture, or Tab into the map.',
  },
  {
    id: 'quiz', focus: 'quiz', visibleControls: ['map', 'quiz'],
    narration: 'Squeezing many numbers onto two bends distances, so a dot that looks close can score lower than one further away. The true similarity is the one search uses. One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Does a token id say anything about what a word means?',
  },
];

export default function FromTokenToVector() {
  const { index, cfg, failed } = useMapIndex();
  // the three cosines, computed live from RAG's committed question vectors
  const cos = useMemo(() => {
    if (!index) return null;
    const v = (id: string, kind?: 'rewrite') => queryVector(index, queryIndexOf(index, id, kind));
    return { rewrite: cosine(v(Q.id), v(Q.id, 'rewrite')), other: cosine(v(Q.id), v(OTHER.id)) };
  }, [index]);
  const out1 = cos ? (Math.abs(cos.rewrite - cos.other) < 0.01 ? 2 : cos.rewrite > cos.other ? 0 : 1) : 0;
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, embedded: false, probed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      ready={!!cos && !!cfg}
      stage={({ state, sync }) => (
        <MapStage question={Q} onProbe={() => { if (!state.probed) sync({ ...state, probed: true }); }}
          caption={`RAG’s map of meaning: the diamond is “${Q.query}”.`} />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        embed: ({ state, apply }) => (
          <>
            <button type="button" className="big" disabled={!cos} onClick={() => apply({ ...state, embedded: true })}>Compare the embeddings</button>
            {!cos && <p className="tc-status" role="status">{failed ? 'RAG’s index could not load. Reload the page to try again.' : 'Loading RAG’s embeddings…'}</p>}
          </>
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={out1} />,
        cosines: () => cos && (
          <div className="tc-def" data-cosines>
            <table className="tc-ledger">
              <caption>Cosine similarity to “{Q.query}”</caption>
              <thead><tr><th scope="col">Question</th><th scope="col">Words shared</th><th scope="col">Cosine</th></tr></thead>
              <tbody>
                <tr><th scope="row">{REWRITE}</th><td>{sharedWords(Q.query, REWRITE)}</td><td>{cos.rewrite.toFixed(3)}</td></tr>
                <tr><th scope="row">{OTHER.query}</th><td>{sharedWords(Q.query, OTHER.query)}</td><td>{cos.other.toFixed(3)}</td></tr>
              </tbody>
            </table>
            <Fact id="minilm" />
            <p className="tc-fact">
              The RAG module built these embeddings and searched with them: <a href={chapterHref('rag', RAG4.id)}>RAG chapter 4, {RAG4.title}</a>.
            </p>
          </div>
        ),
        map: ({ state }) => <p className="tc-status" role="status" data-probed={state.probed || undefined}>{state.probed ? 'Compare the true similarity with how far the dot looks.' : 'Waiting for you to point at a dot on the map.'}</p>,
        quiz: ({ state, apply, sync }) => (
          <Quiz {...QUIZ} unsure value={state.quiz} onAnswer={(_, q) => apply({ ...state, quiz: q })} onUnsure={() => sync({ ...state, quiz: UNSURE })} />
        ),
      }}
    />
  );
}
