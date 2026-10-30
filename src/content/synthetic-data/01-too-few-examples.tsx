// Chapter 1: too few examples. The reader counts how many training documents mention the common topics, predicts how
// many answer a rare request, then counts those (pinned.json, recounted from the corpus by a test).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import PINNED from '../../../data/synthetic-data/pinned.json' with { type: 'json' };
import { COPIER_PARTS } from '../../components/scenes/copierScene';
import { CopierStage, Fact } from './kit';

const MODULE = 'synthetic-data',
  ID = '01-too-few-examples';
export const PARTS = COPIER_PARTS;
const { common: COMMON, rare: RARE } = PINNED.mentions;
const N = PINNED.trainDocs,
  FIRST = RARE[0];

export const P1 = {
  question: `How many of the ${N} training documents say ${FIRST.topic.toLowerCase()}?`,
  options: ['Ten or more, like the products', 'Three to five', 'One'],
};
export const OUTCOME = FIRST.docs >= 10 ? 0 : FIRST.docs >= 3 ? 1 : 2;

export const QUIZ = {
  question:
    'A bank’s help bot learns from thousands of chats about card PINs and a few about inheritance accounts. Where is it weakest?',
  options: [
    'Inheritance accounts: it has few examples to learn them from',
    'Card PINs: too many examples confuse it',
    'Nowhere: it saw every topic at least once',
  ],
  correct: 0,
  explanation: 'A model learns a topic from its examples, so a topic seen once or twice is learned poorly.',
  why: [
    'Right: one or two examples give the model little to learn an answer from.',
    'Many examples of one topic make it better at that topic, not worse.',
    'Seeing a topic once is not the same as learning it: rare topics stay weak.',
  ],
};

interface S {
  common: boolean;
  p1: number | null;
  rare: boolean;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'common',
    focus: 'common',
    visibleControls: ['common'],
    narration: `Larkspur’s support set is its own ${N} training documents. Its common topics come up again and again.`,
    act: 'Count the common topics.',
    say: { block: 'originals', text: 'Support set' },
    predicate: s => s.common,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['counts', 'p1'],
    narration: `${COMMON[0].text} is in ${COMMON[0].docs} documents. A rare request is a question few documents answer.`,
    act: 'Predict first.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'rare',
    focus: 'rare',
    visibleControls: ['p1', 'rare'],
    narration: 'Your pick is locked.',
    act: 'Count the rare requests.',
    predicate: s => s.rare,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out', 'quiz'],
    narration: `One document each. Their rare words, the rarest half of the vocabulary, appear ${PINNED.rareMaxCount} times or fewer.`,
    act: 'One question to finish.',
    say: { block: 'originals', text: 'Few examples' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'How much can a model learn from one example?',
  },
];

const Counts = ({ rows, caption }: { rows: { text: string; topic?: string; docs: number }[]; caption: string }) => (
  <table className="tc-ledger" style={{ marginTop: 10 }}>
    <caption>{caption}</caption>
    <thead>
      <tr>
        <th scope="col">{rows[0].topic ? 'Rare request (its key fact)' : 'Topic'}</th>
        <th scope="col">Documents</th>
      </tr>
    </thead>
    <tbody>
      {rows.map(r => (
        <tr key={r.text} data-docs={r.docs}>
          <th scope="row">{r.topic ? `${r.topic} (“${r.text}”)` : r.text}</th>
          <td>
            {r.docs} of {N}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

export default function TooFewExamples() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ common: false, p1: null, rare: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ say }) => (
        <CopierStage
          say={say}
          room={{ gens: [], gen: null, arm: 'replace', real: 1 }}
          caption={`Larkspur’s support set: ${N} training documents, no copies yet.`}
        />
      )}
      controls={{
        common: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, common: true })}>
            Count the common topics
          </button>
        ),
        counts: () => <Counts rows={COMMON} caption="Training documents that mention each topic" />,
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        rare: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, rare: true })}>
            Count the rare requests
          </button>
        ),
        out: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />
            <Counts rows={RARE} caption="Training documents that answer each rare request" />
            <Fact id="kandpal-2023" />
          </>
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
    />
  );
}
