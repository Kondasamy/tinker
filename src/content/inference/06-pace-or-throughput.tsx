// Chapter 6: pace or throughput. The batch cap steps over its list on the simulated server (continuous batching, the
// full KV room). A bigger batch serves more tokens a second and empties the queue sooner, but every pass is longer, so
// each customer's tokens come more slowly. The outcome is read off the runs, never typed.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { CAPS, MEMORY, OPEN, serve } from '../../lib/inference/server';
import { floorAt } from '../../components/scenes/serveScene';
import { ms } from '../../components/scenes/serverTimeline';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { CostModelNote, Fact, InferenceStage, type View } from './kit';

const MODULE = 'inference', ID = '06-pace-or-throughput';
const ROOM = MEMORY.at(-1)!;
export const RUNS = Object.fromEntries(CAPS.map(cap => [cap, serve(OPEN, { mode: 'continuous', cap, kvRoomGB: ROOM })])) as Record<number, ReturnType<typeof serve>>;
/** the prediction compares these two caps */
export const FROM = 4, TO = 16;
const tput = (cap: number) => `${Math.round(RUNS[cap].throughput)} tokens/s`;

const P1 = {
  question: `The server runs up to ${FROM} requests at once. Raise the cap to ${TO}. What happens?`,
  options: [
    'Everything gets better: more tokens a second, and each reply’s tokens come faster',
    'More tokens a second and shorter queues, but each reply’s tokens come more slowly',
    'Nothing much: the server was already busy',
  ],
};
export function outcomeOf(): number {
  const a = RUNS[FROM], b = RUNS[TO];
  if (b.throughput <= a.throughput * 1.05) return 2;
  return b.meanTpot > a.meanTpot ? 1 : 0;
}

const QUIZ = {
  question: 'A voice assistant reads its replies aloud as they arrive; if a token comes later than the voice needs it, the speech stutters. Its server has spare memory. Should the team raise the batch cap as far as memory allows?',
  options: [
    'Yes: a bigger batch is always faster',
    'Not blindly: a bigger batch serves more callers, but slows each caller’s tokens; set the cap so the time per token stays under what speech needs',
    'No: batching only helps text, not voice',
    'Yes, because memory is the only limit on a batch',
  ],
  correct: 1,
  explanation: 'The cap trades each request’s pace for the server’s throughput. A product that streams tokens to people needs a pace target, and the cap has to respect it.',
  why: [
    'More tokens per second across all callers, yes; but each pass carries more requests, so each caller waits longer between tokens.',
    'Right. Throughput rises with the cap; so does the time per token. Pick the cap from the pace the product needs.',
    'Batching works the same for any reply; voice just makes the pace matter more.',
    'Memory caps how many fit; the pace each one gets is a second limit, set by how long a pass takes.',
  ],
};

interface S { cap: number; view: View; p1: number | null; quiz: number | null }

export const STEPS: Step<S>[] = [
  {
    id: 'predict', focus: 'p1', visibleControls: ['table', 'p1'],
    narration: `Monday’s rush again, with continuous batching and the full KV room. The batch cap is how many requests run in one pass. Each pass reads the weights once, plus each request’s own cache and work, so a fuller pass takes longer. The cap is ${FROM}. Before you raise it:`,
    predicate: s => s.p1 !== null,
  },
  {
    id: 'reveal', focus: 'cap', visibleControls: ['p1', 'cap'],
    narration: `Locked in. Raise the cap to ${TO}.`,
    predicate: s => s.cap === TO,
    hint: 'Move the slider all the way right.',
  },
  {
    id: 'low', focus: 'cap', visibleControls: ['out1', 'cap'],
    narration: 'More throughput and a shorter queue, paid for by every customer’s pace: each token now waits for a fuller pass. Look at the other end: a cap of 1, one customer at a time.',
    predicate: s => s.cap === 1,
  },
  {
    id: 'quiz', focus: 'quiz', visibleControls: ['cap', 'quiz'],
    narration: 'One at a time, each token comes fastest, but the queue grows long and the server writes a fraction of the tokens. No setting wins on every number; the team has to choose from its targets. One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What happens to each customer when a pass carries more requests?',
  },
];

function Table({ cap }: { cap: number }) {
  return (
    <table className="tc-ledger">
      <caption>Monday’s rush, continuous batching, simulated</caption>
      <thead><tr><th scope="col">Batch cap</th><th scope="col">Throughput</th><th scope="col">Longest wait for a first token</th><th scope="col">Time per token, average</th></tr></thead>
      <tbody>
        {CAPS.map(c => (
          <tr key={c} data-cap={c} data-on={c === cap || undefined} style={c === cap ? { fontWeight: 800 } : undefined}>
            <th scope="row">{c}</th><td>{tput(c)}</td><td>{ms(RUNS[c].worstTtft)}</td><td>{ms(RUNS[c].meanTpot)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function PaceOrThroughput() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ cap: FROM, view: 'scene', p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync }) => (
        <InferenceStage view={state.view} onView={view => sync({ ...state, view })} show={() => ({
          scene: floorAt(RUNS[state.cap]), result: RUNS[state.cap],
          caption: `Batch cap ${state.cap}: ${tput(state.cap)}; each token every ${ms(RUNS[state.cap].meanTpot)} on average; the longest wait for a first token ${ms(RUNS[state.cap].worstTtft)}.`,
        })} />
      )}
      controls={{
        table: ({ state }) => <><Table cap={state.cap} /><CostModelNote /></>,
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        cap: ({ state, apply, sync, focused }) => {
          const i = Math.max(0, CAPS.indexOf(state.cap as (typeof CAPS)[number])), set = focused ? apply : sync;
          return (
            <>
              <div className="in-range">
                <label htmlFor="in-cap">{`Batch cap: ${state.cap}`}</label>
                <input id="in-cap" type="range" min={0} max={CAPS.length - 1} step={1} value={i} aria-valuetext={`${state.cap} requests at once`}
                  onChange={e => set({ ...state, cap: CAPS[Number(e.target.value)] })} />
              </div>
              <Table cap={state.cap} />
            </>
          );
        },
        out1: ({ state }) => (<><Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} /><Fact id="batching-amortizes" /></>),
        quiz: ({ state, apply, sync }) => (
          <Quiz {...QUIZ} unsure value={state.quiz} onAnswer={(_, q) => apply({ ...state, quiz: q })} onUnsure={() => sync({ ...state, quiz: UNSURE })} />
        ),
      }}
    />
  );
}
