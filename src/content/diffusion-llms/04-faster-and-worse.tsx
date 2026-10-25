// Chapter 4: faster and worse. One phrase filled surest first at 1, 4 and 16 tokens a pass (live; the dial follows the
// range). Each run is read against the careful fill (tokens the same) and for repeats (a token equal to the one
// before). The averages over every pinned phrase come from prompts.json's quality and repeats.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import PINNED from '../../../data/diffusion-llms/prompts.json' with { type: 'json' };
import { KS, L, agreeing, passesFor, pct, repeating, text, type K } from '../../lib/diffusion-llms/decode';
import { PHRASES } from '../../lib/diffusion-llms/workbench';
import { ASKED_K } from '../../lib/diffusion-llms/chapters';
import { FRAME_PARTS } from '../../components/scenes/typeFrameScene';
import { Outcome } from '../tool-calling/kit';
import { FrameStage, KRange, ToyNote, Waiting, frameOf, given, phrase, replyAt, tokens, useFill } from './kit';

const MODULE = 'diffusion-llms',
  ID = '04-faster-and-worse';
export const PARTS = FRAME_PARTS;
export const SEED = 1;
/** The settings the chapter asks for, slowest first. */
export const ASKED = ASKED_K;
const P = phrase(SEED),
  CAREFUL = P.replies.confidence[1].ids;
const QUALITY = PINNED.quality.confidence as Record<string, number>,
  REPEATS = PINNED.repeats.confidence as Record<string, number>;

interface Ran {
  ids: number[];
  agree: number;
  repeat: number;
}
export interface S {
  p1: number | null;
  k: K;
  run: K | null;
  runs: Partial<Record<string, Ran>>;
  quiz: number | null;
}
const ran = (ids: number[]): Ran => ({ ids, agree: agreeing(ids, CAREFUL), repeat: repeating(ids) });
/** Show me: the pinned replies at each asked setting (the decode test keeps them equal to live fills). */
export const PINNED_RUNS = Object.fromEntries(ASKED.map(k => [k, ran(P.replies.confidence[k].ids)]));

const P1 = {
  question: `Stamp all ${L} tokens in one pass instead of ${L} passes. What happens?`,
  options: [
    `The same reply, ${L} times faster`,
    'Faster, but the reply drifts and stutters',
    'Nothing comes out: it needs a pass per token',
  ],
};

export const QUIZ = {
  question: 'A team sets its diffusion model to 8 tokens a pass to hit a speed target. What should they do next?',
  options: [
    'Check that replies at that setting still pass their quality tests',
    'Nothing: speed and quality are separate dials',
    'Only measure tokens a second',
  ],
  correct: 0,
  explanation: 'More tokens a pass buys speed with quality, so the setting has to be tested on real replies.',
  why: [
    'Right: guesses stamped together can’t see each other, so quality falls as tokens a pass rises.',
    'Here they are one dial: every token stamped together is a guess made without its neighbours.',
    'Speed alone says nothing about whether the replies still read well.',
  ],
};

const tried = (s: S) => ASKED.every(k => s.runs[k]);
export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration:
      'Same phrase, same model. Tokens a pass sets how many blanks each pass stamps, so how many passes a reply takes.',
    act: 'Predict first.',
    say: { block: 'dial', text: 'Tokens a pass' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'sweep',
    focus: 'k',
    visibleControls: ['k', 'results'],
    narration: 'Each run is checked against the careful fill, and for repeats: tokens copying the one before.',
    act: `Fill at ${ASKED.join(', ')} tokens a pass.`,
    say: { block: 'frame', text: 'How far off?' },
    predicate: tried,
    hint: 'Set Tokens a pass, press Fill, wait for the frame to fill, then the next setting.',
    solution: s => ({ ...s, runs: { ...s.runs, ...PINNED_RUNS } }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['results', 'quiz'],
    narration:
      'Fewer passes, more drift: guesses stamped together can’t see each other, so neighbours copy one another.',
    act: 'One question to finish.',
    say: { block: 'frame', text: 'Fast, stuttering' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Does a faster setting give the same reply?',
  },
];

function Stage({ state, sync, say }: { state: S; sync: (s: S) => void; say?: Step<S>['say'] }) {
  const job = state.run ? { seed: SEED, k: state.run, rule: 'confidence' as const } : null;
  const r = useFill(job, f => {
    if (state.run && !state.runs[state.run]) sync({ ...state, runs: { ...state.runs, [state.run]: ran(f.reply) } });
  });
  const fr = { ...frameOf(r.fill, r.shown, state.k), k: state.k };
  return (
    <FrameStage
      say={say}
      shown={{
        wait:
          job && !r.fill && r.status !== 'ready' ? (
            <Waiting w="mlm" failed={r.status === 'error'} retry={r.retry} />
          ) : undefined,
        given: P.ids.length,
        ...fr,
        fill: r.done ? r.fill : null,
        stripLabel: state.run ? `${tokens(state.run)} a pass, pass by pass` : undefined,
        caption: !r.fill
          ? `“${given(SEED)}” and ${L} blanks.`
          : `${tokens(r.fill.k)} a pass, pass ${r.shown} of ${fr.passes}: “${replyAt(r.fill, r.shown)}”`,
      }}
    />
  );
}

export default function FasterAndWorse() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, k: 1, run: null, runs: {}, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => <Stage state={state} sync={sync} say={say} />}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        k: ({ state, sync }) => (
          <>
            <KRange value={state.k} onChange={k => sync({ ...state, k })} />
            <button
              type="button"
              className="big"
              style={{ marginTop: 10 }}
              onClick={() => sync({ ...state, run: state.k })}
            >
              Fill: {tokens(state.k)} a pass
            </button>
          </>
        ),
        results: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={1} />
            <table className="tc-ledger" style={{ marginTop: 10 }} data-runs={Object.keys(state.runs).length}>
              <caption>Each run against the careful fill</caption>
              <thead>
                <tr>
                  <th scope="col">Tokens a pass</th>
                  <th scope="col">Passes</th>
                  <th scope="col">Same as careful</th>
                  <th scope="col">Repeats</th>
                </tr>
              </thead>
              <tbody>
                {KS.filter(k => state.runs[k]).map(k => {
                  const x = state.runs[k]!;
                  return (
                    <tr key={k} data-k={k} data-reply={text(x.ids)}>
                      <th scope="row">
                        {k} <span className="dl-why">“{text(x.ids)}”</span>
                      </th>
                      <td>{passesFor(k)}</td>
                      <td>
                        {x.agree} of {L}
                      </td>
                      <td>
                        {x.repeat} of {L - 1}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {tried(state) && (
              <table className="tc-ledger" style={{ marginTop: 10 }}>
                <caption>Every pinned phrase ({PHRASES.length}), surest first</caption>
                <thead>
                  <tr>
                    <th scope="col">Tokens a pass</th>
                    <th scope="col">Same as careful</th>
                    <th scope="col">Repeats</th>
                  </tr>
                </thead>
                <tbody>
                  {KS.map(k => (
                    <tr key={k}>
                      <th scope="row">{k}</th>
                      <td>{pct(QUALITY[k])}</td>
                      <td>{pct(REPEATS[k])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <ToyNote />
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
