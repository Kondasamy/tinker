// Chapter 7: serve Larkspur's Monday, the workbench. The reader sets the batching mode, the batch cap and the KV room;
// the simulated server runs Monday's rush and every request is checked against the support lead's two targets. The
// puzzle accepts every setting tied for the most requests on target (WINNERS, computed over the whole domain).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { CAPS, MEMORY, MODES, type Mode, type Settings } from '../../lib/inference/server';
import { BEST, TARGETS, WINNERS, runOf, verdicts, wins } from '../../lib/inference/workbench';
import { floorAt } from '../../components/scenes/serveScene';
import { ms } from '../../components/scenes/serverTimeline';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { CostModelNote, InferenceStage, type View } from './kit';

const MODULE = 'inference', ID = '07-serve-larkspur';
/** where the bench starts: the first server, static and small */
export const START: Settings = { mode: 'static', cap: CAPS[2], kvRoomGB: MEMORY[0] };
const MODE_NAME: Record<Mode, string> = { static: 'Static batching', continuous: 'Continuous batching' };
/** the settings in a run's state; anything unknown falls back to START's */
export const settingsOf = (s: Partial<Settings>): Settings => ({
  mode: MODES.includes(s.mode!) ? s.mode! : START.mode,
  cap: (CAPS as readonly number[]).includes(s.cap!) ? s.cap! : START.cap,
  kvRoomGB: MEMORY.includes(s.kvRoomGB!) ? s.kvRoomGB! : START.kvRoomGB,
});
const onTarget = (p: Settings) => verdicts(runOf(p)).filter(v => v.ok).length;

const QUIZ = {
  question: 'A ticket-booking site faces a rush when sales open. Its assistant must start answering within a second and keep a steady pace. Which plan matches what you found?',
  options: [
    'The biggest batch cap the memory allows: more throughput serves the rush',
    'Continuous batching, a cap tuned against both targets, and enough KV room that memory doesn’t hold requests back',
    'Static batching with a small cap, so every batch is quick',
    'Any setting: the targets depend only on the model',
  ],
  correct: 1,
  explanation: 'Continuous batching keeps seats full; the cap trades the queue against each reply’s pace; memory decides whether the cap can be used at all.',
  why: [
    'The biggest batch empties the queue, but slows every reply’s tokens past a pace target.',
    'Right. Each setting pulls on a different target, so you tune them together against the targets, not one number alone.',
    'Static batches hold seats until their longest reply ends, so the queue waits however small the cap.',
    'The same model served differently missed or met the targets: the server’s settings decide them.',
  ],
};

interface S extends Settings { view: View; quiz: number | null }

export const STEPS: Step<S>[] = [
  {
    id: 'bench', focus: 'bench', visibleControls: ['score', 'bench'],
    narration: `The support lead’s targets for every customer: the first token within ${ms(TARGETS.ttftMs)}, then each token within ${ms(TARGETS.tpotMs)}. The bench starts on Larkspur’s first server: static batching, a cap of ${START.cap} and ${START.kvRoomGB} GB of KV room. Change the settings until as many of Monday’s ${runOf(START).served.length} requests as possible are on target.`,
    predicate: s => wins(settingsOf(s)),
    hint: 'Start with the batching mode. Then try caps in the middle, and watch the time per token as well as the first token.',
    solution: s => ({ ...s, ...WINNERS[0] }),
  },
  {
    id: 'ties', focus: 'quiz', visibleControls: ['score', 'bench', 'quiz'],
    narration: `${BEST} of ${runOf(START).served.length}: the most any setting gets on target. Yours is one of ${WINNERS.length} settings that work.${BEST < runOf(START).served.length ? ' The rest arrive in the thick of the rush; no setting of this one server meets both targets for them.' : ''} The bench is still yours. One question to finish.`,
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which setting pulls on which target?',
  },
];

function Score({ s }: { s: S }) {
  const p = settingsOf(s), n = onTarget(p), r = runOf(p), best = wins(p);
  return (
    <div role="status" data-score={n} data-best={best ? '1' : '0'}>
      <p className="in-headline"><strong>{n}</strong>{` of ${r.served.length} on target`} <span className={`stamp ${best ? 'correct' : 'neutral'}`}>{best ? 'BEST' : `BEST IS ${BEST}`}</span></p>
      {best && <p className="tc-status">{`One of ${WINNERS.length} settings that work.`}</p>}
    </div>
  );
}

function Bench({ s, set }: { s: S; set: (s: S) => void }) {
  const p = settingsOf(s), v = verdicts(runOf(p)), ci = (CAPS as readonly number[]).indexOf(p.cap), mi = MEMORY.indexOf(p.kvRoomGB);
  return (
    <div className="tc-bench">
      <fieldset className="tc-pick">
        <legend>Batching</legend>
        <div className="in-row">
          {MODES.map(m => <button key={m} type="button" className="chip" aria-pressed={p.mode === m} onClick={() => set({ ...s, mode: m })}>{MODE_NAME[m]}</button>)}
        </div>
      </fieldset>
      <div className="in-range">
        <label htmlFor="in-wcap">{`Batch cap: ${p.cap}`}</label>
        <input id="in-wcap" type="range" min={0} max={CAPS.length - 1} step={1} value={ci} aria-valuetext={`${p.cap} requests at once`} onChange={e => set({ ...s, cap: CAPS[Number(e.target.value)] })} />
      </div>
      <div className="in-range">
        <label htmlFor="in-wroom">{`KV room: ${p.kvRoomGB} GB`}</label>
        <input id="in-wroom" type="range" min={0} max={MEMORY.length - 1} step={1} value={mi} aria-valuetext={`${p.kvRoomGB} gigabytes`} onChange={e => set({ ...s, kvRoomGB: MEMORY[Number(e.target.value)] })} />
      </div>
      <div className="in-scrolltable" tabIndex={0} role="region" aria-label="Every request against the targets, scrolls">
        <table className="tc-ledger">
          <caption>Every request against the targets</caption>
          <thead><tr><th scope="col">Request</th><th scope="col">First token</th><th scope="col">Per token</th><th scope="col">Result</th></tr></thead>
          <tbody>
            {v.map((x, i) => (
              <tr key={x.id} data-ok={x.ok ? 1 : 0}>
                <th scope="row">{`${i + 1} (${x.served.prompt} → ${x.served.reply})`}</th>
                <td className={x.ttftOk ? 'ok' : 'bad'}>{ms(x.served.ttft)}</td>
                <td className={x.tpotOk ? 'ok' : 'bad'}>{ms(x.served.tpot)}</td>
                <td>{x.ok ? 'on target' : !x.ttftOk && !x.tpotOk ? 'late and slow' : !x.ttftOk ? 'late start' : 'too slow'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <CostModelNote />
    </div>
  );
}

export default function ServeLarkspur() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ...START, view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync }) => {
        const p = settingsOf(state), r = runOf(p);
        return (
          <InferenceStage view={state.view} onView={view => sync({ ...state, view })} show={() => ({
            scene: floorAt(r), result: r, ttftTarget: TARGETS.ttftMs,
            caption: `${MODE_NAME[p.mode]}, cap ${p.cap}, ${p.kvRoomGB} GB of KV room: ${onTarget(p)} of ${r.served.length} requests on target.`,
          })} />
        );
      }}
      controls={{
        score: ({ state }) => <Score s={state} />,
        // changing the settings is an attempt only while it is the puzzle
        bench: ({ state, apply, sync, focused }) => <Bench s={state} set={focused ? apply : sync} />,
        quiz: ({ state, apply, sync }) => (
          <Quiz {...QUIZ} unsure value={state.quiz} onAnswer={(_, q) => apply({ ...state, quiz: q })} onUnsure={() => sync({ ...state, quiz: UNSURE })} />
        ),
      }}
    />
  );
}
