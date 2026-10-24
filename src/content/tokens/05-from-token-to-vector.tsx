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

const MODULE = 'tokens',
  ID = '05-from-token-to-vector';
const Q = questionOf('stale-hotel-limit'),
  OTHER = questionOf('same-day-cutoff');
const REWRITE = Q.rewrites[0];
const DIMS = fact('minilm').value;
const RAG4 = moduleOf('rag').chapters[3];
const words = (n: number) => `${n} word${n === 1 ? '' : 's'}`;
export const PARTS: readonly string[] = [];

interface S {
  p1: number | null;
  embedded: boolean;
  probed: boolean;
  quiz: number | null;
}

const P1 = {
  question: `Which of these is closer in meaning to “${Q.query}”, by its embedding?`,
  options: [
    `“${REWRITE}” (shares ${words(sharedWords(Q.query, REWRITE))})`,
    `“${OTHER.query}” (shares ${words(sharedWords(Q.query, OTHER.query))})`,
    'Neither: they are all questions, so their embeddings are the same distance apart',
  ],
};

export const QUIZ = {
  question:
    'A Larkspur engineer suggests a shortcut for search: compare the token ids of the question and of each document piece, and pick the piece whose ids are closest. What do you tell them?',
  options: [
    'Good idea: tokens with close ids have close meanings',
    'Ids are just positions in the vocabulary and say nothing about meaning. Compare embeddings, which an embedding model made so that similar meanings get similar numbers',
    'It works if you sort the ids first',
    'Embeddings are the same thing as token ids, so either way works',
  ],
  correct: 1,
  explanation: fact('embedding-def').claim,
  why: [
    'An id is a row number in the tokenizer’s list, so id 500 is no closer in meaning to 501 than to 9.',
    `Right: an embedding model reads the whole text and returns ${DIMS} numbers whose direction carries its meaning, which RAG’s search compares.`,
    'Sorting ids still compares row numbers in a list, not meanings.',
    'A token id is one number from a fixed list, while an embedding is many numbers made from the whole text by a trained model.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `An embedding model reads text and returns a vector: ${DIMS} numbers where similar meanings sit close.`,
    act: 'Predict which question is closer.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'embed',
    focus: 'embed',
    visibleControls: ['p1', 'embed'],
    narration: 'Your pick is locked.',
    act: 'Compare their embeddings.',
    predicate: s => s.embedded,
    hint: 'Press “Compare the embeddings”.',
  },
  {
    id: 'map',
    focus: 'map',
    visibleControls: ['out1', 'cosines', 'map'],
    narration: `Few shared words, same meaning, same direction. This map squeezes ${DIMS} dimensions onto two.`,
    act: 'Point or Tab to a dot to read its similarity.',
    predicate: s => s.probed,
    hint: 'Move the pointer over a blue dot on the picture, or Tab into the map.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['map', 'quiz'],
    narration:
      'Squeezing bends distances: a dot that looks close can score lower than one further off. Search uses the true score.',
    act: 'One question to finish.',
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
      stage={({ state, sync, focus }) => (
        // a probe counts only on the map step, and always re-syncs there, so a run saved with an early probe still advances
        <MapStage
          question={Q}
          onProbe={() => {
            if (focus === 'map') sync({ ...state, probed: true });
          }}
          caption={`RAG’s map of meaning: the diamond is “${Q.query}”.`}
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        embed: ({ state, apply }) => (
          <>
            <button type="button" className="big" disabled={!cos} onClick={() => apply({ ...state, embedded: true })}>
              Compare the embeddings
            </button>
            {!cos && (
              <p className="tc-status" role="status">
                {failed ? 'RAG’s index could not load. Reload the page to try again.' : 'Loading RAG’s embeddings…'}
              </p>
            )}
          </>
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={out1} />,
        cosines: () =>
          cos && (
            <div className="tc-def" data-cosines>
              <table className="tc-ledger">
                <caption>Cosine similarity to “{Q.query}”</caption>
                <thead>
                  <tr>
                    <th scope="col">Question</th>
                    <th scope="col">Words shared</th>
                    <th scope="col">Cosine</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">{REWRITE}</th>
                    <td>{sharedWords(Q.query, REWRITE)}</td>
                    <td>{cos.rewrite.toFixed(3)}</td>
                  </tr>
                  <tr>
                    <th scope="row">{OTHER.query}</th>
                    <td>{sharedWords(Q.query, OTHER.query)}</td>
                    <td>{cos.other.toFixed(3)}</td>
                  </tr>
                </tbody>
              </table>
              <Fact id="minilm" />
              <p className="tc-fact">
                The RAG module built these embeddings and searched with them:{' '}
                <a href={chapterHref('rag', RAG4.id)}>RAG chapter 4, {RAG4.title}</a>.
              </p>
            </div>
          ),
        map: ({ state }) => (
          <p className="tc-status" role="status" data-probed={state.probed || undefined}>
            {state.probed
              ? 'Compare the true similarity with how far the dot looks.'
              : 'Waiting for you to point at a dot on the map.'}
          </p>
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
