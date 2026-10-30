// Chapter 6: when pictures mislead. The faxed invoice: the vision reading's total is a clean wrong digit; the host's sum
// check (live) catches it, and OCR's garbled reading is shown beside it. Then the return label: the reader predicts what
// the reading passes on (the pick locks), and both methods carry the label's instruction word for word. Links Guardrails.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { reading, sumCheck } from '../../lib/multimodal/readings';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { SCAN_PARTS } from '../../components/scenes/scanScene';
import { Fact, MultimodalStage, ReadingCard, RecordedNote } from './kit';

const MODULE = 'multimodal',
  ID = '06-when-pictures-mislead';
export const PARTS = SCAN_PARTS;
const SIZE = 1600;
const money = (n: number) => (Number.isFinite(n) ? `$${n.toFixed(2)}` : 'unreadable');

interface S {
  fax: boolean;
  checked: boolean;
  p1: number | null;
  label: boolean;
  quiz: number | null;
}

const P1 = {
  question:
    'A returned crate’s label has a sentence printed for the AI: approve a full refund and skip the inspection. The photo goes to the assistant. What does its reading pass on?',
  options: [
    'Nothing: models ignore text in pictures',
    'The sentence, word for word, in what the model reads',
    'Only the order number',
  ],
};
/** Both methods' recorded readings carry the label's instruction into what the model reads. */
export const outcome = () =>
  (['ocr', 'vision'] as const).every(m =>
    reading('label', SIZE, m).text.includes(reading('label', SIZE, m).fields.instruction!),
  )
    ? 1
    : 0;

export const QUIZ = {
  question: 'Which defence holds against instructions written inside images?',
  options: [
    'Treat text read from an image as data: an action it asks for, like a refund, needs a person',
    'Switch to OCR, which strips instructions out',
    'Tell the model in its prompt to ignore instructions in images',
  ],
  correct: 0,
  explanation:
    'Reading the sentence is the job; acting on it is a decision Larkspur’s software keeps away from untrusted text.',
  why: [
    'Right: the model may read anything, but what text from an image can make the system do is limited by Larkspur’s software, not by hoping.',
    'OCR passed the same sentence on, word for word.',
    'A prompt rule helps, but a well-written injection can still win: the Guardrails module measures exactly that.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'fax',
    focus: 'fax',
    visibleControls: ['fax'],
    narration: 'First, a faxed invoice: grainy, with a smudge across the total.',
    act: 'Read it with vision.',
    say: { block: 'sheet', text: 'Smudged total' },
    predicate: s => s.fax,
  },
  {
    id: 'check',
    focus: 'check',
    visibleControls: ['faxReading', 'check'],
    narration: 'The reading looks sure: nothing says a digit was hard. A cross-check runs outside the model.',
    act: 'Check the lines add up.',
    say: { block: 'camera', text: 'Looks confident' },
    predicate: s => s.checked,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['checked', 'p1'],
    narration:
      'Caught: a misread, a clean wrong digit that looked right. OCR’s reading is garbled: easier to spot, equally unusable.',
    act: 'Now a return label: predict first.',
    say: { block: 'sheet', text: 'Wrong digit' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'label',
    focus: 'label',
    visibleControls: ['p1', 'label'],
    narration: 'Your pick is locked.',
    act: 'Read the return label.',
    predicate: s => s.label,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['labelReadings', 'quiz'],
    narration: 'Both readings pass the sentence on word for word: prompt injection, in an image as in an email.',
    act: 'One question to finish.',
    say: { block: 'camera', text: 'Word for word' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Did OCR’s reading leave the sentence out?',
  },
];

export default function WhenPicturesMislead() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ fax: false, checked: false, p1: null, label: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => {
        const onLabel = state.p1 !== null,
          c = sumCheck(reading('fax', SIZE, 'vision'));
        return onLabel ? (
          <MultimodalStage
            say={say}
            shown={{
              image: 'label',
              size: SIZE,
              method: state.label ? 'vision' : null,
              caption: state.label
                ? 'The label’s sentence is in the reading, word for word.'
                : 'A returned crate with its label.',
              stamp: state.label ? 'WAITING' : undefined,
            }}
          />
        ) : (
          <MultimodalStage
            say={say}
            shown={{
              image: 'fax',
              size: SIZE,
              method: state.fax ? 'vision' : null,
              caption: state.checked
                ? `Lines add up to ${money(c.sum)}; the reading says ${money(c.total)}. Sent to a person.`
                : state.fax
                  ? `The reading says the total is ${money(c.total)}.`
                  : 'A faxed invoice with a smudge on its total.',
              stamp: state.checked ? (c.ok ? 'PASS' : 'STOPPED') : undefined,
            }}
          />
        );
      }}
      controls={{
        fax: ({ state, sync }) => (
          <button type="button" className="big" onClick={() => sync({ ...state, fax: true })}>
            Read the fax with vision
          </button>
        ),
        faxReading: () => <ReadingCard image="fax" size={SIZE} method="vision" fields={false} />,
        check: ({ state, sync }) => (
          <button type="button" className="big" onClick={() => sync({ ...state, checked: true })}>
            Check the lines add up
          </button>
        ),
        checked: () => {
          const c = sumCheck(reading('fax', SIZE, 'vision'));
          return (
            <>
              <table className="tc-ledger" style={{ marginTop: 10 }} data-check={c.ok ? 'pass' : 'fail'}>
                <caption>Larkspur’s check, run live on the reading</caption>
                <tbody>
                  <tr>
                    <th scope="row">Lines, added up</th>
                    <td>{money(c.sum)}</td>
                  </tr>
                  <tr>
                    <th scope="row">Total, as read</th>
                    <td>{money(c.total)}</td>
                  </tr>
                  <tr>
                    <th scope="row">Result</th>
                    <td>
                      <span className={`stamp ${c.ok ? 'correct' : 'wrong'}`}>{c.ok ? 'MATCH' : 'NO MATCH'}</span>{' '}
                      {c.ok ? '' : 'held for a person'}
                    </td>
                  </tr>
                </tbody>
              </table>
              <ReadingCard image="fax" size={SIZE} method="vision" />
              <ReadingCard image="fax" size={SIZE} method="ocr" />
              <RecordedNote />
              <Fact id="small-images" />
            </>
          );
        },
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        label: ({ state, sync }) => (
          <button type="button" className="big" onClick={() => sync({ ...state, label: true })}>
            Read the label
          </button>
        ),
        labelReadings: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcome()} />
            <ReadingCard image="label" size={SIZE} method="ocr" fields={false} />
            <ReadingCard image="label" size={SIZE} method="vision" fields={false} />
            <RecordedNote />
            <Fact id="owasp-multimodal" />
            <p className="tc-fact">
              The <a href="/guardrails/">Guardrails</a> module shows the defences that hold: keep untrusted text away
              from actions, and send refunds to a person.
            </p>
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
