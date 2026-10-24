// Chapter 3: learning from preferences. The reader's picks from chapter 2 (read from its saved run; the team's picks
// when there are none) train the toy policy: the policy DPO targets, the reference reweighted by the fitted scores,
// computed live. The strength β steps over a finite list; the reader predicts, then slides it up and watches the policy
// fall back toward its reference.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { TONE, question, refOf } from '../../lib/post-training/graders';
import { BETAS, dpoLoss, dpoPolicy, kl, winnerOf } from '../../lib/post-training/policy';
import { loadChapter } from '../../lib/progress';
import type { Run } from '../../components/story/steps';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { EXAM_PARTS } from '../../components/scenes/examScene';
import { AnswerCard, Fact, Maths, PostStage, TOY, barsOf, cardsOf } from './kit';
import { TEAM_PICKS, pairsOf, scoresOf, type S as Ch2 } from './02-which-is-better';

const MODULE = 'post-training',
  ID = '03-learning-from-preferences';
export const PARTS = EXAM_PARTS;
const C = question(TONE).candidates,
  REF = refOf(TONE);
const START_BETA = 1;
const pct = (p: number) => `${Math.round(p * 100)}%`;

/** The picks chapter 2 saved, or null when it has none finished. */
export function savedPicks(): (number | null)[] | null {
  const run = loadChapter<Run<Ch2>>(MODULE, '02-which-is-better');
  const p = run?.state?.picks;
  return Array.isArray(p) && p.length === TEAM_PICKS.length && p.every(x => x !== null) ? p : null;
}
/** The policy the toy trains to at strength β, from a set of picks. */
export const policyOf = (picks: (number | null)[], beta: number) => dpoPolicy(REF, scoresOf(picks), beta);

interface S {
  picks: (number | null)[] | null;
  mine: boolean;
  beta: number;
  p1: number | null;
  quiz: number | null;
}

export const P1 = {
  question: 'Now raise the strength β from 1 to 4. What happens to your favourite draft’s share?',
  options: ['It falls back toward where it started', 'It rises even further', 'It stays the same'],
};
/** read off the policy: the favourite's share at the highest β against the starting one */
export function outcome(picks: (number | null)[]) {
  const top = winnerOf(policyOf(picks, START_BETA)),
    a = policyOf(picks, START_BETA)[top],
    b = policyOf(picks, BETAS.at(-1)!)[top];
  return b < a ? 0 : b > a ? 1 : 2;
}

export const QUIZ = {
  question:
    'After preference training, an assistant answers everything in the same gushing tone, even a refund refusal. Which setting most likely went wrong?',
  options: [
    'β was too low, so it strayed far from its reference to please a few picks',
    'β was too high, so it learnt too much',
    'It had too many preference pairs',
  ],
  correct: 0,
  explanation: 'A low strength lets a handful of picks pull the model far from everything it did well before.',
  why: [
    'Right: with little pull back to the reference, the picks’ style spreads to replies they never covered.',
    'A high β keeps the model close to its reference, so it changes too little, not too much.',
    'More pairs give a broader picture of what people want; a narrow set at low β is the risk.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'train',
    focus: 'train',
    visibleControls: ['why', 'train'],
    narration: 'DPO trains on preference pairs directly. The toy policy here jumps to the result DPO aims for.',
    act: 'Press Train on your picks.',
    say: { block: 'grader', text: 'Your picks' },
    predicate: s => s.picks !== null,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['trained', 'p1'],
    narration:
      'Your favourite rose. The strength β sets how far the policy may stray from its reference policy, where it started.',
    act: 'Predict first.',
    say: { block: 'cards', text: 'Your favourite' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'beta',
    focus: 'beta',
    visibleControls: ['p1', 'beta'],
    narration: 'Low β: your picks dominate. High β: the policy keeps close to what the model already did.',
    act: `Slide the strength up to ${BETAS.at(-1)}.`,
    say: { block: 'board', text: 'Strength' },
    predicate: s => s.beta === BETAS.at(-1),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['result', 'quiz'],
    narration: 'Too low, and a few picks drag it off course; too high, and it learns nothing. Teams set β with evals.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which direction lets the model stray further from where it started?',
  },
];

export default function LearningFromPreferences() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ picks: null, mine: false, beta: START_BETA, p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => {
        const p = state.picks ? policyOf(state.picks, state.beta) : REF;
        return (
          <PostStage
            say={say}
            shown={{
              hall: {
                cards: cardsOf(TONE, p),
                grader: state.picks ? 'YOUR PICKS' : undefined,
                board: `β ${state.beta}`,
                lit: state.picks ? winnerOf(p) : undefined,
              },
              bars: state.picks ? barsOf(TONE, REF, p) : undefined,
              caption: state.picks
                ? `At β ${state.beta}: ${C.map((c, i) => `${c.id} ${pct(p[i])}`).join(', ')}. Started at ${C.map((c, i) => `${c.id} ${pct(REF[i])}`).join(', ')}.`
                : 'The toy policy before training: each draft as tall as its odds.',
            }}
          />
        );
      }}
      controls={{
        why: () => (
          <>
            <p className="note">{TOY}</p>
            <Fact id="dpo" />
          </>
        ),
        train: ({ state, sync }) => (
          <button
            type="button"
            className="big"
            onClick={() => {
              const mine = savedPicks();
              sync({ ...state, picks: mine ?? TEAM_PICKS, mine: !!mine });
            }}
          >
            Train on your picks
          </button>
        ),
        trained: ({ state }) => {
          const picks = state.picks ?? TEAM_PICKS,
            p = policyOf(picks, START_BETA);
          return (
            <>
              <p className="tc-status" data-favourite={C[winnerOf(p)].id}>
                {state.mine
                  ? 'Trained on your picks from chapter 2'
                  : 'You haven’t finished chapter 2, so these are the team’s picks'}
                :{' '}
                {pairsOf(picks)
                  .map(([w, l]) => `${C[w].id} over ${C[l].id}`)
                  .join(', ')}
                . Favourite: {C[winnerOf(p)].id}.
              </p>
              <AnswerCard q={TONE} i={winnerOf(p)} p={p[winnerOf(p)]} />
            </>
          );
        },
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        beta: ({ state, sync }) => {
          const i = BETAS.indexOf(state.beta);
          return (
            <div className="pt-range">
              <label htmlFor="pt-beta">
                <strong>Strength β = {state.beta}</strong>
              </label>
              <input
                id="pt-beta"
                type="range"
                min={0}
                max={BETAS.length - 1}
                step={1}
                value={i}
                aria-valuetext={String(state.beta)}
                onChange={e => sync({ ...state, beta: BETAS[Number(e.currentTarget.value)] })}
              />
            </div>
          );
        },
        result: ({ state }) => {
          const picks = state.picks ?? TEAM_PICKS,
            pairs = pairsOf(picks);
          return (
            <>
              <Outcome {...P1} prediction={state.p1} outcome={outcome(picks)} />
              <table className="tc-ledger">
                <caption>Distance from the reference policy, by strength (computed live)</caption>
                <tbody>
                  {BETAS.map(b => (
                    <tr key={b}>
                      <th scope="row">β {b}</th>
                      <td>
                        {C[winnerOf(policyOf(picks, b))].id} leads at {pct(Math.max(...policyOf(picks, b)))} · distance{' '}
                        {kl(policyOf(picks, b), REF).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Fact id="dpo-beta" />
              <Maths>
                <p>
                  The toy fits a Bradley–Terry score r to your pairs, then sets each draft’s share to its reference
                  share × e<sup>r/β</sup>, normalised: the policy DPO’s loss is minimised by. Running DPO’s loss step by
                  step on a four-draft table with firm picks would ignore β, so the toy shows the target directly. DPO’s
                  loss on your pairs at β {state.beta}:{' '}
                  {dpoLoss(policyOf(picks, state.beta), REF, pairs, state.beta).toFixed(2)}, against{' '}
                  {dpoLoss(REF, REF, pairs, state.beta).toFixed(2)} before training. Distance is the KL divergence from
                  the reference.
                </p>
              </Maths>
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
