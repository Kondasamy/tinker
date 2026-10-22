// Chapter 2: size and detail. The reader predicts which field goes first (the pick locks), then drags the size range from
// 3,200 px to 400 px: the count follows live, the Patches tab shows the image blocky, and the recorded reading at each
// size is graded field by field. 3,200 px is scaled down to the model's limit first. The tab is step state.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { SIZES, grade, sent, type Size } from '../../lib/multimodal/readings';
import { thousands } from '../../lib/multimodal/patches';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { Fact, MultimodalStage, ReadingCard, RecordedNote, SizeRange, px, type View } from './kit';

const MODULE = 'multimodal',
  ID = '02-size-and-detail';
const FIELDS = grade('invoice', 1600, 'vision').fields;
/** The first field lost on the way down: the one wrong at the largest size that still loses any. */
export const firstLost = () => {
  const losing = [...SIZES].reverse().find(s => grade('invoice', s, 'vision').right < FIELDS.length)!;
  return grade('invoice', losing, 'vision').fields.find(f => !f.right)!.id;
};
const NEED: Size[] = [400, 800, 3200];

interface S {
  p1: number | null;
  size: Size;
  seen: Size[];
  view: View;
  quiz: number | null;
}

const P1 = {
  question:
    'Accounts wants invoices sent smaller, to save tokens. Shrink this one step by step: which field becomes unreadable first?',
  options: ['The total', 'The invoice number', 'The payment terms in the small print'],
};
const OUTCOME = ['total', 'number', 'terms'].indexOf(firstLost());

const QUIZ = {
  question:
    'A team sends phone photos of shelf labels at 500 px to save tokens, and prices come back wrong. What should they try first?',
  options: [
    'Send them larger, checking a sample until the prices read right',
    'Ask the model to look harder',
    'Always send the largest size the phone takes',
  ],
  correct: 0,
  explanation: 'The prices are small print, and small print is the first thing a smaller image loses.',
  why: [
    'Right. Find the smallest size where the small print survives, on a sample with known answers.',
    'The detail isn’t in the patches any more; no prompt brings it back.',
    'Past the model’s limit the image is scaled down anyway, and below it you pay for pixels the prices may not need.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `At ${px(1600)} the invoice costs ${thousands(sent('invoice', 1600).count.tokens)} image tokens, and the reading gets every field right. Fewer pixels means fewer patches, so fewer tokens. Before you shrink it:`,
    predicate: s => s.p1 !== null,
  },
  {
    id: 'shrink',
    focus: 'size',
    visibleControls: ['p1', 'size'],
    narration:
      'Drag the size down to 400 px and up to 3,200 px. Watch the token count, the close-up in the Patches tab, and the recorded reading at each size, graded field by field.',
    setup: s => ({ ...s, view: 'patches', seen: [...new Set([...s.seen, s.size])] }),
    predicate: s => NEED.every(z => s.seen.includes(z)),
    hint: 'Drag the size, or use the arrow keys, until you have seen 400, 800 and 3,200 px.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['found', 'quiz'],
    narration:
      'The small print goes first: at 800 px a patch holds only a smear of it. At 400 px the invoice number’s last digit becomes a guess. The total, the biggest print, survives. And 3,200 px costs no more than the model’s limit: the image is scaled down before it is read, so the extra pixels buy nothing.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What happened to the payment terms as the invoice shrank?',
  },
];

export default function SizeAndDetail() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, size: 1600, seen: [], view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync }) => {
        const z = sent('invoice', state.size),
          g = grade('invoice', state.size, 'vision');
        return (
          <MultimodalStage
            view={state.view}
            onView={view => sync({ ...state, view })}
            shown={{
              image: 'invoice',
              size: state.size,
              method: 'vision',
              caption: `${px(state.size)}: ${thousands(z.count.tokens)} image tokens${z.count.downscaled ? ` (scaled down to ${z.count.w} × ${z.count.h})` : ''}; ${g.right} of ${g.of} fields read right.`,
              stamp: g.right === g.of ? 'PASS' : 'FAIL',
            }}
          />
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        size: ({ state, sync }) => (
          <>
            <SizeRange
              image="invoice"
              value={state.size}
              onChange={size => sync({ ...state, size, seen: [...new Set([...state.seen, size])] })}
            />
            <ReadingCard image="invoice" size={state.size} method="vision" />
            <RecordedNote />
          </>
        ),
        found: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />
            <Fact id="text-legible" />
            <Fact id="high-res-tier" />
            <Fact id="resize-rule" />
            <Fact id="small-images" />
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
