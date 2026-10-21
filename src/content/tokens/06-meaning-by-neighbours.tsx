// Chapter 6: meaning by neighbours. Cosine similarity between a committed RAG question and committed chunks (KTD5),
// computed live. The puzzle offers the question's nearest pieces and the pieces that share the most words with it;
// every piece tied at the highest cosine is a right answer (closest), the rest are not.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { puzzle } from '../../components/quiz/Puzzle';
import { candidates, closest, commonWords, queryIndexOf, queryVector, questionOf, type Candidate } from '../../lib/tokens/neighbours';
import { fact } from '../../lib/tokens/facts';
import type { Config, RagIndex } from '../../lib/rag/load';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { Fact, MapStage, useMapIndex } from './kit';

const MODULE = 'tokens', ID = '06-meaning-by-neighbours';
const Q = questionOf('k2-volume-price');

interface S { p1: number | null; pick: number | null; tried: number[]; quiz: number | null }

/** The puzzle's choices, once RAG's index has loaded. Module-level so the step's verdict and "Show me" can read them. */
let PUZZLE: { cs: Candidate[]; best: number[]; wordiest: Candidate } | null = null;
export function setUp(cs: Candidate[]) {
  PUZZLE = { cs, best: closest(cs), wordiest: cs.reduce((a, c) => (c.shared > a.shared ? c : a)) };
  return PUZZLE;
}
const right = (s: S) => s.pick !== null && !!PUZZLE?.best.includes(s.pick);

const P1 = {
  question: `Will the piece that shares the most words with “${Q.query}” be the closest to it by meaning?`,
  options: ['Yes: sharing words means sharing meaning', 'Not necessarily: an embedding scores meaning, and a piece can share words without answering'],
};

const QUIZ = {
  question: 'A customer writes “my rack wobbles”. Larkspur’s manual says “If a shelving unit is unstable, tighten the base bolts.” A keyword search finds nothing. Why can an embedding search still find the manual?',
  options: [
    'It can’t: no words match, so nothing can be found',
    'The two texts mean nearly the same, so their embeddings point the same way and score a high cosine, even with no words in common',
    'Embedding search guesses at random when words don’t match',
    'It looks the words up in a dictionary of synonyms',
  ],
  correct: 1,
  explanation: 'Nearest neighbours by cosine find pieces close in meaning. Shared words are neither needed nor enough.',
  why: [
    'That is keyword search’s limit. Embeddings compare meaning, not spelling.',
    `Right. ${fact('cosine-dot').claim}`,
    'The ranking is the cosine of each piece with the question: the same text always gets the same score.',
    'No lookup list is involved: the embedding model learned which texts mean alike from its training.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict', focus: 'p1', visibleControls: ['p1'],
    narration: `Every Larkspur piece and every question has an embedding. To compare two, take the cosine similarity: a score of how alike the two vectors point, from -1 to 1. A score of 1 means the same direction, the same meaning. The pieces with the highest scores are the question’s nearest neighbours, and they are what RAG’s search hands the model. A customer asks: “${Q.query}” Before you search:`,
    predicate: s => s.p1 !== null,
  },
  puzzle<S>({
    id: 'closest', focus: 'pieces', visibleControls: ['p1', 'pieces'],
    narration: 'Here are four pieces of Larkspur’s documents: the two nearest by meaning, and the two others that share the most words with the question. Pick the one closest to the question. Each pick shows its cosine.',
    broken: s => ({ ...s, pick: null, tried: [] }),
    verdict: right,
    solution: s => ({ ...s, pick: PUZZLE!.best[0], tried: [...new Set([...s.tried, PUZZLE!.best[0]])] }),
    hint: 'Ignore how many words a piece shares. Which piece actually answers the question?',
  }),
  {
    id: 'quiz', focus: 'quiz', visibleControls: ['out1', 'ranked', 'quiz'],
    narration: 'The piece that answers the question scored highest, whatever its words. A piece can share a name or small words like “a” and “or” with the question and still be about something else, so the most words in common is no guide. One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Do the two texts need any words in common for their embeddings to be close?',
  },
];

const titleOf = (index: RagIndex, cfg: Config, id: number) => index.corpus[cfg.ranges[id * 3]].title;

function Pieces({ s, apply, index, cfg }: { s: S; apply: (s: S) => void; index: RagIndex; cfg: Config }) {
  const P = PUZZLE!, n = P.best.length;
  const pick = (id: number) => apply({ ...s, pick: id, tried: [...new Set([...s.tried, id])] });
  return (
    <>
      <ol className="tk-choices" aria-label="Pieces to choose from">
        {P.cs.map((c, i) => (
          <li key={c.id} data-picked={s.pick === c.id || undefined}>
            <span className="tk-head">Piece {i + 1}, from {titleOf(index, cfg, c.id)} · shares {c.shared} word{c.shared === 1 ? '' : 's'}{c.shared ? `: ${commonWords(Q.query, cfg.texts[c.id]).join(', ')}` : ''}</span>
            <q>{cfg.texts[c.id]}</q>
            <button type="button" className="chip" aria-pressed={s.pick === c.id} onClick={() => pick(c.id)}>Pick piece {i + 1}</button>
            {s.tried.includes(c.id) && <span className="tk-note"> Cosine {c.score.toFixed(3)}</span>}
          </li>
        ))}
      </ol>
      <p className="tc-status" role="status" data-right={right(s) || undefined}>
        {s.pick === null ? 'No piece picked yet.'
          : right(s) ? `Closest: cosine ${P.cs.find(c => c.id === s.pick)!.score.toFixed(3)}, ${n === 1 ? 'the only one that works' : `one of ${n} that work`}.`
            : `Cosine ${P.cs.find(c => c.id === s.pick)!.score.toFixed(3)}: another piece is closer. Try again.`}
      </p>
    </>
  );
}

function Ranked({ index, cfg }: { index: RagIndex; cfg: Config }) {
  const ranked = [...PUZZLE!.cs].sort((a, b) => b.score - a.score || a.id - b.id);
  return (
    <div className="tc-def">
      <table className="tc-ledger" data-ranked>
        <caption>The four pieces, nearest first</caption>
        <thead><tr><th scope="col">Piece from</th><th scope="col">Words shared</th><th scope="col">Cosine</th></tr></thead>
        <tbody>{ranked.map(c => <tr key={c.id}><th scope="row">{titleOf(index, cfg, c.id)}</th><td>{c.shared}</td><td>{c.score.toFixed(3)}</td></tr>)}</tbody>
      </table>
      <Fact id="cosine-dot" />
    </div>
  );
}

export default function MeaningByNeighbours() {
  const { index, cfg, failed } = useMapIndex();
  const P = index && cfg ? (PUZZLE ?? setUp(candidates(cfg, queryVector(index, queryIndexOf(index, Q.id)), Q.query))) : null;
  const loading = <p className="tc-status" role="status">{failed ? 'RAG’s index could not load. Reload the page to try again.' : 'Loading RAG’s embeddings…'}</p>;
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, pick: null, tried: [], quiz: null }}
      next={nextOf(MODULE, ID)}
      ready={!!P}
      stage={({ state }) => <MapStage question={Q} mark={right(state)} caption={right(state) ? 'The highlighted dots are the question’s three nearest pieces.' : `The diamond is “${Q.query}”.`} />}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        pieces: ({ state, apply }) => (P && index && cfg ? <Pieces s={state} apply={apply} index={index} cfg={cfg} /> : loading),
        out1: ({ state }) => P && <Outcome {...P1} prediction={state.p1} outcome={P.best.includes(P.wordiest.id) ? 0 : 1} />,
        ranked: () => (P && index && cfg ? <Ranked index={index} cfg={cfg} /> : loading),
        quiz: ({ state, apply, sync }) => (
          <Quiz {...QUIZ} unsure value={state.quiz} onAnswer={(_, q) => apply({ ...state, quiz: q })} onUnsure={() => sync({ ...state, quiz: UNSURE })} />
        ),
      }}
    />
  );
}
