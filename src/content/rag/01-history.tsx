// Chapter 1 step script: the real 2020→2026 history of RAG. Every dated or numeric claim lives in
// data/history/timeline.json with its source; narration only quotes numbers derived from that file.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Timeline, { ERAS, eraRange, eraWindow } from '../../components/scenes/Timeline';
import { Source, Answer } from '../../components/scenes/Source';
import { nextOf } from '../../lib/chapters';
import { TIMELINE, formatTokens } from '../../lib/scale';
import { UNSURE } from '../../lib/recall';
import { Fact } from './kit';

const ID = '01-history';
interface S {
  asked: boolean;
  visited: number;
  active: number | null;
  quiz: number | null;
}

const win = (era: string) => formatTokens(eraWindow(TIMELINE, era));
// the model behind an era's largest window, so the narration never passes one model's window off as typical
const largest = (era: string) =>
  TIMELINE.find(e => e.era === era && e.contextTokens === eraWindow(TIMELINE, era))!.model;
// the window most of an era's cited models share (the agents era: 1M)
const common = (era: string) => {
  const w = TIMELINE.filter(e => e.era === era && e.contextTokens).map(e => e.contextTokens!);
  return formatTokens(w.toSorted((a, b) => w.filter(x => x === b).length - w.filter(x => x === a).length)[0]);
};

export const QUIZ = {
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
    'Speed was not the problem: the limit was how much text fit in one request.',
    'Right: small windows meant someone had to pick the right passages up front, since the model could not yet search for itself.',
    'No law asked for it: retrieval was an engineering fix for a model that never read your documents.',
  ],
};

// What the narration says right after the learner opens era i (the drawer shows its cited claims); the picture pins
// the era's lesson over it.
const LESSON = ['RAG is named', 'Small windows', 'Smarter retrieval', 'RAG becomes a tool'];
const AFTER: string[] = [
  '2020: researchers named the fix. Fetch relevant text first, then let the model answer from it: Retrieval-Augmented Generation, or RAG.',
  `2023: companies rolled out chat assistants with context windows of ${eraRange(TIMELINE, 'small-windows')} tokens. Tool calling was new, so retrieval picked the paragraphs.`,
  `2024: ${largest('retrieval-matures')}’s window hit ${win('retrieval-matures')} tokens, the record. Retrieval got smarter: graphs, better chunks, reranking. Multi-step tool use still stumbled.`,
  `Late 2024–26: ${common('agents')}-token windows became common (${largest('agents')} claims ${win('agents')}). Models now act as agents, and retrieval is one tool they choose.`,
];

const eraStep = (i: number): Step<S> => ({
  id: `era-${ERAS[i].id}`,
  focus: 'timeline',
  // the 2020 reveal: how much looking things up helped in the paper that named RAG
  visibleControls: i === 1 ? ['fact'] : [],
  opensDrawer: i === 0 ? 'answer' : 'era',
  narration:
    i === 0
      ? 'Confident, and wrong. A model knows only its training data plus its prompt, and it never saw your contracts.'
      : AFTER[i - 1],
  act: `Click ${ERAS[i].label}.`,
  say: i === 0 ? undefined : { block: String(i - 1), text: LESSON[i - 1] },
  predicate: s => s.visited > i,
  hint: `Click the glowing ${ERAS[i].label} object, or Tab to it and press Enter.`,
});

export const STEPS: Step<S>[] = [
  {
    id: 'ask',
    focus: 'ask',
    visibleControls: ['ask'],
    narration: 'It’s 2023. An employee asks the company’s new AI assistant, an LLM, about a customer contract.',
    predicate: s => s.asked,
  },
  ...ERAS.map((_, i) => eraStep(i)),
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    opensDrawer: 'era',
    narration: AFTER[ERAS.length - 1],
    act: 'Last question.',
    say: { block: String(ERAS.length - 1), text: LESSON[ERAS.length - 1] },
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
      stage={({ state, apply, say }) => (
        <Timeline
          say={say}
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
        fact: () => <Fact id="rag-vs-memory" />,
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
              why="It sounds sure, but it is a guess from training data: the model has never read your policy."
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
