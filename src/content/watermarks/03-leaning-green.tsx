// Chapter 3: leaning green. The same prompt and seed written at each nudge δ in DELTAS (pinned.json leaning,
// re-derived by the engine test), all lit. The reader predicts how the green share moves, tries every δ, then reads
// the cost: the quality lost per token over Larkspur mini's 20 test replies (pinned workbench results at U2's γ).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { UV_PARTS } from '../../components/scenes/uvScene';
import { DELTAS, MARK } from '../../lib/watermarks/story';
import { resultOf } from '../../lib/watermarks/workbench';
import { Outcome } from '../tool-calling/kit';
import { Fact, PIN, signed, ToyNote, UvStage } from './kit';

const MODULE = 'watermarks',
  ID = '03-leaning-green';
export const PARTS = UV_PARTS;
const leaning = (delta: number) => PIN.leaning.find(l => l.delta === delta)!;
/** Quality lost per token at U2's γ, over the 20 test replies; δ 0 loses nothing. */
export const dropAt = (delta: number) => (delta ? resultOf({ gamma: MARK.gamma, delta }).drop : 0);
const nats = (x: number) => x.toFixed(3);
const CHOSEN = leaning(MARK.delta);

export interface S {
  delta: number;
  tried: number[];
  p1: number | null;
  quiz: number | null;
}

export const P1 = {
  question: `Raise the nudge from 0 to ${DELTAS.at(-1)}. What happens to the share of green pairs?`,
  options: ['It climbs as the nudge grows', 'It jumps to all green at 1', 'It stays near half; only the words change'],
};
/** Green share at each δ climbs (asserted against the pins in the chapters test). */
export const OUTCOME = 0;

export const QUIZ = {
  question: 'A team sets the nudge to 10 so every reply is unmistakably marked. What goes wrong?',
  options: [
    'Replies fill with tokens the model rated unlikely',
    'The checker stops counting above z 4',
    'Nothing: a bigger nudge costs nothing',
  ],
  correct: 0,
  explanation: 'A huge nudge forces green tokens even where the model’s best word was red, and the text reads worse.',
  why: [
    'Right: a huge boost overrules the model wherever its best token was red, so quality falls.',
    'The checker keeps counting; a higher z only makes the call surer.',
    'The table shows the cost growing with every step up in the nudge.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'Before each pick, the writer adds a nudge to every green token’s score. At 0 there is no mark.',
    act: 'Predict first.',
    say: { block: 'machine', text: 'Adds the nudge' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'try',
    focus: 'delta',
    visibleControls: ['delta'],
    narration: 'Your pick is locked. Each nudge rewrites the reply with the same dice rolls.',
    act: `Try every nudge: ${DELTAS.join(', ')}.`,
    say: { block: 'page', text: 'Watch the green' },
    predicate: s => DELTAS.every(d => s.tried.includes(d)),
  },
  {
    id: 'cost',
    focus: 'quiz',
    visibleControls: ['delta', 'out1', 'cost', 'facts', 'quiz'],
    narration: `Bigger nudges mark harder but pick less likely tokens. Larkspur chose ${MARK.delta}: it costs ${nats(dropAt(MARK.delta))} nats a token.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What does the boost do where the model’s favourite token was red?',
  },
];

function Deltas({ s, set }: { s: S; set: (s: S) => void }) {
  return (
    <fieldset className="wm-radios">
      <legend>Nudge (δ)</legend>
      {DELTAS.map(d => (
        <label key={d}>
          <input
            type="radio"
            name="wm-delta"
            checked={s.delta === d}
            onChange={() => set({ ...s, delta: d, tried: s.tried.includes(d) ? s.tried : [...s.tried, d] })}
          />
          {d}
        </label>
      ))}
    </fieldset>
  );
}

function Cost() {
  return (
    <table className="tc-ledger wm-table">
      <caption>Each nudge: this reply, and quality lost over Larkspur mini’s 20 test replies</caption>
      <thead>
        <tr>
          <th scope="col">Nudge</th>
          <th scope="col">Green pairs</th>
          <th scope="col">Score (z)</th>
          <th scope="col">Nats lost a token</th>
        </tr>
      </thead>
      <tbody>
        {DELTAS.map(d => {
          const l = leaning(d);
          return (
            <tr key={d}>
              <th scope="row">{d}</th>
              <td>{`${l.green} of ${l.pairs}`}</td>
              <td className={l.verdict === 'marked' ? 'ok' : undefined}>{signed(l.z)}</td>
              <td>{nats(dropAt(d))}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function LeaningGreen() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ delta: 0, tried: [0], p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => {
        const l = leaning(state.delta);
        return (
          <UvStage
            say={say}
            ids={l.ids}
            lamp="all"
            caption={`Nudge ${state.delta}: ${l.green} of ${l.pairs} pairs green, z ${signed(l.z)}.${state.delta === CHOSEN.delta ? ' Larkspur’s choice.' : ''}`}
          />
        );
      }}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        delta: ({ state, apply, sync, focused }) => <Deltas s={state} set={focused ? apply : sync} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        cost: () => <Cost />,
        facts: () => (
          <>
            <ToyNote>
              Real marks show the same trade-off, and a tuned one can cost so little that readers rate marked and
              unmarked replies the same.
            </ToyNote>
            <Fact id="nudge-cost" />
            <Fact id="synthid-text" />
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
