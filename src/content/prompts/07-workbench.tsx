// Chapter 7: the workbench (KTD9). The reader builds a prompt from the bench's cards and sends it to Larkspur's six
// tickets: a prompt ships when every ticket passes, and of those the fewest tokens wins. The puzzle accepts every
// prompt in WINNERS (pinned, recomputed in a test); the score reads the pinned results.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { DOCKET_PARTS } from '../../components/scenes/docketScene';
import type { Docket } from '../../lib/prompts/cards';
import { BENCH_TICKETS, CHAPTER, RESULTS, START, WINNERS, resultOf, wins } from '../../lib/prompts/workbench';
import { DocketStage, Fact, ToyNote, captionOf, type View } from './kit';

const MODULE = 'prompts',
  ID = CHAPTER;
export const PARTS = DOCKET_PARTS;
const N = BENCH_TICKETS.length;
const LEAST = resultOf(WINNERS[0]).tokens;
/** the longest prompt that also passes every ticket: what the winner saves */
const LONGEST = Math.max(...RESULTS.filter(r => r.passed === N).map(r => r.tokens));

export const QUIZ = {
  question: `Your prompt passes all ${N} of Larkspur’s tickets. What should come before it ships?`,
  options: [
    'Add more real tickets to the set and rerun it on the model you will ship',
    `Nothing: ${N} of ${N} proves it works`,
    'Add examples, just to be safe',
  ],
  correct: 0,
  explanation: 'A handful of tickets is a start, not proof: grow the set, and test on the exact model you ship.',
  why: [
    'Right: a bigger set catches what six miss, and a different model can score differently.',
    'A handful of tickets can’t cover every customer, and chapter 6’s smaller model failed some of these.',
    'Here examples added tokens on every ticket and no passes.',
  ],
};

interface S {
  d: Docket;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'bench',
    focus: 'docket',
    visibleControls: ['score'],
    narration: `Workbench: build a prompt for all ${N} tickets. Length is Larkspur mini’s tokens, a stand-in.`,
    act: 'Pass every ticket with the fewest tokens.',
    say: { block: 'docket', text: 'The prompt' },
    predicate: s => wins(s.d),
    hint: 'A clear task and JSON for the router; then cut what adds tokens but no passes.',
    solution: s => ({ ...s, d: WINNERS[0] }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['score', 'fact', 'toy', 'quiz'],
    narration: `All ${N}, in ${LEAST} tokens. The longest prompt that passes them all takes ${LONGEST}: examples cost tokens and added no passes.`,
    act: 'One question to finish.',
    say: { block: 'slip', text: 'All pass' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Is six tickets on one model enough to be sure?',
  },
];

function Score({ d }: { d: Docket }) {
  const r = resultOf(d),
    best = wins(d),
    all = r.passed === N;
  return (
    <div className="pr-score" role="status" data-best={best ? '1' : '0'} data-all={all ? '1' : '0'}>
      <p className="pr-headline">
        <strong>{`${r.passed} of ${N}`}</strong>
        {` tickets pass, ${r.tokens} tokens `}
        <span className={`stamp ${best ? 'correct' : all ? 'neutral' : 'wrong'}`}>
          {best ? 'SHIPS' : all ? 'TOO LONG' : 'FAILS TICKETS'}
        </span>
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
      initial={{ d: START, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, focus, say }) => (
        <DocketStage
          chapter={ID}
          docket={state.d}
          onDocket={d => (focus === 'docket' ? apply : sync)({ ...state, d })}
          tickets={BENCH_TICKETS}
          view={state.view}
          onView={view => sync({ ...state, view })}
          say={say}
          step={focus}
          caption={`${captionOf(ID, state.d, { tickets: BENCH_TICKETS })} Made-up web addresses in replies are changed to .example.`}
        />
      )}
      controls={{
        score: ({ state }) => <Score d={state.d} />,
        fact: () => <Fact id="token-price" />,
        toy: () => <ToyNote />,
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
