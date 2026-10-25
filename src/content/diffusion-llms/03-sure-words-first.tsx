// Chapter 3: sure words first. The same phrase filled at 4 tokens a pass, twice, live: random remasking, then surest
// first. The frame fills in any order, each slot glowing with its confidence. Each reply is compared with the careful
// fill (one a pass, surest first; pinned in prompts.json and replayed by the decode test); the averages over every
// pinned phrase come from prompts.json's quality, and LLaDA's finding is cited apart.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import PINNED from '../../../data/diffusion-llms/prompts.json' with { type: 'json' };
import { L, agreeing, pct, text, type Rule } from '../../lib/diffusion-llms/decode';
import { PHRASES } from '../../lib/diffusion-llms/workbench';
import { FRAME_PARTS } from '../../components/scenes/typeFrameScene';
import { Outcome } from '../tool-calling/kit';
import {
  Fact,
  FrameStage,
  RULE_NAME,
  ToyNote,
  Waiting,
  frameOf,
  given,
  passWords,
  phrase,
  replyAt,
  useFill,
} from './kit';

const MODULE = 'diffusion-llms',
  ID = '03-sure-words-first';
export const PARTS = FRAME_PARTS;
export const SEED = 9,
  K = 4;
const P = phrase(SEED),
  CAREFUL = P.replies.confidence[1].ids;
const QUALITY = PINNED.quality as Record<Rule, Record<string, number>>;

interface Ran {
  ids: number[];
  agree: number;
}
export interface S {
  p1: number | null;
  run: Rule | null;
  runs: Partial<Record<Rule, Ran>>;
  quiz: number | null;
}

const P1 = {
  question: `Each pass may keep ${K} of the guesses. Which ${K} should it keep?`,
  options: [`The ${K} surest guesses`, `The ${K} leftmost, as we read`, `Any ${K}, at random`],
};

export const QUIZ = {
  question: 'A decoder may keep 2 of 10 guesses this pass. Which two should it keep?',
  options: ['The two it is most confident about', 'The first two, left to right', 'Any two: later passes fix mistakes'],
  correct: 0,
  explanation: 'A kept guess is never undone, so keep the surest ones and let the next pass see them.',
  why: [
    'Right: sure guesses are rarely wrong, and the next pass reads them to guess the rest.',
    'Order on the page doesn’t matter to a masked model; confidence does.',
    'A stamped token is never masked again, so a weak guess kept now stays in the reply.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `Each pass stamps ${K} of the ${L} blanks, so the reply takes ${passWords(L / K)}. Remasking decides which ${K} to keep.`,
    act: 'Predict first.',
    say: { block: 'press', text: `Stamps ${K} a pass` },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'random',
    focus: 'random',
    visibleControls: ['random'],
    narration: `Random keeps any ${K} guesses each pass. Watch the frame fill in any order.`,
    act: 'Fill it with Random.',
    say: { block: 'frame', text: `Any ${K}` },
    predicate: s => !!s.runs.random,
  },
  {
    id: 'surest',
    focus: 'surest',
    visibleControls: ['surest'],
    narration: `Surest first keeps the ${K} brightest guesses each pass, so the easy tokens settle first.`,
    act: 'Fill it with Surest first.',
    say: { block: 'frame', text: `Brightest ${K}` },
    predicate: s => !!s.runs.confidence,
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['results', 'quiz'],
    narration:
      'The careful fill stamps one slot a pass, surest first. At the same speed, surest first stays closer to it.',
    act: 'One question to finish.',
    say: { block: 'frame', text: 'Near careful' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'A stamped token is never masked again. Which guesses would you trust to keep?',
  },
];

function Stage({ state, sync, say }: { state: S; sync: (s: S) => void; say?: Step<S>['say'] }) {
  const job = state.run ? { seed: SEED, k: K, rule: state.run } : null;
  const r = useFill(job, f => {
    if (state.run && !state.runs[state.run])
      sync({ ...state, runs: { ...state.runs, [state.run]: { ids: f.reply, agree: agreeing(f.reply, CAREFUL) } } });
  });
  const fr = frameOf(r.fill, r.shown, K);
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
        stripLabel: state.run ? `${RULE_NAME[state.run]}, ${K} tokens a pass, pass by pass` : undefined,
        caption: !r.fill
          ? `“${given(SEED)}” and ${L} blanks.`
          : `${RULE_NAME[r.fill.rule]}, pass ${r.shown} of ${fr.passes}: “${replyAt(r.fill, r.shown)}”`,
      }}
    />
  );
}

const Fill = ({ rule, state, sync }: { rule: Rule; state: S; sync: (s: S) => void }) => (
  <button type="button" className="big" disabled={state.run === rule} onClick={() => sync({ ...state, run: rule })}>
    {state.run === rule ? 'Filling…' : `Fill it: ${RULE_NAME[rule]}`}
  </button>
);

export default function SureWordsFirst() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ p1: null, run: null, runs: {}, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => <Stage state={state} sync={sync} say={say} />}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        random: ({ state, sync }) => <Fill rule="random" state={state} sync={sync} />,
        surest: ({ state, sync }) => <Fill rule="confidence" state={state} sync={sync} />,
        results: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={0} />
            <table className="tc-ledger" style={{ marginTop: 10 }}>
              <caption>This phrase, against the careful fill</caption>
              <thead>
                <tr>
                  <th scope="col">Fill</th>
                  <th scope="col">Passes</th>
                  <th scope="col">Same as careful</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">
                    Careful fill <span className="dl-why">“{text(CAREFUL)}”</span>
                  </th>
                  <td>{L}</td>
                  <td>
                    {L} of {L}
                  </td>
                </tr>
                {(['random', 'confidence'] as const).map(rule => {
                  const x = state.runs[rule];
                  return (
                    x && (
                      <tr key={rule} data-rule={rule} data-agree={x.agree}>
                        <th scope="row">
                          {RULE_NAME[rule]} <span className="dl-why">“{text(x.ids)}”</span>
                        </th>
                        <td>{L / K}</td>
                        <td>
                          {x.agree} of {L}
                        </td>
                      </tr>
                    )
                  );
                })}
              </tbody>
            </table>
            <table className="tc-ledger" style={{ marginTop: 10 }}>
              <caption>Every pinned phrase ({PHRASES.length}): tokens the same as the careful fill</caption>
              <thead>
                <tr>
                  <th scope="col">Tokens a pass</th>
                  <th scope="col">Surest first</th>
                  <th scope="col">Random</th>
                </tr>
              </thead>
              <tbody>
                {[2, 4, 8].map(k => (
                  <tr key={k}>
                    <th scope="row">{k}</th>
                    <td>{pct(QUALITY.confidence[k])}</td>
                    <td>{pct(QUALITY.random[k])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Fact id="llada-remask" />
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
