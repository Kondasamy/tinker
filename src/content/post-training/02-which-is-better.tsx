// Chapter 2: which is better? The upset customer's four drafts, all carrying the fact, differ only in tone. The reader
// picks the better draft in three pairs (kept in the step state, so chapter 3 trains on them), predicts which draft the
// reward model will score highest, and sees the Bradley–Terry scores fitted live to those picks.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { TONE, question, refOf } from '../../lib/post-training/graders';
import { fitRewards, type Pair } from '../../lib/post-training/policy';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { EXAM_PARTS } from '../../components/scenes/examScene';
import { AnswerCard, Asked, PostStage, TOY, cardsOf } from './kit';

const MODULE = 'post-training',
  ID = '02-which-is-better';
export const PARTS = EXAM_PARTS;
const C = question(TONE).candidates,
  REF = refOf(TONE);
/** The three pairs the reader judges, as answer indices: A or B, B or C, A or D. */
export const PAIRS: Pair[] = [
  [0, 1],
  [1, 2],
  [0, 3],
];
/** The team's picks, used when a reader reaches chapter 3 without making their own. */
export const TEAM_PICKS = [0, 1, 0];
/** The reader's picks as preference pairs: [chosen, rejected]. */
export const pairsOf = (picks: (number | null)[]): Pair[] =>
  PAIRS.flatMap(([a, b], k) => (picks[k] === a ? [[a, b] as Pair] : picks[k] === b ? [[b, a] as Pair] : []));
/** The reward model's score per draft, fitted to the picks. */
export const scoresOf = (picks: (number | null)[]) => fitRewards(C.length, pairsOf(picks));

export interface S {
  picks: (number | null)[];
  p1: number | null;
  scored: boolean;
  quiz: number | null;
}

export const P1 = {
  question: 'A reward model will now score all four drafts from your three picks. Which will score highest?',
  options: [
    'A draft that won every pair it was in',
    'The longest draft',
    'None: they tie, since every draft has the fact',
  ],
};
/** read off the scores: the top draft won all its pairs (0), or the scores tie (2); length never enters (1) */
export function outcome(picks: (number | null)[]) {
  const r = scoresOf(picks),
    top = r.indexOf(Math.max(...r));
  if (Math.max(...r) - Math.min(...r) < 1e-9) return 2;
  return pairsOf(picks).some(([, l]) => l === top) ? 1 : 0;
}

export const QUIZ = {
  question: 'A team wants its assistant to sound warmer. What should it collect first?',
  options: [
    'Pairs of replies to the same message, with people picking the warmer one',
    'A list of warm words, and a count of how many each reply uses',
    'More web text to pre-train on',
  ],
  correct: 0,
  explanation: 'Warmth has no right answer to check, but people can reliably say which of two replies is warmer.',
  why: [
    'Right: people compare two replies quickly and consistently, and the pairs become a reward model’s training data.',
    'A word count is a rule a reply can satisfy without being warm, and chapter 6 shows where that leads.',
    'Pre-training text teaches what the web sounds like, not what this team’s customers prefer.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'pick',
    focus: 'pick',
    visibleControls: ['asked', 'pick'],
    narration: 'Every draft has the fact; only the tone differs. A preference pair asks which of two is better.',
    act: 'Pick the better draft in each pair.',
    say: { block: 'cards', text: 'Same fact' },
    predicate: s => s.picks.every(p => p !== null),
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['pick', 'p1'],
    narration: 'Your picks are labels: in each pair, a chosen draft and a rejected one.',
    act: 'Predict first.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'score',
    focus: 'score',
    visibleControls: ['p1', 'score'],
    narration:
      'A reward model turns pairs into scores: a draft that wins its pairs scores higher, one that loses scores lower.',
    act: 'Press Score the drafts.',
    predicate: s => s.scored,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['scores', 'quiz'],
    narration: 'No rule could rank these drafts; your picks did. Chapter 3 trains the toy policy on them.',
    act: 'One question to finish.',
    say: { block: 'grader', text: 'Your picks' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which can people judge reliably: a score out of ten, or which of two is better?',
  },
];

const fmt = (x: number) => (x >= 0 ? `+${x.toFixed(1)}` : `−${(-x).toFixed(1)}`);

export default function WhichIsBetter() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ picks: PAIRS.map(() => null), p1: null, scored: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => {
        const r = state.scored ? scoresOf(state.picks) : undefined;
        return (
          <PostStage
            say={say}
            shown={{
              hall: {
                cards: cardsOf(
                  TONE,
                  REF,
                  r?.map(x => (x > 0 ? 1 : 0)),
                ),
                grader: state.scored ? 'YOUR PICKS' : undefined,
              },
              caption: r
                ? `Scores from your picks: ${C.map((c, i) => `${c.id} ${fmt(r[i])}`).join(', ')}. Marked mint: above zero.`
                : 'Four drafts for an upset customer, each as tall as the toy policy’s odds of writing it.',
            }}
          />
        );
      }}
      controls={{
        asked: () => (
          <>
            <Asked q={TONE} />
            <p className="note">{TOY}</p>
          </>
        ),
        pick: ({ state, sync }) => (
          <div className="pt-pairs">
            {PAIRS.map(([a, b], k) => (
              <div key={k} className="pt-pair" role="group" aria-label={`Pair ${k + 1}: ${C[a].id} or ${C[b].id}`}>
                {[a, b].map(i => (
                  <button
                    key={i}
                    type="button"
                    aria-pressed={state.picks[k] === i}
                    data-pick={C[i].id}
                    onClick={() => sync({ ...state, picks: state.picks.map((p, j) => (j === k ? i : p)) })}
                  >
                    <strong>{C[i].id}</strong> “{C[i].text}”
                  </button>
                ))}
              </div>
            ))}
          </div>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        score: ({ state, sync }) => (
          <button type="button" className="big" onClick={() => sync({ ...state, scored: true })}>
            Score the drafts
          </button>
        ),
        scores: ({ state }) => {
          const r = scoresOf(state.picks);
          return (
            <>
              <Outcome {...P1} prediction={state.p1} outcome={outcome(state.picks)} />
              <table className="tc-ledger" data-scores>
                <caption>The reward model’s score per draft, fitted live to your picks</caption>
                <tbody>
                  {C.map((c, i) => (
                    <tr key={c.id} data-answer={c.id}>
                      <th scope="row">
                        {c.id}: “{c.text}”
                      </th>
                      <td>{fmt(r[i])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <AnswerCard q={TONE} i={r.indexOf(Math.max(...r))} />
            </>
          );
        },
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
