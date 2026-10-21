// Chapter 4: every tokenizer splits differently. The fixed sentences (data/tokens/sentences.json) through this site's
// tokenizer, computed live (R6), and the real ones recorded ahead of time (KTD4): leading spaces, numbers, code and
// other languages. Every count and every piece in the copy is read from the recordings, never typed.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { SENTENCES, TOKENIZERS, encodingOf, type Encoding } from '../../lib/tokens/encodings';
import { fact } from '../../lib/tokens/facts';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { Fact, TokensStage, siteEncoding } from './kit';

const MODULE = 'tokens', ID = '04-every-tokenizer-splits-differently';
const SITE = 'site';
const TOKS = [{ id: SITE, name: 'This site’s tokenizer' }, ...TOKENIZERS];
const nameOf = (t: string) => TOKS.find(x => x.id === t)!.name;
const encOf = (sentence: string, tok: string): Encoding =>
  tok === SITE ? siteEncoding(SENTENCES.find(s => s.id === sentence)!.text) : encodingOf(sentence, tok);
const count = (sentence: string, tok: string) => encOf(sentence, tok).ids.length;
const textOf = (id: string) => SENTENCES.find(s => s.id === id)!.text;

const OLD = TOKENIZERS[0], NEW = TOKENIZERS[TOKENIZERS.length - 1];
/** The saved picks, or the first ones when a run saved before a re-recording names a sentence or tokenizer now gone. */
export const picked = (s: S): S => ({
  ...s,
  sentence: SENTENCES.some(x => x.id === s.sentence) ? s.sentence : 'order-en',
  tok: TOKS.some(t => t.id === s.tok) ? s.tok : OLD.id,
});
const EN = count('order-en', OLD.id), HI = count('order-hi', OLD.id), RATIO = HI / EN;

/** The pieces a tokenizer cut `sub` into, read off its recording: every piece that overlaps the substring's characters. */
function cut(sentence: string, tok: string, sub: string): string[] {
  const e = encOf(sentence, tok), start = textOf(sentence).indexOf(sub), end = start + sub.length;
  const out: string[] = [];
  let at = 0;
  for (const p of e.pieces) {
    const len = typeof p === 'string' ? p.length : 0;   // byte chips only appear in the other languages
    if (typeof p === 'string' && at < end && at + len > start) out.push(p);
    at += len;
  }
  return out;
}
const shown = (ps: string[]) => ps.map(p => `“${p.replace(/ /g, '␣')}”`).join(' + ');
const tokensOf = (n: number) => `${n} token${n === 1 ? '' : 's'}`;

interface S { p1: number | null; ran: boolean; sentence: string; tok: string; quiz: number | null }

const P1 = {
  question: `On ${OLD.name}, Larkspur’s order message in English is ${tokensOf(EN)}: “${textOf('order-en')}” How many tokens does the same message in Hindi take?`,
  options: ['Under twice as many: same meaning, about the same tokens', 'Two to five times as many', 'More than five times as many'],
};
const OUT1 = RATIO < 2 ? 0 : RATIO <= 5 ? 1 : 2;

const QUIZ = {
  question: 'Larkspur opens a support line in Japanese. A planner budgets the Japanese emails at the same tokens per message as the English ones. What do you tell them?',
  options: [
    'Fine: the same message means the same number of tokens',
    'Count real Japanese emails with the model’s tokenizer: the same message can take several times the tokens, and the gap depends on the tokenizer',
    'Japanese takes fewer tokens, because each character is one token',
    'Translate the emails into English before counting, and use that count',
  ],
  correct: 1,
  explanation: fact('language-disparity').claim,
  why: [
    `The order message took ${tokensOf(count('order-en', NEW.id))} in English and ${tokensOf(count('order-ja', NEW.id))} in Japanese on ${NEW.name}. Meaning doesn’t set the count; the tokenizer’s vocabulary does.`,
    'Right. A tokenizer learned mostly from English keeps fewer pieces of other languages whole. Count the real text, on the tokenizer you will be billed by.',
    `A Japanese character is often several bytes, and on ${OLD.name} several tokens: the order message took ${tokensOf(count('order-ja', OLD.id))} there.`,
    'The model reads the Japanese the customer wrote, so that is what you pay for. A translation’s count is a different text’s count.',
  ],
};

const SP = cut('spaces', OLD.id, textOf('spaces').split(' ')[0]);
const NUM = textOf('numbers').match(/\d{4,}/)![0], YEAR = textOf('numbers').match(/\d{4}-/)![0].slice(0, 4);

export const STEPS: Step<S>[] = [
  {
    id: 'predict', focus: 'p1', visibleControls: ['p1'],
    narration: `Real tokenizers counted Larkspur’s documents differently in chapter 3. Each one learned its own vocabulary from its own training text, so each cuts the same sentence its own way. The team recorded two real tokenizers, ${TOKENIZERS.map(t => t.name).join(' and ')}, on a few fixed sentences. Before you look:`,
    predicate: s => s.p1 !== null,
  },
  {
    id: 'run', focus: 'run', visibleControls: ['p1', 'run'],
    narration: 'Locked in. Run every sentence through every tokenizer.',
    predicate: s => s.ran,
    hint: 'Press “Run every sentence”.',
  },
  {
    id: 'spaces', focus: 'pick', visibleControls: ['out1', 'table', 'pick'],
    narration: `The Hindi message took ${tokensOf(HI)} on ${OLD.name}, against ${EN} in English: ${RATIO.toFixed(1)} times as many. Most Hindi letters are three bytes, and ${OLD.name} learned few merges for them, so many stayed as loose bytes. ${NEW.name}, trained on far more languages, took ${tokensOf(count('order-hi', NEW.id))}. Extra tokens for the same meaning are a token tax. Now pick “${textOf('spaces')}” on ${OLD.name} and open the Tokens tab on the picture.`,
    predicate: s => s.sentence === 'spaces' && s.tok === OLD.id,
    hint: `Pick the sentence “${textOf('spaces')}” and the tokenizer ${OLD.name}.`,
  },
  {
    id: 'numbers', focus: 'pick', visibleControls: ['table', 'pick'],
    narration: `${OLD.name} cut the first “${SP.join('')}”, at the start of the text, into ${shown(SP)}, but “␣shelf” with its leading space is ${tokensOf(cut('spaces', OLD.id, ' shelf').length)}. Most words come after a space, so tokenizers learn the word with its space glued on. A capital, a doubled space or no space at all makes different tokens. Now pick the numbers sentence on ${NEW.name}.`,
    predicate: s => s.sentence === 'numbers' && s.tok === NEW.id,
    hint: `Pick the sentence that starts “${textOf('numbers').split(' ')[0]}” and the tokenizer ${NEW.name}.`,
  },
  {
    id: 'quiz', focus: 'quiz', visibleControls: ['table', 'pick', 'quiz'],
    narration: `${NEW.name} cut ${NUM} into ${shown(cut('numbers', NEW.id, NUM))} and the year ${YEAR} into ${shown(cut('numbers', NEW.id, YEAR))}; ${OLD.name} cut them into ${shown(cut('numbers', OLD.id, NUM))} and ${shown(cut('numbers', OLD.id, YEAR))}. Numbers break wherever the vocabulary happens to have pieces, which is one reason models slip on arithmetic. Code is cut the same way: pick it to see. One question to finish.`,
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Does the meaning of a message set its token count, or does the tokenizer?',
  },
];

const short = (name: string) => name.replace(/ \(.*\)$/, '');   // “GPT-4o (o200k_base)” → “GPT-4o”, for narrow columns
function Table({ s }: { s: S }) {
  return (
    <div className="tk-scroll">
      <table className="tc-ledger" data-splits style={{ marginTop: 10 }}>
        <caption>Tokens per sentence: {TOKENIZERS.map(t => short(t.name)).join(' and ')} recorded, this site’s counted live</caption>
        <thead><tr><th scope="col">Sentence</th>{TOKS.map(t => <th key={t.id} scope="col">{t.id === SITE ? 'This site' : short(t.name)}</th>)}</tr></thead>
        <tbody>
          {SENTENCES.map(x => (
            <tr key={x.id} aria-current={x.id === s.sentence ? 'true' : undefined}>
              <th scope="row" lang={x.lang === 'code' ? undefined : x.lang}>{x.text}</th>
              {TOKS.map(t => <td key={t.id}>{count(x.id, t.id)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Pick({ s, apply }: { s: S; apply: (s: S) => void }) {
  return (
    <div className="tc-bench">
      <p className="lbl">Sentence</p>
      <div className="tk-pick" role="group" aria-label="Sentence">
        {SENTENCES.map(x => (
          <button key={x.id} type="button" className="chip" aria-pressed={s.sentence === x.id} lang={x.lang === 'code' ? undefined : x.lang}
            onClick={() => apply({ ...s, sentence: x.id })}>{x.text}</button>
        ))}
      </div>
      <p className="lbl">Tokenizer</p>
      <div className="tk-pick" role="group" aria-label="Tokenizer">
        {TOKS.map(t => <button key={t.id} type="button" className="chip" aria-pressed={s.tok === t.id} onClick={() => apply({ ...s, tok: t.id })}>{t.name}</button>)}
      </div>
    </div>
  );
}

export default function EveryTokenizerSplitsDifferently() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, ran: false, sentence: 'order-en', tok: OLD.id, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state: saved }) => { const state = picked(saved); return (
        <TokensStage text={textOf(state.sentence)} enc={state.tok === SITE ? undefined : encodingOf(state.sentence, state.tok)}
          caption={state.tok === SITE ? 'Counted by this site’s tokenizer, live.' : `${nameOf(state.tok)}’s tokens, recorded ahead of time.`} />
      ); }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        run: ({ state, apply }) => <button type="button" className="big" onClick={() => apply({ ...state, ran: true })}>Run every sentence</button>,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUT1} />,
        table: ({ state }) => <Table s={state} />,
        pick: ({ state, apply }) => <Pick s={state} apply={apply} />,
        quiz: ({ state, apply, sync }) => (
          <>
            <Fact id="language-disparity" />
            <Quiz {...QUIZ} unsure value={state.quiz} onAnswer={(_, q) => apply({ ...state, quiz: q })} onUnsure={() => sync({ ...state, quiz: UNSURE })} />
          </>
        ),
      }}
    />
  );
}
