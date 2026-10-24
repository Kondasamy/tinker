// Chapter 1: three ways to change an answer. The reader pulls each lever on the bench (prompt, documents, weights) and
// reads what it changes, predicts which of the three versions will sign off, then asks all three one question: every
// one signs off, and only some carry the key fact. The answers are recorded; the marks under them are graded live.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { gradeVersion, QUESTION_IDS, SIGNOFF, VERSIONS, VERSION_IDS, type Version } from '../../lib/fine-tuning/engine';
import { APPROACHES, TRAIN_PARTS, type Approach } from '../../components/scenes/trainScene';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { Answer, FineTuneStage, questionText, versionCols, type View } from './kit';

const MODULE = 'fine-tuning',
  ID = '01-three-ways';
const versionOf = (a: Approach) => VERSIONS.find(v => v.changes === a)!;
const fact = (v: Version['id'], q: string) => gradeVersion(v, [q])[0].fact;
/** The question all three are asked: one the prompt alone gets wrong, and documents and weights both get right. */
export const QUESTION = QUESTION_IDS.find(q => !fact('prompted', q) && fact('rag', q) && fact('finetuned', q))!;

/** Where each lever's change lives, and when it applies. */
const LIVES: Record<Approach, string> = {
  prompt: 'Words sent with every question. Change them and the next answer changes. The model itself stays the same.',
  documents:
    'Passages fetched for each question and sent with it. Update a document and the next answer reads the new one. The model stays the same.',
  weights:
    'The numbers inside the model. Training changes them once, and every answer after that comes from the changed model, with nothing extra sent.',
};
const LEVER_NAME: Record<Approach, string> = { prompt: 'prompt', documents: 'documents', weights: 'weights' };

interface S {
  pulled: Approach[];
  p1: number | null;
  asked: boolean;
  view: View;
  quiz: number | null;
}

export const P1 = {
  question: `Each version is told to end its replies with “${SIGNOFF}” in its own way. Ask all three the same question. Which replies will end with it?`,
  options: [
    `Only ${versionOf('prompt').label}: the instruction is right there in its prompt`,
    `Only ${versionOf('weights').label}: training is the only change that sticks`,
    'All three: each lever can carry a style',
    'None: a sign-off has to be added by a person',
  ],
};
// read off the grading: which versions' answers end with the sign-off
function outcome() {
  const signed = VERSION_IDS.filter(v => gradeVersion(v, [QUESTION])[0].signed);
  return signed.length === 3 ? 2 : signed.length === 0 ? 3 : signed.includes('finetuned') ? 1 : 0;
}

export const QUIZ = {
  question:
    'This morning Larkspur published a safety recall for one model of ladder. By lunch, the assistant must tell customers about it. Which lever do you pull?',
  options: [
    'The weights: fine-tune the model on the recall notice',
    'The documents: add the notice to what the assistant reads',
    'The prompt: paste the notice into the words sent with every question',
    'None: the model will hear about it on its own',
  ],
  correct: 1,
  explanation:
    'A new fact belongs where the assistant reads it each time: in the documents. The next answer can use it.',
  why: [
    'Training takes time and changes the model for good, so next month’s recall needs another run and a learnt fact goes stale.',
    'Right: documents are read fresh for every question, so a notice added at 9 is in the answer at 9:01, with a citation.',
    'It works for one notice, but the prompt goes with every question and grows with each notice, while documents are fetched only when they match.',
    'A model knows only what it was trained on and what it is sent, so nothing reaches it on its own.',
  ],
};

/** the bench's parts a callout can point at */
export const PARTS = TRAIN_PARTS;
const [PROMPTED, RAG, TUNED] = (['prompt', 'documents', 'weights'] as const).map(a => versionOf(a).label);

export const STEPS: Step<S>[] = [
  {
    id: 'levers',
    focus: 'levers',
    visibleControls: ['levers'],
    narration: 'Three levers, three ways to change an answer: the prompt, the documents and the weights.',
    act: 'Pull each one.',
    say: { block: 'model', text: 'Weights in here' },
    predicate: s => APPROACHES.every(a => s.pulled.includes(a)),
    hint: 'Press all three lever buttons.',
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['levers', 'p1'],
    narration:
      'The team built one version per lever; changing the weights is fine-tuning. Their answers were recorded for this site, not live.',
    act: 'Predict first.',
    say: { block: 'documents', text: 'Read each time' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'ask',
    focus: 'ask',
    visibleControls: ['p1', 'ask'],
    narration: 'Under each answer, two live checks: does it carry the key fact, and does it sign off?',
    act: 'Ask all three.',
    predicate: s => s.asked,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['answers', 'quiz'],
    narration: `All three sign off: style rides any lever. The fact: ${PROMPTED} guessed, ${RAG} read it, ${TUNED} learnt it in training.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which lever is read fresh for every question?',
  },
];

export default function ThreeWays() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ pulled: [], p1: null, asked: false, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const lit = state.pulled.at(-1) ?? null;
        return (
          <FineTuneStage
            view={state.view}
            onView={view => sync({ ...state, view })}
            say={say}
            show={() => ({
              scene: { lit, weights: lit === 'weights' ? 'finetuned' : 'base' },
              results: state.asked ? { cols: versionCols(VERSION_IDS, [QUESTION]), questions: [QUESTION] } : undefined,
              caption: state.asked
                ? `All three asked: “${questionText(QUESTION)}” The Results tab grades each by the key-fact check.`
                : lit
                  ? `The ${LEVER_NAME[lit]} lever is pulled: ${versionOf(lit).label}.`
                  : 'The bench at rest: the model, and three levers in front of it.',
            })}
          />
        );
      }}
      controls={{
        levers: ({ state, sync }) => (
          <>
            <div role="group" aria-label="Pull a lever" className="ft-row">
              {APPROACHES.map(a => (
                <button
                  key={a}
                  type="button"
                  className="chip"
                  aria-pressed={state.pulled.includes(a)}
                  onClick={() => sync({ ...state, pulled: [...state.pulled.filter(x => x !== a), a] })}
                >
                  Pull the {LEVER_NAME[a]} lever
                </button>
              ))}
            </div>
            {state.pulled.length > 0 && (
              <table className="tc-ledger" style={{ marginTop: 10 }}>
                <caption>Where the change lives</caption>
                <tbody>
                  {APPROACHES.filter(a => state.pulled.includes(a)).map(a => (
                    <tr key={a}>
                      <th scope="row">{LEVER_NAME[a]}</th>
                      <td>{LIVES[a]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        ),
        p1: ({ state, apply }) => (
          <>
            <ul className="note">
              {VERSIONS.map(v => (
                <li key={v.id}>
                  {v.label}: {v.note}.
                </li>
              ))}
            </ul>
            <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />
          </>
        ),
        ask: ({ state, sync }) => (
          <button type="button" className="big" onClick={() => sync({ ...state, asked: true, view: 'results' })}>
            Ask all three: “{questionText(QUESTION)}”
          </button>
        ),
        answers: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcome()} />
            {VERSION_IDS.map(v => (
              <Answer key={v} version={v} question={QUESTION} />
            ))}
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
