// Chapter 1: what the assistant did (R12.1). One good trace of a Larkspur conversation, read span by span: the reader
// opens it, predicts where the time went, then reads every span (in the waterfall with the arrow keys, or one at a time
// from the story column). The timings are hand-written, and the copy says so.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { DOMAINS, TRACES, durationOf, ordered, traceOf, type SpanKind } from '../../lib/observability/traces';
import { KIND_NAME } from '../../components/scenes/traceWaterfall';
import { num } from '../../lib/format';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { Fact, MODULE, ObsStage, TraceCard, wallOf, type View } from './kit';
import { TRACE_PARTS } from '../../components/scenes/traceScene';

export const PARTS = TRACE_PARTS;

const ID = '01-what-it-did';
const TRACE = traceOf(DOMAINS[ID].traces[0]);
const SPANS = ordered(TRACE).map(o => o.span);
const msOf = (k: SpanKind) => TRACE.spans.filter(s => s.kind === k).reduce((n, s) => n + durationOf(s), 0);
const KINDS: SpanKind[] = ['chat', 'tool', 'retrieval'];
export const P1 = {
  question: 'Inside this one answer, which kind of step do you expect took most of the time?',
  options: ['The model calls', 'Looking up the order', 'Searching the policies'],
};
export const OUT1 = KINDS.indexOf(KINDS.reduce((a, b) => (msOf(b) > msOf(a) ? b : a)));

export const QUIZ = {
  question:
    'A customer says the assistant told them the wrong delivery date. All you have is the question and the reply. What would a trace let you see that they can’t?',
  options: [
    'Nothing more: the reply already shows the mistake',
    'Each step in between: what was searched, which order the tool looked up, and what the model was given',
    'Only how long the answer took',
  ],
  correct: 1,
  explanation: 'A trace records every step of one request, so you can see where the wrong date came from.',
  why: [
    'The reply shows that something went wrong, but the cause sits in the steps before it.',
    'Right: a span per step lets you check the order number the tool was asked for and what it returned.',
    'Timings are part of a trace, but each span also records what the step did.',
  ],
};

interface S {
  opened: boolean;
  read: string[];
  p1: number | null;
  view: View;
  quiz: number | null;
}
const readAll = (s: S) => SPANS.every(sp => s.read.includes(sp.id));

export const STEPS: Step<S>[] = [
  {
    id: 'open',
    focus: 'open',
    visibleControls: ['open'],
    narration: `Larkspur’s assistant answered ${TRACES.length} questions yesterday, and each left a trace: one request’s record, question to reply.`,
    act: 'Open the first.',
    say: { block: 'wall', text: 'One per request' },
    predicate: s => s.opened,
    hint: 'Press the open button.',
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['card', 'p1'],
    narration: `${TRACE.customer} asked about an order and a return. The trace holds ${SPANS.length} spans: one for the whole run, one per step.`,
    act: 'Predict first.',
    say: { block: 'wall', text: 'This one is open' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'read',
    focus: 'read',
    visibleControls: ['p1', 'read'],
    narration:
      'The Waterfall draws a row per span, as long as its step took. Spans are shaped like OpenTelemetry’s conventions.',
    act: 'Read every span.',
    predicate: readAll,
    hint: 'Tab into the waterfall and use the arrow keys, or press the button: it reads the next span.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'read', 'facts', 'quiz'],
    narration: `Model calls took ${num(msOf('chat'))} of ${num(durationOf(SPANS[0]))} ms; order lookup ${num(msOf('tool'))} ms, search ${num(msOf('retrieval'))} ms. Hand-written timings, not any system’s speed.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What sits between the question and the reply?',
  },
];

export default function WhatItDid() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ opened: false, read: [], p1: null, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => (
        <ObsStage
          say={say}
          room={{ cards: wallOf(TRACES, state.opened ? TRACE.id : null) }}
          trace={state.opened ? TRACE : null}
          view={state.view}
          onView={view => sync({ ...state, view })}
          onRead={id => {
            if (!state.read.includes(id)) sync({ ...state, read: [...state.read, id] });
          }}
          caption={
            state.opened ? (
              <>
                <span className="lbl">
                  Trace {TRACE.id} · {SPANS.length} spans
                </span>
                <span>
                  {TRACE.customer}: “{TRACE.question}”
                </span>
              </>
            ) : (
              'Yesterday’s traces on the wall.'
            )
          }
        />
      )}
      controls={{
        open: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, opened: true })}>
            Open the first trace
          </button>
        ),
        card: () => <TraceCard trace={TRACE} />,
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        // reading is never a failed try, so it syncs
        read: ({ state, sync }) => {
          const next = SPANS.find(sp => !state.read.includes(sp.id));
          return (
            <div className="tc-bench">
              {next && (
                <button
                  type="button"
                  className="big"
                  onClick={() => sync({ ...state, view: 'fall', read: [...state.read, next.id] })}
                >
                  Read the next span ({state.read.length + 1} of {SPANS.length})
                </button>
              )}
              <ol className="ob-list" aria-label="Spans read">
                {SPANS.filter(sp => state.read.includes(sp.id)).map(sp => (
                  <li key={sp.id} className="ob-trace">
                    <p>
                      <b>{sp.name}</b> · {KIND_NAME[sp.kind]} · {num(durationOf(sp))} ms
                    </p>
                    <p className="ob-a">{sp.detail}</p>
                    {Object.keys(sp.attrs).length > 0 && (
                      <p className="ob-a">
                        <code>
                          {Object.entries(sp.attrs)
                            .map(([k, v]) => `${k} = ${v}`)
                            .join(' · ')}
                        </code>
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          );
        },
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUT1} />,
        facts: () => (
          <>
            <p className="tc-fact">
              These traces and timings were written by hand for this module, shaped like real ones: they show how to
              read a trace, not any system’s speed.
            </p>
            <Fact id="otel-genai" />
            <Fact id="otel-operations" />
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
