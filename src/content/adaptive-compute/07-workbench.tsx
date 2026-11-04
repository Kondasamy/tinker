// Chapter 7: the workbench (R6h.7). The reader turns all five valves for a hand-written day of questions against the
// usual budget, in the picture or by the sliders, scored on answers right and effort spent. The puzzle accepts every
// setting in WINNERS (every answer right, the tower never dry: pinned, recomputed in a test).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { MILL_PARTS } from '../../components/scenes/millScene';
import {
  BUDGET,
  KINDS,
  KIND_IDS,
  OPT_NAME,
  PLAIN,
  REQUESTS,
  type Rules,
  isWin,
  runDay,
} from '../../lib/adaptive-compute/effort';
import PINNED from '../../../data/adaptive-compute/pinned.json' with { type: 'json' };
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { EffortStage, Fact, ToyNote, yardOf } from './kit';

const MODULE = 'adaptive-compute',
  ID = '07-workbench';
export const PARTS = MILL_PARTS;
/** Every winning setting, pinned in data/adaptive-compute/pinned.json (recomputed from the engine in a test). */
export const WINNERS = PINNED.winners as Rules[];
const N = REQUESTS.length;

export const QUIZ = {
  question: 'Your team’s assistant has a fixed monthly budget. How should you set its effort?',
  options: [
    'Per kind of request: extra effort only where it changes the answer',
    'The highest setting everywhere, to be safe',
    'The lowest setting everywhere, to save money',
  ],
  correct: 0,
  explanation: 'No single setting fits every request; routing spends where it pays.',
  why: [
    'Right: easy requests get none, and each hard kind gets the effort that fixes it.',
    'The budget runs out on easy requests, and the rest go unanswered.',
    'Cheap, but every request that needed effort comes out wrong.',
  ],
};

interface S {
  rules: Rules;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'bench',
    focus: 'bench',
    visibleControls: ['score'],
    narration: `Workbench: a hand-written day of ${N} questions, and ${BUDGET} in the tower.`,
    act: 'Get every answer right before the tower runs dry.',
    say: { block: 'tower', text: 'The day’s budget' },
    status: 'The yard shows the whole day under your valve settings.',
    predicate: s => isWin(s.rules),
    hint: 'Everyday questions need no mill. Each other kind needs one mill, and only one.',
    solution: s => ({ ...s, rules: WINNERS[0] }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['score', 'fact', 'quiz'],
    narration: `${N} of ${N} right within the budget: each kind gets the one effort that changes its answer.`,
    act: 'One question to finish.',
    status: `Every rim is mint and the tower still holds water.`,
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What happens to easy requests under the highest setting?',
  },
];

function Score({ rules }: { rules: Rules }) {
  const d = runDay(rules),
    win = d.right === N && !d.dry;
  return (
    <div className="ac-score" data-win={win ? '1' : '0'}>
      <p>
        <strong>{`${d.right} of ${N} right`}</strong>
        {`, ${d.spent} of ${BUDGET} spent${d.dry ? ', tower dry' : ''} `}
        <span className={`stamp ${win ? 'correct' : 'wrong'}`}>{win ? 'WITHIN BUDGET' : 'NOT YET'}</span>
      </p>
      <ul>
        {KINDS.map(k => (
          <li key={k.id}>{`${k.name} (${OPT_NAME[rules[k.id]]}): ${d.by[k.id].right} of ${d.by[k.id].asked} right`}</li>
        ))}
      </ul>
      <ToyNote />
    </div>
  );
}

export default function Workbench() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ rules: PLAIN, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, say, closeUp, focus }) => {
        const set = focus === 'bench' ? apply : sync;
        return (
          <EffortStage
            yard={yardOf(state.rules, { lit: { tower: true } })}
            turn={(k, o) => {
              set({ ...state, rules: { ...state.rules, [k]: o } });
              return undefined;
            }}
            kinds={KIND_IDS}
            say={say}
            closeUp={closeUp}
          />
        );
      }}
      controls={{
        score: ({ state }) => <Score rules={state.rules} />,
        fact: () => <Fact id="per-prompt-4x" />,
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
