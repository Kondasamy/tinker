// Chapter 7: the workbench. Larkspur's prompt is built from parts (src/lib/tokens/workbench.ts), counted live with
// this site's tokenizer (R6) and fitted to a token budget. The parts on and the budget live in the step state, so a
// resumed run keeps the reader's bench. Every prompt that fits with nothing more to add is a right answer.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { puzzle } from '../../components/quiz/Puzzle';
import { encode } from '../../lib/lm/bpe';
import { BUDGETS, PARTS as PROMPT_PARTS, fit, full, fullPrompts, promptOf } from '../../lib/tokens/workbench';
import { TOKEN_PARTS, tokensWord } from '../../components/scenes/tokenScene';
import { fact } from '../../lib/tokens/facts';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { Fact, TokensStage } from './kit';

const MODULE = 'tokens',
  ID = '07-workbench';
export const PARTS = TOKEN_PARTS;
const ALL = PROMPT_PARTS.map(p => p.id);
const LOW = BUDGETS[0],
  HIGH = BUDGETS[BUDGETS.length - 1];
const ALL_TOKENS = fit(ALL, LOW).tokens,
  RATIO = ALL_TOKENS / LOW;
const label = (id: string) => PROMPT_PARTS.find(p => p.id === id)!.label;
const list = (ids: string[]) => ids.map(label).join(', ');

interface S {
  p1: number | null;
  on: string[];
  budget: number;
  quiz: number | null;
}

const P1 = {
  question: `Larkspur’s budget is ${LOW} tokens per request. With all ${PROMPT_PARTS.length} parts in, how does the prompt compare?`,
  options: [
    'It fits in the budget',
    'Over, by less than half the budget again',
    'Over, by half the budget again or more',
  ],
};
const OUT1 = RATIO <= 1 ? 0 : RATIO < 1.5 ? 1 : 2;

export const QUIZ = {
  question:
    'The prompt fits Larkspur’s budget on this site’s tokenizer. The team will send it to a provider’s model. Is it sure to fit there too?',
  options: [
    'Yes: a token is a token on every model',
    'No: count it with the provider’s own tokenizer, which bills and limits the request, and leave some room',
    'Yes, as long as it is in English',
    'No, and it can’t be known until the bill arrives',
  ],
  correct: 1,
  explanation: fact('billed-in-tokens').claim,
  why: [
    'Each provider cuts text with its own tokenizer: in chapter 4 the same sentence took a different count on every one.',
    'Right: count with the tokenizer you will be billed by and keep a margin, since even a provider’s own count is an estimate.',
    'English differs too: in chapter 3 the real tokenizers counted Larkspur’s English documents differently.',
    'Providers offer ways to count tokens before you send, so you can know and should check before going live.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `The token budget is ${LOW} tokens per request, counted live here by this site’s tokenizer.`,
    act: 'Predict first.',
    say: { block: 'belt', text: 'Counted live' },
    predicate: s => s.p1 !== null,
  },
  puzzle<S>({
    id: 'trim',
    focus: 'bench',
    visibleControls: ['out1', 'bench'],
    narration: `All in, the prompt is ${tokensWord(ALL_TOKENS)}. The needed parts stay: without them the assistant can’t answer.`,
    act: `Turn parts off until it fits in ${LOW}.`,
    say: { block: 'belt', text: 'Over budget' },
    broken: s => ({ ...s, on: ALL, budget: LOW }),
    verdict: s => full(s.on, s.budget),
    solution: s => ({ ...s, on: fullPrompts(LOW)[0] }),
    hint: 'The parts marked “needed” must stay. Turn every other part off.',
  }),
  puzzle<S>({
    id: 'raise',
    focus: 'bench',
    visibleControls: ['bench'],
    narration: `The budget is now ${HIGH}. A prompt with room for one more part isn’t done.`,
    act: 'Add parts back until nothing else fits.',
    say: { block: 'belt', text: 'Room for more' },
    broken: s => ({ ...s, budget: HIGH }),
    verdict: s => full(s.on, s.budget),
    solution: s => ({ ...s, on: fullPrompts(HIGH)[0] }),
    hint: 'Add one part at a time. If the count goes over, swap it for a smaller one.',
  }),
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['bench', 'quiz'],
    narration:
      'It fits with nothing more to add, and more than one mix does that. A provider’s tokenizer would count it differently.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Whose tokenizer counts the tokens a provider bills and limits?',
  },
];

function Bench({ s, apply }: { s: S; apply: (s: S) => void }) {
  const f = fit(s.on, s.budget),
    n = fullPrompts(s.budget).length,
    done = full(s.on, s.budget);
  const flip = (id: string) => apply({ ...s, on: s.on.includes(id) ? s.on.filter(x => x !== id) : [...s.on, id] });
  return (
    <div className="tc-bench">
      <ul className="tk-choices" aria-label="Prompt parts">
        {PROMPT_PARTS.map(p => (
          <li key={p.id} data-picked={s.on.includes(p.id) || undefined}>
            <button type="button" className="chip" aria-pressed={s.on.includes(p.id)} onClick={() => flip(p.id)}>
              {p.label}: {s.on.includes(p.id) ? 'in' : 'out'}
            </button>
            <span className="tk-note">
              {' '}
              {tokensWord(encode(p.text).length)}
              {p.required ? ' · needed' : ''}
            </span>
          </li>
        ))}
      </ul>
      <p className="tc-status" role="status" data-fit={f.fits} data-tokens={f.tokens}>
        {f.tokens} of {f.budget} tokens · {f.fits ? `fits, ${f.left} left` : `over by ${f.over}`}
        {f.missing.length ? ` · missing: ${list(f.missing)}` : ''}
        {done ? ` · nothing more fits: one of ${n} that work.` : f.ok ? ' · room for more?' : ''}
      </p>
    </div>
  );
}

export default function Workbench() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, on: ALL, budget: LOW, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => {
        const f = fit(state.on, state.budget);
        return (
          <TokensStage
            say={say}
            text={promptOf(state.on)}
            caption={`${f.tokens} of ${f.budget} tokens, counted by this site’s tokenizer, live.`}
          />
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUT1} />,
        bench: ({ state, apply }) => <Bench s={state} apply={apply} />,
        quiz: ({ state, apply, sync }) => (
          <>
            <Fact id="billed-in-tokens" />
            <Fact id="count-estimate" />
            <Quiz
              {...QUIZ}
              unsure
              value={state.quiz}
              onAnswer={(_, q) => apply({ ...state, quiz: q })}
              onUnsure={() => sync({ ...state, quiz: UNSURE })}
            />
          </>
        ),
      }}
    />
  );
}
