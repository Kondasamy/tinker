// Chapter 4: facts move, style stays. A price changes (the fixture in data/fine-tuning/price-change.json). The reader
// reads the update, predicts which version gives the new price, asks the fine-tuned and RAG versions (recorded answers,
// graded live by Evals' key-fact check against the fixture's reference), then runs the whole test set on both.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { ALL_QUESTIONS, gradeVersion, PRICE_CHANGE, VERSIONS, type VersionId } from '../../lib/fine-tuning/engine';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { Answer, FineTuneStage, versionCols, type View } from './kit';

const MODULE = 'fine-tuning', ID = '04-facts-move-style-stays';
const Q = PRICE_CHANGE.question.id, BOTH: VersionId[] = ['finetuned', 'rag'];
const label = (v: VersionId) => VERSIONS.find(x => x.id === v)!.label;
const FT = label('finetuned'), RAG = label('rag');
/** each version over every question: how many carry the key fact, how many sign off */
export const tally = (v: VersionId) => {
  const g = gradeVersion(v, ALL_QUESTIONS);
  return { facts: g.filter(x => x.fact).length, signed: g.filter(x => x.signed).length, of: g.length };
};

interface S { read: boolean; p1: number | null; asked: boolean; all: boolean; view: View; quiz: number | null }

const P1 = {
  question: `The update is in Larkspur’s documents. Nobody retrained anything. Ask ${FT} and ${RAG} what a K2 costs at 50 or more. What will each say?`,
  options: [
    'Both give the new price',
    `${FT} gives the old price; ${RAG} gives the new one`,
    'Both give the old price',
    `${FT} gives the new price; ${RAG} gives the old one`,
  ],
};
/** read off the key-fact check on the two recorded answers */
export function outcome() {
  const [ft, rag] = BOTH.map(v => gradeVersion(v, [Q])[0].fact);
  return ft && rag ? 0 : !ft && rag ? 1 : !ft && !rag ? 2 : 3;
}

const QUIZ = {
  question: 'Larkspur fine-tuned its assistant last month, on replies that say returns are accepted within 30 days. Next week the window becomes 45 days. What keeps the answers right with the least work?',
  options: [
    'Nothing: the fine-tuned model will pick up the change by itself',
    'Retrain the model on new replies every time a policy changes',
    'Put the returns policy in the documents the assistant reads, and update the document',
    'Add “be accurate about returns” to the prompt',
  ],
  correct: 2,
  explanation: 'Facts that change belong in documents, which are read fresh for every question; style can stay in the weights.',
  why: [
    'Weights hold what they were trained on. Nothing tells them the policy moved, so the old window stays in every answer.',
    'It works, slowly: every change means a new training run and a new round of evals, and the old fact may still leak through until then.',
    'Right. Update the document and the next answer reads 45 days, with a citation to show where it came from.',
    'An instruction to be accurate gives the model no new fact. It still only knows 30 days.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'update', focus: 'update', visibleControls: ['update'],
    narration: `Larkspur’s fine-tuned version learnt prices from past replies, and it signs off the way the team wants. Then purchasing posts a price change. Read it.`,
    predicate: s => s.read,
  },
  {
    id: 'predict', focus: 'p1', visibleControls: ['passage', 'p1'],
    narration: `${RAG} reads the documents for every question; ${FT} reads none, and answers from its weights. Before you ask:`,
    predicate: s => s.p1 !== null,
  },
  {
    id: 'ask', focus: 'ask', visibleControls: ['p1', 'ask'],
    narration: 'Ask both. Their answers are recorded; the key-fact check from the Evals module runs on them live, looking for the new price.',
    predicate: s => s.asked,
  },
  {
    id: 'all', focus: 'all', visibleControls: ['answers', 'all'],
    narration: `${FT}’s answer is stale: right when it was trained, wrong now. It still signs off: the style stayed, the fact didn’t move. Is that one question bad luck? Run every question in the test set on both.`,
    predicate: s => s.all,
  },
  {
    id: 'quiz', focus: 'quiz', visibleControls: ['summary', 'quiz'],
    narration: 'Weights are a good home for a style, which rarely changes. They are a poor home for facts, which do. Documents move the moment they are updated. One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which lever is read fresh each time a question comes in?',
  },
];

export default function FactsMoveStyleStays() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ read: false, p1: null, asked: false, all: false, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync }) => (
        <FineTuneStage view={state.view} onView={view => sync({ ...state, view })} show={() => ({
          scene: { lit: state.asked ? 'weights' : state.read ? 'documents' : null, weights: state.asked ? 'finetuned' : 'base' },
          results: state.all ? { cols: versionCols(BOTH, ALL_QUESTIONS), questions: ALL_QUESTIONS }
            : state.asked ? { cols: versionCols(BOTH, [Q]), questions: [Q] } : undefined,
          caption: state.all ? `Every question, key-fact check: ${FT} ${tally('finetuned').facts} of ${tally('finetuned').of}, ${RAG} ${tally('rag').facts} of ${tally('rag').of}.`
            : state.asked ? `“${PRICE_CHANGE.question.query}” ${FT}: ${gradeVersion('finetuned', [Q])[0].fact ? 'PASS' : 'FAIL'}. ${RAG}: ${gradeVersion('rag', [Q])[0].fact ? 'PASS' : 'FAIL'}.`
            : state.read ? 'The price update goes into the documents lever.' : 'The bench, with the fine-tuned model.',
        })} />
      )}
      controls={{
        update: ({ state, sync }) => <button type="button" className="big" onClick={() => sync({ ...state, read: true })}>Read the price update</button>,
        passage: () => (
          <div className="tc-def ft-answer">
            <p className="lbl">{PRICE_CHANGE.passage.title}</p>
            <p>{PRICE_CHANGE.passage.text}</p>
          </div>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        ask: ({ state, sync }) => (
          <button type="button" className="big" onClick={() => sync({ ...state, asked: true, view: 'results' })}>Ask both: “{PRICE_CHANGE.question.query}”</button>
        ),
        answers: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcome()} />
            {BOTH.map(v => <Answer key={v} version={v} question={Q} />)}
          </>
        ),
        all: ({ state, sync }) => (
          <button type="button" className="big" onClick={() => sync({ ...state, all: true, view: 'results' })}>Run all {ALL_QUESTIONS.length} questions on both</button>
        ),
        summary: () => (
          <table className="tc-ledger" style={{ marginTop: 10 }}>
            <caption>All {ALL_QUESTIONS.length} questions</caption>
            <thead><tr><th scope="col">Version</th><th scope="col">Key fact</th><th scope="col">Signs off</th></tr></thead>
            <tbody>
              {BOTH.map(v => { const t = tally(v); return <tr key={v}><th scope="row">{label(v)}</th><td>{t.facts} of {t.of}</td><td>{t.signed} of {t.of}</td></tr>; })}
            </tbody>
          </table>
        ),
        quiz: ({ state, apply, sync }) => (
          <Quiz {...QUIZ} unsure value={state.quiz} onAnswer={(_, q) => apply({ ...state, quiz: q })} onUnsure={() => sync({ ...state, quiz: UNSURE })} />
        ),
      }}
    />
  );
}
