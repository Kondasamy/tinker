// Chapter 4: check the checkers. Gold tickets come from the gold-star tray; the reader predicts who falls under the gold
// bar, sorts a few gold tickets against the lead's answer, then scores everyone: Tom's flag goes up. The cost of
// missing it is the triage model counted on his labels (pinned, held-out accuracy).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { LABEL_PARTS } from '../../components/scenes/pigeonholeScene';
import { GOLD, LABELLERS, labellerOf, nameOf } from '../../lib/labelling/story';
import { GOLD_BAR, goldScores } from '../../lib/labelling/workbench';
import pinned from '../../../data/labelling/pinned.json' with { type: 'json' };
import { Outcome } from '../tool-calling/kit';
import { Fact, RUN0, RackStage, type Run, SortRun, StandInNote, pct, runRack } from './kit';

const MODULE = 'labelling',
  ID = '04-check-the-checkers';
export const PARTS = LABEL_PARTS;
export const SCORES = goldScores(GOLD.length);
/** who the gold check flags: everyone under the bar */
export const FLAGGED = LABELLERS.filter(l => SCORES[l.id] < GOLD_BAR).map(l => l.id);
const flagged = FLAGGED[0] ?? null;
const TOM = labellerOf('tom').name;
const { clean, noisy, heldOut } = pinned.triage;

interface S {
  p1: number | null;
  run: Run;
  scored: boolean;
  quiz: number | null;
}

export const P1 = {
  question: `Who scores under the ${pct(GOLD_BAR)} gold bar?`,
  options: [...LABELLERS.map(l => l.name), 'No one'],
};
export const OUTCOME = FLAGGED.length === 1 ? LABELLERS.findIndex(l => l.id === flagged) : LABELLERS.length;

export const QUIZ = {
  question: 'Why mix gold tickets in with the rest, looking like any other ticket?',
  options: [
    'So labellers work on them as they do on every ticket',
    'So the triage model never sees the right answers',
    'Because marked tickets cost more to label',
  ],
  correct: 0,
  explanation: 'A gold score only predicts the rest of someone’s work if they can’t tell gold from the rest.',
  why: [
    'Right: if gold looked different, people could take extra care on it alone.',
    'The model can learn from gold tickets too; they are hidden from labellers, not from it.',
    'Marking a ticket costs nothing; the point is honest scores.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `${GOLD.length} gold tickets wait in the tray, each answer checked by the lead. Every labeller files them among the rest.`,
    act: 'Predict first.',
    say: { block: 'gold', text: 'Gold tray' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'sort',
    focus: 'sort',
    visibleControls: ['sort'],
    narration: 'Your pick is locked. File gold tickets yourself; the caption shows the lead’s answer.',
    act: 'Sort three gold tickets.',
    say: { block: 'ticket', text: 'Gold ticket' },
    predicate: s => s.run.count >= 3,
    hint: 'Pick a hole for the ticket, then press Next ticket.',
  },
  {
    id: 'score',
    focus: 'score',
    visibleControls: ['score'],
    narration: `A gold score is the share of the ${GOLD.length} gold tickets a labeller got right. Under ${pct(GOLD_BAR)}, their work is dropped.`,
    act: 'Score everyone on gold.',
    predicate: s => s.scored,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'score', 'quiz'],
    narration: `${TOM} scores ${pct(SCORES.tom)}. Counted on his labels, the triage model gets ${pct(noisy)} right, not ${pct(clean)}.`,
    act: 'One question to finish.',
    say: { block: 'tom', text: 'Under the bar' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What would a labeller do on a ticket they knew was being checked?',
  },
];

function Stage({ s, say }: { s: S; say?: { block: string; text: string } }) {
  const t = GOLD[Math.min(s.run.at, GOLD.length - 1)];
  return (
    <RackStage
      rack={{ ...runRack(GOLD, s.run), gold: GOLD.length - 1 - s.run.at, flag: s.scored ? flagged : null, say }}
      caption={
        s.scored
          ? `Gold scores: ${LABELLERS.map(l => `${l.name} ${pct(SCORES[l.id])}`).join(', ')}.`
          : s.run.filed
            ? `The lead’s answer: ${nameOf(t.intent)}.`
            : `Gold ticket ${s.run.at + 1} of ${GOLD.length}.`
      }
    />
  );
}

export default function CheckTheCheckers() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, run: RUN0, scored: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => <Stage s={state} say={say} />}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        sort: ({ state, apply, sync }) => (
          <SortRun
            tickets={GOLD}
            run={state.run}
            onFile={run => apply({ ...state, run })}
            onNext={run => sync({ ...state, run })}
          />
        ),
        score: ({ state, apply }) =>
          state.scored ? (
            <table className="lb-scores">
              <caption className="sr">Gold scores</caption>
              <tbody>
                {LABELLERS.map(l => (
                  <tr key={l.id}>
                    <th scope="row">{l.name}</th>
                    <td className={SCORES[l.id] < GOLD_BAR ? 'bad' : undefined}>
                      {`${pct(SCORES[l.id])}${SCORES[l.id] < GOLD_BAR ? ', under the bar: dropped' : ''}`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <button type="button" className="big" onClick={() => apply({ ...state, scored: true })}>
              Score on gold
            </button>
          ),
        quiz: ({ state, apply, sync }) => (
          <>
            <p className="note lb-note">
              {`Larkspur’s toy triage model counts words per intent, as a spam filter does, and is tested on ${heldOut} held-out tickets.`}
            </p>
            <Fact id="test-set-errors" />
            <StandInNote />
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
