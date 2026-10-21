// Chapter 2: the first failure (R12.2). Two bad traces; in each the reader finds the earliest span that went wrong, in
// the waterfall (arrow keys, then Enter or a click) or from the story column's list of spans. The first is an old
// passage (retrieval), the second a wrong order number (the first model call, though the tool's result looks wrong
// too). Both are puzzles with "Show me"; the reference first span is the trace's own (data/observability/traces.json).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { puzzle } from '../../components/quiz/Puzzle';
import { DOMAINS, FAILED, ordered, replyOf, spanOf, traceOf, type Trace } from '../../lib/observability/traces';
import { KIND_NAME } from '../../components/scenes/traceWaterfall';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { Fact, MODULE, ObsStage, TraceCard, wallOf, type View } from './kit';

const ID = '02-first-failure';
const [A, B] = DOMAINS[ID].traces.map(traceOf);
const firstOf = (t: Trace) => spanOf(t, t.first!)!;
export const P1 = {
  question: `The reply told ${A.customer} the wrong cutoff. Where do you expect it first went wrong?`,
  options: ['In the search: it brought back the wrong passage', 'In the model call: it misread a good passage', 'In the reply: it was sent wrong'],
};
const KIND_OPTION = { retrieval: 0, chat: 1, reply: 2 } as Record<string, number>;
export const OUT1 = KIND_OPTION[firstOf(A).kind];

const QUIZ = {
  question: 'A refund assistant refunded the wrong amount. Its trace: the model read the order correctly, then called the refund tool with the amount doubled; the tool refunded it; the reply confirmed it. Which span do you note?',
  options: [
    'The reply: that is what the customer saw',
    'The refund tool: it moved the wrong amount',
    'The model call that doubled the amount',
    'The order lookup: it came first',
  ],
  correct: 2,
  explanation: 'The first span that did the wrong thing is the one to note; the rest followed from it.',
  why: [
    'The reply is where the mistake shows. Change its wording and the money is still wrong.',
    'The tool did exactly what it was asked. The wrong amount came from the call made to it.',
    'Right. Everything after the doubled amount followed from it, like the wrong order number in this chapter.',
    'The lookup read the order correctly; being first doesn’t make it wrong.',
  ],
};

interface S { at: 0 | 1; picks: Record<string, string>; p1: number | null; view: View; opened: boolean; quiz: number | null }
const pick = (s: S, t: Trace, span: string): S => ({ ...s, picks: { ...s.picks, [t.id]: span } });
const right = (s: S, t: Trace) => s.picks[t.id] === t.first;

export const STEPS: Step<S>[] = [
  {
    id: 'open', focus: 'open', visibleControls: ['open'],
    narration: `Yesterday ${FAILED.length} traces ended in a wrong or useless reply. A customer saw each failure in the reply, but that is where it showed, not always where it started. Open the first.`,
    predicate: s => s.opened,
    hint: 'Press the open button.',
  },
  {
    id: 'predict', focus: 'p1', visibleControls: ['card', 'p1'],
    narration: `${A.customer} asked: “${A.question}” The reply: “${replyOf(A)}” The real cutoff is later. Before you look inside:`,
    predicate: s => s.p1 !== null,
  },
  puzzle<S>({
    id: 'find-a', focus: 'spans', visibleControls: ['p1', 'spans'],
    narration: 'Find the first failure: the earliest span that did the wrong thing. Read the spans in the waterfall, then press Enter on the one you choose, or pick it below.',
    broken: s => ({ ...s, at: 0, picks: {}, view: 'fall' }),
    verdict: s => right(s, A),
    solution: s => pick(s, A, A.first!),
    hint: 'Read what the search found. Is it this year’s passage?',
  }),
  puzzle<S>({
    id: 'find-b', focus: 'spans', visibleControls: ['out1', 'spans'],
    narration: `Yes: “${firstOf(A).detail}” Last year’s passage. The model quoted it faithfully, so the model call wasn’t the cause. Now ${B.customer}’s trace: “${B.question}” The reply: “${replyOf(B)}” Find its first failure.`,
    broken: s => ({ ...s, at: 1, view: 'fall' }),
    verdict: s => right(s, B),
    solution: s => pick(s, B, B.first!),
    hint: 'The tool returned the wrong order. What was it asked for?',
  }),
  {
    id: 'quiz', focus: 'quiz', visibleControls: ['facts', 'quiz'],
    narration: `The tool’s result looked wrong, but it returned exactly the order it was asked for: “${firstOf(B).detail}” The first model call asked for the wrong number, and every span after it followed. Note that one, not the tool or the reply. One question to finish.`,
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which span did the wrong thing first?',
  },
];

export default function FirstFailure() {
  const traceOfState = (s: S) => (s.at === 0 ? A : B);
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ at: 0, picks: {}, p1: null, view: 'scene', opened: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, apply, sync, focus }) => {
        const t = traceOfState(state), done = right(state, t);
        return (
          <ObsStage room={{ cards: wallOf(FAILED, state.opened ? t.id : null) }} trace={state.opened ? t : null}
            stamp={done ? t.first : null} picked={state.picks[t.id] ?? null}
            onPick={focus === 'spans' ? id => apply(pick(state, t, id)) : undefined}
            view={state.view} onView={view => sync({ ...state, view })}
            caption={state.opened ? <><span className="lbl">Trace {t.id} · {t.customer}</span><span>“{replyOf(t)}”</span></> : 'Yesterday’s failed traces on the wall.'} />
        );
      }}
      controls={{
        open: ({ state, apply }) => <button type="button" className="big" onClick={() => apply({ ...state, opened: true, view: 'fall' })}>Open the first failed trace</button>,
        card: () => <TraceCard trace={A} />,
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        spans: ({ state, apply }) => {
          const t = traceOfState(state), mine = state.picks[t.id];
          return (
            <div className="tc-bench">
              <div className="ob-chips" role="group" aria-label={`Spans of trace ${t.id}`}>
                {ordered(t).map(({ span }, i) => (
                  <button key={span.id} type="button" className="chip" aria-pressed={mine === span.id} onClick={() => apply(pick(state, t, span.id))}>
                    {i + 1}. {span.name} ({KIND_NAME[span.kind]})
                  </button>
                ))}
              </div>
              {mine && (
                <p className="tc-status" role="status">
                  <span className={`stamp ${mine === t.first ? "correct" : "wrong"}`}>{mine === t.first ? "FIRST FAILURE" : "NOT THE FIRST"}</span> {spanOf(t, mine)!.name}: “{spanOf(t, mine)!.detail}”
                </p>
              )}
            </div>
          );
        },
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUT1} />,
        facts: () => <Fact id="first-failure" />,
        quiz: ({ state, apply, sync }) => (
          <Quiz {...QUIZ} unsure value={state.quiz} onAnswer={(_, q) => apply({ ...state, quiz: q })} onUnsure={() => sync({ ...state, quiz: UNSURE })} />
        ),
      }}
    />
  );
}
