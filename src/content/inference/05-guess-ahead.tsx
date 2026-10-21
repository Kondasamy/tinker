// Chapter 5: guess ahead. Speculative decoding runs live: the student drafts k tokens, Larkspur mini checks them in one
// pass and keeps the longest prefix it agrees with plus its own next token. The reply is compared with plain greedy
// decoding token for token ("same output"); the acceptance rate and tokens per check are computed, never typed.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { decode, encode } from '../../lib/lm/bpe';
import type { Model } from '../../lib/lm/model';
import { KS, greedy, speculate, type SpecRun } from '../../lib/inference/speculate';
import { pieceLabel } from '../../components/scenes/attentionMap';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { num } from '../../lib/format';
import META from '../../../public/data/lm/meta.json' with { type: 'json' };
import P from '../../../data/inference/prompts.json' with { type: 'json' };
import { Fact, InferenceStage, ModelGate, modelNow } from './kit';

const MODULE = 'inference', ID = '05-guess-ahead';
export const PROMPT = P.prompts.find(p => p.id === 'billing')!.text, IDS = encode(PROMPT), N = P.write;
/** the draft length the reveal uses */
export const K = 2;
const BIG = META.model.params, SMALL = META.student!.model.params;

const cache = new Map<string, SpecRun>();
/** one run per k, computed once (both models are fixed) */
export function runAt(target: Model, draft: Model, k: number): SpecRun {
  if (!cache.has(String(k))) cache.set(String(k), speculate(target, draft, IDS, k, N));
  return cache.get(String(k))!;
}

const P1 = {
  question: `The student, about ${Math.round(SMALL / 1000)}k parameters to Larkspur mini’s ${Math.round(BIG / 1000)}k, will guess ${K} tokens at a time; Larkspur mini checks each guess in one pass and keeps what it agrees with. What happens to the reply?`,
  options: [
    'The same reply, in fewer passes of Larkspur mini',
    'A slightly different reply: the student’s guesses get in',
    'The same reply, but more passes: every guess has to be checked',
  ],
};
export function outcomeOf(target: Model, draft: Model): number {
  const r = runAt(target, draft, K), same = r.out.join() === greedy(target, IDS, N).join();
  return !same ? 1 : r.checks < r.out.length ? 0 : 2;
}

const QUIZ = {
  question: 'A team tries speculative decoding with a draft model trained on very different text from its target. The draft’s guesses are rarely accepted. What happens?',
  options: [
    'The replies change, because the draft writes them',
    'The replies stay the same, but there is little or no speed-up: nearly every check keeps only the target’s own token',
    'The target model speeds up anyway: it reads fewer weights',
    'The run fails: a rejected guess stops decoding',
  ],
  correct: 1,
  explanation: 'The target checks every guess, so the reply never changes; the speed-up depends on how often the draft guesses what the target would write.',
  why: [
    'The draft only proposes. Every kept token is one the target would have chosen itself.',
    'Right. Each check still yields at least the target’s own token, so the reply is safe; but with few accepted guesses there is no saving, and the drafting is wasted work.',
    'The target still reads every weight once per check. Fewer checks is the only saving, and that needs accepted guesses.',
    'A rejected guess is simply replaced by the target’s own token in the same pass, and decoding carries on.',
  ],
};

interface S { plain: boolean; p1: number | null; k: number; quiz: number | null }

export const STEPS: Step<S>[] = [
  {
    id: 'plain', focus: 'run', visibleControls: ['run'],
    narration: `Each decode pass of Larkspur mini writes one token and reads every weight to do it. Write ${N} tokens after “${PROMPT}” the plain way, one pass each.`,
    predicate: s => !!modelNow('base') && !!modelNow('student') && s.plain,
  },
  {
    id: 'predict', focus: 'p1', visibleControls: ['run', 'p1'],
    narration: `${N} tokens, ${N} passes. The student is a much smaller model, trained to copy Larkspur mini. Before it helps:`,
    predicate: s => s.p1 !== null,
  },
  {
    id: 'reveal', focus: 'run', visibleControls: ['p1', 'run'],
    narration: `Locked in. Let the student draft ${K} tokens at a time.`,
    predicate: s => s.k === K,
  },
  {
    id: 'k', focus: 'k', visibleControls: ['out1', 'run', 'k'],
    narration: 'Each check is one pass over the prompt, the reply so far and the guesses: Larkspur mini scores every position at once, as in a prefill. It keeps guesses up to the first one it disagrees with, then adds its own token, so the reply is exactly what it writes alone. Now try longer guesses: the longest one.',
    predicate: s => s.k === KS.at(-1),
  },
  {
    id: 'quiz', focus: 'quiz', visibleControls: ['k', 'facts', 'quiz'],
    narration: 'Longer guesses can save more checks, but each extra guess is less likely to be right, and the student’s drafting is work too. The papers report two to three times faster decoding on big models. One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Who decides which tokens are kept?',
  },
];

/** A run, round by round: the student's guesses (kept or struck), then the token Larkspur mini added. */
function Rounds({ r }: { r: SpecRun }) {
  return (
    <ol className="in-rounds" aria-label="Checks, one per pass of Larkspur mini">
      {r.rounds.map((x, i) => (
        <li key={i} data-round={i}>
          <span>{`Check ${i + 1}:`}</span>
          <ul className="in-tokens">
            {x.drafted.map((id, j) => <li key={j} data-kind={j < x.accepted ? 'kept' : 'rejected'}>{pieceLabel(decode([id]))}<span className="sr">{j < x.accepted ? ' (kept)' : ' (rejected)'}</span></li>)}
            <li data-kind="target">{pieceLabel(decode([x.added]))}<span className="sr"> (Larkspur mini’s own)</span></li>
          </ul>
        </li>
      ))}
    </ol>
  );
}

function Run({ target, draft, s, apply }: { target: Model; draft: Model; s: S; apply: (s: S) => void }) {
  const plain = greedy(target, IDS, N), r = s.k ? runAt(target, draft, s.k) : null, same = r && r.out.join() === plain.join();
  return (
    <>
      {s.plain && <p className="tc-status" data-plain>{`Plain decoding: “${PROMPT}`}<strong>{decode(plain)}</strong>{`” in ${plain.length} passes.`}</p>}
      {!s.plain && <button type="button" className="big" onClick={() => apply({ ...s, plain: true })}>{`Write ${N} tokens, one pass each`}</button>}
      {s.plain && !r && <button type="button" className="big" disabled={s.p1 === null} onClick={() => apply({ ...s, k: K })}>{`Draft ${K} at a time with the student`}</button>}
      {r && (
        <div data-spec>
          <Rounds r={r} />
          <p className="tc-status">{`Speculative: “${PROMPT}`}<strong>{decode(r.out)}</strong>{`” in ${r.checks} checks.`} <span className={`stamp ${same ? 'correct' : 'wrong'}`}>{same ? 'SAME OUTPUT' : 'DIFFERENT'}</span></p>
        </div>
      )}
    </>
  );
}

function Ks({ target, draft, s, set }: { target: Model; draft: Model; s: S; set: (s: S) => void }) {
  const i = Math.max(0, KS.indexOf(s.k as (typeof KS)[number]));
  return (
    <>
      <div className="in-range">
        <label htmlFor="in-k">{`Tokens the student guesses per check: ${s.k}`}</label>
        <input id="in-k" type="range" min={0} max={KS.length - 1} step={1} value={i} aria-valuetext={`${s.k} tokens`} onChange={e => set({ ...s, k: KS[Number(e.target.value)] })} />
      </div>
      <table className="tc-ledger">
        <caption>{`Counted live, ${N} tokens after “${PROMPT}”`}</caption>
        <thead><tr><th scope="col">Guesses per check</th><th scope="col">Checks</th><th scope="col">Accepted</th><th scope="col">Tokens per check</th></tr></thead>
        <tbody>
          {KS.map(k => { const x = runAt(target, draft, k); return (
            <tr key={k} data-on={k === s.k || undefined}><th scope="row">{k}</th><td>{x.checks}</td><td>{k ? `${x.accepted} of ${x.drafted} (${Math.round(x.rate * 100)}%)` : '—'}</td><td>{x.perCheck.toFixed(2)}</td></tr>
          ); })}
        </tbody>
      </table>
      <p className="note in-note">{`Same output as plain decoding at every setting. Runs stop at Larkspur mini’s ${META.model.ctx}-token window, so no check ever reads a cut-off prompt. These are Larkspur mini’s numbers (${num(BIG)} parameters), not any provider’s.`}</p>
    </>
  );
}

export default function GuessAhead() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      ready={!!modelNow('base') && !!modelNow('student')}
      initial={{ plain: false, p1: null, k: 0, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state }) => (
        <InferenceStage weights={['base', 'student']} show={m => {
          const r = state.k ? runAt(m.base!, m.student!, state.k) : null;
          return {
            scene: { seats: ['decode'], queued: 0, kv: .02, draft: r ? { drafted: r.rounds[0].drafted.length, accepted: r.rounds[0].accepted } : null },
            caption: r ? `The student guesses ${state.k} at a time: ${r.accepted} of ${r.drafted} guesses kept, ${r.checks} checks for ${r.out.length} tokens.`
              : state.plain ? `Plain decoding: ${N} passes for ${N} tokens.` : 'One request in the seat; no draft runner yet.',
          };
        }} />
      )}
      controls={{
        run: ({ state, apply }) => <ModelGate weights={['base', 'student']}>{m => <Run target={m.base!} draft={m.student!} s={state} apply={apply} />}</ModelGate>,
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <ModelGate weights={['base', 'student']}>{m => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf(m.base!, m.student!)} />}</ModelGate>,
        k: ({ state, apply, sync, focused }) => <ModelGate weights={['base', 'student']}>{m => <Ks target={m.base!} draft={m.student!} s={state} set={focused ? apply : sync} />}</ModelGate>,
        facts: () => (<><Fact id="speculative-leviathan" /><Fact id="speculative-chen" /></>),
        quiz: ({ state, apply, sync }) => (
          <Quiz {...QUIZ} unsure value={state.quiz} onAnswer={(_, q) => apply({ ...state, quiz: q })} onUnsure={() => sync({ ...state, quiz: UNSURE })} />
        ),
      }}
    />
  );
}
