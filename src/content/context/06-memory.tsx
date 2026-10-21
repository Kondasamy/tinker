// Chapter 6: memory outside the window (R10.6). Two conversations with Hollis Hardware a week apart, without and with
// the memory tool. The note the model chose to write is part of its recorded turn; the host writes it under /memories/
// and reads it into the next session's window (src/lib/context/memory.ts). The prediction's outcome is read off the runs.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { DOMAINS, type Run } from '../../lib/context/loop';
import { MEMORY_DIR } from '../../lib/context/memory';
import { caseOf } from '../../lib/context/window';
import { fact } from '../../lib/context/facts';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { ContextStage, Fact, runOf } from './kit';

const MODULE = 'context', ID = '06-memory';
const SESSIONS = DOMAINS[ID].sessions![0];
const [HELLO] = SESSIONS.map(s => s[0]);
export const R = (memory: boolean) => runOf({ sessions: SESSIONS, memory });
const OFF = R(false), ON = R(true);
const later = (r: Run) => r.answers.find(a => a.session === 1)!;

const P1 = {
  question: 'Give the assistant a memory tool and run both conversations again. What happens in the second one?',
  options: [
    'It knows about the contract: the assistant wrote a note in the first conversation, and the host reads it into the new window',
    'Nothing changes: a new conversation always starts empty, whatever tools there are',
    'The host sends the whole first conversation again, so the window doubles',
  ],
};
const OUT1 = later(ON).right && Object.keys(ON.notes).length ? 0 : later(ON).right ? 2 : 1;

const QUIZ = {
  question: 'A bookshop’s assistant saves a memory note: “Customer prefers email, not phone.” Where does that note live, and who decides where it is stored?',
  options: [
    'Inside the model: it learns the note and keeps it in its weights',
    'In the shop’s own storage: the model asks for a file operation, and the shop’s application carries it out, only inside the memory folder',
    'In the context window, which the provider keeps open until the customer writes again',
    'Nowhere: notes vanish when the conversation ends, like the window',
  ],
  correct: 1,
  explanation: fact('memory-client-side').claim,
  why: [
    'A model doesn’t change between calls; nothing it reads is learned into its weights. The note is a file it can read back.',
    `Right. ${fact('memory-client-side').claim} Here the host writes only under ${MEMORY_DIR}.`,
    'Every window starts empty. In this chapter the second conversation knew nothing until the note was read in.',
    'The window vanishes; the file doesn’t. That is the point of writing it.',
  ],
};

interface S { memory: boolean; seen: boolean[]; p1: number | null; quiz: number | null }

export const STEPS: Step<S>[] = [
  {
    id: 'without', focus: 'run', visibleControls: ['run'],
    narration: `${caseOf(HELLO).customer} writes: “${caseOf(HELLO).question}” A week later, in a new conversation, they write again. A session is one conversation, and nothing in its window carries over to the next. Run both conversations.`,
    predicate: s => s.seen.includes(false),
    hint: 'Press the run button.',
  },
  {
    id: 'predict', focus: 'p1', visibleControls: ['sessions', 'p1'],
    narration: `The second answer was ${later(OFF).right ? 'right' : 'wrong'}: “${later(OFF).text}” The new window started empty, so the model never heard about the contract. A memory tool lets the assistant write short notes to files that outlive the conversation. Before you try it:`,
    predicate: s => s.p1 !== null,
  },
  {
    id: 'with', focus: 'run', visibleControls: ['p1', 'sessions', 'run'],
    narration: 'The assistant now has the memory tool, and the host reads any notes into the window when a session starts. Run both conversations again.',
    predicate: s => s.seen.includes(true),
    hint: 'Press the run button.',
  },
  {
    id: 'quiz', focus: 'quiz', visibleControls: ['out1', 'sessions', 'notes', 'facts', 'quiz'],
    narration: `In the first conversation the model chose to write a note, and the host saved it. The second conversation started with the note in its window, so it answered: “${later(ON).text}” The model only asks; the host decides what is written, where, and what is read back. One question to finish.`,
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Who carried out the file operation in this chapter?',
  },
];

/** Each run tried: what the assistant said in each conversation. */
function Sessions({ s }: { s: S }) {
  const rows = [false, true].filter(m => s.seen.includes(m));
  if (!rows.length) return null;
  return (
    <table className="tc-ledger">
      <caption>Two conversations, a week apart</caption>
      <thead><tr><th scope="col">Memory</th><th scope="col">First conversation</th><th scope="col">A week later</th></tr></thead>
      <tbody>{rows.map(m => {
        const a = R(m).answers;
        return (
          <tr key={String(m)} data-memory={m ? 'on' : 'off'}>
            <th scope="row">{m ? 'Memory tool' : 'No memory'}</th>
            <td>{a[0].text}</td>
            <td>{a[1].text} <span className={`stamp ${a[1].right ? 'correct' : 'wrong'}`}>{a[1].right ? 'RIGHT' : 'WRONG'}</span></td>
          </tr>
        );
      })}</tbody>
    </table>
  );
}

/** The memory files the host kept between the two sessions. */
function Notes() {
  return (
    <table className="tc-ledger">
      <caption>The host’s memory files after the first conversation</caption>
      <thead><tr><th scope="col">File</th><th scope="col">Note</th></tr></thead>
      <tbody>{Object.entries(ON.notes).map(([f, t]) => <tr key={f}><th scope="row"><code>{f}</code></th><td>{t}</td></tr>)}</tbody>
    </table>
  );
}

export default function MemoryOutsideTheWindow() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ memory: false, seen: [], p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state }) => { const r = R(state.memory); return <ContextStage run={r} upTo={state.seen.length ? r.meter.length : 0} props={{ cabinet: true }} />; }}
      controls={{
        run: ({ state, apply }) => {
          const memory = state.seen.includes(false);
          return <button type="button" className="big" onClick={() => apply({ ...state, memory, seen: [...state.seen, memory] })}>{memory ? 'Run both with the memory tool' : 'Run both conversations'}</button>;
        },
        sessions: ({ state }) => <Sessions s={state} />,
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUT1} />,
        notes: () => <Notes />,
        facts: () => <><Fact id="memory-tool" /><Fact id="memory-client-side" /></>,
        quiz: ({ state, apply, sync }) => (
          <Quiz {...QUIZ} unsure value={state.quiz} onAnswer={(_, q) => apply({ ...state, quiz: q })} onUnsure={() => sync({ ...state, quiz: UNSURE })} />
        ),
      }}
    />
  );
}
