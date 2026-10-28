// Chapter 7: the workbench. A data policy is three switches (remove duplicates, scrub PINs, output filter), each a
// native checkbox. The first two pick a run trained offline; the filter is live over replies. The result table gives
// the PINs leaked and how, the worst exposure and held-out top-5, and what beats the policy. The puzzle accepts every
// policy no other beats (WINNERS); Show me applies one.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { replyText } from '../../lib/memorisation/extract';
import { filterReply } from '../../lib/memorisation/filter';
import { REPEATS, RUNS, bits, canaryOf, firstName, pct, scoreOf as canaryScore } from '../../lib/memorisation/story';
import { START, WINNERS, beatenBy, isPolicy, scoreOf, solved, type Policy } from '../../lib/memorisation/workbench';
import PINNED from '../../../data/memorisation/pinned.json' with { type: 'json' };
import { RECITAL_PARTS } from '../../components/scenes/recitalScene';
import { Fact, RecitalStage, ToyNote, ledgerOf } from './kit';

const MODULE = 'memorisation',
  ID = '07-workbench';
export const PARTS = RECITAL_PARTS;
const MOST = Math.max(...REPEATS);
const SWITCHES: [keyof Policy, string][] = [
  ['dedup', 'Remove duplicates'],
  ['scrub', 'Scrub PINs before training'],
  ['filter', 'Output filter on replies'],
];
export const policyWords = (p: Policy) =>
  SWITCHES.filter(([k]) => p[k])
    .map(([, w]) => w[0].toLowerCase() + w.slice(1))
    .join(', ') || 'train on the tickets as they are';
const names = (rs: number[]) => rs.map(r => firstName(canaryOf(r))).join(' and ');

export interface S {
  policy: Policy;
  quiz: number | null;
}
const policyOf = (s: S) => (isPolicy(s.policy) ? s.policy : START);

export const QUIZ = {
  question: 'A team will fine-tune on chat logs holding customers’ phone numbers. What does Larkspur’s bench say?',
  options: [
    'Scrub the numbers first; a filter and deduplication only help on top',
    'An output filter is enough: it hides every number',
    'Deduplicate the logs: numbers seen once can’t leak',
  ],
  correct: 0,
  explanation:
    'Every winning policy scrubbed; a filter alone still leaked, and deduplication still left PINs guessable.',
  why: [
    'Right: only scrubbing left nothing to leak and nothing to guess.',
    'The filter missed PINs asked for one digit at a time, so a filter-only policy leaked.',
    'Deduplication stopped the recital but left the most-copied PIN ranked far above chance.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'policy',
    focus: 'policy',
    visibleControls: ['score', 'policy'],
    narration: 'First data policy: train on tickets as they are. A winner leaks nothing, and nothing beats it on both.',
    act: 'Change the policy on the workbench.',
    say: { block: 'ledger', text: 'The policy' },
    predicate: s => solved(policyOf(s)),
    hint: 'A filter alone still leaks. What keeps the PINs out of the text itself?',
    solution: s => ({ ...s, policy: WINNERS[0] }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['score', 'policy', 'facts', 'quiz'],
    narration: `Every winner scrubs. A filter on top costs nothing; alone, it leaks one digit at a time.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What do all the winners share?',
  },
];

function Score({ s }: { s: S }) {
  const p = policyOf(s),
    sc = scoreOf(p),
    by = beatenBy(p),
    best = solved(p);
  return (
    <div data-best={best ? '1' : '0'}>
      <p className="mem-headline">
        Leaked <strong>{sc.leaked.length}</strong> · worst exposure <strong>{bits(sc.exposure)} bits</strong> · top-5{' '}
        <strong>{sc.top5.toFixed(1)}%</strong>
        <span className={`stamp ${best ? 'correct' : 'neutral'}`}>
          {best ? 'NONE BETTER' : sc.leaked.length ? 'LEAKS' : 'BEATEN'}
        </span>
      </p>
      {best && <p className="mem-note">One of {WINNERS.length} that work.</p>}
      <table className="tc-ledger" style={{ marginTop: 10 }}>
        <caption>Your policy, as trained offline</caption>
        <tbody>
          <tr>
            <th scope="row">Policy</th>
            <td>{policyWords(p)}</td>
          </tr>
          <tr data-leaked={sc.leaked.length}>
            <th scope="row">PINs leaked</th>
            <td>{sc.leaked.length ? `${names(sc.leaked)}’s, ${sc.how}` : 'None'}</td>
          </tr>
          <tr>
            <th scope="row">Worst exposure</th>
            <td>
              {bits(sc.exposure)} bits of {bits(Math.log2(RUNS.candidates))}
            </td>
          </tr>
          <tr>
            <th scope="row">Held-out top-5</th>
            <td>
              {sc.top5.toFixed(1)}% (Larkspur mini: {pct(RUNS.base.heldout.top5)})
            </td>
          </tr>
          <tr data-beaten={by ? '1' : '0'}>
            <th scope="row">Beaten by</th>
            <td>
              {by
                ? `${policyWords(by)}: leaks none, exposure ${bits(scoreOf(by).exposure)}, top-5 ${scoreOf(by).top5.toFixed(1)}%`
                : 'No policy beats it on both.'}
            </td>
          </tr>
        </tbody>
      </table>
      <ToyNote />
    </div>
  );
}

/** What the desk's slip says for the most-copied canary under a policy (recorded replies; the filter live). */
function slipOf(p: Policy) {
  const sc = scoreOf(p),
    said = replyText(canaryScore(sc.run, MOST).reply).trim();
  if (sc.leaked.includes(MOST) && p.filter) return { text: PINNED.bypass.drip.join(' ').trim(), leak: true };
  return { text: `SAYS ${p.filter ? filterReply(said) : said}`, leak: sc.leaked.includes(MOST) };
}

export default function Workbench() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ policy: START, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => {
        const p = policyOf(state),
          sc = scoreOf(p);
        return (
          <RecitalStage
            say={say}
            run={sc.run}
            repeats={MOST}
            desk={{
              ledger: ledgerOf(MOST, { dedup: p.dedup, scrub: p.scrub }),
              filter: p.filter,
              reply: slipOf(p),
              column: { lps: [], label: `EXPOSURE ${bits(sc.exposure)}` },
            }}
            readout={[
              policyWords(p),
              `leaked ${sc.leaked.length}`,
              `worst exposure ${bits(sc.exposure)} bits`,
              `top-5 ${sc.top5.toFixed(1)}%`,
            ]}
            caption={`${firstName(canaryOf(MOST))}’s line, asked of the model this policy trains.`}
          />
        );
      }}
      controls={{
        score: ({ state }) => <Score s={state} />,
        // changing the policy is an attempt only while it is the puzzle
        policy: ({ state, apply, sync, focused }) => {
          const p = policyOf(state);
          return (
            <fieldset className="mem-bench">
              <legend>Data policy</legend>
              {SWITCHES.map(([k, w]) => (
                <label key={k}>
                  <input
                    type="checkbox"
                    checked={p[k]}
                    onChange={e =>
                      (focused ? apply : sync)({ ...state, policy: { ...p, [k]: e.currentTarget.checked } })
                    }
                  />{' '}
                  {w}
                </label>
              ))}
            </fieldset>
          );
        },
        facts: () => <Fact id="abadi-2016" />,
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
