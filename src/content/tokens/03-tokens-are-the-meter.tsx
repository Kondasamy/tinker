// Chapter 3: tokens are the meter. Larkspur's documents are counted three ways: the bytes ÷ 4 rule of thumb, real
// tokenizers' counts (recorded ahead of time, KTD4) and the site tokenizer's (in-sample, R6). Then the documents are
// priced with a dated, cited price. Every number is computed from the corpus or read from data/tokens/.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { VOCAB_SIZE } from '../../lib/lm/bpe';
import { BYTES_PER_TOKEN } from '../../lib/scale';
import { CORPUS, corpusMeter } from '../../lib/tokens/counts';
import { fact } from '../../lib/tokens/facts';
import { PARAGRAPH } from '../../lib/tokens/merges';
import { chapterHref, moduleOf, nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { Fact, TokensStage } from './kit';

const MODULE = 'tokens', ID = '03-tokens-are-the-meter';
const M = corpusMeter();
const n = (x: number) => Math.round(x).toLocaleString('en-US');
const pct = (a: number, b: number) => `${Math.round(Math.abs(a / b - 1) * 100)}%`;
const PRICE = fact('input-price'), PER_M = Number(PRICE.value);
const cost = (tokens: number) => `$${(tokens * PER_M / 1e6).toFixed(4)}`;
const RAG2 = moduleOf('rag').chapters[1];

interface S { p1: number | null; counted: boolean; priced: boolean; quiz: number | null }

const P1 = {
  question: `The rule of thumb says Larkspur’s documents are about ${n(M.rule)} tokens. How does that compare with what real tokenizers count?`,
  options: [
    'The rule gives more tokens than the real tokenizers count',
    'The rule gives fewer tokens than the real tokenizers count',
    'The rule matches them within 1%',
  ],
};
const mean = M.real.reduce((a, r) => a + r.tokens, 0) / M.real.length;
const OUT1 = M.rule > mean * 1.01 ? 0 : M.rule < mean * 0.99 ? 1 : 2;
const vs = M.real.map(r => `${pct(M.rule, r.tokens)} ${M.rule > r.tokens ? 'over' : 'under'} ${r.name}`).join(' and ');

const QUIZ = {
  question: 'Larkspur moves its assistant to a newer model from the same provider. The documents and prompts haven’t changed. The finance lead expects the same bill per request. What do you tell them?',
  options: [
    'Same text, same tokens, same bill',
    'Recount with the new model’s tokenizer: a new tokenizer can cut the same text into more or fewer tokens, and the bill follows its count',
    'Use the 4-characters rule: it is exact for English, so the count can’t change',
    'Count words instead: providers bill per word, not per token',
  ],
  correct: 1,
  explanation: fact('billed-in-tokens').claim,
  why: [
    `The text stays the same, but the meter may not. ${fact('claude-tokenizer-30').claim}`,
    `Right. ${fact('billed-in-tokens').claim}`,
    `The rule was ${vs} on Larkspur’s documents. It is a guide for planning, not a count.`,
    'Providers bill in tokens, counted by their own tokenizer. Words are only a rough guide to tokens.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict', focus: 'p1', visibleControls: ['p1'],
    narration: `Larkspur has ${CORPUS.length} documents, ${n(M.bytes)} bytes of text. Providers bill and size the context window in tokens, so the team needs a count. ${fact('openai-rule').claim} By that rule, ${n(M.bytes)} ÷ ${BYTES_PER_TOKEN} is about ${n(M.rule)} tokens. Two real tokenizers counted the same documents ahead of time. Before you look:`,
    predicate: s => s.p1 !== null,
  },
  {
    id: 'count', focus: 'count', visibleControls: ['p1', 'count'],
    narration: 'Locked in. Count the documents.',
    predicate: s => s.counted,
    hint: 'Press “Count the documents”.',
  },
  {
    id: 'compare', focus: 'price', visibleControls: ['out1', 'table', 'price'],
    narration: `The rule was ${vs}. On these documents each real token held more than ${BYTES_PER_TOKEN} bytes. This site’s own tokenizer counted ${n(M.site)}, more than any of them, even though it learned from these very documents. That count is in-sample, and with only ${VOCAB_SIZE} tokens in its vocabulary it cuts finer. Now put a price on it.`,
    predicate: s => s.priced,
    hint: 'Press “Price the documents”.',
  },
  {
    id: 'bill', focus: 'quiz', visibleControls: ['table', 'bill', 'quiz'],
    narration: `Same documents, different meters, different bills. The context window is counted the same way, by the model’s own tokenizer. One question to finish.`,
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Who counts the tokens on the bill: you, a rule, or the model’s tokenizer?',
  },
];

function Table({ priced }: { priced: boolean }) {
  const rows = [
    { name: `Rule of thumb (bytes ÷ ${BYTES_PER_TOKEN})`, tokens: M.rule, note: 'an estimate' },
    ...M.real.map(r => ({ name: r.name, tokens: r.tokens, note: 'recorded' })),
    { name: 'This site’s tokenizer', tokens: M.site, note: 'in-sample: trained on these documents' },
  ];
  return (
    <table className="tc-ledger" data-meter style={{ marginTop: 10 }}>
      <caption>Larkspur’s {CORPUS.length} documents, {n(M.bytes)} bytes</caption>
      <thead><tr><th scope="col">Counted by</th><th scope="col">Tokens</th><th scope="col">Bytes per token</th>{priced && <th scope="col">Cost to send once</th>}</tr></thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.name}>
            <th scope="row">{r.name} <span className="tk-note">({r.note})</span></th>
            <td>{n(r.tokens)}</td><td>{(M.bytes / r.tokens).toFixed(1)}</td>{priced && <td>{cost(r.tokens)}</td>}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function TokensAreTheMeter() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, counted: false, priced: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={() => <TokensStage text={PARAGRAPH} caption={`One paragraph of ${CORPUS.length} documents, counted by this site’s tokenizer.`} />}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        count: ({ state, apply }) => <button type="button" className="big" onClick={() => apply({ ...state, counted: true })}>Count the documents</button>,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUT1} />,
        table: ({ state }) => <Table priced={state.priced} />,
        price: ({ state, apply }) => <button type="button" className="big" onClick={() => apply({ ...state, priced: true })}>Price the documents</button>,
        bill: () => (
          <div className="tc-def">
            <Fact id="input-price" />
            <Fact id="claude-tokenizer-30" />
            <p className="tc-fact">Why the window matters too: <a href={chapterHref('rag', RAG2.id)}>RAG chapter 2, {RAG2.title}</a></p>
          </div>
        ),
        quiz: ({ state, apply, sync }) => (
          <Quiz {...QUIZ} unsure value={state.quiz} onAnswer={(_, q) => apply({ ...state, quiz: q })} onUnsure={() => sync({ ...state, quiz: UNSURE })} />
        ),
      }}
    />
  );
}
