// Chapter 5: split inside a layer. Eight chip workers share one layer's maths and all-reduce its results (the ring,
// steppable as exploration); the reader predicts what crossing boxes costs, then picks the split inside one box and
// across two: the simulated step time (stepOf, pinned) more than triples on the slow link.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { RING_PARTS } from '../../components/scenes/ringScene';
import { LINK, PER_BOX, TP_ALLREDUCES } from '../../lib/parallel-training/facts';
import type { Layout } from '../../lib/parallel-training/memory';
import { stepOf, tensorHopSeconds } from '../../lib/parallel-training/timing';
import { CHIPS } from '../../lib/parallel-training/workbench';
import { secondsText } from '../../lib/parallel-training/story';
import { Outcome } from '../tool-calling/kit';
import { Fact, Maths, PassControls, type PassState, Radios, RingStage, SimNote, sceneOf, timelineOf } from './kit';

const MODULE = 'parallel-training',
  ID = '05-inside-a-layer';
export const PARTS = RING_PARTS;
type Link = 'inside' | 'between';
const LINKS: Link[] = ['inside', 'between'];
/** the two layouts on the quote (pinned.json's tensor): a layer split inside one box, or across two */
export const LAYOUTS: Record<Link, Layout> = {
  inside: { tp: PER_BOX, pp: 4, dp: CHIPS / (PER_BOX * 4), zero: 1 },
  between: { tp: 2 * PER_BOX, pp: 2, dp: CHIPS / (PER_BOX * 4), zero: 1 },
};
export const STEP = { inside: stepOf(LAYOUTS.inside), between: stepOf(LAYOUTS.between) };
export const HOP = {
  inside: tensorHopSeconds(PER_BOX, LINK.inside),
  between: tensorHopSeconds(2 * PER_BOX, LINK.between),
};
export const RATIO = STEP.between.total / STEP.inside.total;
const GBS = (b: number) => `${b / 1e9} GB/s`;
const words = (l: Link) => `${LAYOUTS[l].tp} ways, ${l === 'inside' ? 'in one box' : 'across boxes'}`;
const START_PASS: PassState = { mode: 'ring', n: 8, k: 0, m: 4 };

export interface S {
  p1: number | null;
  link: Link | null;
  pass: PassState;
  quiz: number | null;
}

export const P1 = {
  question: `Split each layer ${LAYOUTS.between.tp} ways across two boxes, not ${PER_BOX} in one. What happens to the step time?`,
  options: ['About the same', 'A little slower', 'More than twice as slow'],
};
export const OUTCOME = RATIO < 1.2 ? 0 : RATIO < 2 ? 1 : 2;

export const QUIZ = {
  question: 'A team serves a big model with each layer split over chips in two servers. Replies come slowly. Why?',
  options: [
    'Every layer waits on an all-reduce over the slow link between servers',
    'Two servers hold less memory than one',
    'Splitting a layer makes its maths harder',
  ],
  correct: 0,
  explanation: 'A split layer talks every layer, so it runs at the speed of the link its chips share.',
  why: [
    'Right: the chips swap results inside every layer, so the slow link sets the pace.',
    'Two servers hold more memory, not less; the cost is the waiting between them.',
    'The maths is the same, only shared out; the extra is the talking.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `Tensor parallel splits each layer’s maths across chips. They all-reduce partial results ${TP_ALLREDUCES} times a layer.`,
    act: 'Predict first.',
    say: { block: 'table', text: 'One layer' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'inside',
    focus: 'link',
    visibleControls: ['link'],
    narration: `Your pick is locked. Inside one box, chips talk over a fast link at ${GBS(LINK.inside)} each.`,
    act: `Pick ${words('inside')}.`,
    say: { block: 'table', text: 'Fast link' },
    predicate: s => s.link === 'inside',
  },
  {
    id: 'between',
    focus: 'link',
    visibleControls: ['link'],
    narration: `${secondsText(STEP.inside.total)} a step. Between boxes each chip’s link runs ${GBS(LINK.between)}, ${LINK.inside / LINK.between}× slower.`,
    act: `Pick ${words('between')}.`,
    say: { block: 'rack', text: 'Slow link' },
    predicate: s => s.link === 'between',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'link', 'sum', 'quiz'],
    narration: `${secondsText(STEP.between.total)} a step: every layer waits on the slow link. So this split stays inside one box.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'How often do chips that share a layer have to talk?',
  },
];

function Ledger() {
  const row = (l: Link) => (
    <tr key={l}>
      <th scope="row">{words(l)}</th>
      <td>{secondsText(HOP[l])}</td>
      <td className={l === 'inside' ? 'ok' : 'bad'}>{secondsText(STEP[l].total)}</td>
    </tr>
  );
  return (
    <table className="tc-ledger">
      <caption>Simulated, on planning numbers</caption>
      <thead>
        <tr>
          <th scope="col">Layer split</th>
          <th scope="col">One all-reduce</th>
          <th scope="col">Step</th>
        </tr>
      </thead>
      <tbody>{LINKS.map(row)}</tbody>
    </table>
  );
}

export default function InsideALayer() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, link: null, pass: START_PASS, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, focus, say }) => (
        <RingStage
          say={say}
          scene={{ ...sceneOf(state.pass), table: `${GBS(LINK.inside)} in`, rack: `${GBS(LINK.between)} out` }}
          timeline={timelineOf(state.pass)}
          caption={
            state.link
              ? `${words(state.link)}: ${secondsText(STEP[state.link].total)} a step, simulated.`
              : `${state.pass.n} chips share one layer; hop ${state.pass.k} of its all-reduce.`
          }
        >
          <PassControls
            key={`${focus}-${say?.text ?? ''}`}
            state={state.pass}
            workers={false}
            onChange={pass => sync({ ...state, pass })}
          />
        </RingStage>
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUTCOME} />,
        link: ({ state, apply, sync, focused }) => (
          <>
            <Radios
              legend="Layer split"
              options={LINKS}
              value={state.link}
              words={words}
              onChange={link => (focused ? apply : sync)({ ...state, link })}
            />
            {state.link && <Ledger />}
          </>
        ),
        sum: () => (
          <>
            <Fact id="tp-in-box" />
            <Maths>
              <p>
                {`One all-reduce of a micro-batch’s activations: 2(t − 1)/t × the bytes ÷ the link speed, ${TP_ALLREDUCES} times a layer, every layer, every micro-batch.`}
              </p>
            </Maths>
            <SimNote />
            <p className="note">
              <a href="/inference/">Serving a big model splits it the same way: see the module on serving models.</a>
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
