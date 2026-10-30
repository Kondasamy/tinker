// Chapter 6: one neuron, many meanings. Each neuron's five top tokens over the training split come from
// data/interpretability/neurons.json (recomputed by its own test). The reader opens three pinned neurons, predicts what
// most neurons look like, and counts: most mix words, parts of words and marks. That is why researchers look for
// features (facts on dictionary learning and attribution graphs). Kinds and counts are computed when the page runs.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { NEURONS, kindOf, neuron, type Kind } from '../../lib/interpretability/probe';
import { pieceLabel } from '../../components/scenes/attentionMap';
import { FUSE_PARTS } from '../../components/scenes/fuseScene';
import DATA from '../../../data/interpretability/prompts.json' with { type: 'json' };
import META from '../../../public/data/lm/meta.json' with { type: 'json' };
import { Fact, InterpStage, OURS, useBase } from './kit';

const MODULE = 'interpretability',
  ID = '06-one-neuron-many-meanings';
export const PARTS = FUSE_PARTS;
const LM = META.model;
export const SHOWN = DATA.neurons.shown;
const nid = (n: { layer: number; neuron: number }) => `${n.layer}-${n.neuron}`;
const nName = (n: { layer: number; neuron: number }) => `Layer ${n.layer + 1}, neuron ${n.neuron + 1}`;
const KIND: Record<Kind, string> = { word: 'word', part: 'part of a word', number: 'number', mark: 'mark' };
const kinds = (fires: { piece: string | null }[]) => new Set(fires.map(f => kindOf(f.piece))).size;
/** How many neurons fire on pieces of two or more kinds, out of all of them, counted from neurons.json. */
export const MIXED = NEURONS.layers.flat().filter(f => kinds(f) >= 2).length,
  TOTAL = NEURONS.layers.flat().length;

const P1 = {
  question: `Across all ${TOTAL} of Larkspur mini’s neurons, what do most neurons’ five top tokens look like?`,
  options: ['One kind of token: one idea each', 'A mix of unrelated kinds', 'The same token five times'],
};
/** The option the count lands on. */
export const OUTCOME = MIXED * 2 >= TOTAL ? 1 : 0;

export const QUIZ = {
  question:
    'A team finds a neuron in their model that fires on “refund”. They plan to switch it off to stop refund talk. What is the risk?',
  options: [
    'None: that neuron is the refund neuron',
    'The neuron likely fires on unrelated things too, so switching it off changes more than refunds',
    'Switching off a neuron never changes anything',
  ],
  correct: 1,
  explanation:
    'Most neurons mix several unrelated meanings, so one neuron is a poor handle on one idea; features found across many neurons are closer to one meaning each.',
  why: [
    'You saw neurons fire on words, word parts and marks with nothing in common; “refund” is unlikely to be its only job.',
    'Right: a polysemantic neuron carries several jobs, so a switch aimed at one hits the others.',
    'Pulling one fuse moved Larkspur mini’s guesses, and a neuron is part of what that fuse switches off.',
  ],
};

interface S {
  picked: string | null;
  seen: string[];
  p1: number | null;
  revealed: boolean;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'mlp',
    focus: 'neurons',
    visibleControls: ['neurons'],
    narration: `Each block ends in a thinking part of ${LM.d_mlp} neurons. A neuron fires more on some tokens than others.`,
    act: 'Open a neuron.',
    say: { block: 'fuses', text: 'Thinking parts' },
    predicate: s => s.seen.length >= 1,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'If each neuron meant one idea, reading neurons would explain the model.',
    act: 'Predict first.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'reveal',
    focus: 'reveal',
    visibleControls: ['p1', 'reveal'],
    narration: 'Locked in.',
    act: 'Count the mixed neurons.',
    predicate: s => s.revealed,
  },
  {
    id: 'more',
    focus: 'neurons',
    visibleControls: ['out1', 'neurons'],
    narration: `${MIXED} of ${TOTAL} mix kinds: they are polysemantic. Researchers split activations into features instead.`,
    act: 'Open the other neurons.',
    predicate: s => SHOWN.every(n => s.seen.includes(nid(n))),
    hint: 'Press each neuron’s button once.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['facts', 'quiz'],
    narration: 'Feature methods now trace answers through big models, though they still capture only part of the work.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Does that neuron do only one thing?',
  },
];

function Neuron({ id }: { id: string }) {
  const [l, n] = id.split('-').map(Number),
    { fires } = neuron(l, n);
  return (
    <table className="tc-ledger ip-top" data-neuron={id}>
      <caption>{`${nName({ layer: l, neuron: n })}: the five tokens it fires on most`}</caption>
      <thead>
        <tr>
          <th scope="col">Token</th>
          <th scope="col">Kind</th>
          <th scope="col">Firing</th>
        </tr>
      </thead>
      <tbody>
        {fires.map((f, i) => (
          <tr key={i}>
            <td>
              <code>{f.piece === null ? '(a byte)' : pieceLabel(f.piece)}</code>
            </td>
            <td>{KIND[kindOf(f.piece)]}</td>
            <td>{f.act.toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function OneNeuronManyMeanings() {
  const { model } = useBase();
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      ready={!!model}
      initial={{ picked: null, seen: [], p1: null, revealed: false, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => {
        const l = state.picked ? Number(state.picked.split('-')[0]) : 0;
        return (
          <InterpStage
            say={say}
            prompt={DATA.fuses.bite.text}
            layer={l}
            caption={
              state.picked
                ? `${nName({ layer: l, neuron: Number(state.picked.split('-')[1]) })} lives in layer ${l + 1}’s thinking part.`
                : 'Each layer’s thinking part has its own fuse.'
            }
          />
        );
      }}
      controls={{
        neurons: ({ state, sync, apply, focused }) => (
          <>
            <div role="group" aria-label="Open a neuron" className="ip-fuses">
              {SHOWN.map(n => (
                <button
                  key={nid(n)}
                  type="button"
                  className="chip"
                  aria-pressed={state.picked === nid(n)}
                  onClick={() =>
                    (focused ? apply : sync)({
                      ...state,
                      picked: nid(n),
                      seen: [...new Set([...state.seen, nid(n)])],
                    })
                  }
                >
                  {nName(n)}
                </button>
              ))}
            </div>
            {state.picked && <Neuron id={state.picked} />}
            <p className="note">{`Read over every window of Larkspur’s training documents. ${OURS}`}</p>
          </>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        reveal: ({ state, apply }) => (
          <button type="button" className="chip" onClick={() => apply({ ...state, revealed: true })}>
            Count them
          </button>
        ),
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />
            <p className="tc-status" role="status">
              {`${MIXED} of ${TOTAL} neurons fire on tokens of two or more kinds (word, part of a word, number, mark).`}
            </p>
            <Fact id="superposition" />
          </>
        ),
        facts: () => (
          <>
            <Fact id="dictionary-learning" />
            <Fact id="attribution-graphs" />
            <Fact id="biology" />
            <Fact id="fraction" />
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
