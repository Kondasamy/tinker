// Chapter 1 step script: the real 2020→2026 history of RAG. Every dated or numeric claim lives in
// data/history/timeline.json with its source; narration only quotes numbers derived from that file.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Timeline, { ERAS, eraWindow } from '../../components/scenes/Timeline';
import { Source, Answer } from '../../components/scenes/Source';
import { nextOf } from '../../lib/chapters';
import { TIMELINE, formatTokens } from '../../lib/scale';
import { UNSURE } from '../../lib/recall';

const ID = '01-history';
interface S {
  asked: boolean;
  visited: number;
  active: number | null;
  quiz: number | null;
}

const win = (era: string) => formatTokens(eraWindow(TIMELINE, era));
const smallest2023 = formatTokens(
  Math.min(...TIMELINE.filter(e => e.era === 'small-windows' && e.contextTokens).map(e => e.contextTokens!)),
);

const QUIZ = {
  question: 'Why did 2023 assistants need retrieval to answer from company documents?',
  options: [
    'Models were too slow to read documents',
    'The documents did not fit in the prompt, and tool calling had barely begun',
    'Retrieval was required by law',
  ],
  correct: 1,
  explanation:
    'Small context windows meant someone had to pick the few right passages up front. Retrieval did that picking.',
  why: [
    'Speed was not the problem. The limit was how much text fit in one request, and the model had never seen your files.',
    'Right. Small windows meant someone had to pick the few right passages up front, and the model could not yet go and search for itself.',
    'No law asked for it. Retrieval was an engineering fix for a model that had never read your documents.',
  ],
};

// What the narration says right after the learner opens era i (the drawer shows its cited claims).
const AFTER: Pick<Step<S>, 'narration' | 'label' | 'more'>[] = [
  {
    narration:
      '2020: researchers named the fix, Retrieval-Augmented Generation (RAG): fetch relevant text first, then answer from it. Click 2023.',
    label: '2020: RAG fetches first, then answers',
  },
  {
    narration: `2023: context windows held ${smallest2023} to ${win('small-windows')} tokens; tool calling had barely begun. Retrieval picked passages up front. Click 2024.`,
    label: '2023: small windows, retrieval picks up front',
    more: 'The context window is the text a model reads per request. A token is a chunk of text, about ¾ of a word. Chat assistants arrived this year.',
  },
  {
    narration: `2024: windows reached ${win('retrieval-matures')} tokens; retrieval got smarter with reranking and knowledge graphs. Click the last era.`,
    label: '2024: bigger windows, smarter retrieval',
    more: 'Chunks got better too. Tool calling was measured on public leaderboards, and still stumbled on multi-step tasks.',
  },
  {
    narration: `Late 2024–26: windows reached ${win('agents')} tokens. Retrieval became one tool among many; agents decide when to search. Answer one question.`,
    label: 'Answered why 2023 needed retrieval',
    more: 'Models now call tools well enough to act as agents.',
  },
];

const eraStep = (i: number): Step<S> => ({
  id: `era-${ERAS[i].id}`,
  focus: 'timeline',
  visibleControls: [],
  opensDrawer: i === 0 ? 'answer' : 'era',
  ...(i === 0
    ? {
        narration:
          'Confident, and wrong: the model knows only its training data and prompt, never your contracts. Click 2020.',
        label: 'The assistant guessed, and was wrong',
        more: 'How did the industry fix this? Each era on the timeline is one step of the answer, with sources.',
      }
    : AFTER[i - 1]),
  predicate: s => s.visited > i,
  hint: `Click the glowing ${ERAS[i].label} object, or Tab to it and press Enter.`,
});

export const STEPS: Step<S>[] = [
  {
    id: 'ask',
    focus: 'ask',
    visibleControls: ['ask'],
    narration: 'It’s 2023. An employee asks the new AI assistant about a customer contract.',
    label: 'Asked the assistant about a contract',
    predicate: s => s.asked,
  },
  ...ERAS.map((_, i) => eraStep(i)),
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    opensDrawer: 'era',
    ...AFTER[ERAS.length - 1],
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Think back to 2023: what limited how much a model could read?',
  },
];

export default function History() {
  return (
    <StepRunner<S>
      chapter={ID}
      steps={STEPS}
      initial={{ asked: false, visited: 0, active: null, quiz: null }}
      next={nextOf(ID)}
      stage={({ state, apply }) => (
        <Timeline
          entries={TIMELINE}
          visited={state.asked ? state.visited : -1}
          active={state.active}
          // open the next era, or reopen one already seen; skipping ahead does nothing
          onPick={k =>
            state.asked && k <= state.visited && apply({ ...state, active: k, visited: Math.max(state.visited, k + 1) })
          }
        />
      )}
      controls={{
        ask: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, asked: true })}>
            Ask: “Do enterprise contracts get refunds after 30 days?”
          </button>
        ),
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
      inspectPanel="era"
      panels={{
        answer: {
          title: 'The assistant’s answer',
          render: () => (
            <Answer
              verdict="Wrong"
              answer="Yes. All customers can get a full refund within 60 days of purchase."
              why="It sounds sure, but it is a guess from training data. Your actual policy says something else, and the model has never read it."
            />
          ),
        },
        era: {
          title: 'Sources for this era',
          render: s => {
            if (s.active === null) return <p>Open an era on the timeline to see what happened, with sources.</p>;
            const era = ERAS[s.active];
            return (
              <>
                <p>
                  <strong>
                    {era.label}: {era.title}
                  </strong>
                </p>
                <ul>
                  {TIMELINE.filter(e => e.era === era.id).map(e => (
                    <li key={e.sourceUrl + e.claim}>
                      <time>{e.date}</time> {e.claim} <Source e={e} />
                    </li>
                  ))}
                </ul>
              </>
            );
          },
        },
      }}
    />
  );
}
